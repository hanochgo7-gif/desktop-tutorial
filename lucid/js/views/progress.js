// Progress: honest evidence of learning. Reports for the week or month, per-skill levels with their
// source, topic mastery, recurring mistakes and their trend, retention, and level checks.
import { html, render, on, pct, todayKey } from '../core/util.js';
import { tt, t, legend } from '../core/i18n.js';
import { content, taxonomyIndex } from '../core/content.js';
import { icon, LEVEL_LABEL, mark } from '../ui/components.js';
import { model, allCards, settings, weekActivity, currentSessionSeconds, due } from '../core/learner.js';
import { store } from '../core/store.js';
import { periodReport, levelIndex } from '../core/adaptive.js';
import { configured, auth } from '../core/api.js';
import { CONFIG } from '../../config.js';
import { RETENTION } from '../core/srs.js';
import { levelRail, skillProfile } from './today.js';

export default async function progress(el, ctx) {
  ctx.setTitle(t('nav.progress'));
  const [curriculum, tx] = await Promise.all([content.curriculum(), taxonomyIndex()]);
  let days = Number(ctx.query.days) === 30 ? 30 : 7;

  function draw() {
    const m = model();
    const cards = allCards();
    const events = store.all('events');
    const r = periodReport({ attempts: m.attempts, cards, progress: store.all('progress'), events, days, extraSeconds: currentSessionSeconds() });
    const target = RETENTION[settings().retention];
    const delta = r.accuracy != null && r.accuracy_prev != null ? r.accuracy - r.accuracy_prev : null;
    // Activity per day (or per week for the month view).
    const buckets = days === 7
      ? Array.from({ length: 7 }, (_, i) => { const d = new Date(Date.now() - (6 - i) * 86_400_000); const k = todayKey(d); return { label: d.toLocaleDateString(document.documentElement.lang, { weekday: 'narrow' }), n: m.attempts.filter((a) => a.at.slice(0, 10) === k && a.source !== 'placement').length }; })
      : Array.from({ length: 4 }, (_, i) => { const end = Date.now() - (3 - i) * 7 * 86_400_000; const start = end - 7 * 86_400_000; return { label: tt(`ש׳ ${i + 1}`, `W${i + 1}`), n: m.attempts.filter((a) => { const t0 = new Date(a.at).getTime(); return t0 > start && t0 <= end && a.source !== 'placement'; }).length }; });
    const maxN = Math.max(1, ...buckets.map((b) => b.n));
    const mastered = [...m.mastery.values()].filter((x) => x.status === 'mastered');
    const practising = [...m.mastery.values()].filter((x) => x.status === 'practising');
    const name = (id) => { const x = tx.topic.get(id); return x ? legend(x.name_en, x.name_he) : id; };
    const week = weekActivity();
    // Recommend only what this learner can do here (persona finding R2-03): AI writing feedback needs the AI
    // service, an account and consent, and makes sense from A1; a weak topic needs somewhere to practise it.
    const aiReady = configured() && CONFIG.aiEnabled && auth.signedIn && settings().ai_consent;
    const weakToPractise = m.weak.find((w) => w.route !== null);
    const dueN = due().length;
    const recs = [];
    if (m.recurring[0]) recs.push(html`<a href="#/drill?error=${m.recurring[0].error_type}">${tt('תרגול ממוקד לטעות שחוזרת הכי הרבה', 'Targeted practice for your most frequent mistake')}</a>`);
    if (weakToPractise) recs.push(html`<a href="#/${weakToPractise.route || `drill?topic=${weakToPractise.topic}`}">${tt('לחזק נושא שעוד לא יושב', 'Strengthen a topic that is not secure yet')}</a>`);
    if (dueN) recs.push(html`<a href="#/review">${tt(`חזרה מרווחת: ${dueN} מילים מחכות`, `Spaced review: ${dueN} words are waiting`)}</a>`);
    if (m.next && !m.placementPending) recs.push(html`<a href="#/lesson/${m.next.id}">${tt('השיעור הבא:', 'Your next lesson:')} ${legend(m.next.title_en, m.next.title_he)}</a>`);
    if (!m.skills.writing.level && aiReady && levelIndex(m.courseLevel) >= levelIndex('A1')) recs.push(html`<a href="#/writing">${tt('לכתוב במעבדת הכתיבה ולקבל משוב: שני טקסטים שהוערכו, בימים שונים, נותנים לכתיבה רמה', 'Write in the Writing lab and get feedback: two assessed texts, on different days, give writing a level')}</a>`);
    if (!events.some((e) => e.type === 'speaking' && Date.now() - new Date(e.at).getTime() < days * 86_400_000)) recs.push(html`<a href="#/speaking">${tt('תרגול דיבור קצר במעבדה', 'A short speaking practice in the lab')}</a>`);
    // Level checks: the learner's level and the ones below it; higher ones (and those not taken) are folded.
    const checkRow = (l) => { const c = store.get('progress', `check:${l.id}`); return html`<li class="row small">${mark(c?.status)}<span class="grow">${LEVEL_LABEL[l.id]}</span><span class="faint num">${c?.best_score != null ? pct(c.best_score) : '—'}</span><a href="#/checkpoint/${l.id}" class="xsmall">${c ? tt('שוב', 'Again') : tt('לבדיקה', 'Take it')}</a></li>`; };
    const nearChecks = curriculum.levels.filter((l) => levelIndex(l.id) <= levelIndex(m.courseLevel) || store.get('progress', `check:${l.id}`));
    const moreChecks = curriculum.levels.filter((l) => !nearChecks.includes(l));

    render(el, html`
      <div class="page-head"><div><h1>${t('nav.progress')}</h1><p>${tt('מה אתם יודעים לעשות עכשיו, לפי ראיות. בלי נקודות ובלי ניקוד על זמן.', 'What you can do now, based on evidence. No points, no scores for time spent.')}</p></div>
        <div class="seg" role="group" aria-label="${tt('תקופה', 'Period')}"><button type="button" data-days="7" aria-pressed="${days === 7}">${tt('השבוע', 'This week')}</button><button type="button" data-days="30" aria-pressed="${days === 30}">${tt('החודש', 'This month')}</button></div>
        <a class="key small ghost" href="#/profile">${icon('user', { size: 16 })} ${tt('הפרופיל שלי', 'My profile')}</a></div>
      <div class="stack-lg">
        <section class="stack" aria-labelledby="rep-h"><h2 id="rep-h">${days === 7 ? tt('דוח שבועי', 'Weekly report') : tt('דוח חודשי', 'Monthly report')}</h2>
          ${!m.attempts.some((a) => a.source !== 'placement') ? html`<div class="panel flat stack-sm"><p>${tt('הדוח הראשון יופיע אחרי התרגול הראשון.', 'Your first report appears after your first practice.')}</p><p class="small muted">${tt('הוא יראה כמה ימים ודקות למדתם, דיוק בניסיון ראשון לעומת התקופה הקודמת, כמה מילים נשארות בזיכרון, ומה השתפר.', 'It will show days and minutes studied, first-try accuracy against the previous period, how many words are sticking, and what improved.')}</p><div class="row"><a class="key enter" href="#/today">${tt('לתוכנית של היום', 'To today\'s plan')}</a></div></div>` : html`
          <div class="stat-grid">
            <div class="stat"><div class="v num">${r.active_days}</div><div class="k">${tt('ימי לימוד', 'Days studied')}</div>${days === 7 ? html`<div class="d faint">${tt(`יעד: ${week.goal}`, `Goal: ${week.goal}`)}</div>` : ''}</div>
            <div class="stat"><div class="v num">${r.minutes}</div><div class="k">${tt('דקות פעילות', 'Active minutes')}</div></div>
            <div class="stat"><div class="v num">${r.exercises}</div><div class="k">${tt('תרגילים', 'Exercises')}</div></div>
            <div class="stat"><div class="v num">${pct(r.accuracy)}</div><div class="k">${tt('דיוק בניסיון ראשון', 'First-try accuracy')}</div>${delta != null ? html`<div class="d" style="color:${delta >= 0 ? 'var(--ok)' : 'var(--bad)'}">${delta >= 0 ? '+' : ''}${Math.round(delta * 100)} ${tt('נק׳ מהתקופה הקודמת', 'pts vs previous')}</div>` : ''}</div>
            <div class="stat"><div class="v num">${pct(r.retention)}</div><div class="k">${tt('זכירה בחזרות', 'Recall on reviews')}</div><div class="d faint">${tt(`יעד ${Math.round(target * 100)}%`, `Target ${Math.round(target * 100)}%`)}</div></div>
            <div class="stat"><div class="v num">${r.words_known}</div><div class="k">${tt('מילים יציבות (3 שבועות+)', 'Stable words (3+ weeks)')}</div><div class="d faint">${tt(`${r.words_started} חדשות בתקופה`, `${r.words_started} new this period`)}</div></div>
            <div class="stat"><div class="v num">${r.lessons_completed}</div><div class="k">${tt('שיעורים שהושלמו', 'Lessons completed')}</div></div>
            <div class="stat"><div class="v num">${r.retention_30d == null ? '—' : pct(r.retention_30d)}</div><div class="k">${tt('זכירה אחרי 30 יום', 'Recall after 30 days')}</div><div class="d faint">${r.retention_30d == null ? tt('מחכה למספיק נתונים', 'Waiting for enough data') : ''}</div></div>
          </div>
          <div class="panel flat"><p class="small faint" style="margin-bottom:var(--s3)">${tt('תרגילים לפי', 'Exercises by')} ${days === 7 ? tt('יום', 'day') : tt('שבוע', 'week')}</p>
            <div class="bars" role="img" aria-label="${buckets.map((b) => `${b.label}: ${b.n}`).join(', ')}">${buckets.map((b) => html`<div><span class="bar-track"><span class="bar" style="height:${(b.n / maxN) * 100}%"></span></span>${b.label}</div>`)}</div></div>`}
          ${r.improved.length ? html`<div class="panel flat stack-sm"><h3 class="small">${tt('השתפר בתקופה', 'Improved this period')}</h3>${r.improved.map((x) => html`<p class="row small">${icon('check', { size: 16 })}<span class="grow">${name(x.topic)}</span><span class="num faint">${pct(x.from)} → ${pct(x.to)}</span></p>`)}</div>` : ''}
          ${recs.length ? html`<div class="panel flat stack-sm"><h3 class="small">${tt('המלצות לשבוע הבא', 'Recommendations for next week')}</h3><ul class="stack-sm small" style="margin:0;padding-inline-start:1.2rem">${recs.map((x) => html`<li>${x}</li>`)}</ul></div>` : ''}
        </section>

        <section class="grid-2" style="align-items:start">
          <div class="panel stack"><h2 class="small" style="font-size:var(--t-md)">${tt('רמה לפי מיומנות', 'Level by skill')}</h2>${skillProfile(m.skills)}
            <p class="xsmall faint">${tt('כתיבה מקבלת רמה רק מטקסטים שהוערכו במשוב AI. Lucid עוד לא מעריך רמת דיבור: זיהוי דיבור לבדו אף פעם לא נותן ציון.', 'Writing gets a level only from texts assessed with AI feedback. Lucid does not assess speaking level yet: speech recognition alone never gives a grade.')}</p></div>
          <div class="panel stack"><h2 class="small" style="font-size:var(--t-md)">${tt('בדיקות רמה', 'Level checks')}</h2>
            ${levelRail(curriculum, m.progress, m.courseLevel)}
            <ul class="lesson-list" style="list-style:none;padding:0;margin:0">${nearChecks.map(checkRow)}</ul>
            ${moreChecks.length ? html`<details class="more-checks"><summary class="disclosure small"><span class="chev" aria-hidden="true">${icon('chevron', { size: 16 })}</span><span class="grow">${tt('להציג את כל הרמות', 'Show all levels')}</span></summary>
              <ul class="lesson-list" style="list-style:none;padding:0;margin:var(--s3) 0 0">${moreChecks.map(checkRow)}</ul></details>` : ''}</div>
        </section>

        <section class="grid-2" style="align-items:start">
          <div class="panel stack-sm"><h2 class="small" style="font-size:var(--t-md)">${tt('טעויות שחוזרות', 'Recurring mistakes')}</h2>
            ${m.errors.length ? m.errors.slice(0, 8).map((e) => { const x = tx.error.get(e.error_type); return html`<a class="row small" href="#/drill?error=${e.error_type}" style="color:inherit;text-decoration:none"><span class="tag ${e.recurring ? 'warn' : ''} num">${e.count}×</span><span class="grow">${tt(x?.name_he || e.error_type, x?.name_en || e.error_type)}</span><span class="xsmall ${e.trend === 'improving' ? '' : 'faint'}" style="${e.trend === 'improving' ? 'color:var(--ok)' : ''}">${{ improving: tt('משתפר', 'improving'), worsening: tt('מחמיר', 'more often'), new: tt('חדש', 'new'), steady: tt('יציב', 'steady') }[e.trend]}</span></a>`; }) : html`<p class="small muted">${tt('עוד אין טעויות מתועדות ב-30 הימים האחרונים.', 'No recorded mistakes in the last 30 days.')}</p>`}</div>
          <div class="panel stack-sm"><h2 class="small" style="font-size:var(--t-md)">${tt('נושאים', 'Topics')}</h2>
            <p class="small"><strong>${mastered.length}</strong> ${tt('בשליטה', 'secure')} · <strong>${practising.length}</strong> ${tt('בתרגול', 'practising')} · <strong>${m.weak.length}</strong> ${tt('דורשים חיזוק', 'need work')}</p>
            ${mastered.slice(0, 8).map((x) => html`<p class="row small">${mark('completed')}<span class="grow">${name(x.topic)}</span></p>`)}
            ${m.weak.map((x) => (x.route === null
              ? html`<p class="row small">${mark('started')}<span class="grow">${name(x.topic)}</span><span class="num faint">${pct(x.mastery)}</span></p>`
              : html`<a class="row small" href="#/${x.route || `drill?topic=${x.topic}`}" style="color:inherit;text-decoration:none">${mark('started')}<span class="grow">${name(x.topic)}</span><span class="num faint">${pct(x.mastery)}</span></a>`))}
            <p class="xsmall faint">${tt('״בשליטה״ = לפחות 85% לאורך זמן, ב-6 תשובות ומעלה, בשני ימים שונים לפחות.', '"Secure" = at least 85% over time, from 6+ answers, on at least two different days.')}</p></div>
        </section>
        <p class="xsmall faint">${t('level.estimate')}. ${tt('Lucid לא מבטיח שסיום הקורס מקנה רמה מסוימת: הרמה נקבעת רק לפי מה שהראיתם בפועל.', 'Lucid does not promise that finishing the course gives a level: levels come only from what you have actually shown.')}</p>
      </div>`);
  }
  draw();
  ctx.watch(['attempts', 'progress', 'cards', 'settings'], draw);
  return on(el, 'click', '[data-days]', (e, b) => { days = Number(b.dataset.days); draw(); });
}
