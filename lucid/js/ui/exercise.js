// Exercise renderers. mountExercise(root, ex, opts) draws one exercise and returns a controller:
//   ready()        true when there is something to check
//   check()        -> Promise<{ correct, almost, score, graded, response, error_type, title, detail }>
//   hintText()     authored hint (Bilingual) or null
//   onKey(e)       keyboard shortcuts (1-4 for options); returns true when handled
//   graded         false for practice that is never scored (speaking, writing)
//   speak          true for speaking items: the player offers "Can't speak right now" and goes straight on
//   reveal()       "I don't know": the exercise stays on screen, locked, with the answer marked in place and the
//                  play buttons kept (mcq, listen, gap, order, transform, correct, dictation, match, categorize, read)
//   retryable      true for typed answers (a gap with no word bank, transform, correct, dictation): after a wrong
//                  check the player may
//   reopen()       unlock the fields with the learner's text kept, wrong fields marked, focus on the first one
//   silent()       listen and dictation: true once a play reported no sound in place (the player then treats
//                  "I don't know" as unheard: no score, no retry; contract (b))
// Focus never falls to the page: every action that redraws or disables the focused control moves focus to the
// next useful one (the next tile, chip or bin, or Check once the exercise is complete).
// Every typed answer goes through grading.js, so contractions, case and small slips are fair.
// Speaking is never graded by speech recognition (research C2, D34-D37): the learner sees what was
// recognised, can try again, mark it themselves or go on, and the attempt is stored with no score.
import { html, raw, render, on, shuffle, $, $$ } from '../core/util.js';
import { bi, tt, hebrewSupport, isolateLatin, uiLang } from '../core/i18n.js';
import { checkTyped, findWrongFeedback, wordAccuracy, checkOrder, countWords, normalize, couldBeRight, keyStructure, usSpelling, oneSlip, letterCode, sameAsSource } from '../core/grading.js';
import { sentenceDiff, letterDiff } from '../core/diff.js';
import { say, canSpeak, canListen, listen, stopSpeaking, micNotice, speechErrorText, SPEECH_EVENT } from '../core/speech.js';
import { icon } from './components.js';
import { analyzeWriting } from '../core/writing-analyzer.js';

const KEYS = ['1', '2', '3', '4', '5', '6'];
// Open rewrites from B1 up have many right answers, so the key is "a model answer" and the learner may
// count an equivalent answer (logged as self-judged; research E, P-77). "Find and fix" items are full sentences
// too: from B1 a fix can be worded another way ("To a certain extent" for "To some extent"), so they get the
// same treatment (R1-E2). An answer that matches an authored wrong answer is wrong, never "one of many".
export const OPEN_REWRITE_LEVELS = ['B1', 'B2', 'C1', 'C2'];
export const isOpenRewrite = (ex, level) => ['transform', 'correct'].includes(ex?.type) && OPEN_REWRITE_LEVELS.includes(level);
const NIQQUD = /[\u05B0-\u05BC\u05C1\u05C2\u05C7]/;
const LETTER = /^[A-Za-z]$/;
const firstAnswer = (a) => (Array.isArray(a) ? a[0] : a);
const playTile = (text) => html`<button type="button" class="key ghost small icon-only" data-say-tile="${String(text).trim()}" aria-label="${tt('השמעה', 'Play')}: ${text}">${icon('volume', { size: 18 })}</button>`;
// lang and dir of the interface, for UI words inside an English element (screen-reader notes).
const uiAttrs = () => raw(`lang="${uiLang()}" dir="${uiLang() === 'he' ? 'rtl' : 'ltr'}"`);
const HEBREW = /[֐-׿]/;
const SHORT_EN = /^[A-Za-z][A-Za-z'’-]*(?: [A-Za-z][A-Za-z'’-]*)?[.!?]?$/; // one or two English words
const langOf = (s) => (HEBREW.test(String(s)) ? 'he' : 'en');
const tick = (ok = true) => html`<span class="ex-mark ${ok ? 'ok' : 'bad'}" aria-hidden="true">${icon(ok ? 'check' : 'x', { size: 16 })}</span>`;

// Dialogues (P1 EX-6): a text with two or more "Name:" turns starts each turn on a new line, name in bold.
const TURN = /(^|\s)([A-Z][A-Za-z]+:)(?=\s)/g;
export const isDialogue = (text) => (String(text || '').match(TURN) || []).length >= 2;
export function splitTurns(text) {
  const t = String(text);
  const starts = [...t.matchAll(TURN)].map((m) => m.index + m[1].length).filter((i) => i > 0);
  return [0, ...starts].map((s, k, all) => t.slice(s, all[k + 1] ?? t.length).trim()).filter(Boolean);
}
// A body paragraph of a reading passage, which gets a number (r4 EX-11). Not numbered: a greeting or sign-off
// ("Hi Noa,", "Love,"), a short label (three words or fewer, or all capitals: "Maya", "COMMENTS") and a byline
// ("– Lior, 16").
export function bodyPara(p) {
  const t = String(p || '').trim();
  if (/^(hi|dear|hello|love|best|thanks|cheers)\b/i.test(t) && /,$/.test(t)) return false;
  if (/^[–—-]\s*\S/.test(t)) return false;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length <= 3) return false;
  if (/[A-Z]/.test(t) && t === t.toUpperCase()) return false;
  return true;
}
// The text with a line break before each turn (none at the very start when `first`) and the names in bold.
function turns(text, on_, first) {
  const t = String(text ?? '');
  if (!on_) return t;
  const out = [];
  let last = 0;
  for (const m of t.matchAll(TURN)) {
    const at = m.index + m[1].length;
    out.push(t.slice(last, at));
    if (!(first && at === 0)) out.push(html`<br>`);
    out.push(html`<b class="speaker">${m[2]}</b>`);
    last = at + m[2].length;
  }
  out.push(t.slice(last));
  return out;
}

function listenButtons(text) {
  if (!canSpeak()) return html`<p class="banner warn small">${icon('alert', { size: 18 })}<span>${tt('הדפדפן הזה לא תומך בהקראה. התמליל מוצג במקום.', 'This browser cannot read text aloud, so the transcript is shown instead.')}</span></p><p class="ex-text" lang="en" dir="ltr">${text}</p>`;
  return html`<div class="big-listen"><button type="button" class="key" data-say="normal" aria-label="${tt('השמעה', 'Play')}">${icon('volume', { size: 24 })} ${tt('השמעה', 'Play')}</button><button type="button" class="key" data-say="slow" aria-label="${tt('לאט: השמעה איטית', 'Slowly: play it slowly')}">${icon('turtle', { size: 24 })} ${tt('לאט', 'Slowly')}</button></div>`;
}

// Error label for feedback: "Article (a / an / the)", plus the error type's general Hebrew note only when the
// exercise has nothing of its own to say. That note is written for every level and topic ("make a decision, do
// homework" for any word-choice slip), so next to an item's own explanation it is off-topic noise (R2-04).
function errorNote(type, errors, { general = true } = {}) {
  const e = type && errors?.get(type);
  if (!e) return '';
  return html`<p class="small"><span class="tag bad">${tt(e.name_he, e.name_en)}</span>${general && hebrewSupport() !== 'off' && e.why_he ? html` <span lang="he" dir="rtl" class="faint">${isolateLatin(e.why_he)}</span>` : ''}</p>`;
}

