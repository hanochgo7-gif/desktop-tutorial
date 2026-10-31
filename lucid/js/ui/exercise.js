// Exercise renderers. mountExercise(root, ex, opts) draws one exercise and returns a controller:
//   ready()        true when there is something to check
//   check()        -> Promise<{ correct, almost, score, graded, response, error_type, title, detail }>
//   hintText()     authored hint (Bilingual) or null
//   onKey(e)       keyboard shortcuts (1-4 for options); returns true when handled
//   graded         false for practice that is never scored (speaking, writing)
//   speak          true for speaking items: the player offers "Can't speak right now" and goes straight on
// Every typed answer goes through grading.js, so contractions, case and small slips are fair.
// Speaking is never graded by speech recognition (research C2, D34-D37): the learner sees what was
// recognised, can try again, mark it themselves or go on, and the attempt is stored with no score.
import { html, render, on, shuffle, $, $$ } from '../core/util.js';
import { bi, tt, hebrewSupport, isolateLatin } from '../core/i18n.js';
import { checkTyped, findWrongFeedback, wordAccuracy, checkOrder, countWords, normalize } from '../core/grading.js';
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

function listenButtons(text) {
  if (!canSpeak()) return html`<p class="banner warn small">${icon('alert', { size: 18 })}<span>${tt('הדפדפן הזה לא תומך בהקראה. התמליל מוצג במקום.', 'This browser cannot read text aloud, so the transcript is shown instead.')}</span></p><p class="ex-text" lang="en" dir="ltr">${text}</p>`;
  return html`<div class="big-listen"><button type="button" class="key" data-say="normal" aria-label="${tt('השמעה', 'Play')}">${icon('volume', { size: 24 })} ${tt('השמעה', 'Play')}</button><button type="button" class="key" data-say="slow" aria-label="${tt('השמעה איטית', 'Play slowly')}">${icon('turtle', { size: 24 })} ${tt('לאט', 'Slowly')}</button></div>`;
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
  const prompt = html`<h2 class="ex-prompt">${bi(ex.prompt)}</h2>`;
  const ctl = { graded: true, ready: () => false, check: async () => ({}), hintText: () => ex.hint || null, onKey: () => false, destroy: () => {} };
  const offs = [];
  const sayHandler = (text) => offs.push(on(root, 'click', '[data-say]', (e, b) => say(text, { slow: b.dataset.say === 'slow', variant })));
  const result = (r) => ({ graded: true, error_type: r.correct ? null : r.error_type || ex.error_type || null, ...r });

  switch (ex.type) {
    case 'mcq':
    case 'listen': {
      let picked = null;
      const order = ex.options.map((_, i) => i);
      render(root, html`${prompt}
        ${ex.type === 'listen' ? listenButtons(ex.audio_text) : ''}
        <p class="ex-text" lang="en" dir="ltr">${ex.question}</p>
        <div class="options" role="group" style="margin-top:var(--s5)">${order.map((i, n) => html`<button type="button" class="option" data-opt="${i}" aria-pressed="false" lang="en" dir="ltr"><span class="k" aria-hidden="true">${KEYS[n]}</span><span>${ex.options[i]}</span></button>`)}</div>`);
      if (ex.type === 'listen') { sayHandler(ex.audio_text); setTimeout(() => root.querySelector('[data-say="normal"]')?.focus(), 60); }
      const pick = (i) => { picked = i; $$('.option', root).forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.opt) === i))); onChange(true); };
      offs.push(on(root, 'click', '[data-opt]', (e, b) => { if (!b.disabled) pick(Number(b.dataset.opt)); }));
      ctl.ready = () => picked != null;
      ctl.onKey = (e) => { const n = KEYS.indexOf(e.key); if (n >= 0 && n < order.length && !$('.option', root).disabled) { pick(order[n]); return true; } return false; };
      ctl.check = async () => {
        const correct = picked === ex.answer;
        $$('.option', root).forEach((b) => { b.disabled = true; const i = Number(b.dataset.opt); if (i === ex.answer) b.classList.add('is-right'); else if (i === picked) b.classList.add('is-wrong'); });
        const fb = !correct && ex.option_feedback?.[picked];
        // The transcript is its own left-to-right block under the label, so it wraps as English (R2-18).
        if (ex.type === 'listen') root.insertAdjacentHTML('beforeend', `<div class="transcript small faint" style="margin-top:var(--s4)"><p>${tt('תמליל:', 'Transcript:')}</p><p class="en-block" lang="en" dir="ltr">${normalizeHtml(ex.audio_text)}</p></div>`);
        return result({ correct, score: correct ? 1 : 0, response: ex.options[picked], error_type: ex.option_errors?.[picked], answer: ex.options[ex.answer], specific: fb || null });
      };
      break;
    }

    case 'gap': {
      const parts = ex.text.split('___');
      const bank = ex.word_bank ? shuffle(ex.word_bank, 0.42) : null;
      render(root, html`${prompt}
        <p class="ex-text" lang="en" dir="ltr">${parts.map((p, i) => html`${p}${i < parts.length - 1 ? html`<input class="gap-input" data-gap="${i}" aria-label="${tt('מילה חסרה', 'Missing word')} ${i + 1}" autocomplete="off" autocapitalize="off" spellcheck="false" ${bank ? html`readonly` : ''}>` : ''}`)}</p>
        ${bank ? html`<div class="chips" style="margin-top:var(--s5)" role="group" aria-label="${tt('מחסן מילים', 'Word bank')}">${bank.map((w) => html`<button type="button" class="chip" data-chip="${w}" lang="en">${w}</button>`)}</div>` : ''}`);
      const inputs = $$('.gap-input', root);
      const update = () => onChange(inputs.every((i) => i.value.trim()));
      offs.push(on(root, 'input', '.gap-input', update));
      if (bank) {
        offs.push(on(root, 'click', '[data-chip]', (e, b) => { const target = inputs.find((i) => !i.value) || inputs[inputs.length - 1]; target.value = b.dataset.chip; update(); }));
        offs.push(on(root, 'click', '.gap-input', (e, i) => { i.value = ''; update(); }));
      }
      setTimeout(() => !bank && inputs[0]?.focus(), 50);
      ctl.ready = () => inputs.every((i) => i.value.trim());
      ctl.check = async () => {
        let allRight = true, almost = false, specific = null, err = null;
        const responses = [];
        inputs.forEach((inp, i) => {
          const r = checkTyped(inp.value, ex.answers[i], ex.wrong_feedback);
          responses.push(inp.value);
          inp.readOnly = true;
          inp.classList.add(r.correct ? 'right' : 'wrong');
          if (!r.correct) {
            allRight = false;
            const f = findWrongFeedback(inp.value, ex.wrong_feedback);
            if (f && !specific) { specific = f.feedback; err = f.error_type; }
          } else if (r.almost) almost = true;
        });
        $$('.chip', root).forEach((c) => { c.disabled = true; });
        return result({ correct: allRight, almost, score: allRight ? 1 : inputs.filter((i) => i.classList.contains('right')).length / inputs.length * 0.5, response: responses.join(' | '), error_type: err, answer: ex.answers.map(firstAnswer).join(' … '), specific });
      };
      break;
    }

    case 'order': {
      const pool = shuffle(ex.tokens.map((t, i) => ({ t, i })), 0.77);
      if (pool.every((p, k) => p.i === k)) pool.reverse();
      const chosen = [];
      const draw = () => render(root, html`${prompt}
        <div class="answer-line" aria-label="${tt('המשפט שלך', 'Your sentence')}" lang="en" dir="ltr">${chosen.map((p, k) => html`<button type="button" class="chip" data-out="${k}">${p.t}</button>`)}</div>
        <div class="chips" lang="en" dir="ltr">${pool.map((p) => html`<button type="button" class="chip ${chosen.includes(p) ? 'used' : ''}" data-in="${p.i}" ${chosen.includes(p) ? html`tabindex="-1" aria-hidden="true"` : ''}>${p.t}</button>`)}</div>`);
      draw();
      offs.push(on(root, 'click', '[data-in]', (e, b) => { if (root.dataset.locked) return; const p = pool.find((x) => x.i === Number(b.dataset.in)); if (!chosen.includes(p)) chosen.push(p); draw(); onChange(chosen.length === pool.length); }));
      offs.push(on(root, 'click', '[data-out]', (e, b) => { if (root.dataset.locked) return; chosen.splice(Number(b.dataset.out), 1); draw(); onChange(false); }));
      ctl.ready = () => chosen.length === pool.length;
      ctl.check = async () => {
        root.dataset.locked = '1';
        const r = checkOrder(chosen.map((p) => p.t), ex.tokens, ex.answers || []);
        return result({ correct: r.correct, score: r.correct ? 1 : 0, response: chosen.map((p) => p.t).join(' '), answer: ex.tokens.join(' '), error_type: ex.error_type || 'word-order' });
      };
      break;
    }

    case 'match': {
      const left = shuffle(ex.pairs.map((p, i) => ({ text: p[0], i })), 0.31);
      const right = shuffle(ex.pairs.map((p, i) => ({ text: p[1], i })), 0.63);
      let sel = null; let mistakes = 0; const done = new Set();
      const langOf = (s) => (/[֐-׿]/.test(s) ? 'he' : 'en');
      // Letter names that differ only in their vowel points are shown larger, and a letter tile has its own
      // play button (P-09), so the learner can hear "A" and "I" instead of telling them apart by niqqud.
      const tile = (side, x) => {
        const b = html`<button type="button" class="match-item ${NIQQUD.test(x.text) ? 'pointed' : ''}" ${side === 'l' ? html`data-l="${x.i}"` : html`data-r="${x.i}"`} lang="${langOf(x.text)}" dir="auto">${x.text}</button>`;
        // The play button sits on the outer side of the tile, away from the other column.
        return canSpeak() && LETTER.test(String(x.text).trim())
          ? html`<div class="match-cell">${side === 'l' ? playTile(x.text) : ''}${b}${side === 'r' ? playTile(x.text) : ''}</div>`
          : b;
      };
      render(root, html`${prompt}
        <div class="match-grid">
          <div class="match-col">${left.map((x) => tile('l', x))}</div>
          <div class="match-col">${right.map((x) => tile('r', x))}</div>
        </div>`);
      offs.push(on(root, 'click', '[data-say-tile]', (e, b) => say(b.dataset.sayTile, { variant })));
      const tryPair = (l, r) => {
        const lb = $(`[data-l="${l}"]`, root), rb = $(`[data-r="${r}"]`, root);
        if (l === r) { [lb, rb].forEach((b) => { b.classList.add('paired'); b.disabled = true; b.setAttribute('aria-pressed', 'false'); }); done.add(l); onChange(done.size === ex.pairs.length); }
        else { mistakes++; [lb, rb].forEach((b) => { b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 320); b.setAttribute('aria-pressed', 'false'); }); }
        sel = null;
      };
      offs.push(on(root, 'click', '[data-l],[data-r]', (e, b) => {
        const side = b.dataset.l != null ? 'l' : 'r';
        const id = Number(b.dataset[side]);
        if (sel && sel.side !== side) return tryPair(side === 'l' ? id : sel.id, side === 'r' ? id : sel.id);
        $$('.match-item', root).forEach((x) => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        sel = { side, id };
      }));
      ctl.ready = () => done.size === ex.pairs.length;
      ctl.check = async () => {
        const correct = mistakes === 0;
        // Every pair is matched on screen by now, so the verdict counts the wrong tries instead of repeating the key.
        return result({ correct, score: Math.max(0, 1 - mistakes / ex.pairs.length), response: `${mistakes} mistakes`, summary: correct ? null : tt(mistakes === 1 ? 'ניסיון שגוי אחד' : `${mistakes} ניסיונות שגויים`, `${mistakes} wrong ${mistakes === 1 ? 'try' : 'tries'}`) });
      };
      break;
    }

    case 'categorize': {
      const items = shuffle(ex.items.map((x, i) => ({ ...x, i })), 0.5);
      const placed = new Map();
      let sel = null;
      const draw = () => render(root, html`${prompt}
        <div class="chips" lang="en" dir="ltr">${items.filter((x) => !placed.has(x.i)).map((x) => html`<button type="button" class="chip" data-item="${x.i}" aria-pressed="${sel === x.i}">${x.text}</button>`)}</div>
        <div class="cat-grid" lang="en" dir="ltr">${ex.categories.map((c) => html`<div class="cat-bin" data-bin="${c}"><button type="button" class="label">${c}</button>${items.filter((x) => placed.get(x.i) === c).map((x) => html`<button type="button" class="chip" data-placed="${x.i}" lang="en">${x.text}</button>`)}</div>`)}</div>
        <p class="xsmall faint">${tt('בחרו פריט ואז את הקטגוריה. לחיצה על פריט שהונח מחזירה אותו.', 'Pick an item, then its category. Tap a placed item to take it back.')}</p>`);
      draw();
      offs.push(on(root, 'click', '[data-item]', (e, b) => { if (root.dataset.locked) return; sel = Number(b.dataset.item); draw(); }));
      // A bin's name is a button (keyboard, screen readers); a tap anywhere in the bin works too. Bins hold the
      // placed chips, so the bin itself is not a button (no nested controls).
      offs.push(on(root, 'click', '[data-bin]', (e, b) => { if (root.dataset.locked || sel == null || e.target.closest('[data-placed]')) return; placed.set(sel, b.dataset.bin); sel = null; draw(); onChange(placed.size === items.length); }));
      offs.push(on(root, 'click', '[data-placed]', (e, b) => { if (root.dataset.locked) return; placed.delete(Number(b.dataset.placed)); draw(); onChange(false); }));
      ctl.ready = () => placed.size === items.length;
      ctl.check = async () => {
        root.dataset.locked = '1';
        let right = 0;
        // Each placed item is marked in place (icon, colour and words); the verdict lists only the misplaced ones.
        $$('[data-placed]', root).forEach((b) => {
          const it = items.find((x) => x.i === Number(b.dataset.placed));
          const ok = placed.get(it.i) === it.category;
          if (ok) right++;
          b.classList.add(ok ? 'is-right' : 'is-wrong');
          b.insertAdjacentHTML('afterbegin', String(html`${icon(ok ? 'check' : 'x', { size: 14 })}<span class="sr-only">${ok ? tt('במקום הנכון:', 'Right:') : tt('לא במקום:', 'Wrong place:')} </span>`));
        });
        const correct = right === items.length;
        return result({ correct, score: right / items.length, response: `${right}/${items.length}`, summary: tt(`${right} מתוך ${items.length} במקום`, `${right} of ${items.length} in place`), fixes: categoryFixes(ex, placed) });
      };
      break;
    }

    case 'transform':
    case 'correct': {
      const source = ex.type === 'transform' ? ex.source : ex.sentence;
      render(root, html`${prompt}
        <p class="ex-text" lang="en" dir="ltr">${ex.type === 'correct' ? html`<span style="text-decoration:underline wavy var(--bad);text-underline-offset:.3em">${source}</span>` : source}</p>
        <label class="sr-only" for="tx-${ex.id}">${tt('התשובה שלך', 'Your answer')}</label>
        <textarea class="input" id="tx-${ex.id}" rows="2" lang="en" dir="ltr" autocomplete="off" autocapitalize="sentences" spellcheck="false" style="min-height:4.5rem;font-size:var(--t-lg)" placeholder="${tt('כתבו כאן את המשפט המלא', 'Type the full sentence here')}">${ex.type === 'correct' ? source : ''}</textarea>`);
      const ta = $('textarea', root);
      setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 50);
      offs.push(on(root, 'input', 'textarea', () => onChange(Boolean(ta.value.trim()) && normalize(ta.value) !== normalize(ex.type === 'correct' ? source : ''))));
      offs.push(on(root, 'keydown', 'textarea', (e) => { if (e.key === 'Enter' && !e.shiftKey) e.preventDefault(); }));
      ctl.ready = () => Boolean(ta.value.trim()) && (ex.type !== 'correct' || normalize(ta.value) !== normalize(source));
      ctl.check = async () => {
        ta.readOnly = true;
        const r = checkTyped(ta.value, ex.answers, ex.wrong_feedback);
        const f = !r.correct && findWrongFeedback(ta.value, ex.wrong_feedback);
        return result({ correct: r.correct, almost: r.almost, score: r.correct ? 1 : 0, response: ta.value, answer: ex.answers[0], specific: f?.feedback || null, error_type: f?.error_type, model: !r.correct && !f && isOpenRewrite(ex, level) });
      };
      break;
    }

    case 'dictation': {
      render(root, html`${prompt}${listenButtons(ex.audio_text)}
        <label class="sr-only" for="dc-${ex.id}">${tt('מה שמעתם', 'What you heard')}</label>
        <textarea class="input" id="dc-${ex.id}" rows="2" lang="en" dir="ltr" autocomplete="off" spellcheck="false" style="min-height:4.5rem;font-size:var(--t-lg)" placeholder="${tt('כתבו מה ששמעתם', 'Type what you hear')}"></textarea>`);
      sayHandler(ex.audio_text);
      setTimeout(() => root.querySelector('[data-say="normal"]')?.focus(), 60);
      const ta = $('textarea', root);
      offs.push(on(root, 'input', 'textarea', () => onChange(Boolean(ta.value.trim()))));
      ctl.ready = () => Boolean(ta.value.trim());
      ctl.check = async () => {
        ta.readOnly = true;
        const exact = checkTyped(ta.value, ex.answers);
        const acc = exact.correct ? { accuracy: 1, words: [] } : wordAccuracy(ta.value, ex.answers[0]);
        const correct = exact.correct || acc.accuracy >= 0.85;
        if (!exact.correct) root.insertAdjacentHTML('beforeend', `<div class="word-diff" lang="en" dir="ltr" style="margin-top:var(--s4)">${acc.words.map((w) => `<span class="${w.ok ? 'w-ok' : 'w-miss'}">${normalizeHtml(w.word)}</span>`).join(' ')}</div>`);
        return result({ correct, almost: correct && !exact.correct, score: acc.accuracy, response: ta.value, answer: ex.answers[0], error_type: 'spelling' });
      };
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
      render(root, html`${prompt}
        <article class="passage" lang="en" dir="ltr">${ex.title ? html`<h3 style="margin-bottom:var(--s3)">${ex.title}</h3>` : ''}${ex.passage.split(/\n\s*\n|\n/).map((p) => html`<p>${p}</p>`)}</article>
        ${canSpeak() ? html`<div class="row" style="margin-top:var(--s3)"><button type="button" class="key small" data-say="normal">${icon('volume', { size: 18 })} ${tt('הקראת הטקסט', 'Read it to me')}</button></div>` : ''}
        <div class="stack" style="margin-top:var(--s5)">${ex.questions.map((q, qi) => html`<fieldset class="panel flat stack-sm" style="margin:0" data-q="${qi}"><legend class="sr-only">${tt('שאלה', 'Question')} ${qi + 1}</legend>
          ${q.type === 'tf' ? html`<p lang="en" dir="ltr"><span class="faint num">${qi + 1}.</span> ${q.statement}</p><div class="row"><button type="button" class="key small" data-tf="${qi}" data-v="true" aria-pressed="false">True</button><button type="button" class="key small" data-tf="${qi}" data-v="false" aria-pressed="false">False</button></div>`
          : q.type === 'mcq' ? html`<p lang="en" dir="ltr"><span class="faint num">${qi + 1}.</span> ${q.question}</p><div class="options">${q.options.map((o, oi) => html`<button type="button" class="option" data-mq="${qi}" data-o="${oi}" aria-pressed="false" lang="en" dir="ltr">${o}</button>`)}</div>`
          : html`<p lang="en" dir="ltr"><span class="faint num">${qi + 1}.</span> ${q.text.split('___').map((p, i, a) => html`${p}${i < a.length - 1 ? html`<input class="gap-input" data-rg="${qi}" data-b="${i}" aria-label="${tt('מילה חסרה', 'Missing word')}" autocomplete="off" spellcheck="false">` : ''}`)}</p>`}
          <div class="q-fb" aria-live="polite"></div></fieldset>`)}</div>`);
      sayHandler(ex.passage);
      const done = () => ex.questions.every((q, qi) => (q.type === 'gap' ? $$(`[data-rg="${qi}"]`, root).every((i) => i.value.trim()) : answers.has(qi)));
      offs.push(on(root, 'click', '[data-tf]', (e, b) => { if (root.dataset.locked) return; const qi = Number(b.dataset.tf); answers.set(qi, b.dataset.v === 'true'); $$(`[data-tf="${qi}"]`, root).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); onChange(done()); }));
      offs.push(on(root, 'click', '[data-mq]', (e, b) => { if (root.dataset.locked) return; const qi = Number(b.dataset.mq); answers.set(qi, Number(b.dataset.o)); $$(`[data-mq="${qi}"]`, root).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); onChange(done()); }));
      offs.push(on(root, 'input', '[data-rg]', () => onChange(done())));
      ctl.ready = done;
      ctl.check = async () => {
        root.dataset.locked = '1';
        let right = 0;
        ex.questions.forEach((q, qi) => {
          let ok;
          if (q.type === 'gap') { const ins = $$(`[data-rg="${qi}"]`, root); ok = ins.every((inp, i) => checkTyped(inp.value, q.answers[i], q.wrong_feedback).correct); ins.forEach((i) => { i.readOnly = true; i.classList.add(ok ? 'right' : 'wrong'); }); }
          else ok = answers.get(qi) === q.answer;
          if (ok) right++;
          const box = $(`[data-q="${qi}"] .q-fb`, root);
          const ans = q.type === 'tf' ? String(q.answer) : q.type === 'mcq' ? q.options[q.answer] : q.answers.map(firstAnswer).join(' … ');
          render(box, html`<p class="small" style="color:${ok ? 'var(--ok)' : 'var(--bad)'}">${ok ? tt('נכון', 'Correct') : html`${tt('התשובה:', 'Answer:')} ${answerEl(ans)}`}</p>${q.explanation ? html`<p class="small muted">${bi(q.explanation)}</p>` : ''}`);
          if (q.type === 'mcq') $$(`[data-mq="${qi}"]`, root).forEach((b) => { b.disabled = true; if (Number(b.dataset.o) === q.answer) b.classList.add('is-right'); else if (b.getAttribute('aria-pressed') === 'true') b.classList.add('is-wrong'); });
          if (q.type === 'tf') $$(`[data-tf="${qi}"]`, root).forEach((b) => { b.disabled = true; });
        });
        const score = right / ex.questions.length;
        return result({ correct: score >= 0.99, almost: score >= 0.5 && score < 0.99, score, response: `${right}/${ex.questions.length}`, error_type: 'comprehension', summary: `${right}/${ex.questions.length}` });
      };
      break;
    }

    case 'write': {
      ctl.graded = false;
      render(root, html`${prompt}
        <div class="panel sunk small">${bi(ex.task)}${ex.must_include?.length ? html`<p class="xsmall" style="margin-top:var(--s2)">${tt('צריך לכלול:', 'Must include:')} ${ex.must_include.map((w) => html`<span class="tag" lang="en" dir="ltr">${w}</span> `)}</p>` : ''}</div>
        <label class="sr-only" for="wr-${ex.id}">${tt('הטקסט שלך', 'Your text')}</label>
        <textarea class="input" id="wr-${ex.id}" lang="en" dir="ltr" spellcheck="false" style="margin-top:var(--s4);min-height:10rem" placeholder="${tt('כתבו באנגלית…', 'Write in English…')}"></textarea>
        <p class="small faint num" data-wc>0 ${tt('מילים', 'words')} · ${tt('לפחות', 'at least')} ${ex.min_words}</p>`);
      const ta = $('textarea', root);
      offs.push(on(root, 'input', 'textarea', () => { const n = countWords(ta.value); $('[data-wc]', root).textContent = `${n} ${tt('מילים', 'words')} · ${tt('לפחות', 'at least')} ${ex.min_words}`; onChange(n >= Math.min(ex.min_words, 3)); }));
      ctl.ready = () => countWords(ta.value) >= Math.min(ex.min_words, 3);
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
          <div class="panel flat stack-sm"><h3 class="small">${tt('בדקו את עצמכם', 'Check yourself')}</h3>${ex.checklist.map((c) => html`<label class="row small"><input type="checkbox"> ${bi(c)}</label>`)}</div>
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

// The verdict shown in the player footer after checking: the result and the correct form first, the
// explanation one tap away behind "Why?" (research D7), so it never covers the exercise on a phone.
export function verdictHtml(ex, r, errors) {
  if (r.writing) return html`<div class="verdict-title">${icon('check', { size: 18 })} ${tt('נשמר. עברו על הבדיקות והדוגמה.', 'Saved. Go through the checks and the model.')}</div>`;
  if (r.speak || r.self != null) {
    const title = r.self === 1 ? tt('סימנתם: אמרתי בבירור', 'You marked it: said clearly') : r.self === 0 ? tt('נרשם: צריך עוד תרגול', 'Noted: more practice needed') : tt('תרגול דיבור נרשם', 'Speaking practice recorded');
    return html`<div class="verdict-title">${icon('check', { size: 18 })} ${title}</div><div class="verdict-body"><p class="muted">${tt('תרגול דיבור לא מקבל ציון.', 'Speaking practice is not scored.')}</p></div>`;
  }
  const title = r.correct ? (r.almost ? tt('כמעט! בדקו את הפרטים הקטנים', 'Almost! Check the small details') : tt('נכון', 'Correct')) : r.model ? tt('לא אחת מהתשובות שלנו', 'Not one of our answers') : tt('לא בדיוק', 'Not quite');
  const ico = r.correct ? 'check' : r.model ? 'info' : 'x';
  const note = !r.correct ? errorNote(r.error_type, errors, { general: !ex.explanation && !r.specific }) : '';
  const why = note || ex.explanation;
  return html`<div class="verdict-title">${icon(ico, { size: 18 })} ${title}${r.summary ? html` <span class="num">· ${r.summary}</span>` : ''}</div>
    <div class="verdict-body stack-sm">
      ${!r.correct && r.answer ? html`<p>${r.model ? tt('תשובה אחת לדוגמה:', 'One model answer:') : tt('התשובה הנכונה:', 'Correct answer:')} ${answerEl(r.answer)}</p>` : ''}
      ${!r.correct && r.fixes?.length ? html`<div><p>${tt('המקום של אלה:', 'Where these go:')}</p><ul class="fix-list" lang="en" dir="ltr">${r.fixes.map((g) => html`<li><span class="fix-cat">${g.category}:</span> <span class="answer">${g.items.join(', ')}</span></li>`)}</ul></div>` : ''}
      ${r.almost && r.answer && r.correct ? html`<p>${tt('הצורה המדויקת:', 'Exact form:')} ${answerEl(r.answer)}</p>` : ''}
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
