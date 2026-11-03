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
// Focus never falls to the page: every action that redraws or disables the focused control moves focus to the
// next useful one (the next tile, chip or bin, or Check once the exercise is complete).
// Every typed answer goes through grading.js, so contractions, case and small slips are fair.
// Speaking is never graded by speech recognition (research C2, D34-D37): the learner sees what was
// recognised, can try again, mark it themselves or go on, and the attempt is stored with no score.
import { html, raw, render, on, shuffle, $, $$ } from '../core/util.js';
import { bi, tt, hebrewSupport, isolateLatin, uiLang } from '../core/i18n.js';
import { checkTyped, findWrongFeedback, wordAccuracy, checkOrder, countWords, normalize, couldBeRight, keyVerbForms, usSpelling, oneSlip, letterCode } from '../core/grading.js';
import { sentenceDiff, letterDiff } from '../core/diff.js';
import { say, canSpeak, canListen, listen, stopSpeaking, micNotice, speechErrorText } from '../core/speech.js';
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
  const reopenField = (el) => { el.readOnly = false; onChange(ctl.ready()); el.focus(); el.setSelectionRange?.(el.value.length, el.value.length); };

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
        ${ex.type === 'listen' ? listenButtons(ex.audio_text) : ''}
        <p class="ex-text" lang="en" dir="ltr">${ex.question}${quoted.map((w) => html` <span class="ex-say">${playTile(w)}</span>`)}</p>
        <div class="options" role="group" style="margin-top:var(--s5)">${order.map((i, n) => (sounds ? html`<div class="opt-row">${option(i, n)}${playTile(ex.options[i])}</div>` : option(i, n)))}</div>`);
      if (sounds) offs.push(on(root, 'click', '[data-say-tile]', (e, b) => say(b.dataset.sayTile, { variant })));
      if (ex.type === 'listen') { sayHandler(ex.audio_text); setTimeout(() => root.querySelector('[data-say="normal"]')?.focus(), 60); }
      const pick = (i) => { picked = i; $$('.option', root).forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.opt) === i))); onChange(true); };
      offs.push(on(root, 'click', '[data-opt]', (e, b) => { if (!b.disabled) pick(Number(b.dataset.opt)); }));
      ctl.ready = () => picked != null;
      // A number key chooses, and focus goes to Check, so Enter checks (it used to stay on Play).
      ctl.onKey = (e) => { const n = KEYS.indexOf(e.key); if (n >= 0 && n < order.length && !$('.option', root).disabled) { pick(order[n]); focusOn(checkKey()); return true; } return false; };
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
        const fb = !correct && ex.option_feedback?.[picked];
        transcript();
        return result({ correct, score: correct ? 1 : 0, response: ex.options[picked], error_type: ex.option_errors?.[picked], answer: ex.options[ex.answer], specific: fb || null });
      };
      ctl.reveal = () => { mark(null); transcript(); };
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
          <div class="chips gap-bank" data-bank style="margin-top:var(--s4)" role="group" aria-label="${tt('מחסן מילים', 'Word bank')}" lang="en" dir="ltr">${bank.map((w, ci) => html`<button type="button" class="chip" data-chip="${w}" data-ci="${ci}" aria-disabled="false">${w}</button>`)}</div>` : ''}
        ${liveRegion}`);
      const inputs = $$('.gap-input', root);
      const update = () => onChange(inputs.every((i) => i.value.trim()));
      offs.push(on(root, 'input', '.gap-input', update));
      // Word bank (P0 EX-2): a chip fills the chosen gap (the target), then the target moves to the next empty
      // gap. Tapping or focusing a gap chooses it without clearing it; Backspace or Delete, or the clear key,
      // empties it and gives its word back. Used words stay visible, marked and skipped.
      const filled = new Array(n).fill(null); // chip index in each gap
      const locked = new Set(); // gaps already right when the player reopens the item
      let target = bank ? 0 : null;
      const chipEl = (ci) => $(`[data-ci="${ci}"]`, root);
      const setChip = (ci, used) => { const c = chipEl(ci); if (!c) return; c.classList.toggle('used', used); c.setAttribute('aria-disabled', String(used)); c.tabIndex = used ? -1 : 0; };
      const nextEmpty = (from) => { for (let k = 1; k <= n; k++) { const j = (from + k) % n; if (filled[j] == null && !locked.has(j)) return j; } return null; };
      const drawTarget = () => {
        inputs.forEach((inp, i) => {
          const on_ = i === target;
          inp.classList.toggle('is-target', on_);
          if (on_) inp.setAttribute('aria-current', 'true'); else inp.removeAttribute('aria-current');
          inp.setAttribute('aria-label', inp.value ? `${gapName(i)}: ${inp.value}. ${tt('Backspace לניקוי', 'Backspace clears it')}` : gapName(i));
        });
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
        target = nextEmpty(t);
        drawTarget(); update();
        announce(html`${gapName(t)}: <span lang="en" dir="ltr">${bank[ci]}</span>`);
        // The last gap filled: Check is next. Otherwise the keyboard stays in the word bank.
        if (inputs.every((i) => i.value.trim())) focusOn(checkKey(), e);
        else focusOn($$('[data-ci]', root).find((c) => c.getAttribute('aria-disabled') !== 'true' && Number(c.dataset.ci) > ci) || $('[data-ci][aria-disabled="false"]', root), e);
      };
      if (bank) {
        drawTarget();
        offs.push(on(root, 'click', '[data-chip]', (e, b) => { if (root.dataset.locked === '1' || b.getAttribute('aria-disabled') === 'true') return; fill(Number(b.dataset.ci), e); }));
        offs.push(on(root, 'focusin', '.gap-input', (e, i) => { if (root.dataset.locked === '1' || locked.has(Number(i.dataset.gap))) return; target = Number(i.dataset.gap); drawTarget(); }));
        offs.push(on(root, 'click', '.gap-input', (e, i) => { if (root.dataset.locked === '1' || locked.has(Number(i.dataset.gap))) return; target = Number(i.dataset.gap); drawTarget(); }));
        offs.push(on(root, 'keydown', '.gap-input', (e, i) => {
          if (root.dataset.locked === '1' || !['Backspace', 'Delete'].includes(e.key)) return;
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
        if (!inp || !root.contains(inp) || inputs.every((x) => x.value.trim())) return false;
        const i = Number(inp.dataset.gap);
        const next = [...inputs.slice(i + 1), ...inputs.slice(0, i)].find((x) => !x.value.trim() && !locked.has(Number(x.dataset.gap)));
        if (!next) return false;
        next.focus();
        return true;
      };
      ctl.check = async () => {
        let allRight = true, almost = false, specific = null, err = null;
        const responses = [], typos = [];
        root.dataset.locked = '1';
        $$('.gap-mark', root).forEach((m) => m.remove());
        inputs.forEach((inp, i) => {
          const r = checkTyped(inp.value, ex.answers[i], ex.wrong_feedback);
          responses.push(inp.value);
          inp.readOnly = true;
          inp.classList.remove('right', 'wrong', 'is-target');
          inp.removeAttribute('aria-current');
          setInvalid(inp, !r.correct);
          inp.classList.add(r.correct ? 'right' : 'wrong');
          if (!r.correct) {
            allRight = false;
            const f = findWrongFeedback(inp.value, ex.wrong_feedback);
            if (f && !specific) { specific = f.feedback; err = f.error_type; }
          } else if (r.almost) { almost = true; if (r.typo) typos.push(r.typo); }
        });
        $$('.chip', root).forEach((c) => { c.disabled = true; });
        target = null; drawTarget();
        return result({ correct: allRight, almost, score: allRight ? 1 : inputs.filter((i) => i.classList.contains('right')).length / inputs.length * 0.5, response: responses.join(' | '), error_type: err, answer: ex.answers.map(firstAnswer).join(' … '), specific, typos });
      };
      ctl.reveal = () => {
        root.dataset.locked = '1';
        $$('.gap-mark', root).forEach((m) => m.remove());
        inputs.forEach((inp, i) => {
          inp.value = firstAnswer(ex.answers[i]);
          inp.readOnly = true;
          inp.classList.remove('wrong', 'right', 'is-target');
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
        inputs.forEach((inp, i) => { if (inp.classList.contains('right')) locked.add(i); else if (!bank) inp.readOnly = false; });
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
      // the bins are marked as the next target.
      const helpText = () => (sel == null
        ? tt('בחרו פריט ואז את הקבוצה שלו. לחיצה על פריט שהונח מחזירה אותו.', 'Pick an item, then its group. Tap a placed item to take it back.')
        : tt('עכשיו בחרו את הקבוצה שלו.', 'Now choose its group.'));
      render(root, html`${prompt}
        <p class="cat-help" aria-live="polite" data-cat-help>${helpText()}</p>
        <div class="chips" role="group" aria-label="${tt('פריטים למיון', 'Items to sort')}" lang="en" dir="ltr" data-pool></div>
        <div class="cat-grid" lang="en" dir="ltr" data-bins></div>`);
      const draw = () => {
        render($('[data-pool]', root), items.filter((x) => !placed.has(x.i)).map((x) => html`<button type="button" class="chip" data-item="${x.i}" aria-pressed="${sel === x.i}">${x.text}</button>`));
        render($('[data-bins]', root), ex.categories.map((c) => html`<div class="cat-bin${sel != null ? ' is-target' : ''}" data-bin="${c}"><button type="button" class="label">${c}</button>${items.filter((x) => placed.get(x.i) === c).map((x) => html`<button type="button" class="chip" data-placed="${x.i}" lang="en">${x.text}</button>`)}</div>`));
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
        placed.set(sel, b.dataset.bin); sel = null; draw();
        const complete = placed.size === items.length;
        onChange(complete);
        const next = [...items.slice(at + 1), ...items.slice(0, at)].find((x) => !placed.has(x.i));
        focusOn(complete ? checkKey() : next && $(`[data-item="${next.i}"]`, root), e);
      }));
      offs.push(on(root, 'click', '[data-placed]', (e, b) => { if (root.dataset.locked) return; const i = Number(b.dataset.placed); placed.delete(i); draw(); onChange(false); focusOn($(`[data-item="${i}"]`, root), e); }));
      ctl.ready = () => placed.size === items.length;
      // Each placed item is marked in place (icon, colour and words); the verdict lists only the misplaced ones.
      // A wrong sentence sorted rightly into the "wrong" bin gets no green tick: it is struck through, with its
      // fix beside it when the item has one, and a neutral "in the right place" tag (P2 EX-9).
      const wrongBin = (c) => ex.categories.length === 2 && ex.categories.some((x) => /^correct$/i.test(x)) && !/^correct$/i.test(c);
      const markPlaced = () => {
        let right = 0;
        $$('[data-placed]', root).forEach((b) => {
          const it = items.find((x) => x.i === Number(b.dataset.placed));
          const ok = placed.get(it.i) === it.category;
          if (ok) right++;
          if (ok && wrongBin(it.category)) {
            b.classList.add('is-struck');
            render(b, html`<span class="sr-only" ${uiAttrs()}>${tt('במקום הנכון:', 'Right:')} </span>${it.fix
              ? sentenceDiff(it.text, it.fix).map((p) => (p.type === 'same' ? html`<span>${p.text}</span> ` : p.type === 'del' ? html`<del>${p.text}</del> ` : html`<ins>${p.text}</ins> `))
              : html`<s>${it.text}</s>`}<span class="tag cat-tag" ${uiAttrs()}>${tt('במקום הנכון', 'Right place')}</span>`);
            return;
          }
          b.classList.add(ok ? 'is-right' : 'is-wrong');
          b.insertAdjacentHTML('afterbegin', String(html`${icon(ok ? 'check' : 'x', { size: 14 })}<span class="sr-only" ${uiAttrs()}>${ok ? tt('במקום הנכון:', 'Right:') : tt('לא במקום:', 'Wrong place:')} </span>`));
        });
        return right;
      };
      ctl.check = async () => {
        root.dataset.locked = '1';
        const right = markPlaced();
        const correct = right === items.length;
        return result({ correct, score: right / items.length, response: `${right}/${items.length}`, summary: tt(`${right} מתוך ${items.length} במקום הנכון`, `${right} of ${items.length} in the right place`), fixes: categoryFixes(ex, placed) });
      };
      // "I don't know": every item sorted into its own bin and marked.
      ctl.reveal = () => {
        root.dataset.locked = '1';
        sel = null;
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
        <div data-reveal></div>`);
      const ta = $('textarea', root);
      setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 50);
      offs.push(on(root, 'input', 'textarea', () => onChange(Boolean(ta.value.trim()) && normalize(ta.value) !== normalize(ex.type === 'correct' ? source : ''))));
      offs.push(on(root, 'keydown', 'textarea', (e) => { if (e.key === 'Enter' && !e.shiftKey) e.preventDefault(); }));
      ctl.ready = () => Boolean(ta.value.trim()) && (ex.type !== 'correct' || normalize(ta.value) !== normalize(source));
      ctl.check = async () => {
        ta.readOnly = true;
        const r = checkTyped(ta.value, ex.answers, ex.wrong_feedback);
        const f = !r.correct && findWrongFeedback(ta.value, ex.wrong_feedback);
        setInvalid(ta, !r.correct);
        const open = isOpenRewrite(ex, level);
        // From B1 an answer the key does not list may be counted by the learner, but only when it could be right
        // (P1 EX-5); otherwise the verdict is red and names the rule it breaks.
        const could = !r.correct && !f && open ? couldBeRight(ta.value, { source, answers: ex.answers, wrong_feedback: ex.wrong_feedback }) : null;
        const specific = f?.feedback || (could && !could.ok ? ruleNote(could, source, ex) : null);
        return result({ correct: r.correct, almost: r.almost, score: r.correct ? 1 : 0, response: ta.value, typed: ta.value, answer: ex.answers[0], specific, error_type: f?.error_type, model: Boolean(could?.ok), open, typos: r.typo ? [r.typo] : [] });
      };
      ctl.reveal = () => { ta.readOnly = true; revealAnswer(ex.answers[0]); };
      ctl.retryable = true;
      ctl.reopen = () => reopenField(ta);
      break;
    }

    case 'dictation': {
      render(root, html`${prompt}${listenButtons(ex.audio_text)}
        <label class="sr-only" for="dc-${ex.id}">${tt('מה שמעתם', 'What you heard')}</label>
        <textarea class="input ex-field" id="dc-${ex.id}" rows="2" lang="en" dir="ltr" autocomplete="off" spellcheck="false" style="min-height:4.5rem;font-size:var(--t-lg)" placeholder="${tt('כתבו מה ששמעתם', 'Type what you hear')}"></textarea>
        <div data-reveal></div>`);
      sayHandler(ex.audio_text);
      setTimeout(() => root.querySelector('[data-say="normal"]')?.focus(), 60);
      const ta = $('textarea', root);
      offs.push(on(root, 'input', 'textarea', () => onChange(Boolean(ta.value.trim()))));
      ctl.ready = () => Boolean(ta.value.trim());
      ctl.check = async () => {
        ta.readOnly = true;
        $('.word-diff', root)?.remove();
        const typed = ta.value;
        const exact = checkTyped(typed, ex.answers);
        // A letter code is compared letter by letter, so "BVGE" for "B, V, J, E" marks only the J (P1 EX-7).
        const code = exact.correct ? null : letterCode(typed, ex.answers[0]);
        let correct, almost, score, words = [], specific = null, typos = [], retry_note = null;
        if (code) {
          correct = code.accuracy === 1; almost = false; score = code.accuracy; words = code.words;
          if (code.misses.length) specific = { he: code.misses.map((m) => (m.typed ? `כתבתם ${m.typed}, נאמר ${m.expected}` : `חסרה האות ${m.expected}`)).join('; '), en: code.misses.map((m) => (m.typed ? `You wrote ${m.typed}; it was ${m.expected}` : `${m.expected} is missing`)).join('; ') };
          // The note above names the letters that were said, so the second try (LF-6) gets one that does not.
          const n = code.misses.length;
          if (n) retry_note = n === 1 ? { he: 'אות אחת עוד לא נכונה. אפשר להקשיב שוב ולתקן.', en: 'One letter is not right yet. You can listen again and fix it.' } : { he: `${n} אותיות עוד לא נכונות. אפשר להקשיב שוב ולתקן.`, en: `${n} letters are not right yet. You can listen again and fix them.` };
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
        }
        if (!(exact.correct && !exact.almost)) root.insertAdjacentHTML('beforeend', String(dictationDiff(words)));
        setInvalid(ta, !correct);
        return result({ correct, almost, score, response: typed, answer: ex.answers[0], error_type: 'spelling', specific, typos, retry_note });
      };
      ctl.reveal = () => { ta.readOnly = true; $('.word-diff', root)?.remove(); revealAnswer(ex.answers[0]); };
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
        <div aria-live="polite">${heard != null ? recognised(heard, ex.target) : ''}${err ? html`<p class="error-text" role="alert">${err}</p>` : ''}</div>
        ${ex.focus ? speakFocus(ex.focus) : ''}
        ${!canListen() ? html`<p class="banner warn small">${icon('info', { size: 18 })}<span>${tt('זיהוי דיבור לא זמין בדפדפן הזה (עובד ב-Chrome, Edge ו-Safari). הקשיבו, אמרו בקול, וסמנו בעצמכם.', 'Speech recognition is not available in this browser (it works in Chrome, Edge and Safari). Listen, say it aloud, then mark it yourself.')}</span></p>` : ''}
        <div class="stack-sm self-rate" role="group" aria-labelledby="sr-${ex.id}">
          <p class="small muted" id="sr-${ex.id}">${canListen() ? tt('אפשר גם לומר בקול ולסמן בעצמכם:', 'You can also say it aloud and mark it yourself:') : tt('איך זה הלך?', 'How did it go?')}</p>
          <div class="row"><button type="button" class="key small" data-self="1" aria-pressed="${selfRated === 1}">${tt('אמרתי את זה בבירור', 'I said it clearly')}</button><button type="button" class="key small" data-self="0" aria-pressed="${selfRated === 0}">${tt('צריך עוד תרגול', 'I need more practice')}</button></div>
        </div>
        <p class="xsmall faint">${tt('תרגול דיבור לא מקבל ציון.', 'Speaking practice is not scored.')}</p>`);
      const refocus = () => root.querySelector('[data-rec]')?.focus();
      draw();
      sayHandler(ex.target);
      offs.push(on(root, 'click', '[data-self]', (e, b) => { selfRated = Number(b.dataset.self); draw(); root.querySelector(`[data-self="${selfRated}"]`)?.focus(); onChange(true); }));
      offs.push(on(root, 'click', '[data-rec]', async () => {
        if (listening) { listen.stop?.(); return; }
        stopSpeaking();
        err = '';
        if (!(await micNotice())) { err = `${speechErrorText({ code: 'declined' })} ${tt('אפשר לומר בקול ולסמן בעצמכם.', 'You can say it aloud and mark it yourself.')}`; draw(); return; }
        listening = true; draw(); refocus();
        try {
          const r = await listen({ variant });
          // The alternative closest to the target, so the learner is not shown the recogniser's worst guess.
          heard = r.alternatives.map((a) => ({ a, acc: wordAccuracy(a, ex.target).accuracy })).sort((x, y) => y.acc - x.acc)[0]?.a ?? r.transcript;
        } catch (e) {
          err = speechErrorText(e);
        }
        listening = false;
        if (!root.isConnected) return;
        draw(); refocus(); onChange(ctl.ready());
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
        <article class="passage" lang="en" dir="ltr" ${paras.length > 1 ? html`data-numbered` : ''}>${ex.title ? html`<h3 style="margin-bottom:var(--s3)">${ex.title}</h3>` : ''}${paras.map((p) => html`<p>${turns(p, dialogue, true)}</p>`)}</article>
        ${canSpeak() ? html`<div class="row" style="margin-top:var(--s3)"><button type="button" class="key small" data-say="normal">${icon('volume', { size: 18 })} ${tt('הקראת הטקסט', 'Read it to me')}</button></div>` : ''}
        <div class="stack" style="margin-top:var(--s5)">${ex.questions.map((q, qi) => html`<fieldset class="panel flat stack-sm" style="margin:0" data-q="${qi}"><legend class="sr-only">${tt('שאלה', 'Question')} ${qi + 1}</legend>
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
        ex.questions.forEach((q, qi) => {
          let ok;
          if (q.type === 'gap') { const ins = $$(`[data-rg="${qi}"]`, root); ok = ins.every((inp, i) => checkTyped(inp.value, q.answers[i], q.wrong_feedback).correct); ins.forEach((i) => { i.readOnly = true; i.classList.add(ok ? 'right' : 'wrong'); }); }
          else ok = answers.get(qi) === q.answer;
          if (ok) right++;
          markQuestion(q, qi, answers.get(qi));
          render($(`[data-q="${qi}"] .q-fb`, root), html`<p class="small" style="color:${ok ? 'var(--ok)' : 'var(--bad)'}">${ok ? tt('נכון', 'Correct') : html`${tt('התשובה:', 'Answer:')} ${answerEl(keyText(q))}`}</p>${q.explanation ? html`<p class="small muted">${bi(q.explanation)}</p>` : ''}`);
        });
        const score = right / ex.questions.length;
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
      // Nothing is sent, so the key says what happens: "Save and check" (P2 EX-11). It stays off, saying how many
      // words are still needed, until the text has max(10, 25% of the minimum) words (never more than the minimum).
      const need = ex.min_words ? Math.min(ex.min_words, Math.max(10, Math.ceil(ex.min_words * 0.25))) : 3;
      render(root, html`${prompt}
        <div class="panel sunk small">${bi(ex.task)}${ex.must_include?.length ? html`<p class="xsmall" style="margin-top:var(--s2)">${tt('צריך לכלול:', 'Must include:')} ${ex.must_include.map((w) => html`<span class="tag" lang="en" dir="ltr">${w}</span> `)}</p>` : ''}</div>
        <label class="sr-only" for="wr-${ex.id}">${tt('הטקסט שלך', 'Your text')}</label>
        <textarea class="input ex-write" id="wr-${ex.id}" lang="en" dir="ltr" spellcheck="false" style="margin-top:var(--s4)" placeholder="${tt('כתבו באנגלית…', 'Write in English…')}"></textarea>
        <p class="small faint num" data-wc>0 ${tt('מילים', 'words')} · ${tt('לפחות', 'at least')} ${ex.min_words}</p>`);
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
        render(l, html`<span>${tt('שמירה ובדיקה', 'Save and check')}</span>${left > 0 ? html`<small class="check-need">${left === 1 ? tt('עוד מילה אחת', '1 more word') : tt(`עוד ${left} מילים`, `${left} more words`)}</small>` : ''}`);
      };
      // The player draws its footer after the exercise, so the key is named once it is there.
      queueMicrotask(label);
      offs.push(on(root, 'input', 'textarea', () => { const n = countWords(ta.value); $('[data-wc]', root).textContent = `${n} ${tt('מילים', 'words')} · ${tt('לפחות', 'at least')} ${ex.min_words}`; onChange(n >= need); label(); }));
      ctl.ready = () => countWords(ta.value) >= need;
      ctl.check = async () => {
        ta.readOnly = true;
        const text = ta.value;
        const a = analyzeWriting(text, { level, minWords: ex.min_words, maxWords: ex.max_words, mustInclude: ex.must_include || [] });
        const issues = a.issues.slice(0, 5);
        root.insertAdjacentHTML('beforeend', '<div data-writeout></div>');
        render($('[data-writeout]', root), html`<div class="stack" style="margin-top:var(--s5)">
          <div class="panel flat stack-sm"><h3 class="small">${tt('בדיקות אוטומטיות', 'Automatic checks')}</h3>
            ${a.checks.map((c) => html`<div class="row small">${icon(c.ok ? 'check' : 'alert', { size: 16 })}<span>${tt(c.he, c.en)}</span></div>`)}
            ${issues.map((i) => html`<div class="small"><span class="tag warn">${tt(i.he_title, i.title)}</span> <span lang="en" dir="ltr">“${i.match}”</span> ${hebrewSupport() !== 'off' ? html`<span class="muted">${tt(i.he, i.en)}</span>` : html`<span class="muted">${i.en}</span>`}</div>`)}
            <p class="xsmall faint">${tt('אלה בדיקות אוטומטיות פשוטות, לא ציון. משוב מלא יש במעבדת הכתיבה.', 'These are simple automatic checks, not a grade. Full feedback is in the Writing lab.')}</p></div>
          <div class="panel flat stack-sm"><h3 class="small">${tt('בדקו את עצמכם', 'Check yourself')}</h3><div class="self-check" dir="ltr">${ex.checklist.map((c) => html`<label class="self-check-item"><input type="checkbox"><span class="self-check-text">${bi(c)}</span></label>`)}</div></div>
          <details class="panel flat"><summary>${tt('דוגמה לתשובה', 'A model answer')}</summary><p lang="en" dir="ltr" style="margin-top:var(--s3)">${ex.model_answer}</p></details></div>`);
        return { graded: false, correct: a.passedRequired, score: null, response: text, writing: true };
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

// Misplaced items of a categorize exercise, grouped by the category they belong in.
export function categoryFixes(ex, placed) {
  return ex.categories
    .map((category) => ({ category, items: ex.items.filter((x, i) => x.category === category && placed.get(i) !== category).map((x) => x.text) }))
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

// The rule an open rewrite breaks when it cannot be counted (P1 EX-5), as Bilingual feedback.
export function ruleNote(could, source, ex) {
  if (could.reason === 'unchanged') return { he: `המשפט עדיין כמו המקור: ${source}`, en: `The sentence is still the same as the original: ${source}` };
  if (could.reason === 'did-past') return { he: 'אחרי did, does או do הפועל בא בצורת הבסיס: did live, ולא did lived.', en: 'After did, does or do the verb is in its base form: did live, not did lived.' };
  if (could.reason === 'verb') {
    const forms = keyVerbForms(source, firstAnswer(ex.answers)).join(' ');
    return forms ? { he: `חסרה צורת הפועל שהמשימה מבקשת: ${forms}.`, en: `The verb form the task asks for is missing: ${forms}.` } : null;
  }
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
      ${!r.correct && r.answer ? html`<p>${r.model || r.open ? tt('תשובה אחת לדוגמה:', 'One model answer:') : tt('התשובה הנכונה:', 'Correct answer:')} ${answerEl(r.answer)}</p>` : ''}
      ${!r.correct && r.answer && r.typed && normalize(r.typed) !== normalize(r.answer) ? html`<div class="stack-sm"><p class="small">${tt('בתשובה שלכם:', 'In your answer:')}</p>${sentenceDiffHtml(r.typed, r.answer)}</div>` : ''}
      ${!r.correct && r.fixes?.length ? html`<div><p>${tt('המקום של אלה:', 'Where these go:')}</p><ul class="fix-list" lang="en" dir="ltr">${r.fixes.map((g) => html`<li><span class="fix-cat">${g.category}:</span> <span class="answer">${g.items.join(', ')}</span></li>`)}</ul></div>` : ''}
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
