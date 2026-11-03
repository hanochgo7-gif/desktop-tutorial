// Today: the plan for this session, why each part is there, and honest evidence of progress.
import { html, render, on, todayKey } from '../core/util.js';
import { tt, legend, t, uiLang, isolateLatin, bi, hebrewSupport } from '../core/i18n.js';
import { content, taxonomyIndex } from '../core/content.js';
import { icon, LEVEL_LABEL, toast } from '../ui/components.js';
import { profile, saveProfile, settings, saveSettings, model, weekActivity, due, placementDraft, selfReportLevel, applyPlacement, vocabImportLevel, importPlacedOutVocab, lessonAvailable, resumeStep, dayStatus, todayMinutes, holdTodayPart } from '../core/learner.js';
import { zeroResult, selfReportResult } from '../core/placement.js';
import { store } from '../core/store.js';
import { LEVELS, SKILLS, EVIDENCE, levelIndex, isLessonId, lessonOrder, introSlots, firstTries, GOAL_KINDS } from '../core/adaptive.js';
import { router } from '../core/router.js';

// Each block's icon names what it is (persona findings R2-22, R2-30: reading has a book, targeted practice
// its own icon, never the placeholder circle of a missing icon).
const GLYPH = { warmup: 'sparkle', review: 'layers', learn: 'path', practice: 'practice', use: 'speaking', exit: 'check', game: 'sparkle' };
const USE_GLYPH = { writing: 'writing', reading: 'reading', speaking: 'speaking' };
export function glyphFor(b, done = false) {
  if (done) return 'check';
  if (b.id === 'use') return b.scenario ? 'reallife' : USE_GLYPH[b.kind] || GLYPH.use;
  if (b.id === 'practice' && b.focus?.kind === 'scenario') return 'reallife';
  return GLYPH[b.id];
}
const L = (l) => LEVEL_LABEL[l] || l;

// A lesson's can-do line on Today and the path (TP-5): bi() orders the two languages by the Hebrew support level,
// so Hebrew leads at full support and English leads above it. These rows are links, which cannot hold bi()'s
// Hebrew chip button, so where the support level would fold the Hebrew behind that chip the row shows the
// English alone (the lesson itself has the chip).
export function canDo(en, he, cls = 'can-do') {
  if (!en) return '';
  const s = hebrewSupport();
  return html`<span class="${cls}" style="display:block">${he && (s === 'full' || s === 'partial') ? bi({ en, he }) : bi(en)}</span>`;
}
const arrow = () => icon(uiLang() === 'he' ? 'arrow-back' : 'arrow-next');

// Where a saved lesson run stands, counted as the player counts (persona findings R2-17, N6, D7): the
// first-pass total never grows, and retries waiting at the end are said apart. short: the main button's
// "6 of 16" (or "revisit 2 of 4"); long: "exercise 6 of 16, and 2 to revisit at the end".
export function stepText(step, { short = false } = {}) {
  if (!step) return '';
  if (step.retry) return tt(`חזרה ${step.pos} מתוך ${step.total}`, `revisit ${step.pos} of ${step.total}`);
  if (short) return t('of', { a: step.pos, b: step.total });
  const base = tt(`תרגיל ${step.pos} מתוך ${step.total}`, `exercise ${step.pos} of ${step.total}`);
  return step.pending ? `${base}${tt(`, ועוד ${step.pending} לחזרה בסוף`, `, and ${step.pending} to revisit at the end`)}` : base;
}

// Completed lessons fill the rail; placed-out lessons show as a lighter, hatched part, so a level the
// learner skipped never looks finished.
export function levelRail(curriculum, progress, current) {
  const count = (l, status) => l.lessons.filter((x) => progress.get(x.id)?.status === status).length;
  const summary = curriculum.levels.map((l) => {
    const out = count(l, 'placed_out');
    return `${L(l.id)}: ${tt(`${count(l, 'completed')} מתוך ${l.lessons.length} הושלמו`, `${count(l, 'completed')} of ${l.lessons.length} completed`)}${out ? tt(`, ${out} דולגו`, `, ${out} placed out`) : ''}`;
  }).join('; ');
  return html`<div>
    <div class="level-rail" role="img" aria-label="${tt('ההתקדמות לאורך הרמות', 'Progress across levels')}: ${summary}">${curriculum.levels.map((l) => {
      const done = (count(l, 'completed') / l.lessons.length) * 100;
      const out = (count(l, 'placed_out') / l.lessons.length) * 100;
      return html`<div class="${l.id === current ? 'current' : ''}" data-l="${l.id}" style="--n:${l.lessons.length}"><span style="width:${done}%"></span>${out ? html`<span class="out" style="inset-inline-start:${done}%;width:${out}%"></span>` : ''}</div>`;
    })}</div>
    <div class="level-rail-labels" aria-hidden="true">${curriculum.levels.map((l) => html`<span class="${l.id === current ? 'current' : ''}" data-l="${l.id}" style="--n:${l.lessons.length}">${L(l.id)}</span>`)}</div>
  </div>`;
}

// The evidence a skill is still collecting (TF-8), in the words of the rule: answers at the level, % right, and
// the day out of the two the rule needs, plus what is still missing.
export function collectingText(c) {
  if (!c) return '';
  const day = Math.min(c.days, EVIDENCE.days);
  const more = [c.answers < EVIDENCE.items ? tt(`צריך ${EVIDENCE.items} תשובות`, `${EVIDENCE.items} answers needed`) : '', c.pct < EVIDENCE.accuracy * 100 ? tt(`צריך ${EVIDENCE.accuracy * 100}% נכון`, `${EVIDENCE.accuracy * 100}% right needed`) : ''].filter(Boolean);
  // Only the level is an isolate, so "94%" keeps its sign beside its number inside the Hebrew line.
  const lv = html`<bdi dir="ltr">${L(c.level)}</bdi>`;
  return html`${tt(`אוספים ראיות: ${c.answers} תשובות ב-`, `Collecting evidence: ${c.answers} answers at `)}${lv}, ${tt(`${c.pct}% נכון`, `${c.pct}% right`)} · <span class="nowrap">${tt(`יום ${day} מתוך ${EVIDENCE.days}`, `day ${day} of ${EVIDENCE.days}`)}</span>${more.length ? ` · ${more.join(', ')}` : ''}`;
}
// A level check that asked about this skill (TF-8): "B2 shown in a level check, 81%" once the check was passed.
function checkText(c) {
  if (!c) return '';
  const passed = store.get('progress', `check:${c.level}`)?.status === 'completed';
  const lv = html`<bdi dir="ltr">${L(c.level)}</bdi>`;
  return passed ? html`${lv} ${tt(`בבדיקת רמה, ${c.pct}%`, `in a level check, ${c.pct}%`)}` : html`${tt('בבדיקת רמה ', '')}${lv}${tt(`: ${c.pct}%`, ` level check: ${c.pct}%`)}`;
}

