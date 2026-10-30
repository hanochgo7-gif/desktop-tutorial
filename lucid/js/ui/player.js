// Runs a set of exercises in the focused player. Used by targeted drills and level checks.
// unassisted: no hints and no explanations until the end (a fair test of independent ability).
import { html, render, on, $ } from '../core/util.js';
import { tt, bi } from '../core/i18n.js';
import { icon, levelTag } from './components.js';
import { mountExercise, verdictHtml } from './exercise.js';
import { recordAttempt, settings } from '../core/learner.js';

export function runSet(el, items, { title, source, unassisted = false, exitHref = '#/practice', errors = null, onDone }) {
  let i = 0; let ctl = null; let shownAt = 0; let hintUsed = false; let checked = null;
  const results = [];
  const variant = settings().english_variant;

  function frame(body, foot) {
    render(el, html`<div class="player">
      <div class="player-top"><a class="key ghost small icon-only" href="${exitHref}" aria-label="${tt('יציאה', 'Exit')}">${icon('x')}</a>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${items.length}" aria-valuenow="${i}" aria-label="${title}"><span style="width:${(i / items.length) * 100}%"></span></div>
        <span class="small faint num">${Math.min(i + 1, items.length)}/${items.length}</span></div>
      <div class="player-body">${body}</div>
      ${foot ? html`<div class="player-foot" id="pfoot">${foot}</div>` : ''}</div>`);
  }

  function show() {
    ctl?.destroy?.();
    if (i >= items.length) { onDone(results); return; }
    const it = items[i];
    hintUsed = false; checked = null;
    frame(html`<p class="small faint row" style="margin-bottom:var(--s4)">${title} ${levelTag(it.level)}</p><div id="exroot"></div><div id="hintroot"></div>`,
      html`<div class="inner">${!unassisted && it.ex.hint ? html`<button type="button" class="key ghost small" data-hint>${icon('hint', { size: 18 })} ${tt('רמז', 'Hint')}</button>` : ''}<button type="button" class="key ghost small" data-idk>${tt('לא יודע/ת', 'I don\'t know')}</button><span class="grow"></span><button type="button" class="key enter" data-check disabled>${tt('בדיקה', 'Check')} <span class="kbd">Enter</span></button></div>`);
    ctl = mountExercise($('#exroot', el), it.ex, { errors, level: it.level, variant, onChange: (r) => { const b = $('[data-check]', el); if (b) b.disabled = !r; } });
    shownAt = performance.now();
  }

  async function check(dontKnow) {
    const it = items[i];
    const r = dontKnow ? { graded: true, correct: false, score: 0, response: '(I don\'t know)' } : await ctl.check();
    checked = r;
    const points = r.correct ? (hintUsed ? 0.75 : r.almost ? 0.9 : 1) : Math.min(0.5, r.score || 0);
    results.push({ item: it, r, points, correct: r.correct });
    recordAttempt({ source, lesson: it.lesson, exercise: it.ex.id, topic: it.topic, skill: it.ex.skill, level: it.level, correct: r.correct, score: r.score ?? (r.correct ? 1 : 0), error_type: r.error_type, hint_used: hintUsed, latency_ms: Math.round(performance.now() - shownAt), response: r.response });
    if (unassisted) { i++; show(); return; }
    const foot = $('#pfoot', el);
    foot.className = `player-foot ${r.correct ? (r.almost ? 'almost' : 'ok') : 'bad'}`;
    render(foot, html`<div class="inner"><div class="verdict" role="status">${verdictHtml(it.ex, r, errors)}</div><button type="button" class="key enter" data-next>${tt('המשך', 'Continue')} <span class="kbd">Enter</span></button></div>`);
    $('[data-next]', el).focus();
  }

  show();
  const offs = [
    on(el, 'click', '[data-check]', (e, b) => { if (!b.disabled) check(false); }),
    on(el, 'click', '[data-idk]', () => check(true)),
    on(el, 'click', '[data-next]', () => { i++; show(); }),
    on(el, 'click', '[data-hint]', (e, b) => { hintUsed = true; b.remove(); render($('#hintroot', el), html`<div class="hint-box">${icon('hint', { size: 18 })}<div>${bi(items[i].ex.hint)}</div></div>`); }),
  ];
  const onKey = (e) => {
    if (ctl?.onKey?.(e)) { e.preventDefault(); return; }
    if (e.key !== 'Enter' || e.isComposing || e.shiftKey) return;
    const b = $('[data-next]', el) || $('[data-check]:not([disabled])', el);
    if (b && (e.target.tagName !== 'BUTTON' || e.target === b)) { e.preventDefault(); b.click(); }
  };
  document.addEventListener('keydown', onKey);
  return () => { offs.forEach((o) => o()); document.removeEventListener('keydown', onKey); ctl?.destroy?.(); };
}
