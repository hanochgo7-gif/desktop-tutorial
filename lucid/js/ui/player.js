// Runs a set of exercises in the focused player. Used by targeted drills and level checks.
// unassisted: no hints and no explanations until the end (a fair test of independent ability).
import { html, render, on, $ } from '../core/util.js';
import { t, tt, bi, hebrewSupport, isolateLatin } from '../core/i18n.js';
import { icon, levelTag } from './components.js';
import { mountExercise, verdictHtml, selfJudgedHtml, answerFor } from './exercise.js';
import { recordAttempt, settings, logEvent } from '../core/learner.js';
import { store } from '../core/store.js';
import { answerPoints, retrySafe } from '../core/pool.js';

// Leaving a lesson, drill or level check returns to the screen the learner came from (LF-11): the path, a
// practice hub, Progress. Another player screen, onboarding or nothing at all (a link opened directly) falls
// back to the given screen. from is the router's ctx.from ("#/path/A2").
const PLAYERS = /^(?:lesson|checkpoint|drill|review|placement|start|welcome)(?:\/|\?|$)/;
export function exitTarget(from, fallback = 'today') {
  const path = String(from || '').replace(/^#?\/?/, '');
  const back = path && !PLAYERS.test(path) ? `#/${path}` : null;
  return back || (String(fallback).startsWith('#') ? fallback : `#/${fallback}`);
}

// The result footer never takes more than 45% of the screen (r4 LF-3): the verdict scrolls inside it, with a
// fade and a "More" cue at its foot while there is more below. Called after every footer render, and again when
// "Why?" opens or the window changes size.
export const FOOT_SHARE = 0.45;
export function fitFooter(foot) {
  const v = foot?.querySelector('.verdict');
  if (!v) return;
  v.style.maxHeight = '';
  v.dataset.more = tt('עוד', 'More');
  const over = foot.getBoundingClientRect().height - Math.floor(innerHeight * FOOT_SHARE);
  if (over > 0) v.style.maxHeight = `${Math.max(48, Math.floor(v.getBoundingClientRect().height - over))}px`;
  const mark = () => {
    const extra = v.scrollHeight - v.clientHeight;
    v.classList.toggle('fade', extra > 2 && v.scrollTop < extra - 2);
  };
  mark();
  if (!v.dataset.fitted) {
    v.dataset.fitted = '1';
    v.addEventListener('scroll', mark, { passive: true });
    v.addEventListener('toggle', () => fitFooter(foot), true);
  }
}
// One resize listener per player screen: the footer is fitted again when the window changes size.
export function fitOnResize(el) {
  const fit = () => fitFooter(el.querySelector('#pfoot'));
  addEventListener('resize', fit);
  return () => removeEventListener('resize', fit);
}

// The note before a second try, in the support language only, never with the answer in it (r4 LF-2, LF-10).
export function retryNote(r, ex, errorInfo = null) {
  const lang = hebrewSupport() === 'off' ? 'en' : 'he';
  const pick = (n) => retrySafe(n, ex, r.response)?.[lang] || null;
  const text = pick(r.retry_note || r.specific) || pick(ex.hint);
  if (text) return lang === 'he' ? html`<span lang="he" dir="rtl">${isolateLatin(text)}</span>` : html`<span lang="en" dir="ltr">${text}</span>`;
  if (errorInfo) return html`${tt(errorInfo.name_he, errorInfo.name_en)}${lang === 'he' && errorInfo.why_he ? html`: <span lang="he" dir="rtl">${isolateLatin(errorInfo.why_he)}</span>` : ''}`;
  return tt('בדקו שוב את התשובה.', 'Check your answer again.');
}

// focusError: the drill's own mistake type, for the Hebrew-speaker pitfall under "Why?" (r4 LF-10). pitfall: one
// pitfall for the whole set, used when an item's own lesson has none for this kind of mistake.
export function runSet(el, items, { title, source, unassisted = false, exitHref = '#/today', errors = null, focusError = null, pitfall = null, onDone }) {
  let i = 0; let ctl = null; let shownAt = 0; let hintUsed = false; let checked = null; let lastAttempt = null; let token = 0;
  let secondTry = false; // the learner is fixing a wrong typed answer (r4 LF-10, as in lessons)
  const results = [];
  const variant = settings().english_variant;

  function frame(body, foot) {
    // The same top and footer as the lesson player (r4 LF-3, LF-13): the exit key with its word, one row at large text.
    render(el, html`<div class="player lesson-player">
      <div class="player-top counting"><a class="key ghost small exit-key" href="${exitHref}" aria-label="${tt('יציאה', 'Exit')}">${icon('x')}<span class="exit-label" aria-hidden="true">${tt('יציאה', 'Exit')}</span></a>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${items.length}" aria-valuenow="${i}" aria-label="${title}"><span style="width:${(i / items.length) * 100}%"></span></div>
        <span class="top-meta is-count"><span class="step-count">${t('of', { a: Math.min(i + 1, items.length), b: items.length })}</span></span></div>
      <div class="player-body">${body}</div>
      ${foot ? html`<div class="player-foot" id="pfoot">${foot}</div>` : ''}</div>`);
  }

  // A new item puts focus on its prompt unless it focused its own answer field (LF-5).
  function focusPrompt(k) {
    if (k !== token) return;
    const a = document.activeElement;
    if (a && $('#exroot', el)?.contains(a) && ['INPUT', 'TEXTAREA'].includes(a.tagName)) return;
    const h = $('#exroot .ex-prompt', el);
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }

  function show() {
    ctl?.destroy?.();
    if (i >= items.length) { onDone(results); return; }
    const it = items[i];
    hintUsed = false; checked = null; lastAttempt = null; secondTry = false;
    const k = ++token;
    frame(html`<p class="small faint row" style="margin-bottom:var(--s4)">${title} ${levelTag(it.level)}</p><div id="exroot"></div><div id="hintroot"></div>`,
      html`<div class="inner">${!unassisted && it.ex.hint ? html`<button type="button" class="key ghost small" data-hint>${icon('hint', { size: 18 })} ${tt('רמז', 'Hint')}</button>` : ''}<button type="button" class="key ghost small" data-idk>${tt('לא יודע/ת', 'I don\'t know')}</button><span class="grow"></span><button type="button" class="key enter" data-check disabled>${tt('בדיקה', 'Check')} <span class="kbd">Enter</span></button></div>`);
    ctl = mountExercise($('#exroot', el), it.ex, { errors, level: it.level, variant, onChange: (r) => { const b = $('[data-check]', el); if (b) b.disabled = !r; } });
    window.scrollTo?.(0, 0);
    shownAt = performance.now();
    setTimeout(() => focusPrompt(k), 90);
  }

  async function check(dontKnow) {
    const it = items[i];
    const r = dontKnow ? { graded: true, correct: false, score: 0, response: '(I don\'t know)', ...answerFor(it.ex) } : await ctl.check();
    const wasSecond = secondTry;
    secondTry = false;
    checked = r;
    const attempt = { source, lesson: it.lesson, exercise: it.ex.id, topic: it.topic, skill: it.ex.skill, level: it.level, correct: r.correct, score: r.score ?? (r.correct ? 1 : 0), error_type: r.error_type, hint_used: hintUsed, latency_ms: Math.round(performance.now() - shownAt), response: r.response };
    if (wasSecond) {
      // The second try is recorded, but the set's score keeps the first answer, as in lessons.
      lastAttempt = recordAttempt(attempt);
      results[results.length - 1].second = r;
    } else {
      // The same points as in lessons: a reading text or a sort counts per question (LF-9).
      const points = answerPoints(r, hintUsed, it.ex.type);
      results.push({ item: it, r, points, correct: r.correct });
      lastAttempt = recordAttempt(attempt);
    }
    if (unassisted) { i++; show(); return; }
    // A wrong typed answer gets a note and a second try before the answer, as in lessons (r4 LF-10). Choices never do.
    if (!dontKnow && !r.correct && !r.model && !wasSecond && ctl.retryable && typeof ctl.reopen === 'function') { showSecondTry(r); return; }
    // After a second try the learner cannot count the answer themselves (r4 LF-2).
    if (wasSecond && r.model) checked = { ...r, noSelf: true };
    showResult(checked);
  }
  function showResult(r) {
    const it = items[i];
    const foot = $('#pfoot', el);
    const perQ = !r.correct && ['read', 'categorize'].includes(it.ex.type) && (r.score ?? 0) >= 0.6 - 1e-9;
    foot.className = `player-foot ${r.correct ? (r.almost ? 'almost' : 'ok') : (r.model || perQ) ? 'almost' : 'bad'}`;
    render(foot, html`<div class="inner"><div class="verdict" role="status">${verdictHtml(it.ex, r, errors)}</div><button type="button" class="key enter" data-next>${t('continue')} <span class="kbd">Enter</span></button></div>`);
    if (r.noSelf) $('.self-judge', foot)?.remove();
    if (!r.correct) addPitfallWhy(foot, it, r);
    fitFooter(foot);
    $('[data-next]', el).focus();
  }
  // The lesson's Hebrew-speaker pitfall for this kind of mistake, under "Why?" (r4 LF-10, as LF-8 does in lessons).
  function addPitfallWhy(foot, it, r) {
    if (hebrewSupport() === 'off') return;
    const type = r.error_type || focusError || it.ex.error_type;
    const p = (it.pitfalls || []).find((x) => x.error_type === type) || (pitfall && (!type || pitfall.error_type === type) ? pitfall : null);
    if (!p) return;
    let why = $('details.why > div', foot);
    if (!why) {
      $('.verdict-body', foot)?.insertAdjacentHTML('beforeend', String(html`<details class="why"><summary>${tt('למה?', 'Why?')}</summary><div class="stack-sm"></div></details>`));
      why = $('details.why > div', foot);
    }
    why?.insertAdjacentHTML('beforeend', String(html`<div class="pitfall-why"><p class="pitfall-head small">${icon('flag', { size: 14 })} ${tt('מלכודת לדוברי עברית', 'A trap for Hebrew speakers')}</p>${bi(p)}</div>`));
  }
  // Fix it yourself: the note (never the answer), the learner's text kept, and two ways on (r4 LF-10).
  function showSecondTry(r) {
    const it = items[i];
    const foot = $('#pfoot', el);
    el.querySelectorAll('#exroot .word-diff').forEach((d) => { d.hidden = true; });
    foot.className = 'player-foot almost';
    render(foot, html`<div class="inner"><div class="verdict" role="status"><div class="verdict-title">${icon('info', { size: 18 })} ${tt('עוד לא. אפשר לתקן בעצמכם', 'Not yet. You can fix it yourself')}</div><div class="verdict-body"><p>${retryNote(r, it.ex, errors?.get(r.error_type || focusError || it.ex.error_type) || null)}</p></div></div>
      <button type="button" class="key ghost" data-show-answer>${tt('להציג את התשובה', 'Show the answer')}</button><button type="button" class="key enter" data-try-again>${tt('לנסות שוב', 'Try again')} <span class="kbd">Enter</span></button></div>`);
    fitFooter(foot);
    $('[data-try-again]', el)?.focus();
  }
  function tryAgain() {
    secondTry = true;
    ctl.reopen();
    const foot = $('#pfoot', el);
    foot.className = 'player-foot';
    render(foot, html`<div class="inner"><span class="grow"></span><button type="button" class="key enter" data-check>${tt('בדיקה', 'Check')} <span class="kbd">Enter</span></button></div>`);
    const b = $('[data-check]', el);
    if (b) b.disabled = !ctl.ready();
    $('#exroot :is(input, textarea):not([readonly])', el)?.focus();
  }
  function showAnswer() {
    el.querySelectorAll('#exroot .word-diff').forEach((d) => { d.hidden = false; });
    showResult(checked);
  }

  // "My answer is also correct" on an open rewrite (B1+): the result and the attempt become right, marked self-judged.
  function selfJudge() {
    const it = items[i];
    const last = results[results.length - 1];
    if (!checked?.model || checked.correct || checked.noSelf || last?.item !== it) return;
    checked = { ...checked, correct: true, self_judged: true };
    Object.assign(last, { r: checked, correct: true, points: hintUsed ? 0.75 : 1 });
    if (lastAttempt) store.put('attempts', { ...lastAttempt, correct: true, score: 1, error_type: null, self_judged: true });
    logEvent({ type: 'self-judged', source, lesson: it.lesson, exercise: it.ex.id, response: String(checked.response || '').slice(0, 300) });
    const foot = $('#pfoot', el);
    foot.className = 'player-foot ok';
    render(foot, html`<div class="inner"><div class="verdict" role="status">${selfJudgedHtml(checked)}</div><button type="button" class="key enter" data-next>${t('continue')} <span class="kbd">Enter</span></button></div>`);
    $('[data-next]', el).focus();
  }

  show();
  const offs = [
    on(el, 'click', '[data-check]', (e, b) => { if (!b.disabled) check(false); }),
    on(el, 'click', '[data-idk]', () => check(true)),
    on(el, 'click', '[data-next]', () => { i++; show(); }),
    on(el, 'click', '[data-self-judge]', () => selfJudge()),
    on(el, 'click', '[data-try-again]', () => tryAgain()),
    on(el, 'click', '[data-show-answer]', () => showAnswer()),
    on(el, 'click', '[data-hint]', (e, b) => { hintUsed = true; b.remove(); render($('#hintroot', el), html`<div class="hint-box">${icon('hint', { size: 18 })}<div>${bi(items[i].ex.hint)}</div></div>`); const f = $('#exroot :is(input, textarea):not([readonly])', el); if (f) f.focus(); else focusPrompt(token); }),
  ];
  const onKey = (e) => {
    if (e.target.closest?.('dialog')) return;
    if (ctl?.onKey?.(e)) { e.preventDefault(); return; }
    if (e.key !== 'Enter' || e.isComposing || e.shiftKey) return;
    const b = $('[data-next]', el) || $('[data-try-again]', el) || $('[data-check]:not([disabled])', el);
    // Enter on another control (a button, a link, the "Why?" toggle) does that control's own job.
    if (b && (!['BUTTON', 'A', 'SUMMARY'].includes(e.target.tagName) || e.target === b)) { e.preventDefault(); b.click(); }
  };
  document.addEventListener('keydown', onKey);
  const offResize = fitOnResize(el);
  return () => { offs.forEach((o) => o()); offResize(); document.removeEventListener('keydown', onKey); ctl?.destroy?.(); };
}
