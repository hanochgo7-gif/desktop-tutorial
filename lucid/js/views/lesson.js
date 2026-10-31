// Lesson player: intro -> explanation -> practice -> review.
// Wrong answers show the right answer at once and come back once at the end of the set
// (retrieval after a delay). Only the first attempt counts toward the lesson score, and only scored
// exercises count: speaking and writing are practice, never part of the score or its denominator.
// After "Nearly there" the learner can redo only the exercises missed on the first try; their earlier
// right answers keep counting, so fixing the misses can complete the lesson.
import { html, render, on, $ } from '../core/util.js';
import { t, tt, bi, legend, hebrewSupport, isolateLatin } from '../core/i18n.js';
import { content, taxonomyIndex } from '../core/content.js';
import { icon, levelTag } from '../ui/components.js';
import { mountExercise, verdictHtml, selfJudgedHtml, answerFor } from '../ui/exercise.js';
import { recordAttempt, startLesson, finishLesson, progressOf, settings, model, newBudgetToday, logEvent, todayPlan, allCards } from '../core/learner.js';
import { store } from '../core/store.js';
import { say, canSpeak, stopSpeaking } from '../core/speech.js';
import { lessonOrder } from '../core/adaptive.js';

// ---------- scoring and counting (pure, unit-tested) ----------
export const UNSCORED = new Set(['write', 'speak']);
export const scoredExercises = (lesson) => lesson.exercises.filter((e) => !UNSCORED.has(e.type));
// First-try points per exercise id -> lesson score (0..1). A lesson with nothing to score counts as done.
export function lessonScore(firstTry, lesson) {
  const scored = scoredExercises(lesson);
  if (!scored.length) return 1;
  return scored.reduce((a, e) => a + (firstTry.get(e.id) || 0), 0) / scored.length;
}
// Points for one answer: right 1, right after a hint 0.75, right with a spelling slip 0.9, wrong up to 0.5.
export const answerPoints = (r, hintUsed) => (r.correct ? (hintUsed ? 0.75 : r.almost ? 0.9 : 1) : Math.min(0.5, r.score || 0));
// A pass is 70% of first-try points (or the lesson's own mark). The small margin keeps a sum of 0.75 and 0.9
// points that should be exactly 70% from falling short by a rounding error.
export const isPass = (score, pass = 0.7) => score >= pass - 1e-9;
// The score in words: below the pass mark it is rounded down, so a 69.6% miss never reads "70%" next to
// "70% completes the lesson" (R2-26).
export const scorePercent = (score, passed) => (passed ? Math.round(score * 100) : Math.floor(score * 100 + 1e-6));
// Why a score is lower than the number of right answers suggests: a right answer after a hint counts 0.75 and
// one with a spelling slip 0.9.
export function partialCredit(firstTry) {
  const v = [...firstTry.values()];
  return { hint: v.some((x) => x === 0.75), slip: v.some((x) => x === 0.9) };
}
// About how long redoing n exercises takes, at the lesson's own pace (the explanation counts as two).
export const missedMinutes = (lesson, n) => Math.max(1, Math.round(n * (lesson.minutes / (lesson.exercises.length + 2))));
// First-pass exercises before position qi (retries are counted apart, as on the step counter).
export const firstDone = (queue, qi) => queue.slice(0, qi).filter((q) => !q.retry).length;
// Today's part ends once the first pass reaches the plan's "up to exercise N" (R2-28): only on the first pass,
// only once, never in a run of only the missed exercises, and only when exercises are left after it.
export function partEnds(part, queue, qi, finished) {
  if (!part || part.done || part.shown || !finished || finished.retry || qi >= queue.length) return false;
  return part.upto < queue.filter((q) => !q.retry).length && firstDone(queue, qi) === part.upto;
}

// Scored exercises whose first try was wrong (or never answered).
export function missedIds(firstTry, lesson) {
  return scoredExercises(lesson).filter((e) => (firstTry.get(e.id) ?? 0) <= 0.5).map((e) => e.id);
}
// Where the learner is: the first pass has a fixed total; retries are counted on their own.
export function stepInfo(queue, qi) {
  const cur = queue[qi];
  if (!cur) return null;
  const upTo = queue.slice(0, qi + 1);
  if (cur.retry) return { retry: true, pos: upTo.filter((q) => q.retry).length, total: queue.filter((q) => q.retry).length, pending: 0 };
  return { retry: false, pos: upTo.filter((q) => !q.retry).length, total: queue.filter((q) => !q.retry).length, pending: queue.slice(qi + 1).filter((q) => q.retry).length };
}
// "3 מתוך 14" / "3 of 14": words, so the numbers never read backwards in Hebrew (P-12).
export function stepLabel(s) {
  if (!s) return '';
  const of = t('of', { a: s.pos, b: s.total });
  if (s.retry) return `${tt('חוזרים', 'Revisit')} ${of}`;
  return s.pending ? `${of} · ${tt(`${s.pending} לחזרה`, `${s.pending} to revisit`)}` : of;
}
// Progress bar: moves forward only, the first pass up to 94%, retries the rest.
export function stepPct(s) {
  if (!s) return 100;
  return Math.round(s.retry ? 94 + (6 * (s.pos - 1)) / s.total : 6 + (88 * (s.pos - 1)) / s.total);
}
const HEBREW = /[֐-׿]/;

