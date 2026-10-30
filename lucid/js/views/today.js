// Today: the plan for this session, why each part is there, and honest evidence of progress.
import { html, render, on, todayKey } from '../core/util.js';
import { tt, legend, t, uiLang } from '../core/i18n.js';
import { content, taxonomyIndex } from '../core/content.js';
import { icon, LEVEL_LABEL } from '../ui/components.js';
import { profile, settings, saveSettings, todayPlan, model, weekActivity, due } from '../core/learner.js';
import { store } from '../core/store.js';
import { LEVELS, SKILLS, levelIndex } from '../core/adaptive.js';

const GLYPH = { warmup: 'sparkle', review: 'layers', learn: 'path', practice: 'target', use: 'speaking', exit: 'check' };

export function levelRail(curriculum, progress, current) {
  return html`<div>
    <div class="level-rail" role="img" aria-label="${tt('ההתקדמות לאורך הרמות', 'Progress across levels')}">${curriculum.levels.map((l) => {
      const done = l.lessons.filter((x) => ['completed', 'placed_out'].includes(progress.get(x.id)?.status)).length;
      return html`<div class="${l.id === current ? 'current' : ''}" style="--n:${l.lessons.length}"><span style="width:${(done / l.lessons.length) * 100}%"></span></div>`;
    })}</div>
    <div class="level-rail-labels" aria-hidden="true">${curriculum.levels.map((l) => html`<span class="${l.id === current ? 'current' : ''}" style="--n:${l.lessons.length}">${LEVEL_LABEL[l.id]}</span>`)}</div>
  </div>`;
}

export function skillProfile(skills) {
  if (!SKILLS.some((s) => skills[s]?.level)) {
    return html`<p class="small muted">${tt('הפרופיל לפי מיומנות יופיע אחרי השיעורים הראשונים: כל מיומנות מקבלת רמה רק כשיש לה ראיות.', 'Your skill profile appears after your first lessons: each skill gets a level only once there is evidence for it.')}</p>`;
  }
  return html`<div class="skills">${SKILLS.map((s) => {
    const k = skills[s];
    const idx = k?.level ? levelIndex(k.level) : -1;
    return html`<div class="skill-row"><span>${t(`skill.${s}`)}</span><div class="meter" aria-hidden="true"><span style="width:${idx < 0 ? 0 : ((idx + 1) / LEVELS.length) * 100}%"></span></div><span class="skill-level ${k?.level ? '' : 'none'}" title="${k?.source || ''}">${k?.level ? LEVEL_LABEL[k.level] : '—'}</span></div>`;
  })}</div><p class="xsmall faint" style="margin-top:var(--s3)">${t('level.estimate')}. ${tt('״—״ = עוד אין מספיק ראיות.', '"—" means not enough evidence yet.')}</p>`;
}

