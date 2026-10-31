// Lesson player: intro -> explanation -> practice -> review.
// Wrong answers show the right answer at once and come back once at the end of the set
// (retrieval after a delay). Only the first attempt counts toward the lesson score, and only scored
// exercises count: speaking and writing are practice, never part of the score or its denominator.
// After "Nearly there" the learner can redo only the exercises missed on the first try; their earlier
// right answers keep counting, so fixing the misses can complete the lesson.
import { html, render, on, $ } from '../core/util.js';
import { t, tt, bi, legend, hebrewSupport } from '../core/i18n.js';
import { content, taxonomyIndex } from '../core/content.js';
import { icon, levelTag } from '../ui/components.js';
import { mountExercise, verdictHtml, selfJudgedHtml, answerFor } from '../ui/exercise.js';
import { recordAttempt, startLesson, finishLesson, progressOf, settings, model, newBudgetToday, logEvent } from '../core/learner.js';
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
      case 'rule': return html`<div class="block-rule">${bi(b)}</div>`;
      case 'tip': return html`<div class="block-tip row" style="align-items:flex-start">${icon('hint', { size: 18 })}<div class="grow">${bi(b)}</div></div>`;
      case 'warning': return html`<div class="block-warning row" style="align-items:flex-start">${icon('alert', { size: 18 })}<div class="grow">${bi(b)}</div></div>`;
      // A table with English headers lays out left to right, so it starts (and scrolls) from its first column.
      case 'table': return html`<div class="table-wrap" ${b.headers.some((h) => HEBREW.test(h)) ? '' : html`dir="ltr" lang="en"`}><table class="data"><thead><tr>${b.headers.map((h) => html`<th dir="auto">${h}</th>`)}</tr></thead><tbody>${b.rows.map((r) => html`<tr>${r.map((c) => html`<td dir="auto">${c}</td>`)}</tr>`)}</tbody></table></div>`;
      case 'examples': return html`<div class="examples">${b.items.map((x) => exampleRow(x))}</div>`;
      default: return html`<p>${bi(b)}</p>`;
    }
  });
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
      ? html`<p>${tt('לא הצלחנו לטעון את השיעור. ייתכן שאין חיבור לאינטרנט; נסו שוב כשיש חיבור.', 'The lesson did not load. You may be offline; try again when you are connected.')}</p><a class="key enter" href="#/lesson/${id}?t=${Date.now()}">${tt('לנסות שוב', 'Try again')}</a><a class="key ghost" href="#/path">${tt('למסלול', 'To the path')}</a>`
      : html`<p>${tt('אין שיעור בכתובת הזאת.', 'There is no lesson at this address.')}</p><a class="key enter" href="#/path">${tt('למסלול', 'To the path')}</a>`;
  render(el, html`<div class="player"><div class="player-top"><a class="key ghost small icon-only" href="#/path" aria-label="${tt('יציאה', 'Exit')}">${icon('x')}</a></div><div class="player-body"><div class="empty stack missing-lesson">
    <h1 class="h3" tabindex="-1">${plan ? legend(plan.title_en, plan.title_he) : tt('השיעור לא נמצא', 'Lesson not found')}</h1>
    ${unwritten ? html`<p><span class="tag">${tt('בהכנה', 'In preparation')}</span></p>` : ''}
    ${body}</div></div></div>`);
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

  function frame(body, foot = '') {
    const step = stage === 'practice' ? stepInfo(queue, qi) : null;
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

  function showIntro() {
    const p = progressOf(id);
    frame(html`<div class="lesson-intro stack-lg">
      <div class="stack-sm">
        <p class="small faint">${plan ? tt(`${plan.level === 'PreA1' ? 'Pre-A1' : plan.level} · שיעור ${plan.order}`, `${plan.level === 'PreA1' ? 'Pre-A1' : plan.level} · Lesson ${plan.order}`) : ''} · ${tt(`כ-${lesson.minutes} דקות`, `about ${lesson.minutes} min`)}</p>
        <h1 tabindex="-1">${legend(lesson.title_en, lesson.title_he)}</h1>
      </div>
      <div class="panel flat stack-sm"><h2 class="small">${tt('בסוף השיעור', 'By the end of this lesson')}</h2>
        <ul class="point-list">${lesson.objectives.map((o) => html`<li class="point">${icon('flag', { size: 16 })}<div class="grow">${bi(o)}</div></li>`)}</ul></div>
      ${lesson.warmup ? html`<div class="block-tip row" style="align-items:flex-start">${icon('sparkle', { size: 18 })}<div class="grow">${bi(lesson.warmup)}</div></div>` : ''}
      ${p?.resume && p.resume.qi < p.resume.queue.length ? html`<div class="banner row" style="align-items:center"><span class="grow">${tt(`עצרתם בתרגיל ${p.resume.qi + 1} מתוך ${p.resume.queue.length}.`, `You stopped at exercise ${p.resume.qi + 1} of ${p.resume.queue.length}.`)}</span><button type="button" class="key enter small" data-resume>${tt('להמשיך מאיפה שעצרתי', 'Continue where I left off')}</button></div>` : ''}
      ${p?.status === 'completed' ? html`<p class="banner small">${icon('check', { size: 18 })}<span>${tt(`כבר השלמת את השיעור (ציון הכי טוב ${Math.round((p.best_score || 0) * 100)}%). אפשר לחזור עליו.`, `You've completed this lesson (best ${Math.round((p.best_score || 0) * 100)}%). You can go through it again.`)}</span></p>` : ''}
    </div>`, html`<div class="inner"><span class="grow"></span><button type="button" class="key ghost" data-skip-learn>${tt('ישר לתרגול', 'Skip to practice')}</button><button type="button" class="key enter" data-go="learn">${tt('בואו נלמד', 'Let\'s learn')} <span class="kbd">Enter</span></button></div>`);
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
          <div class="entry-he" lang="he" dir="rtl">${v.he}</div>
          <div class="entry-ex" lang="en" dir="ltr">${v.example}</div></div>`)}</div></section>
    </div>`, html`<div class="inner"><span class="grow small faint">${tt('הסבר קצר, ועכשיו מתרגלים.', 'Short explanation, now practice.')}</span><button type="button" class="key enter" data-go="practice">${tt('לתרגול', 'Start practice')} <span class="kbd">Enter</span></button></div>`);
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
    store.put('progress', { ...cur, resume: { qi: qi + 1, queue: queue.map((q) => [q.ex.id, q.retry]), first: [...firstTry], at: new Date().toISOString() } });
  }
  function restoreResume(r) {
    const byId = new Map(lesson.exercises.map((e) => [e.id, e]));
    queue.length = 0;
    for (const [eid, retry] of r.queue) if (byId.has(eid)) queue.push({ ex: byId.get(eid), retry });
    firstTry.clear();
    for (const [k, v] of r.first) firstTry.set(k, v);
    qi = Math.min(r.qi, queue.length);
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
    const passed = score >= pass;
    const wasDone = progressOf(id)?.status === 'completed';
    const budgetBefore = newBudgetToday();
    finishLesson(lesson, { score, passed });
    const missed = passed ? [] : missedIds(firstTry, lesson);
    // The finished run replaces the saved place; a miss keeps the list of exercises to redo.
    const cur = store.get('progress', id);
    if (cur) { const c = { ...cur }; delete c.resume; delete c.missed; if (missed.length) c.missed = { ids: missed, first: [...firstTry], at: new Date().toISOString() }; store.put('progress', c); }
    const lessonErrors = model().attempts.filter((a) => a.lesson === id && !a.correct && a.error_type).map((a) => a.error_type);
    const topErr = [...new Set(lessonErrors)].slice(0, 3);
    const perItem = lesson.minutes / (lesson.exercises.length + 2);
    const missedMin = Math.max(1, Math.round(missed.length * perItem));
    const pctText = Math.round(score * 100);
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
        ${scoredExercises(lesson).length < lesson.exercises.length ? html`<p class="xsmall faint">${tt('תרגילי דיבור וכתיבה הם תרגול ולא נספרים בציון.', 'Speaking and writing exercises are practice and do not count toward the score.')}</p>` : ''}
      </div>
      <div class="panel flat stack-sm"><h2 class="small">${tt('מה לזכור', 'Key points')}</h2><ul class="point-list">${lesson.review.key_points.map((k) => html`<li class="point">${icon('check', { size: 18 })}<div class="grow">${bi(k)}</div></li>`)}</ul></div>
      ${passed && !wasDone ? html`<p class="banner small">${icon('layers', { size: 18 })}<span>${tt(`${lesson.vocab.length} מילים מהשיעור נכנסו לחזרה המרווחת. הן יחזרו בדיוק לפני שתשכחו.`, `${lesson.vocab.length} words from this lesson joined your spaced review. They'll come back just before you'd forget them.`)}${budgetBefore <= 0 ? tt(' (המכסה היומית מלאה, אז חלקן יופיעו מחר.)', ' (Today\'s quota is full, so some will start tomorrow.)') : ''}</span></p>` : ''}
      ${topErr.length ? html`<div class="panel flat stack-sm"><h2 class="small">${tt('כדאי לשים לב', 'Worth watching')}</h2>${topErr.map((x) => { const e = errors.get(x); return e ? html`<p class="small"><span class="tag warn">${tt(e.name_he, e.name_en)}</span> ${hebrewSupport() !== 'off' ? html`<span lang="he" dir="rtl" class="muted">${e.why_he}</span>` : ''}</p>` : ''; })}<p class="xsmall faint">${tt('אם זה יחזור, Lucid יוסיף תרגול ממוקד לתוכנית היומית.', 'If this keeps happening, Lucid adds a short targeted drill to your daily plan.')}</p></div>` : ''}
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
    else if (target === 'practice') { if (qi >= queue.length) showReview(); else showExercise(); }
    window.scrollTo?.(0, 0);
    if (stage !== 'practice') $('h1[tabindex]', el)?.focus({ preventScroll: true });
  }
  function next() { qi++; go('practice'); }

  if (ctx.query.resume && progressOf(id)?.resume) { restoreResume(progressOf(id).resume); stage = 'practice'; }
  else if (ctx.query.stage === 'missed' && progressOf(id)?.missed) startMissed(progressOf(id).missed); // else: the whole practice
  go(stage);

  const offs = [
    on(el, 'click', '[data-go]', (e, b) => go(b.dataset.go)),
    on(el, 'click', '[data-skip-learn]', () => go('practice')),
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
    const btn = $('[data-next]', el) || $('[data-check]:not([disabled])', el) || $('[data-go]', el) || $('[data-next-lesson]', el) || $('[data-retry]', el);
    if (!btn || (inTextarea && queue[qi]?.ex.type === 'write' && !$('[data-next]', el))) return;
    // Enter on another control (a button, a link, the "Why?" toggle) does that control's own job.
    if (['BUTTON', 'A', 'SUMMARY'].includes(e.target.tagName) && e.target !== btn) return;
    e.preventDefault();
    btn.click();
  };
  document.addEventListener('keydown', onKey);
  return () => { offs.forEach((o) => o()); document.removeEventListener('keydown', onKey); ctl?.destroy?.(); stopSpeaking(); };
}
