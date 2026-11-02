// Today: the plan for this session, why each part is there, and honest evidence of progress.
import { html, render, on, todayKey } from '../core/util.js';
import { tt, legend, t, uiLang } from '../core/i18n.js';
import { content, taxonomyIndex } from '../core/content.js';
import { icon, LEVEL_LABEL, toast } from '../ui/components.js';
import { profile, saveProfile, settings, saveSettings, todayPlan, model, weekActivity, due, placementDraft, selfReportLevel, applyPlacement, vocabImportLevel, importPlacedOutVocab, lessonAvailable, resumeStep } from '../core/learner.js';
import { zeroResult, selfReportResult } from '../core/placement.js';
import { store } from '../core/store.js';
import { LEVELS, SKILLS, levelIndex, isLessonId, lessonOrder } from '../core/adaptive.js';

// Each block's icon names what it is (persona findings R2-22, R2-30: reading has a book, targeted practice
// its own icon, never the placeholder circle of a missing icon).
const GLYPH = { warmup: 'sparkle', review: 'layers', learn: 'path', practice: 'practice', use: 'speaking', exit: 'check' };
const USE_GLYPH = { writing: 'writing', reading: 'reading', speaking: 'speaking' };
export function glyphFor(b, done = false) {
  if (done) return 'check';
  if (b.id === 'use') return b.scenario ? 'reallife' : USE_GLYPH[b.kind] || GLYPH.use;
  if (b.id === 'practice' && b.focus?.kind === 'scenario') return 'reallife';
  return GLYPH[b.id];
}
const L = (l) => LEVEL_LABEL[l] || l;
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
      return html`<div class="${l.id === current ? 'current' : ''}" style="--n:${l.lessons.length}"><span style="width:${done}%"></span>${out ? html`<span class="out" style="inset-inline-start:${done}%;width:${out}%"></span>` : ''}</div>`;
    })}</div>
    <div class="level-rail-labels" aria-hidden="true">${curriculum.levels.map((l) => html`<span class="${l.id === current ? 'current' : ''}" style="--n:${l.lessons.length}">${L(l.id)}</span>`)}</div>
  </div>`;
}

// Where a skill's level comes from, in a few words (shown under the skill's name).
function skillSource(s, k) {
  if (k?.level) {
    if (k.source === 'placement') {
      // The answers behind a capped estimate were at a higher level: say where (persona findings R2-29, R2-38).
      return k.from
        ? tt(`הערכה ראשונה: ${k.right} מתוך ${k.evidence} נכונות ברמה ${L(k.from)} במבחן המיקום`, `First estimate: ${k.right} of ${k.evidence} placement questions right at ${L(k.from)}`)
        : tt(`הערכה ראשונה: ${k.evidence} שאלות במבחן המיקום`, `First estimate: ${k.evidence} placement questions`);
    }
    if (k.notYet) return tt(`עוד לא ${L(k.notYet)} בתרגול (${k.evidence} תשובות בניסיון ראשון)`, `Not yet ${L(k.notYet)} in practice (${k.evidence} first-try answers)`);
    if (k.source === 'assessed-writing') return tt(`${k.evidence} טקסטים שהוערכו, ב-${k.days} ימים`, `${k.evidence} assessed texts, on ${k.days} days`);
    return tt(`${k.evidence} תשובות בניסיון ראשון ברמה, ב-${k.days} ימים`, `${k.evidence} first-try answers at this level, on ${k.days} days`);
  }
  if (s === 'speaking') return tt('Lucid עוד לא מעריך רמת דיבור', 'Lucid does not assess speaking level yet');
  if (s === 'writing') return k?.evidence ? tt(`${k.evidence} טקסט שהוערך; צריך 2 בימים שונים`, `${k.evidence} assessed text; 2 on different days give a level`) : tt('לפי טקסטים שקיבלו משוב AI', 'From texts with AI feedback');
  return '';
}

// brief (Today): the rows without their source lines and a one-line note; Progress shows everything.
export function skillProfile(skills, { brief = false } = {}) {
  if (!SKILLS.some((s) => skills[s]?.level)) {
    return html`<p class="small muted">${tt('הפרופיל לפי מיומנות יופיע אחרי השיעורים הראשונים: כל מיומנות מקבלת רמה רק כשיש לה ראיות.', 'Your skill profile appears after your first lessons: each skill gets a level only once there is evidence for it.')}</p>`;
  }
  return html`<div class="skills">${SKILLS.map((s) => {
    const k = skills[s];
    const src = brief ? '' : skillSource(s, k);
    const name = html`<span>${t(`skill.${s}`)}</span>`;
    const note = src ? html`<span class="skill-src">${src}</span>` : '';
    if (!k?.level) return html`<div class="skill-row">${name}<span class="skill-level none skill-wide">${tt('עוד לא נבדק', 'Not yet assessed')}</span>${note}</div>`;
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
  if (!shown.length) return tt('עוד לא נבדק', 'Not yet assessed');
  const rest = SKILLS.length - shown.length;
  const parts = shown.map((s) => html`<span>${t(`skill.${s}`)} <bdi dir="ltr">${L(skills[s].level)}${skills[s].capped ? '+' : ''}</bdi></span>`);
  if (rest) parts.push(html`<span>${rest === 1 ? tt('מיומנות אחת עוד לא נבדקה', '1 not yet assessed') : tt(`${rest} מיומנויות עוד לא נבדקו`, `${rest} not yet assessed`)}</span>`);
  return parts.map((x, i) => html`${i ? ' · ' : ''}${x}`);
}

// The unfinished placement test, on Today and on the path (persona findings P-37, R2-15, R1-D2).
export function placementCard({ heading = 'h2' } = {}) {
  const n = placementDraft()?.answers?.length || 0;
  const own = selfReportLevel();
  const title = n ? tt('להמשיך את מבחן המיקום', 'Finish your placement test') : tt('מבחן המיקום מחכה לך', 'Your placement test is waiting');
  return html`<section class="panel stack" aria-labelledby="pl-h">
    ${heading === 'h1' ? html`<h1 id="pl-h" class="h3">${title}</h1>` : html`<h2 id="pl-h">${title}</h2>`}
    <p class="small muted">${n
      ? tt(`ענית על ${n} שאלות, והן נשמרו. עוד כמה דקות, והתוכנית היומית תתחיל ברמה שמתאימה לך.`, `You've answered ${n} questions, and they're saved. A few more minutes and your daily plan starts at the level that fits you.`)
      : tt('כ-10 דקות. אחריו התוכנית היומית תתחיל ברמה שמתאימה לך.', 'About 10 minutes. After it, your daily plan starts at the level that fits you.')}</p>
    <div class="row"><a class="key enter" href="#/placement${n ? '?resume=1' : ''}">${n ? tt('להמשיך את המבחן', 'Continue the test') : tt('להתחיל את המבחן', 'Start the test')} ${arrow()}</a>
      ${n ? html`<a class="key ghost" href="#/placement?restart=1">${tt('להתחיל מחדש', 'Start again')}</a>` : ''}</div>
    <div class="row small"><span class="muted">${tt('או בלי מבחן:', 'Or without the test:')}</span>
      ${own ? html`<button type="button" class="key ghost small" data-skip-level="${own}">${tt(`להתחיל ב-${L(own)} (ההערכה שלך)`, `Start at ${L(own)} (your own estimate)`)}</button>` : ''}
      <button type="button" class="key ghost small" data-basics>${tt('להתחיל מהבסיס', 'Start from the basics')}</button></div>
  </section>`;
}
export function bindPlacementCard(el, ctx) {
  return [
    on(el, 'click', '[data-skip-level]', async (e, b) => { await applyPlacement(selfReportResult(b.dataset.skipLevel)); toast(tt(`המסלול מתחיל ב-${L(b.dataset.skipLevel)}`, `Your path starts at ${L(b.dataset.skipLevel)}`)); }),
    on(el, 'click', '[data-basics]', async () => { await applyPlacement(zeroResult()); ctx.navigate('lesson/pa1-01'); }),
  ];
}

const wide = () => globalThis.matchMedia?.('(min-width: 64rem)').matches ?? true;

export default async function today(el, ctx) {
  ctx.setTitle(t('nav.today'));
  const [curriculum, tx, scenarios, writing] = await Promise.all([content.curriculum(), taxonomyIndex(), content.scenarios().catch(() => null), content.writingExercises().catch(() => null)]);
  const extras = { lesson: null, scenarios: scenarios?.scenarios || [], writingTasks: writing?.exercises || [] };
  const lessons = new Map(lessonOrder(curriculum).map((l) => [l.id, l]));
  // The skill panel is folded on phones and open beside the plan on wide screens, until the learner toggles it.
  let skillsOpen = null;
  // The plan shows the next lesson's real length, so it needs the lesson file (cached after the first load).
  let loadingLesson = null;
  async function loadLesson(id) {
    if (!id || extras.lesson?.id === id || loadingLesson === id) return;
    loadingLesson = id;
    const lesson = await content.lesson(id).catch(() => null);
    loadingLesson = null;
    if (lesson && model().next?.id === id) { extras.lesson = lesson; draw(); }
  }
  await loadLesson(model().next?.id);

  function draw() {
    const s = settings();
    const p = profile();
    const m = model();
    if (m.next?.id !== extras.lesson?.id) loadLesson(m.next?.id);
    // Onboarding promises to suggest the English interface as the level rises: offered from B1, and again at each
    // higher level after "Not now", never after the learner chose.
    const uiSwitchOffer = p?.ui_language !== 'en' && !m.placementPending && levelIndex(m.courseLevel) >= levelIndex('B1')
      && s.ui_switch_answered !== 'en' && (!s.ui_switch_answered || levelIndex(m.courseLevel) > levelIndex(s.ui_switch_answered));
    const plan = todayPlan(s.daily_minutes, extras);
    const week = weekActivity();
    const dueCount = due().length;
    const today = todayKey();
    // Only curriculum lessons count here: a finished scenario or level check is not a lesson.
    const lessonDoneToday = store.all('progress').some((x) => isLessonId(x.id) && x.status === 'completed' && x.completed_at && todayKey(new Date(x.completed_at)) === today);
    // A block is ticked only for what was really done: the plan marks practice and "use it" blocks itself.
    const isDone = (b) => (b.id === 'review' && dueCount === 0) || ((b.id === 'use' || b.id === 'practice') && Boolean(b.done)) || (b.id === 'learn' && Boolean(b.slice?.partDone));
    const first = plan.blocks.find((b) => !isDone(b));
    const hour = new Date().getHours();
    const hello = hour < 12 ? tt('בוקר טוב', 'Good morning') : hour < 18 ? tt('צהריים טובים', 'Good afternoon') : tt('ערב טוב', 'Good evening');
    const scenario = (id) => extras.scenarios.find((x) => x.id === id);
    const task = (id) => extras.writingTasks.find((x) => x.id === id);
    const pos = (sl) => tt(`תרגיל ${sl.done + 1} מתוך ${sl.of}`, `exercise ${sl.done + 1} of ${sl.of}`);
    const missedLabel = (n) => (n === 1 ? tt('לתרגל את הטעות', 'Practise the one you missed') : tt(`לתרגל את ${n} הטעויות`, `Practise the ${n} you missed`));

    const title = (b) => {
      switch (b.id) {
        case 'warmup': return tt('חימום: מילים מהימים האחרונים', 'Warm-up: words from the last few days');
        case 'review': return tt(`חזרה מרווחת · ${b.count} מילים`, `Spaced review · ${b.count} words`);
        case 'learn': {
          if (!m.next) return tt('השיעור הבא', 'Next lesson');
          const lead = b.missed ? tt('כמעט סיימת:', 'Nearly done:') : b.resume ? tt('המשך:', 'Continue:') : '';
          return html`${lead ? html`<span class="small faint">${lead}</span> ` : ''}${legend(m.next.title_en, m.next.title_he)}`;
        }
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
          if (sc) return html`${tt('מהחיים:', 'Real life:')} ${legend(sc.title_en, sc.title_he)}`;
          if (tk) return html`${b.started && !b.done ? tt('כתיבה, להמשיך:', 'Writing, continue:') : tt('כתיבה:', 'Writing:')} ${legend(tk.title_en, tk.title_he)}`;
          if (b.kind === 'reading') return tt('קריאה: טקסט קצר ברמה שלך', 'Reading: a short text at your level');
          return b.kind === 'speaking' ? tt('דיבור: להשתמש במה שלמדתם', 'Speaking: use what you learned') : tt('כתיבה: טקסט קצר משלכם', 'Writing: a short text of your own');
        }
        case 'exit': return tt('בדיקת יציאה: המילים של היום', 'Exit check: today\'s words');
        default: return b.id;
      }
    };
    const lessonWhy = (b) => {
      const sl = b.slice || {};
      const lines = [];
      if (b.skipped?.length) {
        const sk = lessons.get(b.skipped[0]);
        lines.push(tt(`השיעור ״${sk?.title_he || b.skipped[0]}״ עוד בהכנה, ולכן זה השיעור הבא שמוכן.`, `"${sk?.title_en || b.skipped[0]}" is still being written, so this is the next lesson that is ready.`));
      }
      // After "Nearly there": the right answers still count, so the missed exercises can complete the lesson.
      if (b.missed) lines.push(tt(`${b.missed === 1 ? 'נשאר תרגיל אחד שפספסתם' : `נשארו ${b.missed} תרגילים שפספסתם`}, כ-${sl.today} דק׳. התשובות הנכונות נשמרו, ותיקון הטעויות יכול להשלים את השיעור.`, `${b.missed === 1 ? 'One exercise you missed is left' : `${b.missed} exercises you missed are left`}, about ${sl.today} min. Your right answers are kept, and fixing these can complete the lesson.`));
      else if (b.missedRun && b.step) lines.push(tt(`מתקנים את מה שפספסתם: ${stepText(b.step)}.`, `Fixing the ones you missed: ${stepText(b.step)}.`));
      else if (sl.partDone) lines.push(tt(`החלק של היום הושלם. מחר ממשיכים מ${pos(sl)}.`, `Today's part is done. Tomorrow continues from ${pos(sl)}.`));
      else if (sl.split) lines.push(tt(`השיעור כולו כ-${sl.total} דקות, אז היום עושים חלק: עד תרגיל ${sl.upto} מתוך ${sl.of}. המקום נשמר בכל יציאה.`, `The whole lesson takes about ${sl.total} min, so today is a part: up to exercise ${sl.upto} of ${sl.of}. Your place is saved whenever you leave.`));
      else if (sl.total && b.resume) lines.push(tt(`נשארו כ-${sl.remaining} דקות: ${stepText(b.step) || pos(sl)}.`, `About ${sl.remaining} min left: ${stepText(b.step) || pos(sl)}.`));
      else if (sl.total) lines.push(tt(`שיעור של כ-${sl.total} דקות.`, `A lesson of about ${sl.total} min.`));
      return html`${m.next?.can_do && !b.missed ? html`<span lang="en" dir="ltr" style="display:block">${m.next.can_do}</span>` : ''}${lines.map((x) => html`<span style="display:block">${x}</span>`)}`;
    };
    // The reason names only a goal the learner chose (persona finding R2-39).
    const goalWhy = (b) => {
      if (b.goal === 'travel') return tt('בחרת טיולים: מצב אחד מנסיעה, ברמה שלך.', 'You chose travel: one real situation from a trip, at your level.');
      if (b.goal === 'conversation') return tt('בחרת ביטחון בשיחה: שיחה אחת מהחיים, ברמה שלך.', 'You chose confidence in conversation: one real conversation, at your level.');
      if (b.goal === 'work') return tt('בחרת עבודה: מצב אחד מהעבודה, ברמה שלך.', 'You chose work: one workplace situation, at your level.');
      if (b.goal === 'studies' && b.kind === 'reading') return tt('בחרת בגרות ולימודים: קריאה של טקסטים קצרים בונה את ההבנה שהמבחנים האלה בודקים.', 'You chose exams and university: reading short texts builds the comprehension these exams test.');
      if (b.goal === 'writing' && b.kind === 'reading') return tt('בחרת כתיבה אקדמית: קריאה של טקסטים עם טיעון טוב בונה את השפה שכותבים בה.', 'You chose academic writing: reading well-argued texts builds the language you write with.');
      if (b.goal === 'studies' && b.kind === 'writing') return tt('בחרת בגרות ולימודים: משימה אחת ממעבדת הכתיבה, ברמה שלך.', 'You chose exams and university: one Writing lab task at your level.');
      if (b.goal === 'writing' && b.kind === 'writing') return tt('בחרת כתיבה אקדמית: משימה אחת ממעבדת הכתיבה, ברמה שלך.', 'You chose academic writing: one Writing lab task at your level.');
      return b.kind === 'speaking' ? tt('להגיד דברים בקול הופך ידע למיומנות.', 'Saying things out loud turns knowledge into skill.') : b.kind === 'reading' ? tt('קריאה ברמה שלך מרחיבה מילים ומבנים.', 'Reading at your level widens your words and structures.') : tt('כתיבה מחייבת לבחור מילים ומבנים בעצמכם.', 'Writing makes you choose words and structures yourself.');
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
        case 'review': return tt('המילים האלה בדיוק לפני שכחה. חזרה עכשיו מאריכה את הזיכרון.', 'These words are about to fade. Reviewing now makes the memory last longer.');
        case 'learn': return lessonWhy(b);
        case 'practice': {
          if (b.focus.kind === 'scenario') return tt('בחלק מהתשובות שלך כאן הייתה דרך טבעית יותר. עוד סבב יעזור לזכור אותה.', 'Some of your replies here had a more natural option. Another round helps it stick.');
          const e = b.focus.kind === 'error' ? m.recurring.find((x) => x.error_type === b.focus.id) : null;
          return e ? tt(`חזר ${e.count} פעמים ב-${e.days} ימים שונים בחודש האחרון.`, `It came up ${e.count} times on ${e.days} different days this month.`) : tt('נושא שעוד לא יושב טוב.', 'A topic that is not secure yet.');
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
        return b.resume
          ? html`<span>${tt('להמשיך', 'Continue')}: <bdi lang="en" dir="ltr">${m.next.title_en}</bdi> · <span style="white-space:nowrap">${stepText(b.step, { short: true })}</span></span>`
          : html`<span>${tt('להתחיל', 'Start')}: <bdi lang="en" dir="ltr">${m.next.title_en}</bdi></span>`;
      }
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
    const done = !m.next;
    const open = skillsOpen ?? wide();

    const planSection = m.placementPending
      ? html`${placementCard()}<p class="small muted">${tt('התוכנית היומית תופיע אחרי מבחן המיקום, כדי שתתחיל ברמה הנכונה.', 'Your daily plan appears after the placement test, so it starts at the right level.')}</p>`
      : html`
          ${first ? html`<div class="start-bar"><a class="key enter" href="#/${first.route}">${startLabel(first)} ${arrow()}</a>
            ${lessonDoneToday ? html`<span class="tag ok">${icon('check', { size: 14 })} ${tt('השלמת שיעור היום', 'Lesson completed today')}</span>` : ''}</div>` : html`<p class="banner">${icon('check', { size: 18 })}<span>${tt('סיימתם את התוכנית להיום. אפשר להמשיך בחופשיות במעבדות.', 'You\'ve finished today\'s plan. Carry on freely in the labs.')}</span></p>`}
          ${otherPlan ? html`<a class="panel plan-item" href="#/lesson/${other.id}?resume=1"><span class="glyph">${icon('play')}</span><span class="grow"><span style="font-weight:500;display:block">${tt('להמשיך מאיפה שעצרתם', 'Continue where you left off')}</span><span class="why" style="display:block">${legend(otherPlan.title_en, otherPlan.title_he)}</span><span class="why" style="display:block">${stepText(resumeStep(other.resume))}</span></span>${icon('chevron')}</a>` : ''}
          <ol class="plan" style="list-style:none;padding:0;margin:0">${plan.blocks.map((b) => html`<li><a class="panel plan-item ${isDone(b) ? 'done' : ''}" href="#/${b.route}">
            <span class="glyph">${icon(glyphFor(b, isDone(b)))}</span>
            <span class="grow"><span style="font-weight:500">${title(b)}</span><span class="why" style="display:block">${why(b)}</span></span>
            <span class="plan-time num">${b.minutes} ${tt('דק׳', 'min')}</span></a></li>`)}</ol>
          ${showImport ? html`<div class="panel flat stack-sm"><p class="small">${tt(`להוסיף לחזרה המרווחת את מילות המפתח של שיעורי ${L(importLevel)} שדילגת עליהם? הן ייכנסו בהדרגה, עד ${s.new_per_day} ביום.`, `Add the key words of the ${L(importLevel)} lessons you placed out of to your spaced review? They come in gradually, up to ${s.new_per_day} a day.`)}</p>
            <div class="row"><button type="button" class="key small" data-import="${importLevel}">${tt(`להוסיף את המילים של ${L(importLevel)}`, `Add the ${L(importLevel)} words`)}</button><button type="button" class="key ghost small" data-import-later="${importLevel}">${tt('לא עכשיו', 'Not now')}</button></div></div>` : ''}
          ${done ? html`<p class="banner">${m.skipped.length
            ? tt('עשית את כל השיעורים שמוכנים כרגע. שיעורים נוספים בהכנה; בינתיים מעבדת הכתיבה והמטלות המתקדמות מחכות.', 'You\'ve done every lesson that is ready. More are being written; meanwhile the Writing lab and advanced assignments are waiting.')
            : tt('השלמתם את כל 75 השיעורים. מעבדת הכתיבה והמטלות המתקדמות מחכות.', 'You have completed all 75 lessons. The Writing lab and advanced assignments are waiting.')}</p>` : ''}`;

    render(el, html`
      <div class="page-head">
        <div><h1>${hello}${p?.name ? `, ${p.name}` : ''}</h1>
          <p>${tt(`יעד שבועי: ${week.days} מתוך ${week.goal} ימים. יום חופש לא מוחק כלום.`, `Weekly goal: ${week.days} of ${week.goal} days. A day off erases nothing.`)}</p></div>
        <div class="seg" role="group" aria-label="${tt('אורך האימון היום', 'Session length today')}">${[10, 20, 35, 50].map((n) => html`<button type="button" data-min="${n}" aria-pressed="${s.daily_minutes === n}">${n} ${tt('דק׳', 'min')}</button>`)}</div>
      </div>
      ${uiSwitchOffer ? html`<div class="banner row" style="margin-block-end:var(--s5)">${icon('globe', { size: 18 })}<span class="grow">${tt(`את/ה ברמה ${LEVEL_LABEL[m.courseLevel]}. ממשק באנגלית הוא עוד תרגול יומיומי, ואפשר לחזור לעברית בכל רגע בהגדרות.`, `You are at ${LEVEL_LABEL[m.courseLevel]}. An English interface is extra daily practice, and you can switch back in Settings at any time.`)}</span>
        <button type="button" class="key small" data-ui-en>${tt('לעבור לאנגלית', 'Switch to English')}</button><button type="button" class="key small ghost" data-ui-later>${tt('לא עכשיו', 'Not now')}</button></div>` : ''}
      <div class="today">
        <section class="stack" aria-labelledby="plan-h">
          <div class="row between"><h2 id="plan-h">${tt('התוכנית להיום', 'Today\'s plan')}</h2>${m.placementPending ? '' : html`<span class="small faint num">${tt(`כ-${plan.minutes} דקות`, `about ${plan.minutes} min`)}</span>`}</div>
          ${planSection}
        </section>
        <aside class="stack">
          <div class="panel stack">
            <div class="row between"><h2 class="small" style="font-size:var(--t-md)">${tt('המסלול', 'Your path')}</h2><a class="small" href="#/path">${tt('לכל השיעורים', 'All lessons')}</a></div>
            ${levelRail(curriculum, m.progress, m.courseLevel)}
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
  const offs = [
    on(el, 'click', '[data-min]', (e, b) => saveSettings({ daily_minutes: Number(b.dataset.min) })),
    on(el, 'click', '[data-ui-en]', () => { saveProfile({ ui_language: 'en' }); saveSettings({ ui_switch_answered: 'en' }); }),
    on(el, 'click', '[data-ui-later]', () => saveSettings({ ui_switch_answered: model().courseLevel })),
    ...bindPlacementCard(el, ctx),
    on(el, 'click', '[data-import]', async (e, b) => {
      b.disabled = true;
      const n = await importPlacedOutVocab(b.dataset.import);
      toast(n ? tt(`${n} מילים נוספו לחזרה. הן ייכנסו בהדרגה.`, `${n} words added to review. They come in gradually.`) : tt('המילים האלה כבר בחזרה.', 'These words are already in review.'));
      draw();
    }),
    on(el, 'click', '[data-import-later]', (e, b) => { saveSettings({ vocab_import_hidden: b.dataset.importLater }); toast(tt('אפשר להוסיף אותן בכל זמן מהמסלול.', 'You can add them any time from the path.')); }),
    on(el, 'toggle', 'details[data-skills]', (e, d) => { if (e.target === d) skillsOpen = d.open; }, true),
  ];
  return () => offs.forEach((o) => o());
}