export function renderBlocks(blocks) {
  return blocks.map((b) => {
    switch (b.type) {
      // Explanation paragraphs fold their Hebrew at "partial" support (a tap per paragraph, R1-D10).
      case 'rule': return html`<div class="block-rule">${bi(b, { fold: true })}</div>`;
      case 'tip': return html`<div class="block-tip row" style="align-items:flex-start">${icon('hint', { size: 18 })}<div class="grow">${bi(b, { fold: true })}</div></div>`;
      case 'warning': return html`<div class="block-warning row" style="align-items:flex-start">${icon('alert', { size: 18 })}<div class="grow">${bi(b, { fold: true })}</div></div>`;
      // A table with English headers lays out left to right, so it starts (and scrolls) from its first column.
      // When it is wider than the screen, a line above it and a fade say that it scrolls (markWideTables).
      case 'table': return html`${tableHint()}<div class="table-wrap" ${b.headers.some((h) => HEBREW.test(h)) ? '' : html`dir="ltr" lang="en"`}><table class="data"><thead><tr>${b.headers.map((h) => html`<th dir="auto">${h}</th>`)}</tr></thead><tbody>${b.rows.map((r) => html`<tr>${r.map((c) => html`<td dir="auto">${c}</td>`)}</tr>`)}</tbody></table></div>`;
      case 'examples': return html`<div class="examples">${b.items.map((x) => exampleRow(x))}</div>`;
      default: return html`<p>${bi(b, { fold: true })}</p>`;
    }
  });
}

const tableHint = () => html`<p class="table-hint xsmall faint" hidden>${tt('הטבלה רחבה מהמסך: גללו אותה הצידה כדי לראות את כל העמודות.', 'This table is wider than the screen: scroll it sideways to see every column.')}</p>`;
// A table wider than its frame says that it scrolls (R2-32): the hint line above it, and a fade on the side its
// hidden columns are on until the learner reaches the far side. It can be scrolled with the keyboard too.
export function markWideTables(root) {
  for (const w of root.querySelectorAll('.table-wrap')) {
    const hint = w.previousElementSibling?.classList.contains('table-hint') ? w.previousElementSibling : null;
    const update = () => {
      const max = w.scrollWidth - w.clientWidth;
      const wide = max > 2;
      w.classList.toggle('scrolls', wide);
      w.classList.toggle('at-end', wide && Math.abs(w.scrollLeft) >= max - 2);
      if (hint) hint.hidden = !wide;
      if (wide) { w.tabIndex = 0; w.setAttribute('role', 'region'); w.setAttribute('aria-label', tt('טבלה שאפשר לגלול הצידה', 'Table that scrolls sideways')); }
    };
    w.addEventListener('scroll', update, { passive: true });
    update();
  }
}

export function exampleRow(x) {
  return html`<div class="example">${canSpeak() ? html`<button type="button" class="key ghost small icon-only" data-say-text="${x.en}" aria-label="${tt('השמעה', 'Play')}">${icon('volume', { size: 18 })}</button>` : ''}<div class="grow">${legend(x.en, hebrewSupport() === 'off' ? null : x.he)}${x.note ? html`<div class="note" lang="en" dir="ltr">${x.note}</div>` : ''}</div></div>`;
}

// A link to a lesson whose file does not exist: say it is still being written and point to the next
// lesson that is ready (P-14, P-26, P-61). A lesson that exists but did not load is a connection problem.
function missingLesson(el, { id, plan, order, available }) {
  const idx = order.findIndex((l) => l.id === id);
  const ready = (l) => available.has(l.id);
  const alt = idx < 0 ? null : order.slice(idx + 1).find(ready) || order.slice(0, idx).reverse().find(ready) || null;
  const unwritten = plan && available.size > 0 && !available.has(id);
  const body = unwritten
    ? html`<p>${tt('השיעור הזה עוד בכתיבה, ולכן אי אפשר לפתוח אותו כרגע.', 'This lesson is still being written, so it cannot be opened yet.')}</p>
      ${alt ? html`<p>${tt('אפשר להמשיך לשיעור שכבר מוכן:', 'You can go on with a lesson that is ready:')}</p><a class="key enter" href="#/lesson/${alt.id}" data-alt-lesson>${legend(alt.title_en, alt.title_he)}</a>` : ''}
      <a class="key ${alt ? 'ghost' : 'enter'}" href="#/path">${tt('למסלול', 'To the path')}</a>`
    : plan
      // Not loaded: most likely offline. Say what still works and how to prepare next time (R2-11).
      ? html`<p>${tt('לא הצלחנו לטעון את השיעור. ייתכן שאין חיבור לאינטרנט; נסו שוב כשיש חיבור.', 'The lesson did not load. You may be offline; try again when you are connected.')}</p>
        <p class="small muted">${allCards().length ? tt('גם בלי חיבור אפשר לחזור על המילים שלך ולפתוח שיעורים שכבר נשמרו במכשיר.', 'Without a connection you can still review your words and open lessons already saved on this device.') : tt('גם בלי חיבור אפשר לפתוח שיעורים שכבר נשמרו במכשיר.', 'Without a connection you can still open lessons already saved on this device.')}</p>
        <div class="stack-sm" data-saved-lessons hidden></div>
        <div class="row" style="justify-content:center"><a class="key enter" href="#/lesson/${id}?t=${Date.now()}">${tt('לנסות שוב', 'Try again')}</a>${allCards().length ? html`<a class="key" href="#/review" data-offline-review>${tt('חזרה על מילים (עובד בלי חיבור)', 'Review your words (works offline)')}</a>` : ''}<a class="key ghost" href="#/path">${tt('למסלול', 'To the path')}</a></div>
        <p class="xsmall faint">${tt('בפעם הבאה: לפני שיוצאים בלי אינטרנט, אפשר לשמור את כל השיעורים במכשיר ב', 'Next time: before you go offline, you can save all lessons on this device in ')}<a href="#/settings" data-offline-settings>${tt('הגדרות ← שימוש בלי אינטרנט', 'Settings → Offline use')}</a>.</p>`
      : html`<p>${tt('אין שיעור בכתובת הזאת.', 'There is no lesson at this address.')}</p><a class="key enter" href="#/path">${tt('למסלול', 'To the path')}</a>`;
  render(el, html`<div class="player"><div class="player-top"><a class="key ghost small icon-only" href="#/path" aria-label="${tt('יציאה', 'Exit')}">${icon('x')}</a></div><div class="player-body"><div class="empty stack missing-lesson">
    <h1 class="h3" tabindex="-1">${plan ? legend(plan.title_en, plan.title_he) : tt('השיעור לא נמצא', 'Lesson not found')}</h1>
    ${unwritten ? html`<p><span class="tag">${tt('בהכנה', 'In preparation')}</span></p>` : ''}
    ${body}</div></div></div>`);
  if (plan && !unwritten) savedLessons(order, id, idx).then((list) => {
    const box = el.querySelector('[data-saved-lessons]');
    if (!box || !list.length) return;
    render(box, html`<p class="small">${tt('שיעורים שכבר שמורים במכשיר:', 'Lessons already saved on this device:')}</p>${list.map((l) => html`<a class="key small ghost" href="#/lesson/${l.id}" data-saved-lesson>${legend(l.title_en, l.title_he)}</a>`)}`);
    box.hidden = false;
  }).catch(() => {});
}