export function mountExercise(root, ex, { onChange = () => {}, errors = null, level = null, variant } = {}) {
  const prompt = html`<h2 class="ex-prompt" tabindex="-1">${bi(ex.prompt)}</h2>`;
  const ctl = { graded: true, ready: () => false, check: async () => ({}), hintText: () => ex.hint || null, onKey: () => false, destroy: () => {} };
  const offs = [];
  const sayHandler = (text) => offs.push(on(root, 'click', '[data-say]', (e, b) => say(text, { slow: b.dataset.say === 'slow', variant })));
  const result = (r) => ({ graded: true, error_type: r.correct ? null : r.error_type || ex.error_type || null, ...r });
  // The player's Check key (the placement test calls it Next). A click from the keyboard (detail 0) may scroll
  // the new focus into view; after a tap the page stays where it is.
  const checkKey = () => root.closest('.player')?.querySelector('[data-check]:not([disabled]), [data-answer]:not([disabled])');
  const focusOn = (el, e) => { if (el && root.isConnected) el.focus({ preventScroll: Boolean(e) && e.detail !== 0 }); };
  const announce = (h) => { const live = $('[data-live]', root); if (live) render(live, h); };
  const liveRegion = html`<p class="sr-only" aria-live="polite" data-live></p>`;
  // Typed answers (transform, correct, dictation): a wrong field is marked; "I don't know" shows the key under
  // the learner's own text; a second try unlocks the field with the text kept.
  const setInvalid = (el, bad) => { el.classList.toggle('wrong', bad); if (bad) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid'); };
  const revealAnswer = (a) => { const box = $('[data-reveal]', root); if (box) render(box, html`<p class="reveal-answer">${tick()}<span class="sr-only" ${uiAttrs()}>${tt('התשובה:', 'Answer:')} </span><span lang="en" dir="ltr">${a}</span></p>`); };
  const reopenField = (el) => { el.readOnly = false; setInvalid(el, false); el.classList.remove('almost'); onChange(ctl.ready()); el.focus(); el.setSelectionRange?.(el.value.length, el.value.length); };

  switch (ex.type) {
    case 'mcq':
    case 'listen': {
      let picked = null;
      const order = ex.options.map((_, i) => i);
      // Sound questions for beginners (P2 EX-10): at Pre-A1 and A1, when every option is one or two English
      // words, the quoted word in the question and each option get a play button of their own, outside the
      // option, so playing never chooses.
      const sounds = ex.type === 'mcq' && ['PreA1', 'A1'].includes(level) && canSpeak() && ex.options.every((o) => SHORT_EN.test(String(o).trim()));
      const quoted = sounds ? [...String(ex.question).matchAll(/['‘“"]([A-Za-z][A-Za-z ’'-]{0,30}?)['’”"]/g)].map((m) => m[1]) : [];
      const option = (i, n) => html`<button type="button" class="option" data-opt="${i}" aria-pressed="false" lang="en" dir="ltr"><span class="k" aria-hidden="true">${KEYS[n]}</span><span>${ex.options[i]}</span></button>`;
      render(root, html`${prompt}
        ${ex.type === 'listen' ? html`${listenButtons(ex.audio_text)}<div data-silent-slot></div>` : ''}
        <p class="ex-text" lang="en" dir="ltr">${ex.question}${quoted.map((w) => html` <span class="ex-say">${playTile(w)}</span>`)}</p>
        <div class="options" role="group" style="margin-top:var(--s5)">${order.map((i, n) => (sounds ? html`<div class="opt-row">${option(i, n)}${playTile(ex.options[i])}</div>` : option(i, n)))}</div>`);
      if (sounds) offs.push(on(root, 'click', '[data-say-tile]', (e, b) => say(b.dataset.sayTile, { variant })));
      // Listening with no sound (r4 EX-4): after Play the options wait for the sound to start. When nothing plays,
      // a note under the play keys says so and offers the transcript now; answering after it marks the result
      // unheard (contract b), so the lesson and the listening hub do not score a guess. The root is marked
      // data-silent-inline, so the shell's own "can't hear?" toast stays away (contract c). With sound, the
      // transcript still comes only after answering.
      let waiting = false; let unheard = ex.type === 'listen' && !canSpeak();
      // Silence was reported in place (the note, or the transcript chosen after it): "לא יודע/ת" then goes the
      // unheard way too, in the lesson and in the listening hub (ctl.silent).
      let silentSeen = false;
      const gate = (off) => { waiting = off; $$('.option', root).forEach((b) => { if (off) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled'); }); onChange(ctl.ready()); };
      const showTranscriptNow = () => {
        unheard = true;
        gate(false);
        const slot = $('[data-silent-slot]', root);
        if (slot) render(slot, html`<div class="transcript silent-transcript small"><p>${tt('תמליל:', 'Transcript:')}</p><p class="en-block" lang="en" dir="ltr">${ex.audio_text}</p></div>`);
        focusOn($('.option', root));
      };
      if (ex.type === 'listen') {
        sayHandler(ex.audio_text);
        setTimeout(() => root.querySelector('[data-say="normal"]')?.focus(), 60);
        if (canSpeak()) {
          root.setAttribute('data-silent-inline', '');
          offs.push(on(root, 'click', '[data-say]', () => { if (!unheard && !root.dataset.locked) gate(true); }));
          offs.push(on(root, 'click', '[data-transcript-now]', () => showTranscriptNow()));
          const onSpeech = (e) => {
            const { state, text } = e.detail || {};
            if (text !== ex.audio_text || unheard || root.dataset.locked) return;
            const slot = $('[data-silent-slot]', root);
            if (state === 'start') { silentSeen = false; gate(false); if (slot) render(slot, ''); }
            else if ((state === 'silent' || state === 'error') && slot) {
              silentSeen = true;
              gate(true);
              render(slot, html`<div class="silent-note" role="status">${icon('info', { size: 18 })}<div class="stack-sm"><p><b>${tt('לא נשמע קול באנגלית במכשיר הזה.', 'No English voice played on this device.')}</b> ${tt('בדקו את עוצמת הקול ונסו שוב, או קראו את התמליל. תשובה אחרי קריאת התמליל לא נספרת כהאזנה.', 'Check the volume and try again, or read the transcript. An answer after reading it does not count as listening.')}</p><div><button type="button" class="key small" data-transcript-now>${tt('להציג את התמליל עכשיו', 'Show the transcript now')}</button></div></div></div>`);
            }
          };
          document.addEventListener(SPEECH_EVENT, onSpeech);
          offs.push(() => { document.removeEventListener(SPEECH_EVENT, onSpeech); root.removeAttribute('data-silent-inline'); });
        }
      }
      const pick = (i) => { picked = i; $$('.option', root).forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.opt) === i))); onChange(true); };
      offs.push(on(root, 'click', '[data-opt]', (e, b) => { if (!b.disabled && b.getAttribute('aria-disabled') !== 'true') pick(Number(b.dataset.opt)); }));
      ctl.ready = () => picked != null && !waiting;
      ctl.silent = () => ex.type === 'listen' && canSpeak() && (silentSeen || unheard);
      // A number key chooses, and focus goes to Check, so Enter checks (it used to stay on Play).
      ctl.onKey = (e) => { const n = KEYS.indexOf(e.key); if (n >= 0 && n < order.length && !$('.option', root).disabled && !waiting) { pick(order[n]); focusOn(checkKey()); return true; } return false; };
      // The right option is marked in place (and named for screen readers); a wrong choice too.
      const mark = (chosen) => $$('.option', root).forEach((b) => {
        b.disabled = true;
        const i = Number(b.dataset.opt);
        const cls = i === ex.answer ? 'is-right' : i === chosen ? 'is-wrong' : null;
        if (!cls || b.classList.contains(cls)) return;
        b.classList.add(cls);
        b.insertAdjacentHTML('beforeend', String(html`<span class="sr-only" ${uiAttrs()}> (${cls === 'is-right' ? tt('התשובה הנכונה', 'right answer') : tt('הבחירה שלכם', 'your choice')})</span>`));
      });
      // The transcript is its own left-to-right block under the label, so it wraps as English (R2-18).
      const transcript = () => { if (ex.type === 'listen' && !$('.transcript', root)) root.insertAdjacentHTML('beforeend', `<div class="transcript small faint" style="margin-top:var(--s4)"><p>${tt('תמליל:', 'Transcript:')}</p><p class="en-block" lang="en" dir="ltr">${normalizeHtml(ex.audio_text)}</p></div>`); };
      ctl.check = async () => {
        const correct = picked === ex.answer;
        mark(picked);
        // Nothing was heard: an option's note ("you heard a long /iː/") would say otherwise, so it is left out.
        const fb = !correct && !unheard && ex.option_feedback?.[picked];
        transcript();
        return result({ correct, score: correct ? 1 : 0, response: ex.options[picked], error_type: ex.option_errors?.[picked], answer: ex.options[ex.answer], specific: fb || null, ...(unheard ? { unheard: true } : {}) });
      };
      ctl.reveal = () => { if (waiting) gate(false); mark(null); transcript(); };
      break;
    }

    case 'gap': {
      const parts = ex.text.split('___');
      const bank = ex.word_bank ? shuffle(ex.word_bank, 0.42) : null;
      const n = parts.length - 1;
      const dialogue = isDialogue(ex.text);
      const gapName = (i) => `${tt('מילה חסרה', 'Missing word')} ${i + 1}`;
      render(root, html`${prompt}
        <p class="ex-text" lang="en" dir="ltr">${parts.map((p, i) => html`${turns(p, dialogue, i === 0)}${i < n ? html`<input class="gap-input" data-gap="${i}" aria-label="${gapName(i)}" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="${i < n - 1 ? 'next' : 'done'}" ${bank ? html`readonly inputmode="none"` : ''}>` : ''}`)}</p>
        ${bank ? html`<div class="gap-tools" data-gap-tools hidden><button type="button" class="key ghost small" data-gap-clear>${icon('x', { size: 16 })} <span data-gap-clear-label></span></button></div>
          <div class="chips gap-bank" data-bank style="margin-top:var(--s4)" role="group" aria-label="${tt('מחסן מילים', 'Word bank')}" lang="en" dir="ltr">${bank.map((w, ci) => html`<button type="button" class="chip" data-chip="${w}" data-ci="${ci}" aria-disabled="false" aria-describedby="gt-${ex.id}">${w}</button>`)}</div>
          <span class="sr-only" id="gt-${ex.id}" ${uiAttrs()} data-gap-target></span>` : ''}
        ${liveRegion}`);
      const inputs = $$('.gap-input', root);
      const update = () => onChange(inputs.every((i) => i.value.trim()));
      offs.push(on(root, 'input', '.gap-input', update));
      // Word bank (P0 EX-2): a chip fills the chosen gap (the target), then the target moves to the first empty
      // gap. Tapping a gap, or Enter or Space on it, chooses it without clearing it; focus passing through a gap
      // does not (r4 EX-1: tabbing from gap 1 to the chips used to make the last gap the target). Backspace or
      // Delete, or the clear key, empties it and gives its word back. Used words stay visible, marked and skipped.
      // Every chip is described by a hidden line that names the gap it will fill.
      const filled = new Array(n).fill(null); // chip index in each gap
      const locked = new Set(); // gaps already right when the player reopens the item
      let target = bank ? 0 : null;
      const chipEl = (ci) => $(`[data-ci="${ci}"]`, root);
      const setChip = (ci, used) => { const c = chipEl(ci); if (!c) return; c.classList.toggle('used', used); c.setAttribute('aria-disabled', String(used)); c.tabIndex = used ? -1 : 0; };
      const nextEmpty = (from) => { for (let k = 1; k <= n; k++) { const j = (from + k) % n; if (filled[j] == null && !locked.has(j)) return j; } return null; };
      const firstEmpty = () => nextEmpty(n - 1);
      const drawTarget = () => {
        inputs.forEach((inp, i) => {
          const on_ = i === target;
          inp.classList.toggle('is-target', on_);
          if (on_) inp.setAttribute('aria-current', 'true'); else inp.removeAttribute('aria-current');
          inp.setAttribute('aria-label', inp.value ? `${gapName(i)}: ${inp.value}. ${tt('Backspace לניקוי', 'Backspace clears it')}` : gapName(i));
        });
        const into = $('[data-gap-target]', root);
        if (into) into.textContent = target == null ? '' : tt(`ייכנס למילה חסרה ${target + 1}`, `Goes into missing word ${target + 1}`);
        const tools = $('[data-gap-tools]', root);
        if (!tools) return;
        tools.hidden = target == null || filled[target] == null || root.dataset.locked === '1';
        if (!tools.hidden) $('[data-gap-clear-label]', root).textContent = tt(`לנקות את רווח ${target + 1}`, `Clear gap ${target + 1}`);
      };
      const clearGap = (i) => {
        if (filled[i] == null || locked.has(i)) return;
        setChip(filled[i], false);
        filled[i] = null;
        inputs[i].value = '';
        inputs[i].classList.remove('wrong');
        target = i;
        drawTarget(); update();
        announce(html`${gapName(i)}: ${tt('ריק', 'empty')}`);
      };
      const fill = (ci, e) => {
        const t = target ?? nextEmpty(n - 1);
        if (t == null) return;
        if (filled[t] != null) setChip(filled[t], false);
        filled[t] = ci;
        inputs[t].value = bank[ci];
        inputs[t].classList.remove('wrong');
        setChip(ci, true);
        target = firstEmpty();
        drawTarget(); update();
        announce(html`${gapName(t)}: <span lang="en" dir="ltr">${bank[ci]}</span>`);
        // The last gap filled: Check is next. Otherwise the keyboard stays in the word bank.
        if (inputs.every((i) => i.value.trim())) focusOn(checkKey(), e);
        else focusOn($$('[data-ci]', root).find((c) => c.getAttribute('aria-disabled') !== 'true' && Number(c.dataset.ci) > ci) || $('[data-ci][aria-disabled="false"]', root), e);
      };
      // The learner chose this gap (tap, Enter or Space): the next word goes there.
      const chooseGap = (i, say_ = false) => {
        if (root.dataset.locked === '1' || locked.has(i)) return false;
        target = i; drawTarget();
        if (say_) announce(tt(`המילה הבאה תיכנס למילה חסרה ${i + 1}`, `The next word goes into missing word ${i + 1}`));
        return true;
      };
      if (bank) {
        drawTarget();
        offs.push(on(root, 'click', '[data-chip]', (e, b) => { if (root.dataset.locked === '1' || b.getAttribute('aria-disabled') === 'true') return; fill(Number(b.dataset.ci), e); }));
        offs.push(on(root, 'click', '.gap-input', (e, i) => { chooseGap(Number(i.dataset.gap)); }));
        offs.push(on(root, 'keydown', '.gap-input', (e, i) => {
          if (root.dataset.locked === '1') return;
          if (e.key === ' ') { e.preventDefault(); chooseGap(Number(i.dataset.gap), true); return; }
          if (!['Backspace', 'Delete'].includes(e.key)) return;
          e.preventDefault();
          clearGap(Number(i.dataset.gap));
        }));
        offs.push(on(root, 'click', '[data-gap-clear]', (e) => { const t = target; if (t == null) return; clearGap(t); focusOn(inputs[t], e); }));
      }
      setTimeout(() => !bank && inputs[0]?.focus(), 50);
      ctl.ready = () => inputs.every((i) => i.value.trim());
      // Enter in a gap goes to the next empty gap (P2 EX-8); once every gap is filled the player's Enter checks.
      ctl.onKey = (e) => {
        if (e.key !== 'Enter' || e.shiftKey || e.isComposing || root.dataset.locked === '1') return false;
        const inp = e.target?.closest?.('.gap-input');
        // With a word bank, Enter on a gap chooses it (r4 EX-1), until every gap is filled and Enter checks.
        if (bank && inp && root.contains(inp) && !inputs.every((x) => x.value.trim())) { chooseGap(Number(inp.dataset.gap), true); return true; }
        if (!inp || !root.contains(inp) || inputs.every((x) => x.value.trim())) return false;
        const i = Number(inp.dataset.gap);
        const next = [...inputs.slice(i + 1), ...inputs.slice(0, i)].find((x) => !x.value.trim() && !locked.has(Number(x.dataset.gap)));
        if (!next) return false;
        next.focus();
        return true;
      };
      ctl.check = async () => {
        let allRight = true, almost = false, specific = null, err = null, rule = null;
        const responses = [], typos = [];
        root.dataset.locked = '1';
        $$('.gap-mark, .gap-diff', root).forEach((m) => m.remove());
        inputs.forEach((inp, i) => {
          const r = checkTyped(inp.value, ex.answers[i], ex.wrong_feedback);
          responses.push(inp.value);
          inp.readOnly = true;
          inp.classList.remove('right', 'wrong', 'almost', 'is-target');
          inp.removeAttribute('aria-current');
          setInvalid(inp, !r.correct);
          // An "almost" word (a spelling slip) is amber, not green, with its letters marked (r4 EX-8).
          inp.classList.add(!r.correct ? 'wrong' : r.almost ? 'almost' : 'right');
          if (!r.correct) {
            allRight = false;
            const f = findWrongFeedback(inp.value, ex.wrong_feedback);
            if (f && !specific) { specific = f.feedback; err = f.error_type; rule = f.rule || null; }
          } else if (r.almost) {
            almost = true;
            if (r.typo) { typos.push(r.typo); inp.insertAdjacentHTML('afterend', String(gapDiffHtml(r.typo.typed, r.typo.expected))); }
          }
        });
        $$('.chip', root).forEach((c) => { c.disabled = true; });
        target = null; drawTarget();
        return result({ correct: allRight, almost, score: allRight ? 1 : inputs.filter((i) => i.classList.contains('right') || i.classList.contains('almost')).length / inputs.length * 0.5, response: responses.join(' | '), error_type: err, answer: ex.answers.map(firstAnswer).join(' … '), specific, typos, ...(rule ? { retry_note: rule } : {}) });
      };
      ctl.reveal = () => {
        root.dataset.locked = '1';
        $$('.gap-mark, .gap-diff', root).forEach((m) => m.remove());
        inputs.forEach((inp, i) => {
          inp.value = firstAnswer(ex.answers[i]);
          inp.readOnly = true;
          inp.classList.remove('wrong', 'right', 'almost', 'is-target');
          inp.classList.add('is-right');
          inp.removeAttribute('aria-current');
          inp.removeAttribute('aria-invalid');
          inp.setAttribute('aria-label', `${gapName(i)}: ${inp.value}`);
          inp.insertAdjacentHTML('afterend', String(html`<span class="gap-mark">${tick()}</span>`));
        });
        $$('.chip', root).forEach((c) => { c.disabled = true; });
        target = null; drawTarget();
      };
      // A second try (P0 EX-4): the gaps that were right stay as they are; the wrong ones open with the
      // learner's words in them, marked, and the first of them takes the focus. Typed gaps only: with a word bank
      // a second try would be picking by elimination among the chips left (plan.conflicts: typed answers only).
      ctl.retryable = !bank;
      ctl.reopen = () => {
        delete root.dataset.locked;
        const wrong = inputs.filter((inp) => inp.classList.contains('wrong'));
        locked.clear();
        inputs.forEach((inp, i) => { if (inp.classList.contains('right') || inp.classList.contains('almost')) locked.add(i); else if (!bank) inp.readOnly = false; });
        // The reopened fields keep the learner's words and look editable, not wrong, until they are checked again
        // (r4 EX-8).
        wrong.forEach((inp) => setInvalid(inp, false));
        if (bank) $$('.chip', root).forEach((c) => { c.disabled = false; });
        target = bank && wrong.length ? Number(wrong[0].dataset.gap) : null;
        drawTarget();
        onChange(ctl.ready());
        const first = wrong[0];
        first?.focus();
        if (first && !bank) first.setSelectionRange?.(first.value.length, first.value.length);
      };
      break;
    }

    case 'order': {
      const pool = shuffle(ex.tokens.map((t, i) => ({ t, i })), 0.77);
      if (pool.every((p, k) => p.i === k)) pool.reverse();
      const chosen = [];
      // The prompt is drawn once; a tap redraws only the sentence and the word pool, then puts the focus back.
      render(root, html`${prompt}
        <div class="answer-line" role="group" aria-label="${tt('המשפט שלכם', 'Your sentence')}" lang="en" dir="ltr" data-line></div>
        <div class="chips" role="group" aria-label="${tt('המילים', 'The words')}" lang="en" dir="ltr" data-pool></div>`);
      const draw = (revealed = false) => {
        render($('[data-line]', root), chosen.map((p, k) => html`<button type="button" class="chip${revealed ? ' is-right' : ''}" data-out="${k}" ${revealed ? html`disabled` : ''}>${p.t}</button>`));
        render($('[data-pool]', root), pool.map((p) => html`<button type="button" class="chip ${chosen.includes(p) ? 'used' : ''}" data-in="${p.i}" ${chosen.includes(p) ? html`tabindex="-1" aria-hidden="true"` : ''}>${p.t}</button>`));
      };
      draw();
      offs.push(on(root, 'click', '[data-in]', (e, b) => {
        if (root.dataset.locked) return;
        const at = pool.findIndex((x) => x.i === Number(b.dataset.in));
        if (!chosen.includes(pool[at])) chosen.push(pool[at]);
        draw();
        const done = chosen.length === pool.length;
        onChange(done);
        // Next: the next unused word after this one, or Check when the sentence is complete.
        const next = [...pool.slice(at + 1), ...pool.slice(0, at)].find((p) => !chosen.includes(p));
        focusOn(done ? checkKey() : next && $(`[data-in="${next.i}"]`, root), e);
      }));
      offs.push(on(root, 'click', '[data-out]', (e, b) => {
        if (root.dataset.locked) return;
        const k = Number(b.dataset.out);
        chosen.splice(k, 1);
        draw();
        onChange(false);
        focusOn($(`[data-out="${Math.min(k, chosen.length - 1)}"]`, root) || $('[data-in]:not(.used)', root), e);
      }));
      ctl.ready = () => chosen.length === pool.length;
      ctl.check = async () => {
        root.dataset.locked = '1';
        const r = checkOrder(chosen.map((p) => p.t), ex.tokens, ex.answers || []);
        return result({ correct: r.correct, score: r.correct ? 1 : 0, response: chosen.map((p) => p.t).join(' '), answer: ex.tokens.join(' '), error_type: ex.error_type || 'word-order' });
      };
      // "I don't know": the sentence in its right order, marked, in the answer line.
      ctl.reveal = () => {
        root.dataset.locked = '1';
        chosen.length = 0;
        ex.tokens.forEach((t, i) => chosen.push(pool.find((p) => p.i === i)));
        draw(true);
        $$('[data-in]', root).forEach((b) => { b.disabled = true; });
      };
      break;
    }

    case 'match': {
      const left = shuffle(ex.pairs.map((p, i) => ({ text: p[0], i })), 0.31);
      const right = shuffle(ex.pairs.map((p, i) => ({ text: p[1], i })), 0.63);
      let sel = null; let mistakes = 0; const done = new Set(); let marked = [];
      // Letter names that differ only in their vowel points are shown larger, and a letter tile has its own
      // play button (P-09), so the learner can hear "A" and "I" instead of telling them apart by niqqud.
      const tile = (side, x) => {
        const b = html`<button type="button" class="match-item ${NIQQUD.test(x.text) ? 'pointed' : ''}" ${side === 'l' ? html`data-l="${x.i}"` : html`data-r="${x.i}"`} aria-pressed="false" lang="${langOf(x.text)}" dir="auto"><span class="match-mark" aria-hidden="true"></span>${x.text}</button>`;
        // The play button sits on the outer side of the tile, away from the other column.
        return canSpeak() && LETTER.test(String(x.text).trim())
          ? html`<div class="match-cell">${side === 'l' ? playTile(x.text) : ''}${b}${side === 'r' ? playTile(x.text) : ''}</div>`
          : b;
      };
      // Each column is a named group: by language when the columns differ ("English", "Hebrew"), else by place.
      const colLang = (side) => { const ls = new Set(ex.pairs.map((p) => langOf(p[side === 'l' ? 0 : 1]))); return ls.size === 1 ? [...ls][0] : null; };
      const [ll, rl] = [colLang('l'), colLang('r')];
      const colName = (side) => (ll && rl && ll !== rl
        ? ((side === 'l' ? ll : rl) === 'he' ? tt('עברית', 'Hebrew') : tt('אנגלית', 'English'))
        : side === 'l' ? tt('עמודה ראשונה', 'First column') : tt('עמודה שנייה', 'Second column'));
      render(root, html`${prompt}
        <div class="match-grid" data-board>
          <div class="match-col" role="group" aria-label="${colName('l')}">${left.map((x) => tile('l', x))}</div>
          <div class="match-col" role="group" aria-label="${colName('r')}">${right.map((x) => tile('r', x))}</div>
        </div>
        ${liveRegion}`);
      offs.push(on(root, 'click', '[data-say-tile]', (e, b) => say(b.dataset.sayTile, { variant })));
      const pairText = (l, r) => html`<span lang="${langOf(ex.pairs[l][0])}" dir="auto">${ex.pairs[l][0]}</span> – <span lang="${langOf(ex.pairs[r][1])}" dir="auto">${ex.pairs[r][1]}</span>`;
      // A wrong pair keeps its red outline and cross until the next tap (with reduced motion too: no shake needed).
      const clearMarks = () => { marked.forEach((b) => { b.classList.remove('is-wrong', 'shake'); render($('.match-mark', b), ''); }); marked = []; };
      const tryPair = (l, r, origin, e) => {
        const lb = $(`[data-l="${l}"]`, root), rb = $(`[data-r="${r}"]`, root);
        [lb, rb].forEach((b) => b.setAttribute('aria-pressed', 'false'));
        sel = null;
        if (l === r) {
          done.add(l);
          [lb, rb].forEach((b) => { b.classList.add('paired'); b.disabled = true; render($('.match-mark', b), html`<span class="match-n">${done.size}</span>`); });
          announce(html`${pairText(l, r)}: ${tt('נמצא', 'found')}`);
          const complete = done.size === ex.pairs.length;
          onChange(complete);
          // The last pair finishes the exercise by itself: there is nothing left to check (P0 EX-1).
          if (complete) { checkKey()?.click(); return; }
          // The keyboard stays on the board: the next open tile in the column the pair started from.
          const col = $$(`[data-${origin.side}]`, root);
          const at = col.findIndex((b) => Number(b.dataset[origin.side]) === origin.id);
          focusOn([...col.slice(at + 1), ...col.slice(0, at)].find((b) => !b.disabled), e);
        } else {
          mistakes++;
          [lb, rb].forEach((b) => { b.classList.add('is-wrong', 'shake'); render($('.match-mark', b), icon('x', { size: 16 })); });
          marked = [lb, rb];
          announce(html`${pairText(l, r)}: ${tt('לא מתאים', 'not a match')}`);
          focusOn($(`[data-${origin.side}="${origin.id}"]`, root), e);
        }
      };
      offs.push(on(root, 'click', '[data-l],[data-r]', (e, b) => {
        if (b.disabled || root.dataset.locked) return;
        clearMarks();
        const side = b.dataset.l != null ? 'l' : 'r';
        const id = Number(b.dataset[side]);
        if (sel && sel.side !== side) return tryPair(side === 'l' ? id : sel.id, side === 'r' ? id : sel.id, sel, e);
        $$('.match-item', root).forEach((x) => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        sel = { side, id };
        // Next: the other column, where its partner is.
        focusOn($(`[data-${side === 'l' ? 'r' : 'l'}]:not(:disabled)`, root), e);
      }));
      // After the board: the pairs side by side, one row each, with the English word's play button.
      const rows = (revealed) => {
        const allEn = ll === 'en' && rl === 'en';
        return html`<ul class="match-rows" aria-label="${tt('הזוגות', 'The pairs')}" ${allEn ? html`dir="ltr"` : ''}>${ex.pairs.map(([a, b]) => {
          // The play button sits beside the English side of the row.
          const playA = canSpeak() && langOf(a) === 'en', playB = canSpeak() && !playA && langOf(b) === 'en';
          return html`<li class="match-row${revealed ? ' is-right' : ''}"><span class="match-lead">${revealed ? tick() : ''}${playA ? playTile(a) : ''}</span><span class="match-a" lang="${langOf(a)}"><bdi dir="${langOf(a) === 'he' ? 'rtl' : 'ltr'}">${a}</bdi></span><span class="match-sep"><span aria-hidden="true">—</span><span class="sr-only">=</span></span><span class="match-b" lang="${langOf(b)}"><bdi dir="${langOf(b) === 'he' ? 'rtl' : 'ltr'}">${b}</bdi></span><span class="match-trail">${playB ? playTile(b) : ''}</span></li>`;
        })}</ul>`;
      };
      const showRows = (revealed) => { root.dataset.locked = '1'; sel = null; const old = $('[data-board], .match-rows', root); if (old) old.outerHTML = String(rows(revealed)); };
      ctl.ready = () => done.size === ex.pairs.length;
      ctl.check = async () => {
        // One slip on a finished board is forgiven: every pair is right on screen, so it is "almost" (amber) and
        // is not queued again. Two or more count against the score as before.
        const correct = mistakes <= 1;
        const r = result({
          correct, almost: mistakes === 1, score: Math.max(0, 1 - mistakes / ex.pairs.length), response: `${mistakes} mistakes`,
          title: mistakes === 1 ? tt('כל הזוגות נכונים', 'All pairs right') : null,
          summary: mistakes === 0 ? null : mistakes === 1 ? tt('ניסיון נוסף אחד', 'one extra try') : tt(`${mistakes} ניסיונות שגויים`, `${mistakes} wrong tries`),
        });
        showRows(false);
        return r;
      };
      ctl.reveal = () => showRows(true);
      break;
    }

    case 'categorize': {
      const items = shuffle(ex.items.map((x, i) => ({ ...x, i })), 0.5);
      const placed = new Map();
      let sel = null;
      // The prompt and the instruction are drawn once; a tap redraws the words and the bins, then puts the focus
      // back: on a bin after choosing a word, on the next word after placing one, on Check when all are placed.
      // The instruction comes first, at body size, and says what to do next (P2 EX-9); while an item is chosen
      // the bins are marked as the next target. Moves are spoken by a live line of their own ("text → bin"), so
      // the instruction is not repeated (r4 EX-10). Each bin is a group named by its label.
      const helpText = () => (sel == null
        ? tt('בחרו פריט ואז את הקבוצה שלו. לחיצה על פריט שהונח מחזירה אותו.', 'Pick an item, then its group. Tap a placed item to take it back.')
        : tt('עכשיו בחרו את הקבוצה שלו.', 'Now choose its group.'));
      // Sentences need room: with a long item the bins stack full width (r4 EX-10).
      const long = ex.items.some((x) => String(x.text).length > 30);
      const binId = (k) => `cat-${ex.id}-${k}`;
      let checked = false;
      // After Check, the items of a capital-letter group are shown with their capital (r4 EX-10).
      const shown = (x) => (checked ? capitalFor(x.text, x.category) : x.text);
      render(root, html`${prompt}
        <p class="cat-help" data-cat-help>${helpText()}</p>
        <div class="chips${long ? ' cat-long-pool' : ''}" role="group" aria-label="${tt('פריטים למיון', 'Items to sort')}" lang="en" dir="ltr" data-pool></div>
        <div class="cat-grid${long ? ' cat-long' : ''}" lang="en" dir="ltr" data-bins></div>
        ${liveRegion}`);
      const draw = () => {
        render($('[data-pool]', root), items.filter((x) => !placed.has(x.i)).map((x) => html`<button type="button" class="chip" data-item="${x.i}" aria-pressed="${sel === x.i}">${x.text}</button>`));
        render($('[data-bins]', root), ex.categories.map((c, k) => html`<div class="cat-bin${sel != null ? ' is-target' : ''}" data-bin="${c}" role="group" aria-labelledby="${binId(k)}"><button type="button" class="label" id="${binId(k)}">${c}</button>${items.filter((x) => placed.get(x.i) === c).map((x) => html`<button type="button" class="chip" data-placed="${x.i}" lang="en" aria-label="${tt(`${shown(x)} – ב-${c}. לחיצה מחזירה`, `${shown(x)} – in ${c}. Tap to take it back`)}">${shown(x)}</button>`)}</div>`));
        const help = $('[data-cat-help]', root);
        if (help && help.textContent !== helpText()) help.textContent = helpText();
      };
      draw();
      offs.push(on(root, 'click', '[data-item]', (e, b) => { if (root.dataset.locked) return; sel = Number(b.dataset.item); draw(); focusOn($('[data-bin] > .label', root), e); }));
      // A bin's name is a button (keyboard, screen readers); a tap anywhere in the bin works too. Bins hold the
      // placed chips, so the bin itself is not a button (no nested controls).
      offs.push(on(root, 'click', '[data-bin]', (e, b) => {
        if (root.dataset.locked || sel == null || e.target.closest('[data-placed]')) return;
        const at = items.findIndex((x) => x.i === sel);
        const moved = items[at];
        placed.set(sel, b.dataset.bin); sel = null; draw();
        announce(html`<span lang="en" dir="ltr">${moved.text}</span> → <span lang="en" dir="ltr">${b.dataset.bin}</span>`);
        const complete = placed.size === items.length;
        onChange(complete);
        const next = [...items.slice(at + 1), ...items.slice(0, at)].find((x) => !placed.has(x.i));
        focusOn(complete ? checkKey() : next && $(`[data-item="${next.i}"]`, root), e);
      }));
      offs.push(on(root, 'click', '[data-placed]', (e, b) => {
        if (root.dataset.locked) return;
        const i = Number(b.dataset.placed);
        placed.delete(i); draw(); onChange(false);
        announce(html`<span lang="en" dir="ltr">${items.find((x) => x.i === i)?.text}</span>: ${tt('הוחזר לרשימה', 'back in the list')}`);
        focusOn($(`[data-item="${i}"]`, root), e);
      }));
      ctl.ready = () => placed.size === items.length;
      // Each placed item is marked in place (icon, colour and words); the verdict lists only the misplaced ones.
      // Every right placement has the same green check (r4 EX-10). A wrong sentence sorted rightly into the
      // "wrong" bin also gets a neutral "שגוי" tag (it is ungrammatical, and it is in the right place), with its
      // fix beside it when the item has one; nothing is struck through.
      const wrongBin = (c) => ex.categories.length === 2 && ex.categories.some((x) => /^correct$/i.test(x)) && !/^correct$/i.test(c);
      const markPlaced = () => {
        let right = 0;
        $$('[data-placed]', root).forEach((b) => {
          const it = items.find((x) => x.i === Number(b.dataset.placed));
          const ok = placed.get(it.i) === it.category;
          if (ok) right++;
          b.classList.add(ok ? 'is-right' : 'is-wrong');
          b.insertAdjacentHTML('afterbegin', String(html`${icon(ok ? 'check' : 'x', { size: 14 })}<span class="sr-only" ${uiAttrs()}>${ok ? tt('במקום הנכון:', 'Right:') : tt('לא במקום:', 'Wrong place:')} </span>`));
          if (ok && wrongBin(it.category)) {
            b.classList.add('is-flawed');
            b.insertAdjacentHTML('beforeend', String(html` <span class="tag cat-tag" ${uiAttrs()}>${tt('שגוי', 'Wrong')}</span>${it.fix ? html`<span class="cat-fix"><span class="sr-only" ${uiAttrs()}>${tt('תיקון:', 'Fix:')} </span><span aria-hidden="true">→ </span>${it.fix}</span>` : ''}`));
          }
        });
        return right;
      };
      ctl.check = async () => {
        root.dataset.locked = '1';
        checked = true;
        draw();
        const right = markPlaced();
        const correct = right === items.length;
        return result({ correct, score: right / items.length, response: `${right}/${items.length}`, summary: tt(`${right} מתוך ${items.length} במקום הנכון`, `${right} of ${items.length} in the right place`), fixes: categoryFixes(ex, placed) });
      };
      // "I don't know": every item sorted into its own bin and marked.
      ctl.reveal = () => {
        root.dataset.locked = '1';
        sel = null;
        checked = true;
        items.forEach((x) => placed.set(x.i, x.category));
        draw();
        markPlaced();
      };
      break;
    }

    case 'transform':
    case 'correct': {
      const source = ex.type === 'transform' ? ex.source : ex.sentence;
      // A Hebrew sentence to translate reads right to left, in Hebrew (P1 EX-6); an English one left to right.
      const srcLang = langOf(source);
      render(root, html`${prompt}
        <p class="ex-text ex-source" lang="${srcLang}" dir="${srcLang === 'he' ? 'rtl' : 'ltr'}">${ex.type === 'correct' ? html`<span style="text-decoration:underline wavy var(--bad);text-underline-offset:.3em">${source}</span>` : source}</p>
        <label class="sr-only" for="tx-${ex.id}">${tt('התשובה שלך', 'Your answer')}</label>
        <textarea class="input ex-field" id="tx-${ex.id}" rows="2" lang="en" dir="ltr" autocomplete="off" autocapitalize="sentences" spellcheck="false" style="min-height:4.5rem;font-size:var(--t-lg)" placeholder="${tt('כתבו כאן את המשפט המלא', 'Type the full sentence here')}">${ex.type === 'correct' ? source : ''}</textarea>
        ${ex.type === 'correct' ? html`<p class="same-note small" id="same-${ex.id}" ${uiAttrs()} hidden>${tt('המשפט זהה למקור – שנו את המילים עם הטעות.', 'The sentence is the same as the original. Change the words with the mistake.')}</p>` : ''}
        <div data-reveal></div>`);
      const ta = $('textarea', root);
      setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 50);
      // Check is off while a "find and fix" answer is still the source sentence; once the learner has typed, a line
      // under the field says why (r4 EX-12).
      const sameNote = () => {
        const note = $('.same-note', root);
        if (!note) return;
        const same = Boolean(ta.value.trim()) && normalize(ta.value) === normalize(source);
        note.hidden = !same;
        if (same) ta.setAttribute('aria-describedby', note.id); else ta.removeAttribute('aria-describedby');
      };
      offs.push(on(root, 'input', 'textarea', () => { sameNote(); onChange(Boolean(ta.value.trim()) && normalize(ta.value) !== normalize(ex.type === 'correct' ? source : '')); }));
      offs.push(on(root, 'keydown', 'textarea', (e) => { if (e.key === 'Enter' && !e.shiftKey) e.preventDefault(); }));
      ctl.ready = () => Boolean(ta.value.trim()) && (ex.type !== 'correct' || normalize(ta.value) !== normalize(source));
      ctl.check = async () => {
        ta.readOnly = true;
        const r = checkTyped(ta.value, ex.answers, ex.wrong_feedback);
        const f = !r.correct && findWrongFeedback(ta.value, ex.wrong_feedback);
        setInvalid(ta, !r.correct); ta.classList.toggle('almost', Boolean(r.correct && r.almost));
        const open = isOpenRewrite(ex, level);
        // From B1 an answer the key does not list may be counted by the learner, but only when it could be right
        // (P1 EX-5); otherwise the verdict is red and names the rule it breaks.
        const could = !r.correct && !f && open ? couldBeRight(ta.value, { source, answers: ex.answers, wrong_feedback: ex.wrong_feedback }) : null;
        const specific = f?.feedback || (could && !could.ok ? ruleNote(could, source, ex) : null);
        return result({ correct: r.correct, almost: r.almost, score: r.correct ? 1 : 0, response: ta.value, typed: ta.value, answer: ex.answers[0], specific, ...(f?.rule ? { retry_note: f.rule } : {}), error_type: f?.error_type, model: Boolean(could?.ok), open, typos: r.typo ? [r.typo] : [] });
      };
      ctl.reveal = () => { ta.readOnly = true; const n = $('.same-note', root); if (n) n.hidden = true; revealAnswer(ex.answers[0]); };
      ctl.retryable = true;
      ctl.reopen = () => { reopenField(ta); sameNote(); };
      break;
    }

    case 'dictation': {
      render(root, html`${prompt}${listenButtons(ex.audio_text)}<div data-silent-slot></div>
        <label class="sr-only" for="dc-${ex.id}">${tt('מה שמעתם', 'What you heard')}</label>
        <textarea class="input ex-field" id="dc-${ex.id}" rows="2" lang="en" dir="ltr" autocomplete="off" spellcheck="false" style="min-height:4.5rem;font-size:var(--t-lg)" placeholder="${tt('כתבו מה ששמעתם', 'Type what you hear')}"></textarea>
        <div data-reveal></div>`);
      sayHandler(ex.audio_text);
      setTimeout(() => root.querySelector('[data-say="normal"]')?.focus(), 60);
      const ta = $('textarea', root);
      // A dictation with no sound (r4 EX-4 for dictation, contract (b)): after a silent play a note in place says
      // so and offers to skip the item with no score. No transcript: it would be the answer. Answering while no
      // play has started marks the result unheard too, so neither a lesson nor the listening hub scores it. The
      // root is marked data-silent-inline, so the shell's "can't hear?" toast stays away (contract c).
      let silentSeen = false; let started = false; let skipped = false;
      if (canSpeak()) {
        root.setAttribute('data-silent-inline', '');
        const onSpeech = (e) => {
          const { state, text } = e.detail || {};
          if (text !== ex.audio_text || root.dataset.locked || ta.readOnly) return;
          const slot = $('[data-silent-slot]', root);
          if (state === 'start') { started = true; silentSeen = false; if (slot) render(slot, ''); }
          else if ((state === 'silent' || state === 'error') && !started && slot) {
            silentSeen = true;
            render(slot, html`<div class="silent-note" role="status">${icon('info', { size: 18 })}<div class="stack-sm"><p><b>${tt('לא נשמע קול באנגלית במכשיר הזה.', 'No English voice played on this device.')}</b> ${tt('בדקו את עוצמת הקול ונסו שוב. אפשר גם לדלג על התרגיל, והוא לא ייספר.', 'Check the volume and try again. You can also skip this item, and it will not be counted.')}</p><div><button type="button" class="key small" data-skip-unheard>${tt('לדלג בלי ציון', 'Skip without a score')}</button></div></div></div>`);
          }
        };
        document.addEventListener(SPEECH_EVENT, onSpeech);
        offs.push(() => { document.removeEventListener(SPEECH_EVENT, onSpeech); root.removeAttribute('data-silent-inline'); });
        offs.push(on(root, 'click', '[data-skip-unheard]', () => { skipped = true; onChange(true); checkKey()?.click(); }));
      }
      ctl.silent = () => canSpeak() && silentSeen && !started;
      offs.push(on(root, 'input', 'textarea', () => onChange(Boolean(ta.value.trim()))));
      ctl.ready = () => Boolean(ta.value.trim()) || skipped;
      ctl.check = async () => {
        ta.readOnly = true;
        $('.word-diff', root)?.remove();
        const typed = ta.value;
        if (skipped || ctl.silent()) {
          render($('[data-silent-slot]', root), '');
          revealAnswer(ex.answers[0]);
          return result({ correct: false, score: null, response: skipped && !typed.trim() ? '(unheard)' : typed, answer: ex.answers[0], error_type: null, unheard: true });
        }
        const exact = checkTyped(typed, ex.answers);
        // A letter code is compared letter by letter, so "BVGE" for "B, V, J, E" marks only the J (P1 EX-7).
        const code = exact.correct ? null : letterCode(typed, ex.answers[0]);
        let correct, almost, score, words = [], specific = null, typos = [], retry_note = null;
        if (code) {
          correct = code.accuracy === 1; almost = false; score = code.accuracy; words = code.words;
          if (code.misses.length) specific = { he: code.misses.map((m) => (m.typed ? `כתבתם ${m.typed}, נאמר ${m.expected}` : `חסרה האות ${m.expected}`)).join('; '), en: code.misses.map((m) => (m.typed ? `You wrote ${m.typed}; it was ${m.expected}` : `${m.expected} is missing`)).join('; ') };
          // The note above names the letters that were said, so the second try (LF-6) gets one that does not.
          // r4 EX-8: it says where the first wrong letter is, never which letter it should be.
          const n = code.misses.length;
          const at = code.words.findIndex((w) => !w.ok);
          if (n) retry_note = slipWhere({ letter: at, more: n - 1 });
        } else {
          const acc = wordAccuracy(typed, ex.answers[0]);
          // One slip of one letter in one word is "almost", even in a short word ("tenn" for "ten").
          const slip = exact.correct ? exact.typo : oneSlip(typed, ex.answers);
          if (slip) typos = [slip];
          words = acc.words;
          // The word with the slip is marked letter by letter, and the note spells it as the sentence has it.
          typos = typos.map((t) => { const w = words.find((x) => bareWord(x.word) === t.expected && (!x.ok || !x.typed || x.typed === t.typed)); if (!w) return t; Object.assign(w, { ok: true, typed: t.typed }); return { typed: t.typed, expected: w.word.replace(/[^A-Za-z0-9']+$/, '') }; });
          // A word the alignment already found with a slip ("thursday" for "Thursdays") is named in the note too.
          if (!typos.length) typos = words.filter((w) => w.ok && w.typed && bareWord(w.typed) !== bareWord(w.word)).map((w) => ({ typed: w.typed, expected: w.word.replace(/[^A-Za-z0-9']+$/, '') }));
          correct = exact.correct || Boolean(slip) || acc.accuracy >= 0.85;
          almost = correct && !(exact.correct && !exact.almost);
          score = exact.correct ? 1 : acc.accuracy;
          // The second try's note says where the first wrong word (and letter) is, without the word (r4 EX-8).
          if (!correct) {
            const k = words.findIndex((w) => !w.ok);
            const tw = String(typed).trim().split(/\s+/);
            const kw = String(ex.answers[0]).trim().split(/\s+/);
            if (k >= 0) {
              const a = bareWord(tw[k] || ''), b = bareWord(kw[k] || '');
              let i = 0;
              while (i < a.length && i < b.length && a[i] === b[i]) i++;
              retry_note = tw.length === kw.length && a && i < b.length ? slipWhere({ letter: i, word: k }) : slipWhere({ word: k });
            }
          }
        }
        if (!(exact.correct && !exact.almost)) root.insertAdjacentHTML('beforeend', String(dictationDiff(words)));
        setInvalid(ta, !correct); ta.classList.toggle('almost', Boolean(correct && almost));
        return result({ correct, almost, score, response: typed, answer: ex.answers[0], error_type: 'spelling', specific, typos, retry_note });
      };
      ctl.reveal = () => { ta.readOnly = true; $('.word-diff', root)?.remove(); const slot = $('[data-silent-slot]', root); if (slot) render(slot, ''); revealAnswer(ex.answers[0]); };
      ctl.retryable = true;
      // The marked sentence shows the key's words, so it goes away while the learner tries again.
      ctl.reopen = () => { $('.word-diff', root)?.remove(); reopenField(ta); };
      break;
    }

    case 'speak': {
      // Practice, not a test: nothing here is scored, whether or not the browser can recognise speech.
      ctl.graded = false;
      ctl.speak = true;
      let heard = null; let selfRated = null; let listening = false; let err = '';
      const recLabel = () => (listening ? tt('מקשיב… לחצו לעצירה', 'Listening… tap to stop') : heard != null ? tt('לנסות שוב', 'Try again') : tt('לומר בקול', 'Say it'));
      // Hear it and Say it come straight after the sentence, before the pronunciation note (R2-19).
      const draw = () => render(root, html`${prompt}
        <p class="ex-text" lang="en" dir="ltr">${ex.target}</p>
        <div class="big-listen speak-controls">
          ${canSpeak() ? html`<button type="button" class="key" data-say="normal">${icon('volume', { size: 22 })} ${tt('לשמוע', 'Hear it')}</button>` : ''}
          ${canListen() ? html`<button type="button" class="key ${listening ? 'enter' : ''}" data-rec aria-pressed="${listening}">${icon(listening ? 'stop' : heard != null ? 'refresh' : 'speaking', { size: 22 })} ${recLabel()}</button>` : ''}
        </div>
        <div aria-live="polite">${heard != null ? recognised(heard, ex.target) : ''}${err ? (err.note
          ? html`<p class="speak-note small" role="status">${icon('info', { size: 16 })}<span>${err.text}</span></p>`
          : html`<p class="error-text" role="alert">${err.text}</p>`) : ''}</div>
        ${ex.focus ? speakFocus(ex.focus) : ''}
        ${!canListen() ? html`<p class="banner warn small">${icon('info', { size: 18 })}<span>${tt('זיהוי דיבור לא זמין בדפדפן הזה (עובד ב-Chrome, Edge ו-Safari). הקשיבו, אמרו בקול, וסמנו בעצמכם.', 'Speech recognition is not available in this browser (it works in Chrome, Edge and Safari). Listen, say it aloud, then mark it yourself.')}</span></p>` : ''}
        <div class="stack-sm self-rate" role="group" aria-labelledby="sr-${ex.id}">
          <p class="small muted" id="sr-${ex.id}">${canListen() ? tt('אפשר גם לומר בקול ולסמן בעצמכם:', 'You can also say it aloud and mark it yourself:') : tt('איך זה הלך?', 'How did it go?')}</p>
          ${heard == null && selfRated == null ? html`<p class="small self-need" data-self-need>${tt('סמנו איך הלך כדי להמשיך.', 'Mark how it went to continue.')}</p>` : ''}
          <div class="row"><button type="button" class="key small" data-self="1" aria-pressed="${selfRated === 1}">${tt('אמרתי את זה בבירור', 'I said it clearly')}</button><button type="button" class="key small" data-self="0" aria-pressed="${selfRated === 0}">${tt('צריך עוד תרגול', 'I need more practice')}</button></div>
          <p class="small self-said" role="status" data-self-said>${selfSaid(selfRated)}</p>
        </div>
        <p class="xsmall faint">${tt('תרגול דיבור לא מקבל ציון.', 'Speaking practice is not scored.')}</p>`);
      const refocus = () => root.querySelector('[data-rec]')?.focus();
      draw();
      sayHandler(ex.target);
      // A self-rating is acknowledged in place (r4 EX-9): the keys and the status line change without a redraw,
      // so the status line (role=status) is announced. The lesson goes straight on after Continue.
      offs.push(on(root, 'click', '[data-self]', (e, b) => {
        selfRated = Number(b.dataset.self);
        $$('[data-self]', root).forEach((x) => x.setAttribute('aria-pressed', String(Number(x.dataset.self) === selfRated)));
        $('[data-self-need]', root)?.remove();
        const said = $('[data-self-said]', root);
        if (said) { said.textContent = selfSaid(selfRated); said.scrollIntoView?.({ block: 'nearest' }); }
        onChange(true);
      }));
      // After a recording result or a microphone message, the rating keys come into view (r4 EX-9: at 150% they
      // were below the fold, with Continue waiting for them).
      const showRating = () => root.querySelector('.self-rate')?.scrollIntoView?.({ block: 'nearest' });
      offs.push(on(root, 'click', '[data-rec]', async () => {
        if (listening) { listen.stop?.(); return; }
        stopSpeaking();
        err = '';
        // Keeping the microphone off is a choice, not an error: a neutral note (r4 EX-9).
        if (!(await micNotice())) { err = { note: true, text: `${speechErrorText({ code: 'declined' })} ${tt('אפשר לומר בקול ולסמן בעצמכם.', 'You can say it aloud and mark it yourself.')}` }; draw(); showRating(); return; }
        listening = true; draw(); refocus();
        try {
          const r = await listen({ variant });
          // The alternative closest to the target, so the learner is not shown the recogniser's worst guess.
          heard = r.alternatives.map((a) => ({ a, acc: wordAccuracy(a, ex.target).accuracy })).sort((x, y) => y.acc - x.acc)[0]?.a ?? r.transcript;
        } catch (e) {
          err = e?.code === 'declined' ? { note: true, text: speechErrorText(e) } : { note: false, text: speechErrorText(e) };
        }
        listening = false;
        if (!root.isConnected) return;
        draw(); refocus(); onChange(ctl.ready()); showRating();
      }));
      ctl.ready = () => heard != null || selfRated != null;
      ctl.check = async () => ({ graded: false, speak: true, correct: selfRated === 1, score: null, error_type: null, self: selfRated, heard, response: heard != null ? heard : selfRated === 1 ? 'self: clear' : 'self: practise' });
      ctl.destroy = () => { listen.stop?.(); stopSpeaking(); };
      break;
    }

    case 'read': {
      const answers = new Map();
      // Paragraphs are numbered (P1 EX-6); in a dialogue each speaker's turn is a paragraph of its own.
      const dialogue = isDialogue(ex.passage);
      const paras = ex.passage.split(/\n\s*\n|\n/).flatMap((p) => (dialogue ? splitTurns(p) : [p])).filter((p) => p.trim());
      render(root, html`${prompt}
        <article class="passage" lang="en" dir="ltr" ${paras.length > 1 ? html`data-numbered` : ''}>${ex.title ? html`<h3 style="margin-bottom:var(--s3)">${ex.title}</h3>` : ''}${paras.map((p) => html`<p ${dialogue || bodyPara(p) ? html`data-para` : ''}>${turns(p, dialogue, true)}</p>`)}</article>
        ${canSpeak() ? html`<div class="row" style="margin-top:var(--s3)"><button type="button" class="key small" data-say="normal">${icon('volume', { size: 18 })} ${tt('הקראת הטקסט', 'Read it to me')}</button></div>` : ''}
        <div class="stack" style="margin-top:var(--s5)" data-questions><div data-jump-slot></div>${ex.questions.map((q, qi) => html`<fieldset class="panel flat stack-sm" style="margin:0" data-q="${qi}"><legend class="sr-only">${tt('שאלה', 'Question')} ${qi + 1}</legend>
          ${q.type === 'tf' ? html`<p lang="en" dir="ltr"><span class="faint num">${qi + 1}.</span> ${q.statement}</p><div class="row tf-row" dir="ltr" lang="en"><button type="button" class="key small" data-tf="${qi}" data-v="true" aria-pressed="false">True</button><button type="button" class="key small" data-tf="${qi}" data-v="false" aria-pressed="false">False</button></div>`
          : q.type === 'mcq' ? html`<p lang="en" dir="ltr"><span class="faint num">${qi + 1}.</span> ${q.question}</p><div class="options">${q.options.map((o, oi) => html`<button type="button" class="option" data-mq="${qi}" data-o="${oi}" aria-pressed="false" lang="en" dir="ltr">${o}</button>`)}</div>`
          : html`<p lang="en" dir="ltr"><span class="faint num">${qi + 1}.</span> ${q.text.split('___').map((p, i, a) => html`${p}${i < a.length - 1 ? html`<input class="gap-input" data-rg="${qi}" data-b="${i}" aria-label="${tt('מילה חסרה', 'Missing word')}" autocomplete="off" spellcheck="false">` : ''}`)}</p>`}
          <div class="q-fb" aria-live="polite"></div></fieldset>`)}</div>`);
      sayHandler(ex.passage);
      const done = () => ex.questions.every((q, qi) => (q.type === 'gap' ? $$(`[data-rg="${qi}"]`, root).every((i) => i.value.trim()) : answers.has(qi)));
      // The answer that completes the set sends the focus to Check.
      const answered = (qi, value, e) => { const was = done(); answers.set(qi, value); const now = done(); onChange(now); if (now && !was) focusOn(checkKey(), e); };
      offs.push(on(root, 'click', '[data-tf]', (e, b) => { if (root.dataset.locked) return; const qi = Number(b.dataset.tf); $$(`[data-tf="${qi}"]`, root).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); answered(qi, b.dataset.v === 'true', e); }));
      offs.push(on(root, 'click', '[data-mq]', (e, b) => { if (root.dataset.locked) return; const qi = Number(b.dataset.mq); $$(`[data-mq="${qi}"]`, root).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); answered(qi, Number(b.dataset.o), e); }));
      offs.push(on(root, 'input', '[data-rg]', () => onChange(done())));
      ctl.ready = done;
      const keyText = (q) => (q.type === 'tf' ? (q.answer ? 'True' : 'False') : q.type === 'mcq' ? q.options[q.answer] : q.answers.map(firstAnswer).join(' … '));
      // A key or option is marked in place: the right one with a check, a wrong choice with a cross (and words for
      // screen readers), so the learner sees both what they chose and the answer.
      const markKey = (b, ok) => {
        b.classList.add(ok ? 'is-right' : 'is-wrong');
        if (b.classList.contains('key')) b.insertAdjacentHTML('afterbegin', String(tick(ok)));
        b.insertAdjacentHTML('beforeend', String(html`<span class="sr-only" ${uiAttrs()}> (${ok ? tt('התשובה הנכונה', 'right answer') : tt('הבחירה שלכם', 'your choice')})</span>`));
      };
      // chosen: the learner's answer to mark, or undefined to show only the key ("I don't know").
      const markQuestion = (q, qi, chosen) => {
        if (q.type === 'tf') $$(`[data-tf="${qi}"]`, root).forEach((b) => { b.disabled = true; const v = b.dataset.v === 'true'; if (v === q.answer) markKey(b, true); else if (v === chosen) markKey(b, false); });
        if (q.type === 'mcq') $$(`[data-mq="${qi}"]`, root).forEach((b) => { b.disabled = true; const o = Number(b.dataset.o); if (o === q.answer) markKey(b, true); else if (o === chosen) markKey(b, false); });
      };
      ctl.check = async () => {
        root.dataset.locked = '1';
        let right = 0;
        const wrong = [];
        ex.questions.forEach((q, qi) => {
          let ok;
          if (q.type === 'gap') { const ins = $$(`[data-rg="${qi}"]`, root); ok = ins.every((inp, i) => checkTyped(inp.value, q.answers[i], q.wrong_feedback).correct); ins.forEach((i) => { i.readOnly = true; i.classList.add(ok ? 'right' : 'wrong'); }); }
          else ok = answers.get(qi) === q.answer;
          if (ok) right++; else wrong.push(qi);
          markQuestion(q, qi, answers.get(qi));
          render($(`[data-q="${qi}"] .q-fb`, root), html`<p class="small" style="color:${ok ? 'var(--ok)' : 'var(--bad)'}">${ok ? tt('נכון', 'Correct') : html`${tt('התשובה:', 'Answer:')} ${answerEl(keyText(q))}`}</p>${q.explanation ? html`<p class="small muted">${bi(q.explanation)}</p>` : ''}`);
        });
        const score = right / ex.questions.length;
        // The first wrong answer comes into view, and a link at the top of the questions jumps to it (r4 EX-11:
        // Check used to leave the page at its bottom, two screens below the wrong Q1).
        if (wrong.length) {
          const target = () => $(`[data-q="${wrong[0]}"]`, root);
          const slot = $('[data-jump-slot]', root);
          if (slot) render(slot, html`<p class="read-jump small" ${uiAttrs()}><button type="button" class="read-jump-key" data-jump-q="${wrong[0]}">${tt(`לשאלה ${wrong[0] + 1}`, `To question ${wrong[0] + 1}`)}</button>${wrong.length > 1 ? html` <span class="faint">${tt(`(${wrong.length} תשובות לבדוק)`, `(${wrong.length} answers to look at)`)}</span>` : ''}</p>`);
          offs.push(on(root, 'click', '[data-jump-q]', () => { const t = target(); if (!t) return; t.scrollIntoView({ block: 'center' }); t.tabIndex = -1; t.focus({ preventScroll: true }); }));
          // After the player has drawn its verdict (it moves the focus to Continue).
          setTimeout(() => { if (root.isConnected) target()?.scrollIntoView({ block: 'center' }); }, 120);
        }
        return result({ correct: score >= 0.99, almost: score >= 0.5 && score < 0.99, score, response: `${right}/${ex.questions.length}`, error_type: 'comprehension', summary: tt(`${right} מתוך ${ex.questions.length} נכונות`, `${right} of ${ex.questions.length} right`) });
      };
      // "I don't know": every answer marked in place, with its explanation; the text and "Read it to me" stay.
      ctl.reveal = () => {
        root.dataset.locked = '1';
        ex.questions.forEach((q, qi) => {
          if (q.type === 'gap') $$(`[data-rg="${qi}"]`, root).forEach((inp, i) => { inp.value = firstAnswer(q.answers[i]); inp.readOnly = true; inp.classList.add('is-right'); });
          markQuestion(q, qi, undefined);
          render($(`[data-q="${qi}"] .q-fb`, root), html`<p class="small">${tt('התשובה:', 'Answer:')} ${answerEl(keyText(q))}</p>${q.explanation ? html`<p class="small muted">${bi(q.explanation)}</p>` : ''}`);
        });
      };
      break;
    }

    case 'write': {
      ctl.graded = false;
      const topic = ex.topic || null; // passed to the analyzer, which may use it (RW-1)
      // Nothing is sent, so the key says what happens: "Save and check" (P2 EX-11). It stays off, saying how many
      // words are still needed, until the text has max(10, 25% of the minimum) words (never more than the minimum).
      const need = ex.min_words ? Math.min(ex.min_words, Math.max(10, Math.ceil(ex.min_words * 0.25))) : 3;
      render(root, html`${prompt}
        <div class="panel sunk small">${bi(ex.task)}${ex.must_include?.length ? html`<p class="xsmall" style="margin-top:var(--s2)">${tt('צריך לכלול:', 'Must include:')} ${ex.must_include.map((w) => html`<span class="tag" lang="en" dir="ltr">${w}</span> `)}</p>` : ''}</div>
        <label class="sr-only" for="wr-${ex.id}">${tt('הטקסט שלך', 'Your text')}</label>
        <textarea class="input ex-write" id="wr-${ex.id}" lang="en" dir="ltr" spellcheck="false" style="margin-top:var(--s4)" placeholder="${tt('כתבו באנגלית…', 'Write in English…')}"></textarea>
        <p class="small faint num" data-wc>${wordCountLine(0, ex)}</p>`);
      const ta = $('textarea', root);
      const label = () => {
        const b = root.closest('.player')?.querySelector('[data-check]');
        if (!b) return;
        let l = $('[data-check-label]', b);
        if (!l) {
          [...b.childNodes].filter((nd) => nd.nodeType === 3).forEach((nd) => nd.remove());
          b.insertAdjacentHTML('afterbegin', '<span class="key-label" data-check-label></span>');
          l = $('[data-check-label]', b);
        }
        const left = need - countWords(ta.value);
        // r4 EX-7: one range on the screen (the counter's). The key says from when a draft can be saved.
        render(l, html`<span>${tt('שמירה ובדיקה', 'Save and check')}</span>${left > 0 ? html`<small class="check-need">${tt(`אפשר לשמור טיוטה מ-${need} מילים (עוד ${left})`, `A draft can be saved from ${need} words (${left} more)`)}</small>` : ''}`);
      };
      // The player draws its footer after the exercise, so the key is named once it is there.
      queueMicrotask(label);
      offs.push(on(root, 'input', 'textarea', () => { const n = countWords(ta.value); $('[data-wc]', root).textContent = wordCountLine(n, ex); onChange(n >= need); label(); }));
      ctl.ready = () => countWords(ta.value) >= need;
      ctl.check = async () => {
        ta.readOnly = true;
        const text = ta.value;
        // A story, blog post or message is not formal writing, whatever the level (r4 EX-7): "didn't" is fine there.
        const informal = INFORMAL_TASK.test(`${ex.genre || ''} ${ex.prompt?.en || ''} ${ex.prompt?.he || ''}`);
        const a = analyzeWriting(text, { level, minWords: ex.min_words, maxWords: ex.max_words, mustInclude: ex.must_include || [], ...(informal ? { formal: false } : {}), topic });
        // Saved below the minimum: a draft, and the result says so (contract e: the lesson shows it amber).
        const words = a.stats?.words ?? countWords(text);
        const short = Boolean(ex.min_words) && words < ex.min_words;
        const issues = a.issues.slice(0, 5);
        root.insertAdjacentHTML('beforeend', '<div data-writeout></div>');
        render($('[data-writeout]', root), html`<div class="stack" style="margin-top:var(--s5)">
          <div class="panel flat stack-sm"><h3 class="small">${tt('בדיקות אוטומטיות', 'Automatic checks')}</h3>
            ${a.checks.map((c) => html`<div class="row small">${icon(c.ok ? 'check' : 'alert', { size: 16 })}<span>${tt(c.he, c.en)}</span></div>`)}
            ${issues.map((i) => html`<div class="small"><span class="tag warn">${tt(i.he_title, i.title)}</span> <span lang="en" dir="ltr">“${i.match}”</span> ${hebrewSupport() !== 'off' ? html`<span class="muted">${tt(i.he, i.en)}</span>` : html`<span class="muted">${i.en}</span>`}</div>`)}
            <p class="xsmall faint">${tt('אלה בדיקות אוטומטיות פשוטות, לא ציון. משוב מלא יש במעבדת הכתיבה.', 'These are simple automatic checks, not a grade. Full feedback is in the Writing lab.')}</p></div>
          <div class="panel flat stack-sm"><h3 class="small">${tt('בדקו את עצמכם', 'Check yourself')}</h3><div class="self-check" dir="ltr">${ex.checklist.map((c) => html`<label class="self-check-item"><input type="checkbox"><span class="self-check-text">${bi(c)}</span></label>`)}</div></div>
          <details class="panel flat"><summary>${tt('דוגמה לתשובה', 'A model answer')}</summary><p lang="en" dir="ltr" style="margin-top:var(--s3)">${ex.model_answer}</p></details></div>`);
        return { graded: false, correct: a.passedRequired, score: null, response: text, writing: true, ...(short ? { short: true, missing: ex.min_words - words } : {}) };
      };
      break;
    }

    default:
      render(root, html`<p class="banner warn">${tt('סוג תרגיל לא מוכר', 'Unknown exercise type')}: ${ex.type}</p>`);
      ctl.ready = () => true;
      ctl.check = async () => ({ graded: false, correct: true, score: null });
  }

  const destroy = ctl.destroy;
  ctl.destroy = () => { offs.forEach((o) => o()); destroy(); };
  return ctl;
}

// A gap word accepted with a slip (r4 EX-8): "evrey → every", amber, the letters that differ marked.
export function gapDiffHtml(typed, expected) {
  return html`<span class="gap-diff" lang="en" dir="ltr"><span class="sr-only" ${uiAttrs()}>${tt('כתבתם', 'You wrote')} </span><span class="gd-typed">${typed}</span> <span aria-hidden="true">→</span><span class="sr-only" ${uiAttrs()}> ${tt('האיות:', 'spelling:')} </span> <span class="gd-fixed">${letterDiff(typed, expected).map((p) => (p.type === 'same' ? p.text : p.type === 'add' ? html`<mark>${p.text}</mark>` : ''))}</span></span>`;
}

// The line that acknowledges a speaking self-rating (r4 EX-9).
export const selfSaid = (v) => (v === 0
  ? tt('נרשם: צריך עוד תרגול. אפשר לחזור למשפט הזה במעבדת הדיבור.', 'Noted: more practice needed. You can come back to this sentence in the Speaking lab.')
  : v === 1 ? tt('סימנתם: אמרתי בבירור.', 'You marked it: said clearly.') : '');

// Where a dictation slip is, for the second try (r4 EX-8): "האות השלישית במילה הרביעית עוד לא נכונה", never the
// letter itself. letter/word are 0-based; more counts other wrong letters in a letter code.
const ORD_HE = ['הראשונה', 'השנייה', 'השלישית', 'הרביעית', 'החמישית', 'השישית', 'השביעית', 'השמינית', 'התשיעית', 'העשירית'];
const ORD_EN = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
const ordHe = (i, noun) => (ORD_HE[i] ? `${noun} ${ORD_HE[i]}` : `${noun} מספר ${i + 1}`);
const ordEn = (i, noun) => (ORD_EN[i] ? `the ${ORD_EN[i]} ${noun}` : `${noun} ${i + 1}`);
export function slipWhere({ letter = null, word = null, more = 0 }) {
  const again = { he: 'אפשר להקשיב שוב ולתקן.', en: 'You can listen again and fix it.' };
  let he, en;
  const letterEn = (i) => (ORD_EN[i] ? `The ${ORD_EN[i]} letter` : `Letter ${i + 1}`);
  if (letter != null && word != null) { he = `${ordHe(letter, 'האות')} ב${ordHe(word, 'מילה')} עוד לא נכונה.`; en = `${letterEn(letter)} of ${ordEn(word, 'word')} is not right yet.`; }
  else if (letter != null) { he = `${ordHe(letter, 'האות')} עוד לא נכונה${more ? more === 1 ? ', וגם עוד אות אחת' : `, וגם עוד ${more} אותיות` : ''}.`; en = `${letterEn(letter)} is not right yet${more ? `, and ${more} more` : ''}.`; }
  else { he = `${ordHe(word, 'המילה')} עוד לא נכונה.`; en = `${ordEn(word, 'word').replace(/^t/, 'T')} is not right yet.`; }
  return { he: `${he} ${again.he}`, en: `${en} ${again.en}` };
}

// The lesson writing step's one word range (r4 EX-7): "{n} מילים · יעד {min}-{max}".
export function wordCountLine(n, ex) {
  const words = n === 1 ? tt('מילה אחת', '1 word') : tt(`${n} מילים`, `${n} words`);
  const target = ex.max_words ? `${ex.min_words}-${ex.max_words}` : tt(`${ex.min_words} ומעלה`, `${ex.min_words}+`);
  return `${words} · ${tt('יעד', 'target')} ${target}`;
}
// Tasks that are not formal writing: a story, a blog post, a message, a chat, a diary entry or a postcard.
export const INFORMAL_TASK = /story|blog|message|chat|diary|postcard|סיפור|בלוג|הודעה/i;

// A speaking item's pronunciation note. It is a contrastive note for Hebrew speakers, so its Hebrew shows at
// every support level except "off", as the Speaking lab's sound tips do (research C3; R1-A10). At 130-150% text
// it folds behind its info icon, so Hear it and Say it stay on the first screen (R2-19).
export const largeText = () => Number(globalThis.document?.documentElement?.dataset?.text) >= 130;
export function speakFocus(focus) {
  const body = bi(focus, { always: hebrewSupport() !== 'off' });
  return largeText()
    ? html`<details class="speak-focus-fold small muted"><summary>${icon('info', { size: 16 })} ${tt('טיפ להגייה', 'Pronunciation tip')}</summary><div class="speak-focus-body">${body}</div></details>`
    : html`<div class="row small muted speak-focus">${icon('info', { size: 16 })}<div class="grow">${body}</div></div>`;
}

function normalizeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// What speech recognition heard, next to the target in its own spelling. Words it did not return are shown
// grey with a dotted underline ("not caught"), never in the red of a wrong answer (R2-08): this is information
// for the learner, never a score. Spelled-out letters ("M-A-Y-A") rarely come back from a recogniser, so a
// target that spells letters says so.
export const spellsLetters = (target) => /\b[A-Za-z](?:[-.][A-Za-z]){2,}\b/.test(String(target || ''));
export function recognised(heard, target) {
  const words = wordAccuracy(heard, target).words;
  const missing = words.some((w) => !w.ok);
  return html`<div class="panel sunk stack-sm recognised">
    <p class="xsmall faint">${tt('מה שזוהה:', 'What was recognised:')}</p>
    <p lang="en" dir="ltr" class="heard en-block">“${heard || '…'}”</p>
    <div class="word-diff" lang="en" dir="ltr">${words.map((w) => html`<span class="${w.ok ? 'w-ok' : 'w-uncaught'}">${w.word}${w.ok ? '' : html`<span class="sr-only"> (${tt('לא נקלט', 'not caught')})</span>`}</span>`)}</div>
    ${missing ? html`<p class="xsmall faint row recognised-key"><span class="w-uncaught" lang="en" dir="ltr" aria-hidden="true">word</span> ${tt('= לא נקלט בזיהוי', '= not caught by recognition')}</p>` : ''}
    ${missing && spellsLetters(target) ? html`<p class="xsmall faint">${tt('זיהוי דיבור כמעט אף פעם לא מחזיר אותיות מאויתות, גם כשאומרים אותן נכון.', 'Recognition often can\'t show spelled letters, even when you say them right.')}</p>` : ''}
    <p class="xsmall faint">${tt('זה לא ציון ולא בדיקת מבטא: זיהוי הדיבור טועה לפעמים. אפשר לנסות שוב או להמשיך.', 'This is not a score or an accent check: recognition is sometimes wrong. Try again or continue.')}</p>
  </div>`;
}

// An item of a capital-letter group ("Capital (A)") as it is written: with its capital (r4 EX-10: "israel" was
// shown in small letters under "Capital").
export const capitalFor = (text, category) => (/capital/i.test(String(category)) ? String(text).replace(/^\s*([a-z])/, (m, c) => m.replace(c, c.toUpperCase())) : String(text));
// Misplaced items of a categorize exercise, grouped by the category they belong in.
export function categoryFixes(ex, placed) {
  return ex.categories
    .map((category) => ({ category, items: ex.items.filter((x, i) => x.category === category && placed.get(i) !== category).map((x) => capitalFor(x.text, category)) }))
    .filter((g) => g.items.length);
}

// The answer for "I don't know": the key, or for sorting every item under its category.
export function answerFor(ex) {
  if (ex.type === 'mcq' || ex.type === 'listen') return { answer: ex.options[ex.answer] };
  if (ex.type === 'gap') return { answer: ex.answers.map(firstAnswer).join(' … ') };
  if (ex.type === 'order') return { answer: ex.tokens.join(' ') };
  if (['transform', 'correct', 'dictation'].includes(ex.type)) return { answer: ex.answers[0] };
  if (ex.type === 'match') return { answer: ex.pairs.map((p) => `${p[0]} = ${p[1]}`).join(' · ') };
  if (ex.type === 'categorize') return { fixes: categoryFixes(ex, new Map()) };
  return {};
}

// A long English answer gets its own left-to-right line; a short one stays in the sentence.
const answerEl = (a) => html`<span class="answer ${String(a).length > 24 ? 'answer-block' : ''}" lang="en" dir="ltr">${a}</span>`;
// A matching board's answer: each pair with each side in its own language (r4 EX-12: one lang=en span held the
// Hebrew too).
const matchAnswerEl = (ex) => html`<span class="answer answer-block match-answer">${ex.pairs.map(([a, b], k) => html`${k ? html`<span aria-hidden="true"> · </span>` : ''}<span class="pair"><span lang="${langOf(a)}" dir="${langOf(a) === 'he' ? 'rtl' : 'ltr'}">${a}</span> – <span lang="${langOf(b)}" dir="${langOf(b) === 'he' ? 'rtl' : 'ltr'}">${b}</span></span>`)}</span>`;

// The rule an open rewrite breaks when it cannot be counted (P1 EX-5), as Bilingual feedback. It is the
// first-try note too, so it names the rule and never the key's words (r4 EX-5): "did live" is another wrong
// sentence when the key has no did, and "have lived" is the answer. The helper verb is named, not written: the
// first-try note goes through retrySafe, which drops a note that holds a key word the learner left out (r4 LF-2).
const STRUCTURE_NOTES = {
  'present-perfect': { he: 'המשימה מבקשת present perfect: פועל עזר + V3.', en: 'The task asks for the present perfect: helper verb + past participle.' },
  'past-perfect': { he: 'המשימה מבקשת past perfect: פועל עזר בעבר + V3.', en: 'The task asks for the past perfect: past helper verb + past participle.' },
  'perfect-continuous': { he: 'המשימה מבקשת present perfect continuous: שני פעלי עזר + ‏-ing.', en: 'The task asks for the present perfect continuous: two helper verbs + -ing.' },
  passive: { he: 'המשימה מבקשת סביל: פועל עזר + V3.', en: 'The task asks for the passive: helper verb + past participle.' },
};
export function structureNote(ex, source = '') {
  const key = firstAnswer(ex.answers) || '';
  const kind = keyStructure(key);
  if (kind === 'present-perfect' && /\bsince\b/i.test(`${key} ${source}`)) return { he: '‏since + נקודת התחלה → present perfect (פועל עזר + V3).', en: 'since + starting point → present perfect (helper verb + past participle).' };
  if (STRUCTURE_NOTES[kind]) return STRUCTURE_NOTES[kind];
  return { he: 'בדקו את זמן הפועל ואת הצורה שהמשימה מבקשת.', en: 'Check the tense and the verb form the task asks for.' };
}
export function ruleNote(could, source, ex) {
  if (could.reason === 'unchanged') return { he: `המשפט עדיין כמו המקור: ${source}`, en: `The sentence is still the same as the original: ${source}` };
  if (could.reason === 'did-past') {
    if (/\b(did|does|do)\b/i.test(firstAnswer(ex.answers) || '')) return { he: 'אחרי did, ‏does או do הפועל בא בצורת הבסיס.', en: 'After did, does or do, the verb is in its base form.' };
    const s = structureNote(ex, source);
    return { he: `כאן לא צריך did. ${s.he}`, en: `This sentence needs no did. ${s.en}` };
  }
  if (could.reason === 'agreement') return { he: 'בדקו שהפועל מתאים לנושא: יחיד או רבים.', en: 'Check that the verb agrees with the subject: singular or plural.' };
  if (could.reason === 'verb') return structureNote(ex, source);
  if (could.reason === 'overlap') return { he: 'התשובה רחוקה מהמשפט שהמשימה מבקשת. השוו אותה לתשובה לדוגמה.', en: 'Your answer is far from the sentence the task asks for. Compare it with the model answer.' };
  return null;
}

// A word as the grader reads it: lower case, US spelling, no marks around it.
const bareWord = (w) => usSpelling(String(w).toLowerCase().replace(/[‘’]/g, "'").replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, ''));
// A word typed with a slip, letter by letter: the word as it should be, missing letters added and extra ones
// struck, in amber (P1 EX-7), with what was typed for screen readers.
export function slipHtml(typed, word) {
  const [, core, tail] = /^(.*?)([^A-Za-z0-9']*)$/.exec(String(word));
  return html`<span class="w-slip">${letterDiff(typed, core).map((p) => (p.type === 'same' ? p.text : p.type === 'add' ? html`<span class="l-add">${p.text}</span>` : html`<span class="l-del">${p.text}</span>`))}${tail}<span class="sr-only" ${uiAttrs()}> (${tt('כתבתם', 'you wrote')}: </span><span class="sr-only">${typed}</span><span class="sr-only" ${uiAttrs()}>)</span></span>`;
}
// The dictation diff: found words, missing words, and words found with a slip.
function dictationDiff(words) {
  return html`<div class="word-diff" lang="en" dir="ltr" style="margin-top:var(--s4)">${words.map((w) => (w.ok && w.typed && bareWord(w.typed) !== bareWord(w.word) ? slipHtml(w.typed, w.word) : html`<span class="${w.ok ? 'w-ok' : 'w-miss'}">${w.word}</span>`))}</div>`;
}

// The learner's sentence against the model answer: their extra words struck through, the model's words added.
export function sentenceDiffHtml(typed, key) {
  return html`<div class="word-diff answer-diff" lang="en" dir="ltr">${sentenceDiff(typed, key).map((p) => (p.type === 'same' ? html`<span>${p.text}</span>` : p.type === 'del' ? html`<del class="w-del">${p.text}</del>` : html`<ins class="w-add">${p.text}</ins>`))}</div>`;
}

// The verdict shown in the player footer after checking: the result and the correct form first, the
// explanation one tap away behind "Why?" (research D7), so it never covers the exercise on a phone.
export function verdictHtml(ex, r, errors) {
  if (r.writing && r.short) return html`<div class="verdict-title">${icon('info', { size: 18 })} ${tt(r.missing === 1 ? 'נשמר כטיוטה · קצר מהיעד במילה אחת' : `נשמר כטיוטה · קצר מהיעד ב-${r.missing} מילים`,`Saved as a draft · ${r.missing} ${r.missing === 1 ? 'word' : 'words'} short of the target`)}</div>`;
  if (r.writing) return html`<div class="verdict-title">${icon('check', { size: 18 })} ${tt('נשמר. עברו על הבדיקות והדוגמה.', 'Saved. Go through the checks and the model.')}</div>`;
  if (r.speak || r.self != null) {
    const title = r.self === 1 ? tt('סימנתם: אמרתי בבירור', 'You marked it: said clearly') : r.self === 0 ? tt('נרשם: צריך עוד תרגול', 'Noted: more practice needed') : tt('תרגול דיבור נרשם', 'Speaking practice recorded');
    return html`<div class="verdict-title">${icon('check', { size: 18 })} ${title}</div><div class="verdict-body"><p class="muted">${tt('תרגול דיבור לא מקבל ציון.', 'Speaking practice is not scored.')}</p></div>`;
  }
  // An exercise may name its own result (a finished matching board: "All pairs right · one extra try").
  const title = r.title || (r.correct ? (r.almost ? tt('כמעט! בדקו את הפרטים הקטנים', 'Almost! Check the small details') : tt('נכון', 'Correct')) : r.model ? tt('לא אחת מהתשובות שלנו', 'Not one of our answers') : tt('לא בדיוק', 'Not quite'));
  const ico = r.correct ? 'check' : r.model ? 'info' : 'x';
  const note = !r.correct ? errorNote(r.error_type, errors, { general: !ex.explanation && !r.specific }) : '';
  const why = note || ex.explanation;
  return html`<div class="verdict-title">${icon(ico, { size: 18 })} ${title}${r.summary ? html` <span class="num">· ${r.summary}</span>` : ''}</div>
    <div class="verdict-body stack-sm">
      ${!r.correct && r.answer ? html`<p>${r.model || r.open ? tt('תשובה אחת לדוגמה:', 'One model answer:') : tt('התשובה הנכונה:', 'Correct answer:')} ${ex.type === 'match' ? matchAnswerEl(ex) : answerEl(r.answer)}</p>` : ''}
      ${!r.correct && r.answer && r.typed && normalize(r.typed) !== normalize(r.answer) ? html`<div class="stack-sm"><p class="small">${tt('בתשובה שלכם:', 'In your answer:')}</p>${sentenceDiffHtml(r.typed, r.answer)}</div>` : ''}
      ${!r.correct && r.fixes?.length ? html`<div><p>${tt('המקום של אלה:', 'Where these go:')}</p><ul class="fix-list" lang="en" dir="ltr">${r.fixes.map((g) => html`<li><span class="fix-cat">${g.category}:</span> <ul class="fix-items">${g.items.map((x) => html`<li class="answer">${x}</li>`)}</ul></li>`)}</ul></div>` : ''}
      ${r.almost && r.correct && r.typos?.length ? html`<p>${tt('המילה נכונה; האיות:', 'Right word; the spelling:')} ${r.typos.map((t, k) => html`${k ? ', ' : ''}<span class="spell" lang="en" dir="ltr">${t.expected}</span>`)}</p>` : ''}
      ${r.almost && r.answer && r.correct && !(r.typos?.length && !/\s/.test(String(r.answer).trim())) ? html`<p>${tt('הצורה המדויקת:', 'Exact form:')} ${answerEl(r.answer)}</p>` : ''}
      ${r.specific ? html`<p>${bi(r.specific)}</p>` : ''}
      ${r.model ? html`<div class="stack-sm self-judge"><p class="small">${tt('אם התשובה שלכם אומרת את אותו הדבר ועושה מה שהמשימה מבקשת, אפשר לספור אותה.', 'If yours says the same thing and does what the task asks, you can count it.')}</p><div><button type="button" class="key small" data-self-judge>${icon('check', { size: 16 })} ${tt('גם התשובה שלי נכונה', 'My answer is also correct')}</button></div></div>` : ''}
      ${why ? html`<details class="why"><summary>${tt('למה?', 'Why?')}</summary><div class="stack-sm">${note}${ex.explanation ? html`<p>${bi(ex.explanation)}</p>` : ''}</div></details>` : ''}
    </div>`;
}

// After "My answer is also correct": the verdict says so, keeps the model answer, and the button is gone.
export function selfJudgedHtml(r) {
  return html`<div class="verdict-title">${icon('check', { size: 18 })} ${tt('נספר כנכון', 'Counted as correct')}</div>
    <div class="verdict-body stack-sm">${r?.answer ? html`<p>${tt('תשובה אחת לדוגמה:', 'One model answer:')} ${answerEl(r.answer)}</p>` : ''}
      <p class="muted small">${tt('סימנתם שהתשובה שלכם נכונה, והיא נשמרת כשיפוט שלכם ולא של Lucid.', 'You marked your answer as correct. It is saved as your own judgement, not Lucid\'s.')}</p></div>`;
}
