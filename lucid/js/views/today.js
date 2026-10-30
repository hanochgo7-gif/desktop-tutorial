// Today: the plan for this session, why each part is there, and honest evidence of progress.
import { html, render, on, todayKey } from '../core/util.js';
import { tt, legend, t, uiLang } from '../core/i18n.js';
import { content, taxonomyIndex } from '../core/content.js';
import { icon, LEVEL_LABEL, toast } from '../ui/components.js';
import { profile, settings, saveSettings, todayPlan, model, weekActivity, due, placementDraft, selfReportLevel, applyPlacement, vocabImportLevel, importPlacedOutVocab, lessonAvailable } from '../core/learner.js';
import { zeroResult, selfReportResult } from '../core/placement.js';
import { store } from '../core/store.js';
import { LEVELS, SKILLS, levelIndex, isLessonId, lessonOrder } from '../core/adaptive.js';

const GLYPH = { warmup: 'sparkle', review: 'layers', learn: 'path', practice: 'target', use: 'speaking', exit: 'check' };
const L = (l) => LEVEL_LABEL[l] || l;

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
    if (k.source === 'placement') return tt(`הערכה ראשונה: ${k.evidence} שאלות במבחן המיקום`, `First estimate: ${k.evidence} placement questions`);
    if (k.notYet) return tt(`עוד לא ${L(k.notYet)} בתרגול (${k.evidence} תשובות)`, `Not yet ${L(k.notYet)} in practice (${k.evidence} answers)`);
    if (k.source === 'assessed-writing') return tt(`${k.evidence} טקסטים שהוערכו, ב-${k.days} ימים`, `${k.evidence} assessed texts, on ${k.days} days`);
    return tt(`${k.evidence} תשובות ברמה, ב-${k.days} ימים`, `${k.evidence} answers at this level, on ${k.days} days`);
  }
  if (s === 'speaking') return tt('Lucid עוד לא מעריך רמת דיבור', 'Lucid does not assess speaking level yet');
  if (s === 'writing') return k?.evidence ? tt(`${k.evidence} טקסט שהוערך; צריך 2 בימים שונים`, `${k.evidence} assessed text; 2 on different days give a level`) : tt('לפי טקסטים שקיבלו משוב AI', 'From texts with AI feedback');
  return '';
}

export function skillProfile(skills) {
  if (!SKILLS.some((s) => skills[s]?.level)) {
    return html`<p class="small muted">${tt('הפרופיל לפי מיומנות יופיע אחרי השיעורים הראשונים: כל מיומנות מקבלת רמה רק כשיש לה ראיות.', 'Your skill profile appears after your first lessons: each skill gets a level only once there is evidence for it.')}</p>`;
  }
  return html`<div class="skills">${SKILLS.map((s) => {
    const k = skills[s];
    const src = skillSource(s, k);
    const name = html`<span>${t(`skill.${s}`)}</span>`;
    const note = src ? html`<span class="skill-src">${src}</span>` : '';
    if (!k?.level) return html`<div class="skill-row">${name}<span class="skill-level none skill-wide">${tt('עוד לא נבדק', 'Not yet assessed')}</span>${note}</div>`;
    const label = html`<bdi dir="ltr">${L(k.level)}${k.capped ? '+' : ''}</bdi>`;
    return html`<div class="skill-row ${k.provisional ? 'est' : ''}">${name}<div class="meter" aria-hidden="true"><span style="width:${((levelIndex(k.level) + 1) / LEVELS.length) * 100}%"></span></div><span class="skill-level">${label}</span>${note}</div>`;
  })}</div><p class="xsmall faint" style="margin-top:var(--s3)">${t('level.estimate')}. ${tt('רמה מופיעה רק כשיש ראיות למיומנות עצמה: 6 תשובות ומעלה ברמה, 75% נכונות, ביומיים שונים. מבחן המיקום נותן רק הערכה ראשונה (פס מקווקו), ולכל היותר', 'A level appears only with evidence for that skill: 6+ answers at the level, 75% right, on 2 different days. The placement test gives only a first estimate (striped bar), at most')} <bdi dir="ltr">B2+</bdi>.</p>`;
}

