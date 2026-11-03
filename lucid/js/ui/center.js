// Shared pieces for the practice centers (reading, listening, speaking): exercises of given types
// gathered from every lesson on this device, grouped by level, their done status from recorded
// attempts, and a focused one-exercise player (same frame and keys as the lesson player).
import { html, render, on, $ } from '../core/util.js';
import { tt, legend } from '../core/i18n.js';
import { content } from '../core/content.js';
import { icon, levelTag, LEVEL_LABEL } from './components.js';
import { mountExercise, verdictHtml, answerFor } from './exercise.js';
import { recordAttempt, settings, logEvent } from '../core/learner.js';
import { stopSpeaking, canSpeak, SPEECH_EVENT } from '../core/speech.js';
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
// Attempts with no score (nothing was heard, speaking practice) are not results.
export function bestScore(list) {
  const scores = list.filter((a) => a.score !== null).map((a) => a.score ?? (a.correct ? 1 : 0));
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
// Next suggestion: not done yet, at or below the course level, closest to it first. Items from lessons the learner
// has started or completed come first (UX r3 PH-6), so "next" is never a lesson they have not met while one they
// have met still has something to practise; after those, the learner's next lesson (nextId, UX r4 PG-12).
// progress: the learner model's Map of lesson progress.
export const metLesson = (progress, item) => ['started', 'completed'].includes(progress?.get(item?.lesson.id)?.status);
export function nextSuggestion(items, attempts, courseLevel, progress = new Map(), nextId = null) {
  const ci = levelIndex(courseLevel);
  const met = (x) => metLesson(progress, x);
  const isNext = (x) => Boolean(nextId) && x.lesson.id === nextId;
  return items
    .filter((x) => levelIndex(x.lesson.level) <= ci && !attemptsOn(attempts, x).length)
    .sort((a, b) => met(b) - met(a) || isNext(b) - isNext(a) || levelIndex(b.lesson.level) - levelIndex(a.lesson.level) || a.rank - b.rank)[0] || null;
}
// The level groups in the order a hub shows them (PH-6, as the Reading centre does): the recommended level, the
// levels above it, then the easier ones, closest first.
export function orderedGroups(groups, recommended) {
  const ri = recommended ? levelIndex(recommended) : -1;
  return [...groups.filter((g) => levelIndex(g.level) >= ri), ...groups.filter((g) => levelIndex(g.level) < ri).reverse()];
}

// Level heading for a group, with the recommended marker.
export function levelHeading(level, levelMeta, { recommended = false, above = false, id } = {}) {
  const meta = levelMeta.get(level);
  return html`<div class="row between">
    <h2 id="${id}">${LEVEL_LABEL[level]}${meta ? html` · ${legend(meta.name_en, meta.name_he)}` : ''}</h2>
    ${recommended ? html`<span class="tag cobalt">${tt('מומלץ לרמה שלכם', 'Recommended for your level')}</span>` : above ? html`<span class="small faint">${tt('מעל הרמה הנוכחית: אתגר', 'Above your current level: a stretch')}</span>` : ''}
  </div>`;
}

// The shell's deck, tab bar and top bar step aside while one exercise is open (as in a lesson).
export function focusMode(onOff) {
  document.body.classList.toggle('bare', onOff);
  for (const id of ['deck', 'tabbar', 'top']) { const n = document.getElementById(id); if (n) n.hidden = onOff; }
}

// A listening item counts only when it was heard (UX r4 PG-15, contract (b) with exercise.js): a result marked
// unheard:true is stored with no score, as in lessons. exercise.js marks a listen item (EX-4); the player also sees
// it itself, as a safety net: a listen item on a browser that cannot speak, or one whose audio stayed silent every
// time it was played. Dictation is scored as in lessons, where only listen items can be unheard (EX-4, LF-5).
export const LISTEN_TYPES = ['listen'];
export function wasUnheard(r, ex, { speech = true, started = false, silent = false } = {}) {
  if (r?.unheard === true) return true;
  if (!LISTEN_TYPES.includes(ex.type) || r?.graded === false || r?.dontKnow) return false;
  return !speech || (silent && !started);
}

// One exercise in a focused player: Check (enabled when ready) -> verdict -> Continue back to the list. A graded
// item also has "לא יודע/ת" (UX r4 PG-15): a wrong first try, with the answer shown, as in the lessons.
// Returns the view's cleanup function.
export function runPlayer(el, ctx, { item, back, backLabel, source, skill, errors, event }) {
  const { lesson, ex } = item;
  const variant = settings().english_variant;
  let ctl = null;
  let checked = false;
  const shownAt = performance.now();
  const heard = { speech: canSpeak(), started: false, silent: false };
  const onSpeech = (e) => { const st = e.detail?.state; if (st === 'start') heard.started = true; else if (st === 'silent' || st === 'error') heard.silent = true; };
  document.addEventListener(SPEECH_EVENT, onSpeech);
  focusMode(true);

  render(el, html`<div class="player">
    <div class="player-top">
      <a class="key ghost small icon-only" href="#/${back}" aria-label="${backLabel}">${icon('x')}</a>
      <h1 class="grow" style="font-size:var(--t-sm);font-weight:500">${legend(lesson.title_en, lesson.title_he)}</h1>
      ${levelTag(lesson.level)}
    </div>
    <div class="player-body"><div id="exroot"></div></div>
    <div class="player-foot" id="pfoot"><div class="inner"><span class="grow" data-idk-slot></span><button type="button" class="key enter" data-check disabled>${ex.type === 'write' ? tt('שליחה', 'Submit') : ex.type === 'speak' ? tt('סיום', 'Done') : tt('בדיקה', 'Check')} <span class="kbd">Enter</span></button></div></div>
  </div>`);
  el.focus({ preventScroll: true });

  ctl = mountExercise($('#exroot', el), ex, {
    errors, level: lesson.level, variant,
    onChange: (ready) => { const b = $('[data-check]', el); if (b) b.disabled = !ready; },
  });
  // "I don't know" for a graded item; speaking and writing practice is never scored, so it has none.
  if (ctl.graded !== false) render($('[data-idk-slot]', el), html`<button type="button" class="key ghost" data-dontknow>${tt('לא יודע/ת', 'I don\'t know')}</button>`);

  async function doCheck({ dontKnow = false } = {}) {
    if (checked) return;
    checked = true;
    let r;
    if (dontKnow) {
      r = { graded: true, correct: false, score: 0, response: '(I don\'t know)', error_type: null, ...answerFor(ex), dontKnow: true };
      // The exercise stays, with its answer marked in it, when it can show it.
      if (typeof ctl.reveal === 'function') ctl.reveal();
    } else {
      r = await ctl.check();
    }
    const unheard = wasUnheard(r, ex, heard);
    const base = { source, lesson: lesson.id, exercise: ex.id, topic: ex.topic || lesson.topics?.[0] || null, skill, level: lesson.level, latency_ms: Math.round(performance.now() - shownAt), response: r.response };
    if (r.graded === false) recordAttempt({ ...base, correct: true, score: null });
    else if (unheard) recordAttempt({ ...base, correct: false, score: null });
    else recordAttempt({ ...base, correct: r.correct, score: r.score ?? (r.correct ? 1 : 0), error_type: r.error_type });
    if (event) logEvent({ type: event, lesson: lesson.id, exercise: ex.id });
    const foot = $('#pfoot', el);
    foot.className = `player-foot ${r.graded === false ? 'ok' : unheard || r.dontKnow ? 'shown' : r.correct ? (r.almost ? 'almost' : 'ok') : 'bad'}`;
    render(foot, html`<div class="inner"><div class="verdict" role="status">${verdictHtml(ex, r, errors)}</div><a class="key enter" href="#/${back}" data-next>${tt('המשך', 'Continue')} <span class="kbd">Enter</span></a></div>`);
    const title = $('.verdict-title', foot);
    // Nothing was heard: the answer is shown and the item is not counted, right or wrong.
    if (title && unheard) render(title, html`${icon('info', { size: 18 })} ${tt('נשמע? לא נספר', 'Heard? Not counted')}`);
    else if (title && r.dontKnow) render(title, html`${icon('info', { size: 18 })} ${tt('הנה התשובה', 'Here is the answer')}`);
    if (unheard) $('.verdict-body', foot)?.insertAdjacentHTML('afterbegin', String(html`<p class="small muted" data-unheard>${tt('ההקלטה לא הושמעה, ולכן התרגיל לא נספר בתוצאות. אפשר לנסות שוב כשיש קול.', 'The audio did not play, so this item is not counted in your results. Try again when sound works.')}</p>`));
    $('[data-next]', el)?.focus();
  }

  const offs = [
    on(el, 'click', '[data-check]', (e, b) => { if (!b.disabled) doCheck(); }),
    on(el, 'click', '[data-dontknow]', () => doCheck({ dontKnow: true })),
    hebrewReveal(el),
  ];
  const onKey = (e) => {
    if (e.target.closest('dialog')) return;
    if (!checked && ctl?.onKey(e)) { e.preventDefault(); return; }
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    const btn = $('[data-next]', el) || $('[data-check]:not([disabled])', el);
    if (!btn) return;
    if (e.target.tagName === 'TEXTAREA' && !$('[data-next]', el) && ex.type === 'write') return;
    if (['BUTTON', 'A', 'SUMMARY'].includes(e.target.tagName) && e.target !== btn) return;
    e.preventDefault();
    btn.click();
  };
  document.addEventListener('keydown', onKey);
  return () => { offs.forEach((o) => o()); document.removeEventListener('keydown', onKey); document.removeEventListener(SPEECH_EVENT, onSpeech); ctl?.destroy?.(); stopSpeaking(); focusMode(false); };
}

// Player frame for a link that points at an exercise that is not on this device.
export function missingPlayer(el, { back, backLabel, title, body, cta }) {
  focusMode(true);
  render(el, html`<div class="player"><div class="player-top"><a class="key ghost small icon-only" href="#/${back}" aria-label="${backLabel}">${icon('x')}</a></div>
    <div class="player-body"><div class="empty"><h3>${title}</h3><p>${body}</p><a class="key enter" href="#/${back}">${cta}</a></div></div></div>`);
  return () => focusMode(false);
}
