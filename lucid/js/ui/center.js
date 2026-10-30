// Shared pieces for the practice centers (reading, listening, speaking): exercises of given types
// gathered from every lesson on this device, grouped by level, their done status from recorded
// attempts, and a focused one-exercise player (same frame and keys as the lesson player).
import { html, render, on, $ } from '../core/util.js';
import { tt, legend } from '../core/i18n.js';
import { content } from '../core/content.js';
import { icon, levelTag, LEVEL_LABEL } from './components.js';
import { mountExercise, verdictHtml } from './exercise.js';
import { recordAttempt, settings, logEvent } from '../core/learner.js';
import { stopSpeaking } from '../core/speech.js';
import { LEVELS, levelIndex, lessonOrder } from '../core/adaptive.js';

// The "עב" reveal is handled by one document-level listener in app.js.
export const hebrewReveal = () => () => {};

// Every exercise whose type is in `types`, in curriculum order: [{ lesson, ex }].
export async function gatherExercises(types) {
  const [lessons, curriculum] = await Promise.all([content.allLessons(), content.curriculum()]);
  const order = new Map(lessonOrder(curriculum).map((l, i) => [l.id, i]));
  const items = [];
  for (const lesson of lessons) {
    (lesson.exercises || []).forEach((ex, i) => { if (types.includes(ex.type)) items.push({ lesson, ex, rank: (order.get(lesson.id) ?? 9999) * 100 + i }); });
  }
  return items.sort((a, b) => a.rank - b.rank);
}

export const itemHref = (base, item) => `#/${base}?l=${encodeURIComponent(item.lesson.id)}&e=${encodeURIComponent(item.ex.id)}`;
export const findItem = (items, query) => items.find((x) => x.lesson.id === query.l && x.ex.id === query.e) || null;

// Attempts on this exercise from anywhere (lesson, center): done = at least one.
export function attemptsOn(attempts, item) {
  return attempts.filter((a) => a.exercise === item.ex.id && a.lesson === item.lesson.id);
}
export function bestScore(list) {
  const scores = list.map((a) => a.score ?? (a.correct ? 1 : 0));
  return scores.length ? Math.max(...scores) : null;
}

export function groupByLevel(items) {
  return LEVELS.map((level) => ({ level, items: items.filter((x) => x.lesson.level === level) })).filter((g) => g.items.length);
}
// The recommended group: the learner's course level, or the nearest level below it that has items.
export function recommendedLevel(groups, courseLevel) {
  const below = groups.filter((g) => levelIndex(g.level) <= levelIndex(courseLevel));
  return below.length ? below[below.length - 1].level : null;
}
// Next suggestion: not done yet, at or below the course level, closest to it first.
export function nextSuggestion(items, attempts, courseLevel) {
  const ci = levelIndex(courseLevel);
  return items
    .filter((x) => levelIndex(x.lesson.level) <= ci && !attemptsOn(attempts, x).length)
    .sort((a, b) => levelIndex(b.lesson.level) - levelIndex(a.lesson.level) || a.rank - b.rank)[0] || null;
}

// Level heading for a group, with the recommended marker.
export function levelHeading(level, levelMeta, { recommended = false, above = false, id } = {}) {
  const meta = levelMeta.get(level);
  return html`<div class="row between">
    <h2 id="${id}">${LEVEL_LABEL[level]}${meta ? html` · ${legend(meta.name_en, meta.name_he)}` : ''}</h2>
    ${recommended ? html`<span class="tag cobalt">${tt('מומלץ לרמה שלך', 'Recommended for your level')}</span>` : above ? html`<span class="small faint">${tt('מעל הרמה הנוכחית: אתגר', 'Above your current level: a stretch')}</span>` : ''}
  </div>`;
}

// The shell's deck, tab bar and top bar step aside while one exercise is open (as in a lesson).
export function focusMode(onOff) {
  document.body.classList.toggle('bare', onOff);
  for (const id of ['deck', 'tabbar', 'top']) { const n = document.getElementById(id); if (n) n.hidden = onOff; }
}