// Where a skill's level comes from, in a few words (shown under the skill's name).
function skillSource(s, k) {
  if (k?.level) {
    if (k.source === 'placement') {
      // The answers behind a capped estimate were at a higher level: say where, as a promise to confirm, not a
      // contradiction (persona findings R2-29, R2-38; TF-8).
      return isolateLatin(k.from
        ? tt(`הערכה ראשונה ממבחן המיקום · נראה טוב גם ב-${L(k.from)} (${k.right} מתוך ${k.evidence}), יאושר בבדיקת רמה`, `First estimate from placement · looks good at ${L(k.from)} too (${k.right} of ${k.evidence}), to be confirmed in a level check`)
        : tt(`הערכה ראשונה: ${k.evidence} שאלות במבחן המיקום`, `First estimate: ${k.evidence} placement questions`));
    }
    if (k.notYet) return tt(`עוד לא ${L(k.notYet)} בתרגול (${k.evidence} תשובות בניסיון ראשון)`, `Not yet ${L(k.notYet)} in practice (${k.evidence} first-try answers)`);
    if (k.source === 'assessed-writing') return tt(`${k.evidence} טקסטים שהוערכו, ב-${k.days} ימים`, `${k.evidence} assessed texts, on ${k.days} days`);
    return tt(`${k.evidence} תשובות בניסיון ראשון ברמה, ב-${k.days} ימים`, `${k.evidence} first-try answers at this level, on ${k.days} days`);
  }
  if (s === 'speaking') return tt('Lucid עוד לא מעריך רמת דיבור', 'Lucid does not assess speaking level yet');
  if (s === 'writing') return k?.evidence ? tt(`${k.evidence} טקסט שהוערך; צריך 2 בימים שונים`, `${k.evidence} assessed text; 2 on different days give a level`) : tt('לפי טקסטים שקיבלו משוב AI', 'From texts with AI feedback');
  return '';
}

// brief (Today): the rows without their source lines and a one-line note; Progress shows everything. A skill with
// answers but no level yet shows what it is collecting, never "not assessed" (TF-8).
export function skillProfile(skills, { brief = false } = {}) {
  if (!SKILLS.some((s) => skills[s]?.level || skills[s]?.collecting || skills[s]?.check)) {
    return html`<p class="small muted">${tt('הפרופיל לפי מיומנות יופיע אחרי השיעורים הראשונים: כל מיומנות מקבלת רמה רק כשיש לה ראיות.', 'Your skill profile appears after your first lessons: each skill gets a level only once there is evidence for it.')}</p>`;
  }
  return html`<div class="skills">${SKILLS.map((s) => {
    const k = skills[s];
    const lines = brief ? [] : [skillSource(s, k), k?.level ? collectingText(k.collecting) : '', checkText(k?.check)].filter(Boolean);
    const name = html`<span>${t(`skill.${s}`)}</span>`;
    const note = lines.length ? html`<span class="skill-src">${lines.map((x, i) => html`${i ? html`<br>` : ''}${x}`)}</span>` : '';
    if (!k?.level) return html`<div class="skill-row">${name}<span class="skill-level none skill-wide ${k?.collecting ? 'collecting' : ''}">${k?.collecting ? collectingText(k.collecting) : tt('עוד לא נבדקה', 'Not yet assessed')}</span>${note}</div>`;
    const label = html`<bdi dir="ltr">${L(k.level)}${k.capped ? '+' : ''}</bdi>`;
    return html`<div class="skill-row ${k.provisional ? 'est' : ''}">${name}<div class="meter" aria-hidden="true"><span style="width:${((levelIndex(k.level) + 1) / LEVELS.length) * 100}%"></span></div><span class="skill-level">${label}</span>${note}</div>`;
  })}</div>${brief
    ? html`<p class="xsmall faint" style="margin-top:var(--s3)">${t('level.estimate')}. ${tt('פס מקווקו = הערכה ראשונה ממבחן המיקום.', 'A striped bar is a first estimate from placement.')}</p>`
    : html`<p class="xsmall faint" style="margin-top:var(--s3)">${t('level.estimate')}. ${tt('רמה מופיעה רק כשיש ראיות למיומנות עצמה: 6 תשובות ומעלה בניסיון ראשון ברמה, 75% נכונות, ביומיים שונים. חזרות על תרגיל באותו יום לא נספרות. מבחן המיקום נותן רק הערכה ראשונה (פס מקווקו), לא מעל הרמה שאושרה בו, ולכל היותר', 'A level appears only with evidence for that skill: 6+ first-try answers at the level, 75% right, on 2 different days. Repeating an exercise on the same day does not count. The placement test gives only a first estimate (striped bar), never above the level it confirmed, and at most')} <bdi dir="ltr">B2+</bdi>.</p>`}`;
}

// One line for the folded skill panel: "Grammar A2 · Reading A2 · 4 not yet assessed". Each part is its own
// span and each level an isolate, so "A2 · 3" never joins into one left-to-right run inside Hebrew.
export function skillSummary(skills) {
  const shown = SKILLS.filter((s) => skills[s]?.level);
  if (!shown.length) return SKILLS.some((s) => skills[s]?.collecting) ? tt('אוספים ראיות', 'Collecting evidence') : t('level.none');
  const rest = SKILLS.length - shown.length;
  const parts = shown.map((s) => html`<span>${t(`skill.${s}`)} <bdi dir="ltr">${L(skills[s].level)}${skills[s].capped ? '+' : ''}</bdi></span>`);
  if (rest) parts.push(html`<span>${rest === 1 ? tt('מיומנות אחת עוד לא נבדקה', '1 not yet assessed') : tt(`${rest} מיומנויות עוד לא נבדקו`, `${rest} not yet assessed`)}</span>`);
  return parts.map((x, i) => html`${i ? ' · ' : ''}${x}`);
}