// Lessons whose files the offline cache holds (opened before, or saved in Settings): up to three, the next ones
// after this lesson first, then earlier ones, skipping lessons already completed.
const lessonUrl = (lid) => new URL(`../../content/lessons/${encodeURIComponent(lid)}.json`, import.meta.url).href;
export async function savedLessons(order, id, idx) {
  if (!globalThis.caches) return [];
  const keys = (await caches.keys()).filter((k) => k.startsWith('lucid-'));
  if (!keys.length) return [];
  const stores = await Promise.all(keys.map((k) => caches.open(k)));
  const ahead = idx >= 0 ? [...order.slice(idx + 1), ...order.slice(0, idx).reverse()] : order;
  const out = [];
  for (const l of ahead) {
    if (out.length >= 3) break;
    if (l.id === id || progressOf(l.id)?.status === 'completed') continue;
    for (const c of stores) if (await c.match(lessonUrl(l.id))) { out.push(l); break; }
  }
  return out;
}

// The daily plan's slice of this lesson, when it is the plan's lesson today (the same numbers Today shows).
function planSlice(id, lesson) {
  try {
    if (model().placementPending) return null;
    return todayPlan(settings().daily_minutes, { lesson }).blocks.find((b) => b.id === 'learn' && b.lesson === id)?.slice || null;
  } catch { return null; }
}