// One exercise in a focused player: Check (enabled when ready) -> verdict -> Continue back to the list.
// Returns the view's cleanup function.
export function runPlayer(el, ctx, { item, back, backLabel, source, skill, errors, event }) {
  const { lesson, ex } = item;
  const variant = settings().english_variant;
  let ctl = null;
  let checked = false;
  const shownAt = performance.now();
  focusMode(true);

  render(el, html`<div class="player">
    <div class="player-top">
      <a class="key ghost small icon-only" href="#/${back}" aria-label="${backLabel}">${icon('x')}</a>
      <h1 class="grow" style="font-size:var(--t-sm);font-weight:500">${legend(lesson.title_en, lesson.title_he)}</h1>
      ${levelTag(lesson.level)}
    </div>
    <div class="player-body"><div id="exroot"></div></div>
    <div class="player-foot" id="pfoot"><div class="inner"><span class="grow"></span><button type="button" class="key enter" data-check disabled>${ex.type === 'write' ? tt('שליחה', 'Submit') : tt('בדיקה', 'Check')} <span class="kbd">Enter</span></button></div></div>
  </div>`);
  el.focus({ preventScroll: true });

  ctl = mountExercise($('#exroot', el), ex, {
    errors, level: lesson.level, variant,
    onChange: (ready) => { const b = $('[data-check]', el); if (b) b.disabled = !ready; },
  });

  async function doCheck() {
    if (checked) return;
    checked = true;
    const r = await ctl.check();
    const base = { source, lesson: lesson.id, exercise: ex.id, topic: ex.topic || lesson.topics?.[0] || null, skill, level: lesson.level, latency_ms: Math.round(performance.now() - shownAt), response: r.response };
    if (r.graded === false) recordAttempt({ ...base, correct: true, score: null });
    else recordAttempt({ ...base, correct: r.correct, score: r.score ?? (r.correct ? 1 : 0), error_type: r.error_type });
    if (event) logEvent({ type: event, lesson: lesson.id, exercise: ex.id });
    const foot = $('#pfoot', el);
    foot.className = `player-foot ${r.graded === false ? 'ok' : r.correct ? (r.almost ? 'almost' : 'ok') : 'bad'}`;
    render(foot, html`<div class="inner"><div class="verdict" role="status">${verdictHtml(ex, r, errors)}</div><a class="key enter" href="#/${back}" data-next>${tt('המשך', 'Continue')} <span class="kbd">Enter</span></a></div>`);
    $('[data-next]', el)?.focus();
  }

  const offs = [
    on(el, 'click', '[data-check]', (e, b) => { if (!b.disabled) doCheck(); }),
    hebrewReveal(el),
  ];
  const onKey = (e) => {
    if (e.target.closest('dialog')) return;
    if (!checked && ctl?.onKey(e)) { e.preventDefault(); return; }
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    const btn = $('[data-next]', el) || $('[data-check]:not([disabled])', el);
    if (!btn) return;
    if (e.target.tagName === 'TEXTAREA' && !$('[data-next]', el) && ex.type === 'write') return;
    if ((e.target.tagName === 'BUTTON' || e.target.tagName === 'A') && e.target !== btn) return;
    e.preventDefault();
    btn.click();
  };
  document.addEventListener('keydown', onKey);
  return () => { offs.forEach((o) => o()); document.removeEventListener('keydown', onKey); ctl?.destroy?.(); stopSpeaking(); focusMode(false); };
}

// Player frame for a link that points at an exercise that is not on this device.
export function missingPlayer(el, { back, backLabel, title, body, cta }) {
  focusMode(true);
  render(el, html`<div class="player"><div class="player-top"><a class="key ghost small icon-only" href="#/${back}" aria-label="${backLabel}">${icon('x')}</a></div>
    <div class="player-body"><div class="empty"><h3>${title}</h3><p>${body}</p><a class="key enter" href="#/${back}">${cta}</a></div></div></div>`);
  return () => focusMode(false);
}