// The unfinished placement test, on Today and on the path (persona findings P-37, R2-15, R1-D2).
export function placementCard({ heading = 'h2' } = {}) {
  const n = placementDraft()?.answers?.length || 0;
  const title = n ? tt('להמשיך את מבחן המיקום', 'Finish your placement test') : tt('מבחן המיקום מחכה לכם', 'Your placement test is waiting');
  return html`<section class="panel stack" aria-labelledby="pl-h">
    ${heading === 'h1' ? html`<h1 id="pl-h" class="h3">${title}</h1>` : html`<h2 id="pl-h">${title}</h2>`}
    <p class="small muted">${n
      ? tt(`עניתם על ${n} שאלות, והן נשמרו. עוד כמה דקות, והתוכנית היומית תתחיל ברמה שמתאימה לכם.`, `You've answered ${n} questions, and they're saved. A few more minutes and your daily plan starts at the level that fits you.`)
      : tt('כ-10 דקות. אחריו התוכנית היומית תתחיל ברמה שמתאימה לכם.', 'About 10 minutes. After it, your daily plan starts at the level that fits you.')}</p>
    <div class="row"><a class="key enter" href="#/placement${n ? '?resume=1' : ''}">${n ? tt('להמשיך את המבחן', 'Continue the test') : tt('להתחיל את המבחן', 'Start the test')} ${arrow()}</a>
      ${n ? html`<a class="key ghost" href="#/placement?restart=1">${tt('להתחיל מחדש', 'Start again')}</a>` : ''}</div>
    ${noTestChoices()}
  </section>`;
}
// A passed level check (TP-6): the path and Today act on it. Passed = completed with 75% or more (the level check's
// pass mark). next/first: the next level and its first lesson that is ready, for "continue to C1".
export function passedCheck(curriculum, level) {
  const c = store.get('progress', `check:${level}`);
  if (c?.status !== 'completed' || !(c.best_score >= 0.75)) return null;
  const i = curriculum.levels.findIndex((l) => l.id === level);
  const nextLevel = i >= 0 ? curriculum.levels[i + 1] : null;
  const first = nextLevel?.lessons.find((l) => lessonAvailable(l.id)) || null;
  return { level, pct: Math.round(c.best_score * 100), at: c.completed_at || null, next: nextLevel?.id || null, first: first?.id || null };
}
// "B2 level check passed (81%, 3.11.2026)": the level, the score and the date are isolates of their own, so they
// keep their order inside the Hebrew line.
export function passedCheckLine(x) {
  const date = x.at ? new Date(x.at).toLocaleDateString(uiLang() === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' }) : '';
  const lv = html`<bdi dir="ltr">${L(x.level)}</bdi>`;
  const facts = html`(<bdi dir="ltr">${x.pct}%</bdi>${date ? html`, <bdi dir="ltr">${date}</bdi>` : ''})`;
  return uiLang() === 'he' ? html`בדיקת רמה ${lv} עברה <span class="nowrap">${facts}</span>` : html`${lv} level check passed <span class="nowrap">${facts}</span>`;
}
export function nextLevelKey(x, cls = 'key small') {
  return x.first ? html`<a class="${cls}" href="#/lesson/${x.first}" data-next-level><span>${isolateLatin(tt(`להמשיך ל-${L(x.next)}`, `Continue to ${L(x.next)}`))}</span> ${arrow()}</a>` : '';
}

// Starting without the test: the same choices on Today, the path and the placement intro, each naming its level
// (TF-9; ux-research F9): the letters (Pre-A1), A1, and the learner's own estimate when it is higher.
export function noTestChoices() {
  const own = selfReportLevel();
  return html`<div class="row small no-test"><span class="muted">${tt('או בלי מבחן:', 'Or without the test:')}</span>
    <button type="button" class="key ghost small" data-basics><span>${isolateLatin(tt('להתחיל מהאותיות (Pre-A1)', 'Start with the letters (Pre-A1)'))}</span></button>
    <button type="button" class="key ghost small" data-skip-level="A1"><span>${isolateLatin(tt('להתחיל ב-A1', 'Start at A1'))}</span></button>
    ${own && levelIndex(own) > levelIndex('A1') ? html`<button type="button" class="key ghost small" data-skip-level="${own}"><span>${isolateLatin(tt(`להתחיל ב-${L(own)} (ההערכה שלכם)`, `Start at ${L(own)} (your own estimate)`))}</span></button>` : ''}</div>`;
}
export function bindPlacementCard(el, ctx) {
  return [
    on(el, 'click', '[data-skip-level]', async (e, b) => {
      await applyPlacement(selfReportResult(b.dataset.skipLevel));
      toast(tt(`המסלול מתחיל ב-${L(b.dataset.skipLevel)}`, `Your path starts at ${L(b.dataset.skipLevel)}`));
      if (ctx.path === 'placement') ctx.navigate('today');
    }),
    on(el, 'click', '[data-basics]', async () => { await applyPlacement(zeroResult()); ctx.navigate('lesson/pa1-01'); }),
  ];
}

const wide = () => globalThis.matchMedia?.('(min-width: 64rem)').matches ?? true;
// A narrow phone (24rem, 384px and less) at 130% or 150% text (TP-7): the start key goes right under the greeting
// and the minutes choice under the plan, so the key is on the first screen above the tab bar.
const NARROW = '(max-width: 24rem)';
const compact = () => Boolean(globalThis.matchMedia?.(NARROW).matches) && ['130', '150'].includes(globalThis.document?.documentElement.dataset.text);
// The minutes for today (TF-5) now live in learner.js (TP-1), so the lesson end reads the same rule; re-exported
// here so that existing imports keep working.
export { todayMinutes };

// What a done block shows instead of minutes (TP-2): what was done today, counted from today's records, so a
// finished block never shows a leftover budget that changes between visits. Singular forms for 1 (TP-12).
const countOf = (n, one, many, oneEn, manyEn) => (n === 1 ? tt(one, oneEn) : tt(`${n} ${many}`, `${n} ${manyEn}`));
export const exercisesText = (n) => countOf(n, 'תרגיל אחד', 'תרגילים', '1 exercise', 'exercises');
export const wordsText = (n) => countOf(n, 'מילה אחת', 'מילים', '1 word', 'words');
export const turnsText = (n) => countOf(n, 'תור אחד', 'תורות', '1 turn', 'turns');
export const answersText = (n) => countOf(n, 'תשובה אחת', 'תשובות', '1 answer', 'answers');
export function doneWhat(b, { attempts = [], reviews = {} } = {}) {
  const first = (pick) => firstTries(attempts.filter(pick)).length;
  const turns = (id) => first((a) => a.source === 'scenario' && String(a.exercise).startsWith(`${id}:`)) || (attempts.some((a) => a.source === 'roleplay' && a.exercise === id) ? 1 : 0);
  let n = 0;
  let text = null;
  if (b.id === 'review' || b.id === 'warmup' || b.id === 'exit') { n = b.id === 'review' ? reviews.review || b.count : reviews[b.id] || 0; text = wordsText; }
  else if (b.id === 'learn') { n = first((a) => a.source === 'lesson' && a.lesson === b.lesson); text = exercisesText; }
  else if (b.id === 'practice') {
    if (b.focus?.kind === 'scenario') { n = turns(b.focus.scenario); text = turnsText; }
    else { n = first((a) => a.source === 'drill'); text = exercisesText; }
  } else if (b.id === 'use') {
    if (b.scenario) { n = turns(b.scenario); text = turnsText; }
    else if (b.kind === 'reading') { n = first((a) => a.source === 'reading'); text = answersText; }
    else if (b.kind === 'writing') return tt('הטקסט נשמר', 'Text saved');
  }
  return n > 0 && text ? text(n) : tt('בוצע', 'Done');
}

export default async function today(el, ctx) {
  ctx.setTitle(t('nav.today'));
  // This view draws only while its route is the current one: a draw that finishes loading after the learner has
  // moved on (lesson files load asynchronously) must never paint Today over the next screen.
  const route = router.current;
  const [curriculum, tx, scenarios, writing, assignments] = await Promise.all([content.curriculum(), taxonomyIndex(), content.scenarios().catch(() => null), content.writingExercises().catch(() => null), content.assignments().catch(() => null)]);
  const extras = { lesson: null, scenarios: scenarios?.scenarios || [], writingTasks: writing?.exercises || [] };
  // Writing-lab tasks and assignments by id, for an open draft's title (TP-8).
  const writingTitles = new Map([...extras.writingTasks, ...(assignments?.assignments || [])].map((x) => [x.id, x]));
  const lessons = new Map(lessonOrder(curriculum).map((l) => [l.id, l]));
  // The skill panel is folded on phones and open beside the plan on wide screens, until the learner toggles it.
  let skillsOpen = null;
  // The line that says the plan now fits the minutes chosen for today (TF-5).
  let minutesNote = '';
  // What adding a skipped level's words did, shown where the button was (TF-12).
  let importNote = '';
  // The plan shows the next lesson's real length, so it needs the lesson file (cached after the first load).
  let loadingLesson = null;
  // The plan last drawn, so a change of today's minutes can keep a part finished under the old minutes (TP-2).
  let lastPlan = null;
  async function loadLesson(id) {
    if (!id || extras.lesson?.id === id || loadingLesson === id) return;
    loadingLesson = id;
    const lesson = await content.lesson(id).catch(() => null);
    loadingLesson = null;
    if (lesson && model().next?.id === id) { extras.lesson = lesson; draw(); }
  }
  // The pace of each lesson answered or read today, from its file, for the minutes done today (TF-2, TP-2).
  // Loaded once each.
  const paces = new Map();
  async function loadPaces(ids) {
    const missing = ids.filter((id) => !paces.has(id));
    if (!missing.length) return;
    missing.forEach((id) => paces.set(id, null));
    await Promise.all(missing.map(async (id) => {
      const l = await content.lesson(id).catch(() => null);
      if (l) paces.set(id, { minutes: l.minutes, exercises: l.exercises.length, intro: introSlots(l) });
    }));
    draw();
  }
  await loadLesson(model().next?.id);

  function draw() {
    if (route && router.current !== route) return;
    const s = settings();
    const p = profile();
    const m = model();
    if (m.next?.id !== extras.lesson?.id) loadLesson(m.next?.id);
    // Onboarding promises to suggest the English interface as the level rises: offered from B1, and again at each
    // higher level after "Not now", never after the learner chose. It waits until the learner has studied on 3
    // days or more, so it never greets someone who chose Hebrew minutes ago, and it sits below the plan (TF-12).
    const activeDays = new Set(m.attempts.filter((a) => a.source !== 'placement').map((a) => String(a.at).slice(0, 10))).size;
    const uiSwitchOffer = p?.ui_language !== 'en' && !m.placementPending && levelIndex(m.courseLevel) >= levelIndex('B1') && activeDays >= 3
      && s.ui_switch_answered !== 'en' && (!s.ui_switch_answered || levelIndex(m.courseLevel) > levelIndex(s.ui_switch_answered));
    const week = weekActivity();
    const dueList = due();
    const dueCount = dueList.length;
    // How many of the review's cards have never been reviewed (TF-3): new words get their own words, never
    // "about to fade". The review takes the first cards of the due list, as review.js does.
    const newIn = (n) => dueList.slice(0, n).filter((c) => !c.log?.length && !c.fsrs?.reps).length;
    const today = todayKey();
    const isToday = (iso) => Boolean(iso) && todayKey(new Date(iso)) === today;
    // Only curriculum lessons count here: a finished scenario or level check is not a lesson.
    const lessonDoneToday = store.all('progress').some((x) => isLessonId(x.id) && x.status === 'completed' && isToday(x.completed_at));
    // A block is ticked only for what was really done: the plan marks each block itself (adaptive.dailyPlan).
    const isDone = (b) => Boolean(b.done);
    // Today is done when every block is done or today's work adds up to the day's minutes (TF-2): then the plan
    // shows what was done, ticked, and anything else is an optional extra, never a new plan. The rule is
    // learner.dayStatus, which the lesson end reads too (TP-1), with the paces of today's lessons.
    const attemptsToday = m.attempts.filter((a) => isToday(a.at));
    const eventsToday = store.all('events').filter((e) => isToday(e.at));
    loadPaces([...new Set([
      ...attemptsToday.filter((a) => a.source === 'lesson' && a.lesson).map((a) => a.lesson),
      ...eventsToday.filter((e) => e.type === 'learn' && e.lesson).map((e) => e.lesson),
    ])]);
    const day = dayStatus({ ...extras, paces });
    lastPlan = day.plan;
    const { target, plan, complete } = day;
    const status = { open: day.open };
    const first = day.next;
    // Cards reviewed today per review mode, for the done rows (TP-2).
    const reviewsToday = eventsToday.filter((e) => e.type === 'review' && e.count > 0).reduce((o, e) => ({ ...o, [e.mode || 'review']: (o[e.mode || 'review'] || 0) + e.count }), {});
    const hour = new Date().getHours();
    const hello = hour < 12 ? tt('בוקר טוב', 'Good morning') : hour < 18 ? tt('צהריים טובים', 'Good afternoon') : tt('ערב טוב', 'Good evening');
    const scenario = (id) => extras.scenarios.find((x) => x.id === id);
    const task = (id) => extras.writingTasks.find((x) => x.id === id);
    const pos = (sl) => tt(`תרגיל ${sl.done + 1} מתוך ${sl.of}`, `exercise ${sl.done + 1} of ${sl.of}`);
    const missedLabel = (n) => (n === 1 ? tt('לתרגל את הטעות', 'Practise the one you missed') : tt(`לתרגל את ${n} הטעויות`, `Practise the ${n} you missed`));

    const title = (b) => {
      switch (b.id) {
        case 'warmup': return tt('חימום: מילים מהימים האחרונים', 'Warm-up: words from the last few days');
        case 'review': {
          if (b.more) return tt(`עוד סבב קצר · ${b.count} מילים`, `Another short round · ${b.count} words`);
          if (b.done) return tt(`חזרה מרווחת · ${b.count} מילים`, `Spaced review · ${b.count} words`);
          const k = newIn(b.count), n = b.count;
          if (k === n) return n === 1 ? tt('מילה חדשה אחת: סבב ראשון', 'One new word: first round') : tt(`${n} מילים חדשות: סבב ראשון`, `${n} new words: first round`);
          if (!k) return n === 1 ? tt('מילה אחת שכדאי לרענן', 'One word to refresh') : tt(`מילים שכדאי לרענן · ${n}`, `Words to refresh · ${n}`);
          return tt(`${n} מילים לחזרה: ${k} חדשות, ${n - k} לרענון`, `${n} words to review: ${k} new, ${n - k} to refresh`);
        }
        case 'learn': {
          // A lesson completed today: the plan shows that lesson, ticked (TF-2).
          // A done block says so (TP-3): "Done today", never "Continue:" on a card whose part is finished.
          const done = b.completed ? lessons.get(b.lesson) : null;
          if (done) return html`<span class="small faint">${tt('הושלם היום:', 'Done today:')}</span> ${legend(done.title_en, done.title_he)}`;
          if (!m.next) return tt('השיעור הבא', 'Next lesson');
          if (b.done) return html`<span class="small faint">${tt('הושלם היום:', 'Done today:')}</span> ${legend(m.next.title_en, m.next.title_he)}`;
          // After a run that ended under the pass mark, the lead follows the lesson's own banding: "nearly done"
          // from 50% up, and below 50% the lesson is still open (TF-2; ux-research F3).
          const last = m.progress.get(m.next.id)?.last_score;
          const lead = b.next ? tt('השיעור הבא:', 'Next lesson:') : b.beyond ? tt('להמשיך את השיעור:', 'Keep going in the lesson:')
            : b.missed ? (last != null && last < 0.5 ? tt('השיעור עוד פתוח:', 'Not complete yet:') : tt('כמעט סיימת:', 'Nearly done:'))
              : b.resume ? tt('המשך:', 'Continue:') : '';
          return html`${lead ? html`<span class="small faint">${lead}</span> ` : ''}${legend(m.next.title_en, m.next.title_he)}`;
        }
        case 'game': return tt(`משחק מילים · ${L(b.level)}`, `Word game · ${L(b.level)}`);
        case 'practice': {
          if (b.focus.kind === 'scenario') {
            const sc = scenario(b.focus.scenario);
            return html`${tt('לתרגל שוב:', 'Practise again:')} ${sc ? legend(sc.title_en, sc.title_he) : b.focus.scenario}`;
          }
          const label = b.focus.kind === 'error' ? tx.error.get(b.focus.id) : tx.topic.get(b.focus.id);
          return tt(`תרגול ממוקד: ${label?.name_he || b.focus.id}`, `Targeted practice: ${label?.name_en || b.focus.id}`);
        }
        case 'use': {
          const sc = b.scenario && scenario(b.scenario);
          const tk = b.task && task(b.task);
          // The goal item offered outside a short day's budget (TF-4).
          if (b.offer && !complete) {
            const what = sc ? legend(sc.title_en, sc.title_he) : tk ? legend(tk.title_en, tk.title_he)
              : { reading: tt('קריאה ברמה שלכם', 'Reading at your level'), writing: tt('כתיבה קצרה', 'A short text') }[b.kind] || tt('דיבור', 'Speaking');
            return html`<span class="small faint">${tt(`יש עוד ${b.minutes} דקות?`, `Have ${b.minutes} more minutes?`)}</span> ${what}`;
          }
          if (sc) return html`${tt('מהחיים:', 'Real life:')} ${legend(sc.title_en, sc.title_he)}`;
          if (tk) return html`${b.started && !b.done ? tt('כתיבה, להמשיך:', 'Writing, continue:') : tt('כתיבה:', 'Writing:')} ${legend(tk.title_en, tk.title_he)}`;
          if (b.kind === 'reading') return tt('קריאה: טקסט קצר ברמה שלכם', 'Reading: a short text at your level');
          return b.kind === 'speaking' ? tt('דיבור: להשתמש במה שלמדתם', 'Speaking: use what you learned') : tt('כתיבה: טקסט קצר משלכם', 'Writing: a short text of your own');
        }
        case 'exit': return tt('בדיקת יציאה: המילים של היום', 'Exit check: today\'s words');
        default: return b.id;
      }
    };
    const lessonWhy = (b) => {
      if (b.completed) {
        const done = lessons.get(b.lesson);
        return html`${canDo(done?.can_do, done?.can_do_he)}<span style="display:block">${tt('אפשר לפתוח אותו שוב בכל זמן.', 'You can open it again any time.')}</span>`;
      }
      const sl = b.slice || {};
      if (b.beyond) return html`<span style="display:block">${tt(`מעבר לחלק של היום: נשארו כ-${b.minutes} דקות, והמקום נשמר.`, `Beyond today's part: about ${b.minutes} min left, and your place is saved.`)}</span>`;
      // The next lesson, beyond today's plan: the whole lesson, with no part of it planned for today.
      if (b.next) return html`${canDo(m.next?.can_do, m.next?.can_do_he)}<span style="display:block">${tt(`שיעור של כ-${b.minutes} דקות. המקום נשמר בכל יציאה.`, `A lesson of about ${b.minutes} min. Your place is saved whenever you leave.`)}</span>`;
      const lines = [];
      if (b.skipped?.length) {
        const sk = lessons.get(b.skipped[0]);
        lines.push(tt(`השיעור ״${sk?.title_he || b.skipped[0]}״ עוד בהכנה, ולכן זה השיעור הבא שמוכן.`, `"${sk?.title_en || b.skipped[0]}" is still being written, so this is the next lesson that is ready.`));
      }
      // After "Nearly there": the right answers still count, so the missed exercises can complete the lesson.
      if (b.missed) lines.push(tt(`${b.missed === 1 ? 'נשאר תרגיל אחד שפספסתם' : `נשארו ${b.missed} תרגילים שפספסתם`}, כ-${sl.today} דק׳. התשובות הנכונות נשמרו, ותיקון הטעויות יכול להשלים את השיעור.`, `${b.missed === 1 ? 'One exercise you missed is left' : `${b.missed} exercises you missed are left`}, about ${sl.today} min. Your right answers are kept, and fixing these can complete the lesson.`));
      else if (b.missedRun && b.step) lines.push(tt(`מתקנים את מה שפספסתם: ${stepText(b.step)}.`, `Fixing the ones you missed: ${stepText(b.step)}.`));
      else if (sl.partDone) lines.push(tt(`החלק של היום הושלם. מחר ממשיכים מ${pos(sl)}.`, `Today's part is done. Tomorrow continues from ${pos(sl)}.`));
      else if (sl.split) lines.push(tt(`השיעור כולו כ-${sl.total} דקות, אז היום עושים חלק: עד תרגיל ${sl.upto} מתוך ${sl.of}. המקום נשמר בכל יציאה.`, `Today you'll do part of this ${sl.total}-minute lesson: up to exercise ${sl.upto} of ${sl.of}. Your place is saved whenever you leave.`));
      else if (sl.total && b.resume) lines.push(tt(`נשארו כ-${sl.remaining} דקות: ${stepText(b.step) || pos(sl)}.`, `About ${sl.remaining} min left: ${stepText(b.step) || pos(sl)}.`));
      else if (sl.total) lines.push(tt(`שיעור של כ-${sl.total} דקות.`, `A lesson of about ${sl.total} min.`));
      return html`${!b.missed ? canDo(m.next?.can_do, m.next?.can_do_he) : ''}${lines.map((x) => html`<span style="display:block">${x}</span>`)}`;
    };
    // The reason names only a goal the learner chose (persona finding R2-39).
    const goalWhy = (b) => {
      if (b.goal === 'travel') return tt('בחרתם טיולים: מצב אחד מנסיעה, ברמה שלכם.', 'You chose travel: one real situation from a trip, at your level.');
      if (b.goal === 'conversation') return tt('בחרתם ביטחון בשיחה: שיחה אחת מהחיים, ברמה שלכם.', 'You chose confidence in conversation: one real conversation, at your level.');
      if (b.goal === 'work') return tt('בחרתם עבודה: מצב אחד מהעבודה, ברמה שלכם.', 'You chose work: one workplace situation, at your level.');
      if (b.goal === 'studies' && b.kind === 'reading') return tt('בחרתם בגרות ולימודים: קריאה של טקסטים קצרים בונה את ההבנה שהמבחנים האלה בודקים.', 'You chose exams and university: reading short texts builds the comprehension these exams test.');
      if (b.goal === 'writing' && b.kind === 'reading') return tt('בחרתם כתיבה אקדמית: קריאה של טקסטים עם טיעון טוב בונה את השפה שכותבים בה.', 'You chose academic writing: reading well-argued texts builds the language you write with.');
      if (b.goal === 'studies' && b.kind === 'writing') return tt('בחרתם בגרות ולימודים: משימה אחת ממעבדת הכתיבה, ברמה שלכם.', 'You chose exams and university: one Writing lab task at your level.');
      if (b.goal === 'writing' && b.kind === 'writing') return tt('בחרתם כתיבה אקדמית: משימה אחת ממעבדת הכתיבה, ברמה שלכם.', 'You chose academic writing: one Writing lab task at your level.');
      return b.kind === 'speaking' ? tt('להגיד דברים בקול הופך ידע למיומנות.', 'Saying things out loud turns knowledge into skill.') : b.kind === 'reading' ? tt('קריאה ברמה שלכם מרחיבה מילים ומבנים.', 'Reading at your level widens your words and structures.') : tt('כתיבה מחייבת לבחור מילים ומבנים בעצמכם.', 'Writing makes you choose words and structures yourself.');
    };
    // A text longer than the block: the plan says how long the whole text takes and that today is a part
    // (persona finding R2-16). The editor saves the draft as the learner types.
    const useWhy = (b) => {
      const lines = [goalWhy(b)];
      if (b.kind === 'writing' && b.part && !b.done) {
        lines.push(b.started
          ? tt(`הטיוטה שמורה. הטקסט כולו כ-${b.total} דקות; היום עוד ${b.minutes} דקות.`, `Your draft is saved. The whole text takes about ${b.total} min; today, ${b.minutes} more.`)
          : tt(`הטקסט כולו כ-${b.total} דקות, אז היום מתחילים: ${b.minutes} דקות לתכנן ולפתוח. הטיוטה נשמרת תוך כדי כתיבה.`, `The whole text takes about ${b.total} min, so today is a start: ${b.minutes} min to plan and begin. The draft saves as you type.`));
      }
      return html`${lines.map((x) => html`<span style="display:block">${x}</span>`)}`;
    };
    const why = (b) => {
      switch (b.id) {
        case 'warmup': return tt('להיזכר במילה יום-יומיים אחרי שלמדתם אותה זה מה שמקבע אותה.', 'Recalling a word a day or two after learning it is what makes it stick.');
        case 'review':
          if (b.done) return tt(`עברתם היום על ${b.count} מילים.`, `You reviewed ${b.count} words today.`);
          if (b.more) return tt('מילים שכבר עברתם עליהן היום חוזרות לסבב נוסף. לא חובה: הן יחכו גם למחר.', 'Words you already reviewed today come back for another round. Optional: they will wait for tomorrow too.');
          {
            const k = newIn(b.count);
            const base = k === b.count
              ? tt('פעם ראשונה בחזרה המרווחת: כל היזכרות מחזקת את הזיכרון.', 'Their first time in spaced review: every recall makes the memory stronger.')
              : !k ? tt('עבר זמן מאז הפעם הקודמת, והיזכרות עכשיו מאריכה את הזיכרון.', 'Some time has passed since last time, and recalling them now makes the memory last longer.')
                : tt('מילים חדשות לצד מילים שעבר זמן מאז שראיתם אותן. כל היזכרות מחזקת את הזיכרון.', 'New words next to words you have not seen for a while. Every recall makes the memory stronger.');
            return b.later ? `${base} ${tt(`עוד ${b.later} יחכו לימים הבאים.`, `${b.later} more will wait for the next days.`)}` : base;
          }
        case 'learn': return lessonWhy(b);
        case 'game': return tt('10 שאלות קצרות על המילים של הרמה שלכם.', '10 quick questions on the words of your level.');
        case 'practice': {
          if (b.focus.kind === 'scenario') return tt('בחלק מהתשובות שלכם כאן הייתה דרך טבעית יותר. עוד סבב יעזור לזכור אותה.', 'Some of your replies here had a more natural option. Another round helps it stick.');
          const e = b.focus.kind === 'error' ? m.recurring.find((x) => x.error_type === b.focus.id) : null;
          return e ? tt(`חזר ${e.count} פעמים ב-${e.days} ימים שונים בחודש האחרון.`, `It came up ${e.count} times on ${e.days} different days this month.`) : tt('נושא שעוד לא בשליטה.', 'A topic that is not secure yet.');
        }
        case 'use': return useWhy(b);
        case 'exit': return tt('היזכרות אחרונה במילים החדשות, אחרי הפסקה קצרה.', 'One last recall of the new words, after a short break.');
        default: return '';
      }
    };
    const startLabel = (b) => {
      if (b.id === 'learn' && m.next) {
        // After "Nearly there", the main action redoes only the missed exercises (persona findings R2-02, R2-25).
        if (b.missed) return html`<span>${missedLabel(b.missed)} · ${tt(`כ-${b.minutes} דק׳`, `about ${b.minutes} min`)}</span>`;
        // At Pre-A1 and A1 in the Hebrew UI the key names the lesson in Hebrew, which a beginner can read (TF-10).
        const name = uiLang() === 'he' && levelIndex(m.next.level) <= levelIndex('A1') && m.next.title_he
          ? html`<span lang="he">${isolateLatin(m.next.title_he)}</span>` : html`<bdi lang="en" dir="ltr">${m.next.title_en}</bdi>`;
        return b.resume
          ? html`<span>${tt('להמשיך', 'Continue')}: ${name} · <span style="white-space:nowrap">${stepText(b.step, { short: true })}</span></span>`
          : html`<span>${tt('להתחיל', 'Start')}: ${name}</span>`;
      }
      // "Review" alone could read as "go back": the key says what is reviewed (TF-10).
      if (b.id === 'review') return html`<span>${tt(`להתחיל: חזרה על ${b.count} מילים`, `Start: review ${b.count} words`)}</span>`;
      if (b.id === 'use') {
        const kind = b.scenario ? tt('מהחיים', 'Real life') : { writing: tt('כתיבה', 'Writing'), reading: tt('קריאה', 'Reading') }[b.kind] || tt('דיבור', 'Speaking');
        return html`${tt('להתחיל', 'Start')}: ${kind}`;
      }
      const i = ['warmup', 'review', 'learn', 'practice', 'use', 'exit'].indexOf(b.id);
      return html`${tt('להתחיל', 'Start')}: ${tt(['חימום', 'חזרה', 'שיעור', 'תרגול', 'דיבור/כתיבה', 'בדיקה'][i] || '', ['Warm-up', 'Review', 'Lesson', 'Practice', 'Speak or write', 'Check'][i] || '')}`;
    };
    // An interrupted lesson that is not the plan's lesson (for example, a placed-out lesson being revised).
    const other = store.all('progress').filter((x) => isLessonId(x.id) && x.id !== m.next?.id && x.resume && x.status !== 'completed' && x.resume.qi < x.resume.queue.length && lessonAvailable(x.id)).sort((a, b) => (a.resume.at < b.resume.at ? 1 : -1))[0];
    const otherPlan = other && lessons.get(other.id);
    const importLevel = !m.placementPending && !dueCount ? vocabImportLevel() : null;
    // "Not now" hides the offer on Today for that level; the path keeps it (persona finding R2-20).
    const showImport = importLevel && s.vocab_import_hidden !== importLevel;
    const courseDone = !m.next;
    // An open writing draft for a learner with a writing goal (TP-8): a draft with text whose task has no
    // evaluated or final summary yet. The most recent one gets a quiet line under the plan, unless the plan's
    // writing block already opens it.
    const writingGoal = (p?.goals || []).some((g) => GOAL_KINDS[g]?.includes('writing'));
    const wrec = writingGoal && !m.placementPending ? store.all('writing') : [];
    const closed = new Set(wrec.filter((w) => w.kind === 'essay-summary' && ['evaluated', 'final'].includes(w.status)).map((w) => w.exercise));
    const draft = wrec.filter((w) => w.kind === 'essay-draft' && String(w.text || '').trim() && w.exercise && !closed.has(w.exercise) && writingTitles.has(w.exercise))
      .sort((a, b) => (String(a.updated_at) < String(b.updated_at) ? 1 : -1))[0];
    const openDraft = draft && !plan.blocks.some((b) => b.id === 'use' && b.task === draft.exercise && !b.done)
      ? { id: draft.exercise, task: writingTitles.get(draft.exercise), version: Math.max(1, wrec.filter((w) => w.kind === 'essay-version' && w.exercise === draft.exercise).length) } : null;
    // The highest passed level check offers the next level on the path card, until a lesson of that level is opened
    // (TP-6).
    const checkOffer = m.placementPending ? null : [...curriculum.levels].reverse().map((l) => passedCheck(curriculum, l.id))
      .find((x) => x && x.first && !curriculum.levels.find((l) => l.id === x.next).lessons.some((l) => m.progress.has(l.id) && m.progress.get(l.id).status !== 'placed_out')) || null;
    const open = skillsOpen ?? wide();
    // One row of the plan or of the extras. Extras are plain rows: no Enter key, nothing that reads as required.
    // Title, time and reason are grid cells of their own, so on a phone the time moves under the title and the
    // reason takes the card's full width (TF-10).
    const row = (b, { extra = false } = {}) => html`<li><a class="panel plan-item ${extra ? 'flat more-item' : ''} ${isDone(b) ? 'done' : ''}" href="#/${b.route}">
      <span class="glyph">${icon(glyphFor(b, isDone(b)))}</span>
      <span class="pi-title">${title(b)}</span>
      ${isDone(b) ? html`<span class="plan-time done-what">${doneWhat(b, { attempts: attemptsToday, reviews: reviewsToday })}</span>` : html`<span class="plan-time num">${b.minutes} ${tt('דק׳', 'min')}</span>`}
      <span class="why">${why(b)}</span></a></li>`;
    // "Want more?" once the day is done (TF-2): the blocks not done, another review round, the next lesson or the
    // rest of today's lesson, and a quick word game at the learner's level.
    // The goal item (TF-4) is listed once, not beside an open "use it" block with the same route.
    const goalItem = plan.offer && !status.open.some((b) => b.route === plan.offer.route) ? [plan.offer] : [];
    // A first round of today's new words still waiting on a finished day gets its own gentle line above
    // "Want more?" (TP-1), so it is not listed again among the extras.
    const firstRecall = day.firstRecall;
    const openLeft = firstRecall ? status.open.filter((b) => b.id !== 'review') : status.open;
    // Before the day is done, only the lesson's own continuation and, on a short day, the goal item are offered.
    // Either way they sit under "Want more?", outside the plan's minutes, never as a second card beside a done
    // lesson (TP-3).
    const more = complete ? [...openLeft, ...plan.extras, ...goalItem, ...(m.placementPending ? [] : [{ id: 'game', level: m.courseLevel, minutes: 2, route: `games/${m.courseLevel}/1` }])]
      : [...plan.extras.filter((b) => b.id === 'learn'), ...(plan.blocks.some((b) => b.id === 'use') ? [] : goalItem)];
    // The done banner names no minutes (TP-2): the done rows say what was done.
    const doneBanner = html`<div class="banner done-banner">${icon('check', { size: 18 })}<p><strong>${tt('התוכנית להיום הושלמה', 'Today\'s plan is done')}</strong>
      ${tt('אפשר לעצור כאן, או להמשיך בחופשיות', 'You can stop here, or carry on freely')} <a href="#/practice">${tt('בלשונית תרגול', 'in Practice')}</a>.</p></div>`;

    const small = compact();
    const startBar = first ? html`<div class="start-bar"><a class="key enter" href="#/${first.route}">${startLabel(first)} ${arrow()}</a>
            ${lessonDoneToday ? html`<span class="tag ok">${icon('check', { size: 14 })} ${tt('השלמת שיעור היום', 'Lesson completed today')}</span>` : ''}</div>` : '';
    const planSection = m.placementPending
      ? html`${placementCard()}<p class="small muted">${tt('התוכנית היומית תופיע אחרי מבחן המיקום, כדי שתתחילו ברמה הנכונה.', 'Your daily plan appears after the placement test, so it starts at the right level.')}</p>`
      : html`
          ${first ? (small ? '' : startBar) : doneBanner}
          ${otherPlan ? html`<a class="panel plan-item" href="#/lesson/${other.id}?resume=1"><span class="glyph">${icon('play')}</span><span class="pi-title">${tt('להמשיך מאיפה שעצרתם', 'Continue where you left off')}</span><span class="plan-time">${icon('chevron')}</span><span class="why">${legend(otherPlan.title_en, otherPlan.title_he)}<span style="display:block">${stepText(resumeStep(other.resume))}</span></span></a>` : ''}
          <ol class="plan" style="list-style:none;padding:0;margin:0">${(complete ? plan.blocks.filter(isDone) : plan.blocks).map((b) => row(b))}</ol>
          ${openDraft ? html`<ul class="plan more-list writing-open" style="list-style:none;padding:0;margin:0" aria-label="${tt('כתיבה פתוחה', 'Open writing')}"><li><a class="panel plan-item flat more-item" href="#/writing/${openDraft.id}" data-writing-open>
            <span class="glyph">${icon('writing')}</span>
            <span class="pi-title"><span class="small faint">${tt(`להמשיך (גרסה ${openDraft.version}):`, `Continue (version ${openDraft.version}):`)}</span> ${legend(openDraft.task.title_en, openDraft.task.title_he)}</span>
            <span class="why">${tt('הטיוטה שמורה, ואפשר להמשיך ממנה בכל זמן.', 'Your draft is saved, and you can carry on from it any time.')}</span></a></li></ul>` : ''}
          ${firstRecall ? html`<p class="first-recall small"><a href="#/${firstRecall.route}" data-first-recall>${icon('layers', { size: 16 })}<span>${firstRecall.count === 1
            ? tt('המילה החדשה של היום מחכה לסבב ראשון', 'Today\'s new word is waiting for its first round')
            : tt(`${firstRecall.count} המילים החדשות של היום מחכות לסבב ראשון`, `Today's ${firstRecall.count} new words are waiting for their first round`)} · <span class="nowrap">${tt(`כ-${firstRecall.minutes} דק׳`, `about ${firstRecall.minutes} min`)}</span></span></a></p>` : ''}
          ${more.length ? html`<section class="more-today stack-sm" aria-labelledby="more-h"><h3 id="more-h">${tt('רוצים עוד?', 'Want more?')}</h3>
            <p class="small muted">${tt('לא חובה. כל אחד מאלה עומד בפני עצמו.', 'Optional. Each of these stands on its own.')}</p>
            <ul class="plan more-list" style="list-style:none;padding:0;margin:0">${more.map((b) => row(b, { extra: true }))}</ul></section>` : ''}
          ${importNote ? html`<p class="panel flat small import-status" role="status" tabindex="-1" data-import-status>${icon('check', { size: 16 })}<span>${importNote}</span></p>`
            : showImport ? html`<div class="panel flat stack-sm"><p class="small">${isolateLatin(tt(`להוסיף לחזרה המרווחת את מילות המפתח של שיעורי ${L(importLevel)} שדילגתם עליהם? הן ייכנסו בהדרגה, עד ${s.new_per_day} חדשות ביום.`, `You skipped ${L(importLevel)}. Add its key words to your reviews? Up to ${s.new_per_day} new a day.`))}</p>
            <div class="row"><button type="button" class="key small" data-import="${importLevel}"><span>${isolateLatin(tt(`להוסיף את המילים של ${L(importLevel)}`, `Add the ${L(importLevel)} words`))}</span></button><button type="button" class="key ghost small" data-import-later="${importLevel}">${tt('לא עכשיו', 'Not now')}</button></div></div>` : ''}
          ${uiSwitchOffer ? html`<div class="banner row ui-offer">${icon('globe', { size: 18 })}<span class="grow">${isolateLatin(tt(`הרמה שלכם היא ${L(m.courseLevel)}. ממשק באנגלית הוא עוד תרגול יומיומי, ואפשר לחזור לעברית בכל רגע בהגדרות.`, `You are at ${L(m.courseLevel)}. An English interface is extra daily practice, and you can switch back in Settings at any time.`))}</span>
            <button type="button" class="key small" data-ui-en>${tt('לעבור לאנגלית', 'Switch to English')}</button><button type="button" class="key small ghost" data-ui-later>${tt('לא עכשיו', 'Not now')}</button></div>` : ''}
          ${courseDone ? html`<p class="banner">${m.skipped.length
            ? tt('עשית את כל השיעורים שמוכנים כרגע. שיעורים נוספים בהכנה; בינתיים מעבדת הכתיבה והמטלות המתקדמות מחכות.', 'You\'ve done every lesson that is ready. More are being written; meanwhile the Writing lab and advanced assignments are waiting.')
            : tt('השלמתם את כל 75 השיעורים. מעבדת הכתיבה והמטלות המתקדמות מחכות.', 'You have completed all 75 lessons. The Writing lab and advanced assignments are waiting.')}</p>` : ''}`;

    // The minutes choice waits until there is a plan to fit (TP-7): not while the placement test is unfinished.
    const minutesChoice = m.placementPending ? '' : html`<div class="today-minutes"><span class="label" id="today-min-l">${tt('כמה זמן יש לכם היום?', 'How much time do you have today?')}</span>
          <div class="seg" role="group" aria-labelledby="today-min-l">${[10, 20, 35, 50].map((n) => html`<button type="button" data-min="${n}" aria-pressed="${String(target === n)}">${n} ${tt('דק׳', 'min')}</button>`)}</div>
          <p class="today-min-status small" role="status" data-min-status>${minutesNote}</p></div>`;
    render(el, html`
      <div class="page-head ${small ? 'compact' : ''}">
        <div><h1>${hello}${p?.name ? `, ${p.name}` : ''}</h1>
          <p>${tt(`יעד שבועי: ${week.days} מתוך ${week.goal} ימים. יום חופש לא מוחק כלום.`, `Weekly goal: ${week.days} of ${week.goal} days. A day off erases nothing.`)}</p></div>
        ${small ? (m.placementPending ? '' : startBar) : minutesChoice}
      </div>
      <div class="today">
        <section class="stack" aria-labelledby="plan-h">
          <div class="row between"><h2 id="plan-h">${tt('התוכנית להיום', 'Today\'s plan')}</h2>${m.placementPending || complete ? '' : html`<span class="small faint num">${tt(`כ-${plan.minutes} דקות`, `about ${plan.minutes} min`)}</span>`}</div>
          ${planSection}
          ${small ? minutesChoice : ''}
        </section>
        <aside class="stack">
          <div class="panel stack">
            <div class="row between"><h2 class="small" style="font-size:var(--t-md)">${tt('המסלול', 'Your path')}</h2><a class="small all-lessons" href="#/path">${tt('לכל השיעורים', 'All lessons')}</a></div>
            ${levelRail(curriculum, m.progress, m.courseLevel)}
            ${checkOffer ? html`<div class="check-passed stack-sm" data-check-passed><p class="small">${icon('check', { size: 16 })}<span>${passedCheckLine(checkOffer)}</span></p>${nextLevelKey(checkOffer, 'key small')}</div>` : ''}
          </div>
          <details class="panel skill-fold" data-skills ${open ? html`open` : ''}>
            <summary class="disclosure"><span class="chev" aria-hidden="true">${icon('chevron', { size: 18 })}</span>
              <span class="grow"><h2 class="skill-fold-h">${tt('הרמה לפי מיומנות', 'Level by skill')}</h2><span class="skill-fold-sum xsmall faint">${skillSummary(m.skills)}</span></span></summary>
            <div class="stack-sm" style="margin-block-start:var(--s4)">${skillProfile(m.skills, { brief: true })}<a class="small" href="#/progress">${tt('פרטים ומקור כל רמה', 'Details and where each level comes from')}</a></div>
          </details>
          ${m.recurring.length ? html`<div class="panel stack-sm"><h2 class="small" style="font-size:var(--t-md)">${tt('טעויות שחוזרות', 'Recurring mistakes')}</h2>
            ${m.recurring.slice(0, 3).map((e) => { const x = tx.error.get(e.error_type); return html`<a class="row small" href="#/drill?error=${e.error_type}" style="text-decoration:none;color:inherit"><span class="tag ${e.trend === 'improving' ? 'ok' : 'warn'}">${e.count}×</span><span class="grow">${tt(x?.name_he, x?.name_en)}</span>${e.trend === 'improving' ? html`<span class="xsmall" style="color:var(--ok)">${tt('משתפר', 'improving')}</span>` : ''}</a>`; })}</div>` : ''}
        </aside>
      </div>`);
  }

  draw();
  ctx.watch(['progress', 'cards', 'attempts', 'settings', 'events', 'placement', 'profile', 'writing'], draw);
  // The compact layout follows the window width (TP-7); a text-size change saves settings, which redraws already.
  const narrow = globalThis.matchMedia?.(NARROW);
  narrow?.addEventListener?.('change', draw);
  const offs = [
    () => narrow?.removeEventListener?.('change', draw),
    // Today only: Settings keeps the daily default (TF-5). The choice is announced, and focus stays on it.
    on(el, 'click', '[data-min]', (e, b) => {
      const n = Number(b.dataset.min);
      minutesNote = '';
      const hold = holdTodayPart(lastPlan?.blocks.find((b) => b.id === 'learn' && !b.completed));
      saveSettings({ ...hold, today_minutes: n === settings().daily_minutes ? null : { date: todayKey(), n } });
      el.querySelector(`[data-min="${n}"]`)?.focus();
      setTimeout(() => {
        minutesNote = tt(`התוכנית עודכנה ל-${n} דקות`, `The plan now fits ${n} minutes`);
        const status = el.querySelector('[data-min-status]');
        if (status) status.textContent = minutesNote;
      }, 60);
    }),
    on(el, 'click', '[data-ui-en]', () => { saveProfile({ ui_language: 'en' }); saveSettings({ ui_switch_answered: 'en' }); }),
    on(el, 'click', '[data-ui-later]', () => saveSettings({ ui_switch_answered: model().courseLevel })),
    ...bindPlacementCard(el, ctx),
    // The result stays where the button was, as a status that takes the focus, instead of a toast that leaves
    // focus on the page (TF-12).
    on(el, 'click', '[data-import]', async (e, b) => {
      b.disabled = true;
      const n = await importPlacedOutVocab(b.dataset.import);
      const per = settings().new_per_day;
      importNote = n ? tt(`נוספו ${n} מילים לחזרה. עד ${per} חדשות ביום.`, `${n} words added to your reviews. Up to ${per} new a day.`) : tt('המילים האלה כבר בחזרה.', 'These words are already in your reviews.');
      draw();
      el.querySelector('[data-import-status]')?.focus();
    }),
    on(el, 'click', '[data-import-later]', (e, b) => { saveSettings({ vocab_import_hidden: b.dataset.importLater }); toast(tt('אפשר להוסיף אותן בכל זמן מהמסלול.', 'You can add them any time from the path.')); }),
    on(el, 'toggle', 'details[data-skills]', (e, d) => { if (e.target === d) skillsOpen = d.open; }, true),
  ];
  return () => offs.forEach((o) => o());
}