export default async function today(el, ctx) {
  ctx.setTitle(t('nav.today'));
  const [curriculum, tx] = await Promise.all([content.curriculum(), taxonomyIndex()]);

  function draw() {
    const s = settings();
    const p = profile();
    const m = model();
    const plan = todayPlan(s.daily_minutes);
    const week = weekActivity();
    const dueCount = due().length;
    const doneToday = new Set(store.all('events').filter((e) => todayKey(new Date(e.at)) === todayKey()).map((e) => e.type));
    const lessonDoneToday = store.all('progress').some((x) => x.completed_at && todayKey(new Date(x.completed_at)) === todayKey());
    const isDone = (b) => (b.id === 'review' && dueCount === 0) || (b.id === 'use' && doneToday.has(b.kind)) || (b.id === 'practice' && doneToday.has('drill'));
    const first = plan.blocks.find((b) => !isDone(b));
    const hour = new Date().getHours();
    const hello = hour < 12 ? tt('בוקר טוב', 'Good morning') : hour < 18 ? tt('צהריים טובים', 'Good afternoon') : tt('ערב טוב', 'Good evening');

    const title = (b) => {
      switch (b.id) {
        case 'warmup': return tt('חימום: מילים מהימים האחרונים', 'Warm-up: words from the last few days');
        case 'review': return tt(`חזרה מרווחת · ${b.count} מילים`, `Spaced review · ${b.count} words`);
        case 'learn': return m.next ? legend(m.next.title_en, m.next.title_he) : tt('השיעור הבא', 'Next lesson');
        case 'practice': {
          const label = b.focus.kind === 'error' ? tx.error.get(b.focus.id) : tx.topic.get(b.focus.id);
          return tt(`תרגול ממוקד: ${label?.name_he || b.focus.id}`, `Targeted practice: ${label?.name_en || b.focus.id}`);
        }
        case 'use': return b.kind === 'speaking' ? tt('דיבור: להשתמש במה שלמדתם', 'Speaking: use what you learned') : tt('כתיבה: טקסט קצר משלכם', 'Writing: a short text of your own');
        case 'exit': return tt('בדיקת יציאה: המילים של היום', 'Exit check: today\'s words');
        default: return b.id;
      }
    };
    const why = (b) => {
      switch (b.id) {
        case 'warmup': return tt('להיזכר במילה יום-יומיים אחרי שלמדתם אותה זה מה שמקבע אותה.', 'Recalling a word a day or two after learning it is what makes it stick.');
        case 'review': return tt('המילים האלה בדיוק לפני שכחה. חזרה עכשיו מאריכה את הזיכרון.', 'These words are about to fade. Reviewing now makes the memory last longer.');
        case 'learn': return m.next?.can_do ? html`<span lang="en" dir="ltr">${m.next.can_do}</span>` : '';
        case 'practice': {
          const e = b.focus.kind === 'error' ? m.recurring.find((x) => x.error_type === b.focus.id) : null;
          return e ? tt(`חזר ${e.count} פעמים ב-${e.days} ימים שונים בחודש האחרון.`, `It came up ${e.count} times on ${e.days} different days this month.`) : tt('נושא שעוד לא יושב טוב.', 'A topic that is not secure yet.');
        }
        case 'use': return b.kind === 'speaking' ? tt('להגיד דברים בקול הופך ידע למיומנות.', 'Saying things out loud turns knowledge into skill.') : tt('כתיבה מחייבת לבחור מילים ומבנים בעצמכם.', 'Writing makes you choose words and structures yourself.');
        case 'exit': return tt('היזכרות אחרונה במילים החדשות, אחרי הפסקה קצרה.', 'One last recall of the new words, after a short break.');
        default: return '';
      }
    };

    render(el, html`
      <div class="page-head">
        <div><h1>${hello}${p?.name ? `, ${p.name}` : ''}</h1>
          <p>${tt(`יעד שבועי: ${week.days} מתוך ${week.goal} ימים. יום חופש לא מוחק כלום.`, `Weekly goal: ${week.days} of ${week.goal} days. A day off erases nothing.`)}</p></div>
        <div class="seg" role="group" aria-label="${tt('אורך האימון היום', 'Session length today')}">${[10, 20, 35, 50].map((n) => html`<button type="button" data-min="${n}" aria-pressed="${s.daily_minutes === n}">${n} ${tt('דק׳', 'min')}</button>`)}</div>
      </div>
      <div class="today">
        <section class="stack" aria-labelledby="plan-h">
          <div class="row between"><h2 id="plan-h">${tt('התוכנית להיום', 'Today\'s plan')}</h2><span class="small faint num">${tt(`כ-${plan.minutes} דקות`, `about ${plan.minutes} min`)}</span></div>
          ${first ? html`<div class="start-bar"><a class="key enter" href="#/${first.route}">${tt('להתחיל', 'Start')}: ${first.id === 'learn' && m.next ? m.next.title_en : tt(['חימום', 'חזרה', 'שיעור', 'תרגול', 'דיבור/כתיבה', 'בדיקה'][['warmup', 'review', 'learn', 'practice', 'use', 'exit'].indexOf(first.id)] || '', ['Warm-up', 'Review', 'Lesson', 'Practice', 'Speak or write', 'Check'][['warmup', 'review', 'learn', 'practice', 'use', 'exit'].indexOf(first.id)] || '')} ${icon(uiLang() === 'he' ? 'arrow-back' : 'arrow-next')}</a>
            ${lessonDoneToday ? html`<span class="tag ok">${icon('check', { size: 14 })} ${tt('השלמת שיעור היום', 'Lesson completed today')}</span>` : ''}</div>` : html`<p class="banner">${icon('check', { size: 18 })}<span>${tt('סיימתם את התוכנית להיום. אפשר להמשיך בחופשיות במעבדות.', 'You\'ve finished today\'s plan. Carry on freely in the labs.')}</span></p>`}
          ${(() => {
            const r = store.all('progress').filter((x) => x.resume && x.status !== 'completed' && x.resume.qi < x.resume.queue.length).sort((a, b) => (a.resume.at < b.resume.at ? 1 : -1))[0];
            const plan2 = r && curriculum.levels.flatMap((l) => l.lessons).find((l) => l.id === r.id);
            return plan2 ? html`<a class="panel plan-item" href="#/lesson/${r.id}?resume=1" style="border-color:var(--cobalt)"><span class="glyph">${icon('play')}</span><span class="grow"><span style="font-weight:500">${tt('להמשיך מאיפה שעצרתם', 'Continue where you left off')}</span><span class="why" style="display:block">${legend(plan2.title_en, plan2.title_he)} · ${tt(`תרגיל ${r.resume.qi + 1} מתוך ${r.resume.queue.length}`, `exercise ${r.resume.qi + 1} of ${r.resume.queue.length}`)}</span></span>${icon('chevron')}</a>` : '';
          })()}
          <ol class="plan" style="list-style:none;padding:0;margin:0">${plan.blocks.map((b) => html`<li><a class="panel plan-item ${isDone(b) ? 'done' : ''}" href="#/${b.route}">
            <span class="glyph">${icon(isDone(b) ? 'check' : b.id === 'use' && b.kind === 'writing' ? 'writing' : GLYPH[b.id])}</span>
            <span class="grow"><span style="font-weight:500">${title(b)}</span><span class="why" style="display:block">${why(b)}</span></span>
            <span class="plan-time num">${b.minutes} ${tt('דק׳', 'min')}</span></a></li>`)}</ol>
          ${!m.next ? html`<p class="banner">${tt('השלמתם את כל 75 השיעורים. מעבדת הכתיבה והמטלות המתקדמות מחכות.', 'You have completed all 75 lessons. The Writing lab and advanced assignments are waiting.')}</p>` : ''}
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
  ctx.watch(['progress', 'cards', 'attempts', 'settings', 'events'], draw);
  return on(el, 'click', '[data-min]', (e, b) => saveSettings({ daily_minutes: Number(b.dataset.min) }));
}