export default async function today(el, ctx) {
  ctx.setTitle(t('nav.today'));
  const [curriculum, tx, scenarios, writing] = await Promise.all([content.curriculum(), taxonomyIndex(), content.scenarios().catch(() => null), content.writingExercises().catch(() => null)]);
  const extras = { lesson: null, scenarios: scenarios?.scenarios || [], writingTasks: writing?.exercises || [] };
  const lessons = new Map(lessonOrder(curriculum).map((l) => [l.id, l]));
  const arrow = () => icon(uiLang() === 'he' ? 'arrow-back' : 'arrow-next');
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

  function placementCard() {
    const n = placementDraft()?.answers?.length || 0;
    const own = selfReportLevel();
    return html`<section class="panel stack" aria-labelledby="pl-h">
      <h2 id="pl-h">${n ? tt('להמשיך את מבחן המיקום', 'Finish your placement test') : tt('מבחן המיקום מחכה לך', 'Your placement test is waiting')}</h2>
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

  function draw() {
    const s = settings();
    const p = profile();
    const m = model();
    if (m.next?.id !== extras.lesson?.id) loadLesson(m.next?.id);
    const plan = todayPlan(s.daily_minutes, extras);
    const week = weekActivity();
    const dueCount = due().length;
    const today = todayKey();
    const doneToday = new Set(store.all('events').filter((e) => todayKey(new Date(e.at)) === today).map((e) => e.type));
    if (m.attempts.some((a) => a.source === 'reading' && todayKey(new Date(a.at)) === today)) doneToday.add('reading');
    // Only curriculum lessons count here: a finished scenario or level check is not a lesson.
    const lessonDoneToday = store.all('progress').some((x) => isLessonId(x.id) && x.status === 'completed' && x.completed_at && todayKey(new Date(x.completed_at)) === today);
    const isDone = (b) => (b.id === 'review' && dueCount === 0) || (b.id === 'use' && doneToday.has(b.kind)) || (b.id === 'practice' && doneToday.has('drill')) || (b.id === 'learn' && b.slice?.partDone);
    const first = plan.blocks.find((b) => !isDone(b));
    const hour = new Date().getHours();
    const hello = hour < 12 ? tt('בוקר טוב', 'Good morning') : hour < 18 ? tt('צהריים טובים', 'Good afternoon') : tt('ערב טוב', 'Good evening');
    const scenario = (id) => extras.scenarios.find((x) => x.id === id);
    const task = (id) => extras.writingTasks.find((x) => x.id === id);
    const pos = (sl) => tt(`תרגיל ${sl.done + 1} מתוך ${sl.of}`, `exercise ${sl.done + 1} of ${sl.of}`);

    const title = (b) => {
      switch (b.id) {
        case 'warmup': return tt('חימום: מילים מהימים האחרונים', 'Warm-up: words from the last few days');
        case 'review': return tt(`חזרה מרווחת · ${b.count} מילים`, `Spaced review · ${b.count} words`);
        case 'learn': return m.next ? html`${b.resume ? html`<span class="small faint">${tt('המשך:', 'Continue:')}</span> ` : ''}${legend(m.next.title_en, m.next.title_he)}` : tt('השיעור הבא', 'Next lesson');
        case 'practice': {
          const label = b.focus.kind === 'error' ? tx.error.get(b.focus.id) : tx.topic.get(b.focus.id);
          return tt(`תרגול ממוקד: ${label?.name_he || b.focus.id}`, `Targeted practice: ${label?.name_en || b.focus.id}`);
        }
        case 'use': {
          const sc = b.scenario && scenario(b.scenario);
          const tk = b.task && task(b.task);
          if (sc) return html`${tt('מהחיים:', 'Real life:')} ${legend(sc.title_en, sc.title_he)}`;
          if (tk) return html`${tt('כתיבה:', 'Writing:')} ${legend(tk.title_en, tk.title_he)}`;
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
      if (sl.partDone) lines.push(tt(`החלק של היום הושלם. מחר ממשיכים מ${pos(sl)}.`, `Today's part is done. Tomorrow continues from ${pos(sl)}.`));
      else if (sl.split) lines.push(tt(`השיעור כולו כ-${sl.total} דקות, אז היום עושים חלק: עד תרגיל ${sl.upto} מתוך ${sl.of}. אפשר לצאת בכל רגע: המקום נשמר, ומחר ממשיכים ממנו.`, `The whole lesson takes about ${sl.total} min, so today is a part: up to exercise ${sl.upto} of ${sl.of}. Leave any time: your place is saved and tomorrow continues from it.`));
      else if (sl.total && b.resume) lines.push(tt(`נשארו כ-${sl.remaining} דקות (${pos(sl)}).`, `About ${sl.remaining} min left (${pos(sl)}).`));
      else if (sl.total) lines.push(tt(`שיעור של כ-${sl.total} דקות.`, `A lesson of about ${sl.total} min.`));
      return html`${m.next?.can_do ? html`<span lang="en" dir="ltr" style="display:block">${m.next.can_do}</span>` : ''}${lines.map((x) => html`<span style="display:block">${x}</span>`)}`;
    };
    const useWhy = (b) => {
      if (b.goal === 'travel') return tt('בחרת טיולים: מצב אחד מנסיעה, ברמה שלך.', 'You chose travel: one real situation from a trip, at your level.');
      if (b.goal === 'conversation') return tt('בחרת ביטחון בשיחה: שיחה אחת מהחיים, ברמה שלך.', 'You chose confidence in conversation: one real conversation, at your level.');
      if (b.goal === 'work') return tt('בחרת עבודה: מצב אחד מהעבודה, ברמה שלך.', 'You chose work: one workplace situation, at your level.');
      if (b.goal && b.kind === 'reading') return tt('בחרת בגרות ולימודים: קריאה של טקסטים קצרים בונה את ההבנה שהמבחנים האלה בודקים.', 'You chose exams and university: reading short texts builds the comprehension these exams test.');
      if (b.goal && b.kind === 'writing') return tt('בחרת כתיבה או לימודים: משימה אחת ממעבדת הכתיבה, ברמה שלך.', 'You chose writing or studies: one Writing lab task at your level.');
      return b.kind === 'speaking' ? tt('להגיד דברים בקול הופך ידע למיומנות.', 'Saying things out loud turns knowledge into skill.') : tt('כתיבה מחייבת לבחור מילים ומבנים בעצמכם.', 'Writing makes you choose words and structures yourself.');
    };
    const why = (b) => {
      switch (b.id) {
        case 'warmup': return tt('להיזכר במילה יום-יומיים אחרי שלמדתם אותה זה מה שמקבע אותה.', 'Recalling a word a day or two after learning it is what makes it stick.');
        case 'review': return tt('המילים האלה בדיוק לפני שכחה. חזרה עכשיו מאריכה את הזיכרון.', 'These words are about to fade. Reviewing now makes the memory last longer.');
        case 'learn': return lessonWhy(b);
        case 'practice': {
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
        return b.resume
          ? html`<span>${tt('להמשיך', 'Continue')}: <bdi lang="en" dir="ltr">${m.next.title_en}</bdi> (${b.slice.done + 1}/${b.slice.of})</span>`
          : html`<span>${tt('להתחיל', 'Start')}: <bdi lang="en" dir="ltr">${m.next.title_en}</bdi></span>`;
      }
      const i = ['warmup', 'review', 'learn', 'practice', 'use', 'exit'].indexOf(b.id);
      return html`${tt('להתחיל', 'Start')}: ${tt(['חימום', 'חזרה', 'שיעור', 'תרגול', 'דיבור/כתיבה', 'בדיקה'][i] || '', ['Warm-up', 'Review', 'Lesson', 'Practice', 'Speak or write', 'Check'][i] || '')}`;
    };
    // An interrupted lesson that is not the plan's lesson (for example, a placed-out lesson being revised).
    const other = store.all('progress').filter((x) => isLessonId(x.id) && x.id !== m.next?.id && x.resume && x.status !== 'completed' && x.resume.qi < x.resume.queue.length && lessonAvailable(x.id)).sort((a, b) => (a.resume.at < b.resume.at ? 1 : -1))[0];
    const otherPlan = other && lessons.get(other.id);
    const importLevel = !m.placementPending && !dueCount ? vocabImportLevel() : null;
    const done = !m.next;

    const planSection = m.placementPending
      ? html`${placementCard()}<p class="small muted">${tt('התוכנית היומית תופיע אחרי מבחן המיקום, כדי שתתחיל ברמה הנכונה.', 'Your daily plan appears after the placement test, so it starts at the right level.')}</p>`
      : html`
          ${first ? html`<div class="start-bar"><a class="key enter" href="#/${first.route}">${startLabel(first)} ${arrow()}</a>
            ${lessonDoneToday ? html`<span class="tag ok">${icon('check', { size: 14 })} ${tt('השלמת שיעור היום', 'Lesson completed today')}</span>` : ''}</div>` : html`<p class="banner">${icon('check', { size: 18 })}<span>${tt('סיימתם את התוכנית להיום. אפשר להמשיך בחופשיות במעבדות.', 'You\'ve finished today\'s plan. Carry on freely in the labs.')}</span></p>`}
          ${otherPlan ? html`<a class="panel plan-item" href="#/lesson/${other.id}?resume=1"><span class="glyph">${icon('play')}</span><span class="grow"><span style="font-weight:500;display:block">${tt('להמשיך מאיפה שעצרתם', 'Continue where you left off')}</span><span class="why" style="display:block">${legend(otherPlan.title_en, otherPlan.title_he)}</span><span class="why" style="display:block">${tt(`תרגיל ${other.resume.qi + 1} מתוך ${other.resume.queue.length}`, `Exercise ${other.resume.qi + 1} of ${other.resume.queue.length}`)}</span></span>${icon('chevron')}</a>` : ''}
          <ol class="plan" style="list-style:none;padding:0;margin:0">${plan.blocks.map((b) => html`<li><a class="panel plan-item ${isDone(b) ? 'done' : ''}" href="#/${b.route}">
            <span class="glyph">${icon(isDone(b) ? 'check' : b.id === 'use' && b.kind === 'writing' ? 'writing' : GLYPH[b.id])}</span>
            <span class="grow"><span style="font-weight:500">${title(b)}</span><span class="why" style="display:block">${why(b)}</span></span>
            <span class="plan-time num">${b.minutes} ${tt('דק׳', 'min')}</span></a></li>`)}</ol>
          ${importLevel ? html`<div class="panel flat stack-sm"><p class="small">${tt(`בחזרה המרווחת עוד אין מילים מהרמות שדילגת עליהן. להוסיף את מילות המפתח של שיעורי ${L(importLevel)}? הן ייכנסו בהדרגה, עד ${s.new_per_day} מילים חדשות ביום.`, `Your spaced review has no words from the levels you placed out of. Add the key words of the ${L(importLevel)} lessons? They come in gradually, up to ${s.new_per_day} new words a day.`)}</p>
            <div class="row"><button type="button" class="key small" data-import="${importLevel}">${tt(`להוסיף את המילים של ${L(importLevel)}`, `Add the ${L(importLevel)} words`)}</button></div></div>` : ''}
          ${done ? html`<p class="banner">${m.skipped.length
            ? tt('עשית את כל השיעורים שמוכנים כרגע. שיעורים נוספים בהכנה; בינתיים מעבדת הכתיבה והמטלות המתקדמות מחכות.', 'You\'ve done every lesson that is ready. More are being written; meanwhile the Writing lab and advanced assignments are waiting.')
            : tt('השלמתם את כל 75 השיעורים. מעבדת הכתיבה והמטלות המתקדמות מחכות.', 'You have completed all 75 lessons. The Writing lab and advanced assignments are waiting.')}</p>` : ''}`;

    render(el, html`
      <div class="page-head">
        <div><h1>${hello}${p?.name ? `, ${p.name}` : ''}</h1>
          <p>${tt(`יעד שבועי: ${week.days} מתוך ${week.goal} ימים. יום חופש לא מוחק כלום.`, `Weekly goal: ${week.days} of ${week.goal} days. A day off erases nothing.`)}</p></div>
        <div class="seg" role="group" aria-label="${tt('אורך האימון היום', 'Session length today')}">${[10, 20, 35, 50].map((n) => html`<button type="button" data-min="${n}" aria-pressed="${s.daily_minutes === n}">${n} ${tt('דק׳', 'min')}</button>`)}</div>
      </div>
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
          <div class="panel stack">
            <div class="row between"><h2 class="small" style="font-size:var(--t-md)">${tt('הרמה לפי מיומנות', 'Level by skill')}</h2><a class="small" href="#/progress">${tt('פרטים', 'Details')}</a></div>
            ${skillProfile(m.skills)}
          </div>
          ${m.recurring.length ? html`<div class="panel stack-sm"><h2 class="small" style="font-size:var(--t-md)">${tt('טעויות שחוזרות', 'Recurring mistakes')}</h2>
            ${m.recurring.slice(0, 3).map((e) => { const x = tx.error.get(e.error_type); return html`<a class="row small" href="#/drill?error=${e.error_type}" style="text-decoration:none;color:inherit"><span class="tag ${e.trend === 'improving' ? 'ok' : 'warn'}">${e.count}×</span><span class="grow">${tt(x?.name_he, x?.name_en)}</span>${e.trend === 'improving' ? html`<span class="xsmall" style="color:var(--ok)">${tt('משתפר', 'improving')}</span>` : ''}</a>`; })}</div>` : ''}
        </aside>
      </div>`);
  }

  draw();
  ctx.watch(['progress', 'cards', 'attempts', 'settings', 'events', 'placement', 'profile', 'writing'], draw);
  const offs = [
    on(el, 'click', '[data-min]', (e, b) => saveSettings({ daily_minutes: Number(b.dataset.min) })),
    on(el, 'click', '[data-skip-level]', async (e, b) => { await applyPlacement(selfReportResult(b.dataset.skipLevel)); toast(tt(`המסלול מתחיל ב-${L(b.dataset.skipLevel)}`, `Your path starts at ${L(b.dataset.skipLevel)}`)); }),
    on(el, 'click', '[data-basics]', async () => { await applyPlacement(zeroResult()); ctx.navigate('lesson/pa1-01'); }),
    on(el, 'click', '[data-import]', async (e, b) => {
      b.disabled = true;
      const n = await importPlacedOutVocab(b.dataset.import);
      toast(n ? tt(`${n} מילים נוספו לחזרה. הן ייכנסו בהדרגה.`, `${n} words added to review. They come in gradually.`) : tt('המילים האלה כבר בחזרה.', 'These words are already in review.'));
      draw();
    }),
  ];
  return () => offs.forEach((o) => o());
}