export default async function lessonView(el, ctx) {
  const id = ctx.params.id;
  const [lesson, tx, curriculum, available] = await Promise.all([content.lesson(id), taxonomyIndex(), content.curriculum(), content.availableLessons().catch(() => new Set())]);
  const order = lessonOrder(curriculum);
  const plan = order.find((l) => l.id === id);
  if (!lesson) { missingLesson(el, { id, plan, order, available }); return; }
  ctx.setTitle(lesson.title_en);
  startLesson(lesson);
  const variant = settings().english_variant;
  const errors = tx.error;
  // The next lesson that has been written (an unwritten one would be a dead end).
  const idx = order.findIndex((l) => l.id === id);
  const nextPlan = order.slice(idx + 1).find((l) => !available.size || available.has(l.id)) || null;

  let stage = ctx.query.stage === 'practice' || ctx.query.stage === 'missed' ? 'practice' : 'intro';
  const queue = lesson.exercises.map((ex) => ({ ex, retry: false }));
  let qi = 0;
  const firstTry = new Map(); // exercise id -> points (0..1) on first attempt
  let ctl = null;
  let checked = null; // last check result
  let lastAttempt = null; // the attempt record of the last check (for "My answer is also correct")
  let hintUsed = false;
  let shownAt = 0;
  let missedMode = false;
  let runSince = new Date().toISOString(); // this run's start: "Worth watching" shows only its mistakes
  const slice = planSlice(id, lesson);
  // Today's part of a long lesson, as the daily plan set it (R2-28, R1-N7, R1-D3): shown on the intro and marked
  // in the player when the first pass reaches it.
  const part = slice?.split ? { upto: slice.upto, of: slice.of, total: slice.total, today: slice.today, done: Boolean(slice.partDone), shown: false } : null;

  function frame(body, foot = '') {
    const step = stage === 'practice' || stage === 'part' ? stepInfo(queue, qi) : null;
    const pct = stage === 'intro' ? 0 : stage === 'learn' ? 6 : stage === 'review' ? 100 : stepPct(step);
    render(el, html`<div class="player">
      <div class="player-top">
        <button type="button" class="key ghost small icon-only" data-exit aria-label="${tt('יציאה מהשיעור', 'Leave lesson')}">${icon('x')}</button>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${tt('התקדמות בשיעור', 'Lesson progress')}"><span style="width:${pct}%"></span></div>
        ${step ? html`<span class="step-count">${stepLabel(step)}</span>` : levelTag(lesson.level)}
        <a class="key ghost small icon-only" href="#/help" aria-label="${tt('עזרה', 'Help')}">${icon('info', { size: 18 })}</a>
      </div>
      <div class="player-body" id="pbody">${body}</div>
      ${foot ? html`<div class="player-foot" id="pfoot">${foot}</div>` : ''}
    </div>`);
  }

  // The lesson's real length and, when the daily plan splits it, today's part (R1-D3).
  function lengthLine(resuming) {
    if (part?.done) return tt('החלק של היום בשיעור הזה כבר הושלם. אפשר להמשיך עכשיו, והמקום יישמר.', 'Today\'s part of this lesson is already done. You can keep going now; your place is saved.');
    if (part) return tt(`השיעור כולו כ-${part.total} דקות, ולכן התוכנית היומית שלך לוקחת היום חלק ממנו: עד תרגיל ${part.upto} מתוך ${part.of}, כ-${part.today} דקות. כשהחלק נגמר, השיעור אומר את זה.`, `The whole lesson takes about ${part.total} min, so your daily plan takes a part of it today: up to exercise ${part.upto} of ${part.of}, about ${part.today} min. The lesson tells you when that part is done.`);
    if (resuming && slice?.total && slice.remaining) return tt(`נשארו כ-${slice.remaining} דקות.`, `About ${slice.remaining} min left.`);
    return '';
  }
  // After "Nearly there": the exercises missed on the first try are what is left (R2-02, R2-25).
  function missedInfo(p) {
    if (!p?.missed?.ids?.length || p.status === 'completed') return null;
    const ids = p.missed.ids.filter((x) => lesson.exercises.some((e) => e.id === x));
    return ids.length ? { n: ids.length, min: missedMinutes(lesson, ids.length), pct: scorePercent(p.last_score ?? 0, false) } : null;
  }

  function showIntro() {
    const p = progressOf(id);
    const resuming = Boolean(p?.resume && p.resume.qi < p.resume.queue.length);
    const mi = resuming ? null : missedInfo(p);
    const len = lengthLine(resuming);
    frame(html`<div class="lesson-intro stack-lg">
      <div class="stack-sm">
        <p class="small faint">${plan ? tt(`${plan.level === 'PreA1' ? 'Pre-A1' : plan.level} · שיעור ${plan.order}`, `${plan.level === 'PreA1' ? 'Pre-A1' : plan.level} · Lesson ${plan.order}`) : ''} · ${tt(`כ-${lesson.minutes} דקות`, `about ${lesson.minutes} min`)}</p>
        <h1 tabindex="-1">${legend(lesson.title_en, lesson.title_he)}</h1>
        ${len ? html`<p class="small muted" data-part-line>${len}</p>` : ''}
      </div>
      ${mi ? html`<div class="banner stack-sm missed-choice" data-missed-banner><h2 class="small">${tt('כמעט שם', 'Nearly there')}</h2><p class="small">${tt(`בפעם הקודמת: ${mi.pct}% בניסיון הראשון. התשובות הנכונות נשמרו, אז כדי להשלים את השיעור נשאר לתקן רק את ${mi.n === 1 ? 'התרגיל שפספסתם' : `${mi.n} התרגילים שפספסתם`} (כ-${mi.min} דק׳).`, `Last time: ${mi.pct}% on the first try. Your right answers are kept, so to complete the lesson only the ${mi.n === 1 ? 'one exercise' : `${mi.n} exercises`} you missed are left (about ${mi.min} min).`)}</p><div class="row"><button type="button" class="key ghost small" data-go="learn">${tt('לקרוא שוב את ההסבר קודם', 'Read the explanation first')}</button></div></div>` : ''}
      <div class="panel flat stack-sm"><h2 class="small">${tt('בסוף השיעור', 'By the end of this lesson')}</h2>
        <ul class="point-list">${lesson.objectives.map((o) => html`<li class="point">${icon('flag', { size: 16 })}<div class="grow">${bi(o)}</div></li>`)}</ul></div>
      ${lesson.warmup ? html`<div class="block-tip row" style="align-items:flex-start">${icon('sparkle', { size: 18 })}<div class="grow">${bi(lesson.warmup)}</div></div>` : ''}
      ${resuming ? html`<div class="banner row" style="align-items:center"><span class="grow">${tt('עצרתם באמצע:', 'You stopped at:')} <span class="step-count">${stepLabel(stepInfo(p.resume.queue.map(([eid, retry]) => ({ ex: { id: eid }, retry })), p.resume.qi))}</span></span><button type="button" class="key enter small" data-resume>${tt('להמשיך מאיפה שעצרתי', 'Continue where I left off')}</button></div>` : ''}
      ${p?.status === 'completed' ? html`<p class="banner small">${icon('check', { size: 18 })}<span>${tt(`כבר השלמת את השיעור (ציון הכי טוב ${Math.round((p.best_score || 0) * 100)}%). אפשר לחזור עליו.`, `You've completed this lesson (best ${Math.round((p.best_score || 0) * 100)}%). You can go through it again.`)}</span></p>` : ''}
    </div>`, mi
      ? html`<div class="inner"><button type="button" class="key ghost" data-skip-learn>${tt('את כל התרגול מחדש', 'Practise everything again')}</button><span class="grow"></span><button type="button" class="key enter" data-missed>${tt(`${mi.n === 1 ? 'לתרגל את הטעות' : `לתרגל את ${mi.n} הטעויות`} · כ-${mi.min} דק׳`, `Practise the ${mi.n === 1 ? 'one' : mi.n} I missed · about ${mi.min} min`)} <span class="kbd">Enter</span></button></div>`
      : html`<div class="inner"><span class="grow"></span><button type="button" class="key ghost" data-skip-learn>${tt('ישר לתרגול', 'Skip to practice')}</button><button type="button" class="key enter" data-go="learn">${tt('בואו נלמד', 'Let\'s learn')} <span class="kbd">Enter</span></button></div>`);
  }

  // The end of today's part: stop with the place saved, or keep going (R2-28).
  function showPartEnd() {
    const s = stepInfo(queue, qi);
    const from = s.retry ? tt(`חזרה ${s.pos} מתוך ${s.total}`, `revisit ${s.pos} of ${s.total}`) : tt(`תרגיל ${s.pos} מתוך ${s.total}`, `exercise ${s.pos} of ${s.total}`);
    frame(html`<div class="stack-lg part-end">
      <div class="stack-sm"><h1 tabindex="-1">${tt('החלק של היום הושלם', 'Today\'s part is done')}</h1>
        <p>${tt(`עשיתם את החלק שהתוכנית היומית קבעה לשיעור הזה היום (עד תרגיל ${part.upto}, כ-${part.today} דקות).`, `You've done the part of this lesson your daily plan set for today (up to exercise ${part.upto}, about ${part.today} min).`)}</p>
        <p class="muted">${tt(`המקום שלכם נשמר: בפעם הבאה ממשיכים מ${from}. אפשר לעצור כאן, או להמשיך עכשיו אם יש זמן.`, `Your place is saved: next time you continue from ${from}. Stop here, or keep going now if you have time.`)}</p></div>
    </div>`, html`<div class="inner"><button type="button" class="key ghost" data-part-go>${tt('להמשיך עכשיו', 'Keep going')}</button><span class="grow"></span><a class="key enter" href="#/today" data-part-stop>${tt('לעצור כאן', 'Stop here')} <span class="kbd">Enter</span></a></div>`);
  }

  function showLearn() {
    frame(html`<div class="stack-lg lesson-learn">
      <h1 tabindex="-1">${legend(lesson.title_en, lesson.title_he)}</h1>
      <div class="stack">${renderBlocks(lesson.explanation)}</div>
      <section class="stack-sm"><h2 class="small">${tt('דוגמאות', 'Examples')}</h2><div class="examples">${lesson.examples.map(exampleRow)}</div></section>
      ${lesson.hebrew_pitfalls?.length && hebrewSupport() !== 'off' ? html`<section class="stack-sm"><h2 class="small">${tt('שימו לב (דוברי עברית)', 'Watch out (Hebrew speakers)')}</h2>${lesson.hebrew_pitfalls.map((h) => html`<div class="block-warning">${bi(h)}</div>`)}</section>` : ''}
      <section class="stack-sm"><h2 class="small">${tt('מילים חדשות', 'New words')}</h2>
        <div class="grid-2">${lesson.vocab.map((v) => html`<div class="entry">
          <div class="entry-head"><span class="entry-word" lang="en" dir="ltr">${v.word}</span>${canSpeak() ? html`<button type="button" class="key ghost small icon-only" data-say-text="${v.word}" aria-label="${tt('השמעה', 'Play')}">${icon('volume', { size: 18 })}</button>` : ''}</div>
          <div class="row small"><span class="faint" lang="en">${v.pos}</span>${v.ipa ? html`<span class="entry-ipa" lang="en" dir="ltr">${v.ipa}</span>` : ''}</div>
          <div class="entry-he" lang="he" dir="rtl">${isolateLatin(v.he)}</div>
          <div class="entry-ex" lang="en" dir="ltr">${v.example}</div></div>`)}</div></section>
    </div>`, html`<div class="inner"><span class="grow small faint">${tt('הסבר קצר, ועכשיו מתרגלים.', 'Short explanation, now practice.')}</span><button type="button" class="key enter" data-go="practice">${tt('לתרגול', 'Start practice')} <span class="kbd">Enter</span></button></div>`);
    markWideTables(el);
  }

  function footer(state) {
    const item = queue[qi];
    if (state === 'answer') {
      // Speaking: "Can't speak right now" skips it with no penalty and no retry; Continue moves on.
      if (ctl?.speak) {
        return html`<div class="inner">
          <button type="button" class="key ghost small" data-skip-speak>${icon('speaking', { size: 18 })} ${tt('לא יכול/ה לדבר כרגע', 'Can\'t speak right now')}</button>
          <span class="grow"></span>
          <button type="button" class="key enter" data-check disabled>${t('continue')} <span class="kbd">Enter</span></button></div>`;
      }
      return html`<div class="inner">
        ${item.ex.hint && !hintUsed ? html`<button type="button" class="key ghost small" data-hint>${icon('hint', { size: 18 })} ${tt('רמז', 'Hint')}</button>` : ''}
        ${ctl?.graded !== false ? html`<button type="button" class="key ghost small" data-dontknow>${tt('לא יודע/ת', 'I don\'t know')}</button>` : ''}
        <span class="grow"></span>
        <button type="button" class="key enter" data-check disabled>${item.ex.type === 'write' ? tt('שליחה', 'Submit') : tt('בדיקה', 'Check')} <span class="kbd">Enter</span></button></div>`;
    }
    return html`<div class="inner"><div class="verdict" role="status">${verdictHtml(item.ex, checked, errors)}</div><button type="button" class="key enter" data-next>${t('continue')} <span class="kbd">Enter</span></button></div>`;
  }

  function showExercise() {
    const item = queue[qi];
    hintUsed = false; checked = null; lastAttempt = null;
    frame(html`<div id="exroot"></div>${item.retry ? html`<p class="xsmall faint" style="margin-top:var(--s5)">${icon('refresh', { size: 14 })} ${tt('חוזרים על זה שוב, כדי שיישאר', 'Once more, so it sticks')}</p>` : ''}<div id="hintroot"></div>`);
    ctl = mountExercise($('#exroot', el), item.ex, {
      errors, level: lesson.level, variant,
      onChange: (ready) => { const b = $('[data-check]', el); if (b) b.disabled = !ready; },
    });
    // The footer depends on the exercise (speaking has its own), so it is drawn once the exercise knows.
    $('.player', el).insertAdjacentHTML('beforeend', `<div class="player-foot" id="pfoot">${footer('answer')}</div>`);
    if (ctl.ready()) $('[data-check]', el).disabled = false;
    shownAt = performance.now();
  }

  const attemptBase = (item) => ({ source: 'lesson', lesson: id, exercise: item.ex.id, topic: item.ex.topic || lesson.topics[0], skill: item.ex.skill, level: lesson.level });

  async function doCheck({ dontKnow = false } = {}) {
    const item = queue[qi];
    let r;
    if (dontKnow) {
      r = { graded: true, correct: false, score: 0, response: '(I don\'t know)', error_type: null, ...answerFor(item.ex) };
      ctl.destroy();
      render($('#exroot', el), html`<div class="stack"><h2 class="ex-prompt">${bi(item.ex.prompt)}</h2></div>`);
    } else {
      r = await ctl.check();
    }
    checked = r;
    const latency = Math.round(performance.now() - shownAt);
    if (r.graded !== false) {
      if (!item.retry && !firstTry.has(item.ex.id)) firstTry.set(item.ex.id, answerPoints(r, hintUsed));
      lastAttempt = recordAttempt({ ...attemptBase(item), correct: r.correct, score: r.score ?? (r.correct ? 1 : 0), error_type: r.error_type, hint_used: hintUsed, latency_ms: latency, response: r.response });
      if (!r.correct && !item.retry && !['match', 'categorize', 'read'].includes(item.ex.type)) queue.push({ ex: item.ex, retry: true });
    } else {
      // Practice with no score (speaking, writing): stored as done, never as right or wrong.
      recordAttempt({ ...attemptBase(item), correct: Boolean(r.correct), score: null, latency_ms: latency, response: r.response });
      if (item.ex.type === 'speak') logEvent({ type: 'speaking', lesson: id, self: r.self ?? null, recognised: r.heard != null });
      if (item.ex.type === 'write') {
        logEvent({ type: 'writing', lesson: id });
        store.put('writing', { id: `lesson:${id}:${item.ex.id}`, source: 'lesson', lesson: id, exercise: item.ex.id, level: lesson.level, drafts: [{ text: r.response, at: new Date().toISOString() }], updated: new Date().toISOString() });
      }
    }
    saveResume();
    // Speaking goes straight on: what was recognised is already on screen and there is nothing to grade.
    if (ctl.speak) { next(); return; }
    const foot = $('#pfoot', el);
    foot.className = `player-foot ${r.graded === false ? 'ok' : r.correct ? (r.almost ? 'almost' : 'ok') : r.model ? 'almost' : 'bad'}`;
    render(foot, footer('result'));
    $('[data-next]', el)?.focus();
  }

  // "My answer is also correct" on an open rewrite (B1+): counts as right, logged as self-judged, no retry.
  function selfJudge() {
    const item = queue[qi];
    if (!checked?.model || checked.correct) return;
    checked = { ...checked, correct: true, self_judged: true };
    if (!item.retry && firstTry.has(item.ex.id)) firstTry.set(item.ex.id, answerPoints({ correct: true }, hintUsed));
    if (lastAttempt) store.put('attempts', { ...lastAttempt, correct: true, score: 1, error_type: null, self_judged: true });
    const retryAt = queue.findIndex((q, k) => k > qi && q.retry && q.ex.id === item.ex.id);
    if (retryAt > qi) queue.splice(retryAt, 1);
    logEvent({ type: 'self-judged', lesson: id, exercise: item.ex.id, response: String(checked.response || '').slice(0, 300) });
    saveResume();
    const foot = $('#pfoot', el);
    foot.className = 'player-foot ok';
    render(foot, html`<div class="inner"><div class="verdict" role="status">${selfJudgedHtml(checked)}</div><button type="button" class="key enter" data-next>${t('continue')} <span class="kbd">Enter</span></button></div>`);
    frameCounter();
    $('[data-next]', el)?.focus();
  }
  // Redraw only the step counter (the queue changed under the current exercise).
  function frameCounter() {
    const c = $('.step-count', el);
    if (c) c.textContent = stepLabel(stepInfo(queue, qi));
  }

  // Leaving mid-lesson keeps the place (research D, D17/D25): the queue, position and first-try scores.
  function saveResume() {
    const cur = progressOf(id) || { id, level: lesson.level, status: 'started' };
    store.put('progress', { ...cur, resume: { qi: qi + 1, queue: queue.map((q) => [q.ex.id, q.retry]), first: [...firstTry], missed: missedMode, since: runSince, at: new Date().toISOString() } });
  }
  function restoreResume(r) {
    const byId = new Map(lesson.exercises.map((e) => [e.id, e]));
    queue.length = 0;
    for (const [eid, retry] of r.queue) if (byId.has(eid)) queue.push({ ex: byId.get(eid), retry });
    firstTry.clear();
    for (const [k, v] of r.first) firstTry.set(k, v);
    qi = Math.min(r.qi, queue.length);
    missedMode = Boolean(r.missed);
    runSince = r.since || runSince;
  }
  // Only the missed exercises, with the earlier first-try points of the others kept.
  function startMissed(m) {
    const byId = new Map(lesson.exercises.map((e) => [e.id, e]));
    const ids = m.ids.filter((x) => byId.has(x));
    if (!ids.length) return false;
    queue.length = 0;
    for (const x of ids) queue.push({ ex: byId.get(x), retry: false });
    firstTry.clear();
    for (const [k, v] of m.first) if (!ids.includes(k)) firstTry.set(k, v);
    qi = 0;
    missedMode = true;
    return true;
  }

  function showReview() {
    const score = lessonScore(firstTry, lesson);
    const pass = lesson.completion?.pass_score ?? 0.7;
    const passed = isPass(score, pass);
    const credit = partialCredit(firstTry);
    const wasDone = progressOf(id)?.status === 'completed';
    const budgetBefore = newBudgetToday();
    finishLesson(lesson, { score, passed });
    const missed = passed ? [] : missedIds(firstTry, lesson);
    // The finished run replaces the saved place; a miss keeps the list of exercises to redo.
    const cur = store.get('progress', id);
    if (cur) { const c = { ...cur }; delete c.resume; delete c.missed; if (missed.length) c.missed = { ids: missed, first: [...firstTry], at: new Date().toISOString() }; store.put('progress', c); }
    // This run's mistakes on scored exercises only (speaking never has a mistake type; older records might).
    const lessonErrors = model().attempts.filter((a) => a.lesson === id && !a.correct && a.error_type && a.skill !== 'speaking' && a.score !== null && a.at >= runSince).map((a) => a.error_type);
    const topErr = [...new Set(lessonErrors)].slice(0, 3);
    const missedMin = missedMinutes(lesson, missed.length);
    const pctText = scorePercent(score, passed);
    stage = 'review';
    frame(html`<div class="stack-lg">
      <div class="stack-sm">
        <h1 tabindex="-1">${passed ? tt('השיעור הושלם', 'Lesson complete') : tt('כמעט שם', 'Nearly there')}</h1>
        <p class="muted">${missedMode
          ? tt(`עכשיו ${pctText}% מהתרגילים נכונים: התשובות הנכונות מהפעם הקודמת ועוד מה שתרגלתם עכשיו.`, `${pctText}% of the exercises are now right: your earlier right answers plus the ones you just redid.`)
          : passed
            ? tt(`ענית נכון בניסיון הראשון על ${pctText}% מהתרגילים.`, `You got ${pctText}% right on the first try.`)
            : tt(`${pctText}% בניסיון הראשון. צריך ${Math.round(pass * 100)}% כדי להשלים.`, `${pctText}% on the first try. ${Math.round(pass * 100)}% completes the lesson.`)}
          ${passed ? '' : missed.length ? tt(` אפשר לתרגל רק את ${missed.length === 1 ? 'התרגיל שפספסתם' : `${missed.length} התרגילים שפספסתם`}, והתשובות הנכונות נשארות.`, ` You can practise just the ${missed.length === 1 ? 'one' : missed.length} you missed; your right answers still count.`) : ''}</p>
        ${!passed && (credit.hint || credit.slip) ? html`<p class="xsmall faint" data-credit-note>${[credit.hint && tt('תשובה נכונה אחרי רמז נספרת כשלושה רבעים.', 'A right answer after a hint counts as three quarters.'), credit.slip && tt('תשובה נכונה עם טעות כתיב קטנה נספרת כ-90%.', 'A right answer with a small spelling slip counts as 90%.')].filter(Boolean).join(' ')}</p>` : ''}
        ${scoredExercises(lesson).length < lesson.exercises.length ? html`<p class="xsmall faint">${tt('תרגילי דיבור וכתיבה הם תרגול ולא נספרים בציון.', 'Speaking and writing exercises are practice and do not count toward the score.')}</p>` : ''}
      </div>
      <div class="panel flat stack-sm"><h2 class="small">${tt('מה לזכור', 'Key points')}</h2><ul class="point-list">${lesson.review.key_points.map((k) => html`<li class="point">${icon('check', { size: 18 })}<div class="grow">${bi(k)}</div></li>`)}</ul></div>
      ${passed && !wasDone ? html`<p class="banner small">${icon('layers', { size: 18 })}<span>${tt(`${lesson.vocab.length} מילים מהשיעור נכנסו לחזרה המרווחת. הן יחזרו בדיוק לפני שתשכחו.`, `${lesson.vocab.length} words from this lesson joined your spaced review. They'll come back just before you'd forget them.`)}${budgetBefore <= 0 ? tt(' (המכסה היומית מלאה, אז חלקן יופיעו מחר.)', ' (Today\'s quota is full, so some will start tomorrow.)') : ''}</span></p>` : ''}
      ${topErr.length ? html`<div class="panel flat stack-sm"><h2 class="small">${tt('כדאי לשים לב', 'Worth watching')}</h2>${topErr.map((x) => { const e = errors.get(x); return e ? html`<p class="small"><span class="tag warn">${tt(e.name_he, e.name_en)}</span> ${hebrewSupport() !== 'off' ? html`<span lang="he" dir="rtl" class="muted">${isolateLatin(e.why_he)}</span>` : ''}</p>` : ''; })}<p class="xsmall faint">${tt('אם זה יחזור, Lucid יוסיף תרגול ממוקד לתוכנית היומית.', 'If this keeps happening, Lucid adds a short targeted drill to your daily plan.')}</p></div>` : ''}
    </div>`, html`<div class="inner">
      ${passed ? html`<a class="key ghost" href="#/today">${tt('להיום', 'To Today')}</a><span class="grow"></span>${nextPlan ? html`<a class="key enter" href="#/lesson/${nextPlan.id}" data-next-lesson>${tt('לשיעור הבא', 'Next lesson')} <span class="kbd">Enter</span></a>` : html`<a class="key enter" href="#/path">${tt('למסלול', 'To the path')}</a>`}`
      : missed.length
        ? html`<a class="key ghost" href="#/today">${tt('אחר כך', 'Later')}</a><span class="grow"></span><a class="key ghost" href="#/lesson/${id}?stage=practice&t=${Date.now()}" data-retry-all>${tt('את כל התרגול מחדש', 'Practise everything again')}</a><a class="key enter" href="#/lesson/${id}?stage=missed&t=${Date.now()}" data-retry>${tt(`${missed.length === 1 ? 'לתרגל את הטעות' : `לתרגל את ${missed.length} הטעויות`} · כ-${missedMin} דק׳`, `Practise the ${missed.length === 1 ? 'one' : missed.length} I missed · about ${missedMin} min`)} <span class="kbd">Enter</span></a>`
        : html`<a class="key ghost" href="#/today">${tt('אחר כך', 'Later')}</a><span class="grow"></span><a class="key enter" href="#/lesson/${id}?stage=practice&t=${Date.now()}" data-retry>${tt('לתרגל שוב', 'Practise again')} <span class="kbd">Enter</span></a>`}</div>`);
  }

  // Every stage opens at its top, with focus on its heading (P-44); each exercise opens at the top too.
  function go(target) {
    stopSpeaking();
    ctl?.destroy?.(); ctl = null;
    stage = target;
    if (target === 'intro') showIntro();
    else if (target === 'learn') showLearn();
    else if (target === 'part') showPartEnd();
    else if (target === 'practice') { if (qi >= queue.length) showReview(); else showExercise(); }
    window.scrollTo?.(0, 0);
    if (stage !== 'practice') $('h1[tabindex]', el)?.focus({ preventScroll: true });
  }
  function next() {
    const finished = queue[qi];
    qi++;
    if (!missedMode && partEnds(part, queue, qi, finished)) { part.shown = true; go('part'); return; }
    go('practice');
  }

  if (ctx.query.resume && progressOf(id)?.resume) { restoreResume(progressOf(id).resume); stage = 'practice'; }
  else if (ctx.query.stage === 'missed' && progressOf(id)?.missed) startMissed(progressOf(id).missed); // else: the whole practice
  go(stage);

  const offs = [
    on(el, 'click', '[data-go]', (e, b) => go(b.dataset.go)),
    on(el, 'click', '[data-skip-learn]', () => go('practice')),
    on(el, 'click', '[data-missed]', () => { startMissed(progressOf(id).missed); go('practice'); }),
    on(el, 'click', '[data-part-go]', () => go('practice')),
    on(el, 'click', '[data-resume]', () => { restoreResume(progressOf(id).resume); go('practice'); }),
    on(el, 'click', '[data-check]', (e, b) => { if (!b.disabled) doCheck(); }),
    on(el, 'click', '[data-dontknow]', () => doCheck({ dontKnow: true })),
    on(el, 'click', '[data-skip-speak]', () => { logEvent({ type: 'speaking-skipped', lesson: id, exercise: queue[qi].ex.id }); saveResume(); next(); }),
    on(el, 'click', '[data-self-judge]', () => selfJudge()),
    on(el, 'click', '[data-hint]', (e, b) => {
      hintUsed = true; b.remove();
      render($('#hintroot', el), html`<div class="hint-box">${icon('hint', { size: 18 })}<div>${bi(queue[qi].ex.hint)}</div></div>`);
    }),
    on(el, 'click', '[data-next]', () => next()),
    on(el, 'click', '[data-say-text]', (e, b) => say(b.dataset.sayText, { variant })),
    on(el, 'click', '[data-exit]', async () => {
      ctx.navigate('today');
    }),
  ];
  const onKey = (e) => {
    if (e.target.closest('dialog')) return;
    if (stage === 'practice' && ctl?.onKey(e)) { e.preventDefault(); return; }
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    const inTextarea = e.target.tagName === 'TEXTAREA';
    const btn = $('[data-next]', el) || $('[data-check]:not([disabled])', el) || $('[data-missed]', el) || $('[data-part-stop]', el) || $('[data-go]', el) || $('[data-next-lesson]', el) || $('[data-retry]', el);
    if (!btn || (inTextarea && queue[qi]?.ex.type === 'write' && !$('[data-next]', el))) return;
    // Enter on another control (a button, a link, the "Why?" toggle) does that control's own job.
    if (['BUTTON', 'A', 'SUMMARY'].includes(e.target.tagName) && e.target !== btn) return;
    e.preventDefault();
    btn.click();
  };
  document.addEventListener('keydown', onKey);
  return () => { offs.forEach((o) => o()); document.removeEventListener('keydown', onKey); ctl?.destroy?.(); stopSpeaking(); };
}
