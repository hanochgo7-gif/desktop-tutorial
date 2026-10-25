// "My day": what needs doing now, in order, plus this month's numbers.

import { html, render, on, fmt, startOfDay, endOfDay, addDays, whatsappUrl, toDateInput } from '../core/util.js';
import { store } from '../core/store.js';
import { contactName, stages, openTasks, label, TASK_TYPES, nextTaskFor } from '../core/model.js';
import { salesSummary, sourceReport, dealHealth, periodFor } from '../core/metrics.js';
import { pageHeader, icon, badge, emptyState, setTitle, toast } from '../ui/components.js';
import { openLeadForm, openActivityForm, openTaskForm, taskEditBtn } from '../ui/forms.js';
import { showRecords } from '../ui/drill.js';

function buildActions() {
  const now = new Date(), eod = endOfDay();
  const items = [];
  const tasks = openTasks();
  for (const t of tasks) {
    if (!t.due_at || new Date(t.due_at) > eod) continue;
    const overdue = new Date(t.due_at) < startOfDay();
    const late = new Date(t.due_at) < now;
    const c = store.get('crm_contacts', t.contact_id);
    const d = store.get('crm_deals', t.deal_id);
    const value = Number(d?.amount_expected || c?.budget_estimate || 0);
    items.push({
      kind: 'task', task: t, contact: c, deal: d,
      score: (overdue ? 100 : late ? 90 : 70) + (t.priority === 'high' ? 15 : 0) + Math.min(20, value / 2000),
      reason: overdue ? html`${badge(`באיחור ${fmt.relative(t.due_at)}`, 'red')}` : late ? badge(`היום ${fmt.time(t.due_at)} (עבר)`, 'amber') : badge(`היום ${fmt.time(t.due_at)}`, 'sky'),
      title: t.title,
    });
  }
  // new leads nobody has touched yet: speed to lead matters most
  const touched = new Set([...store.all('crm_activities').map((a) => a.contact_id), ...store.all('crm_tasks').map((t) => t.contact_id)]);
  for (const c of store.all('crm_contacts')) {
    if (c.lead_status !== 'new' || touched.has(c.id) || c.lifecycle === 'customer') continue;
    items.push({ kind: 'lead', contact: c, score: 95, reason: badge(`ליד חדש, נכנס ${fmt.relative(c.created_at)}`, 'violet'), title: 'ליד חדש שעוד לא טופל' });
  }
  // open deals: stuck in stage, or no next action
  const stageById = new Map(store.all('crm_stages').map((s) => [s.id, s]));
  for (const d of store.filter('crm_deals', (x) => x.outcome === 'open')) {
    const h = dealHealth(d, { stage: stageById.get(d.stage_id), openTasks: tasks, now });
    const c = store.get('crm_contacts', d.contact_id);
    const value = Number(d.amount_expected || 0);
    if (h.noNext) items.push({ kind: 'deal', deal: d, contact: c, score: 65 + Math.min(25, value / 2000), reason: badge('אין צעד הבא', 'amber'), title: `${d.name}: לקבוע צעד הבא` });
    else if (h.stuck) items.push({ kind: 'deal', deal: d, contact: c, score: 55 + Math.min(25, value / 2000), reason: badge(`${h.daysInStage} ימים באותו שלב`, 'amber'), title: `${d.name}: תקוע ב"${stageById.get(d.stage_id)?.name}"` });
  }
  return items.sort((a, b) => b.score - a.score);
}

function actionRow(it, i) {
  const c = it.contact;
  const phone = c?.phone;
  const typeIcon = it.kind === 'task' ? (TASK_TYPES.find((t) => t.value === it.task.type)?.icon || 'task') : it.kind === 'lead' ? 'user' : 'deal';
  const href = it.deal ? `#/d/${it.deal.id}` : c ? `#/c/${c.id}` : '#/tasks';
  return html`<li class="act-row ${i < 3 ? 'top3' : ''}">
    ${it.kind === 'task' ? html`<button class="task-check" data-act="done" data-id="${it.task.id}" aria-label="סימון כבוצע: ${it.task.title}">${icon('check')}</button>` : html`<span class="act-ic">${icon(typeIcon)}</span>`}
    <a class="grow act-main" href="${href}">
      <span class="act-title">${c ? contactName(c) : it.title}${c?.company_name ? html` <small class="muted">${c.company_name}</small>` : ''}</span>
      <span class="act-what">${c ? it.title : ''}</span>
      <span class="act-meta">${it.reason}${it.deal?.amount_expected ? html`<span class="num">${fmt.money(it.deal.amount_expected)}</span>` : ''}</span>
    </a>
    <span class="act-btns">
      ${phone ? html`<a class="btn-icon" href="tel:${phone}" aria-label="שיחה ל${contactName(c)}" title="שיחה">${icon('phone')}</a>
        <a class="btn-icon" href="${whatsappUrl(phone)}" target="_blank" rel="noopener" aria-label="וואטסאפ ל${contactName(c)}" title="וואטסאפ">${icon('whatsapp')}</a>` : ''}
      ${c ? html`<button class="btn btn-sm" data-act="log" data-contact="${c.id}" data-deal="${it.deal?.id || ''}" aria-label="תיעוד שיחה עם ${contactName(c)}">${icon('note')}תיעוד</button>` : ''}
      ${it.kind === 'task' ? html`<button class="btn-icon" data-act="snooze" data-id="${it.task.id}" aria-label="דחייה למחר: ${it.task.title}${c ? ` (${contactName(c)})` : ''}" title="דחייה למחר">${icon('clock')}</button>${taskEditBtn(it.task)}` : ''}
      ${it.kind === 'deal' && !nextTaskFor({ dealId: it.deal.id, contactId: it.deal.contact_id }) ? html`<button class="btn-icon" data-act="task" data-contact="${c?.id || ''}" data-deal="${it.deal.id}" aria-label="קביעת צעד הבא" title="קביעת צעד הבא">${icon('plus')}</button>` : ''}
    </span>
  </li>`;
}

export default async function view(el, ctx) {
  setTitle('היום שלי');
  if (store.mode === 'local') {
    const bk = await import('../core/backup.js');
    if (bk.backupOverdue(store)) el._backupNote = bk.lastDownloaded() ? 'עבר שבוע מהגיבוי האחרון. כדאי להוריד קובץ גיבוי.' : 'עוד לא הורדת קובץ גיבוי. מומלץ להוריד אחד ולשמור אותו מחוץ למחשב.';
  }
  const draw = () => {
    const period = periodFor('this_month');
    const all = { contacts: store.all('crm_contacts'), deals: store.all('crm_deals'), stages: store.all('crm_stages'), history: store.all('crm_deal_stage_history') };
    const s = salesSummary({ ...all, period });
    const p90 = periodFor('last_90');
    const rep = sourceReport({ ...all, sources: store.all('crm_sources'), spend: store.all('crm_ad_spend'), period: p90 });
    const quotesWaiting = store.filter('crm_deals', (d) => d.outcome === 'open' && store.get('crm_stages', d.stage_id)?.key === 'proposal');
    const actions = buildActions();
    const upcoming = openTasks().filter((t) => t.due_at && new Date(t.due_at) > endOfDay() && new Date(t.due_at) <= endOfDay(addDays(new Date(), 7))).sort((a, b) => (a.due_at < b.due_at ? -1 : 1));
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב';
    render(el, html`
      ${pageHeader({
        title: greet,
        subtitle: new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }),
        actions: html`<button class="btn btn-primary" data-act="new-lead">${icon('plus')}ליד חדש</button>`,
      })}
      ${el._backupNote ? html`<div class="notice notice-warn backup-note">${icon('download')}<div class="grow">${el._backupNote}</div><a class="btn btn-sm" href="#/settings">להורדת גיבוי</a></div>` : ''}
      <div class="today-layout">
      <section class="kpis today-kpis" aria-label="המספרים של החודש">
        <button class="kpi-btn" data-drill="leads"><span class="kpi-label">לידים חדשים החודש</span><span class="kpi-value">${fmt.number(s.newLeads.length)}</span></button>
        <button class="kpi-btn" data-drill="open"><span class="kpi-label">עסקאות פתוחות</span><span class="kpi-value">${fmt.money(s.pipelineValue)}</span><span class="kpi-sub">${fmt.number(s.open.length)} עסקאות | משוקלל ${fmt.money(s.weightedPipeline)}</span></button>
        <button class="kpi-btn" data-drill="quotes"><span class="kpi-label">הצעות שממתינות לתשובה</span><span class="kpi-value">${fmt.number(quotesWaiting.length)}</span><span class="kpi-sub">${fmt.money(quotesWaiting.reduce((a, d) => a + Number(d.amount_expected || 0), 0))}</span></button>
        <button class="kpi-btn" data-drill="won"><span class="kpi-label">נסגר החודש</span><span class="kpi-value money">${fmt.money(s.revenue)}</span><span class="kpi-sub">${fmt.number(s.won.length)} עסקאות, לפני מע"מ</span></button>
        <button class="kpi-btn" data-drill="collected"><span class="kpi-label">נגבה בפועל החודש</span><span class="kpi-value">${fmt.money(s.collected)}</span><span class="kpi-sub">לפי הזנה ידנית</span></button>
        <button class="kpi-btn" data-drill="close"><span class="kpi-label">שיעור הפיכה ללקוח</span><span class="kpi-value">${rep.total.closeRate.value == null ? '—' : fmt.percent(rep.total.closeRate.value * 100)}</span><span class="kpi-sub">${rep.total.closeRate.value == null ? rep.total.closeRate.reason : `${rep.total.customers} מתוך ${rep.total.leads} לידים מ-90 יום${rep.total.leads < 10 ? ' (מעט נתונים, מוקדם להסיק)' : ''}, ${rep.total.openCohort} עוד פתוחים`}</span></button>
      </section>

      <div class="today-grid">
        <section class="panel">
          <div class="panel-head"><h2>מה לעשות עכשיו</h2><span class="muted small">${actions.length ? `${actions.length} פריטים, לפי דחיפות` : ''}</span></div>
          ${actions.length ? html`<ol class="act-list">${actions.slice(0, 40).map(actionRow)}</ol>`
            : emptyState({ icon: 'check', title: 'אין משימות פתוחות להיום', text: 'כל הלידים והעסקאות הפעילים מטופלים. זה זמן טוב להוסיף לידים או לחזור ללקוחות קודמים.', action: { act: 'new-lead', label: 'ליד חדש', icon: 'plus' } })}
        </section>
        <aside class="stack">
          <section class="panel">
            <div class="panel-head"><h3>בשבוע הקרוב</h3><a href="#/tasks" class="small">כל המשימות</a></div>
            ${upcoming.length ? html`<ul class="mini-list">${upcoming.slice(0, 8).map((t) => html`<li class="row"><a class="grow" href="${t.deal_id ? `#/d/${t.deal_id}` : t.contact_id ? `#/c/${t.contact_id}` : '#/tasks'}"><span class="muted small num">${new Date(t.due_at).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' })}</span> ${t.title}</a>${taskEditBtn(t)}</li>`)}</ul>` : html`<p class="pad muted small">אין משימות מתוכננות לשבוע הקרוב.</p>`}
          </section>
          ${rep.completeness.unknownSourceIds.length ? html`<section class="notice notice-warn">${icon('alert')}<div><b>${rep.completeness.unknownSourceIds.length} לידים בלי מקור הגעה</b><p class="small">בלי מקור אי אפשר לדעת איזה פרסום עובד. <button class="linkbtn" data-drill="unknown">הצגת הלידים</button></p></div></section>` : ''}
        </aside>
      </div>
      </div>`);
    el._data = { s, rep, quotesWaiting };
  };
  draw();
  ctx.watch(['crm_tasks', 'crm_contacts', 'crm_deals', 'crm_activities', 'crm_stages'], draw);

  on(el, 'click', '[data-act]', async (e, b) => {
    const a = b.dataset.act;
    if (a === 'new-lead') openLeadForm();
    if (a === 'log') openActivityForm({ contactId: b.dataset.contact, dealId: b.dataset.deal || null });
    if (a === 'task') openTaskForm({ contactId: b.dataset.contact || null, dealId: b.dataset.deal });
    if (a === 'edit-task') openTaskForm({ task: store.get('crm_tasks', b.dataset.id) });
    if (a === 'done') {
      b.disabled = true;
      try { await store.update('crm_tasks', b.dataset.id, { status: 'done' }); toast('בוצע', { kind: 'success', action: { label: 'ביטול', onClick: () => store.update('crm_tasks', b.dataset.id, { status: 'open' }) } }); } catch (err) { toast(err.message, { kind: 'error' }); b.disabled = false; }
    }
    if (a === 'snooze') {
      const t = store.get('crm_tasks', b.dataset.id);
      const d = addDays(new Date(), 1); const old = new Date(t.due_at); d.setHours(old.getHours() || 10, old.getMinutes(), 0, 0);
      const prevDue = t.due_at;
      try { await store.update('crm_tasks', t.id, { due_at: d.toISOString() }); toast(`נדחה ליום ${d.toLocaleDateString('he-IL', { weekday: 'long' })}`, { action: { label: 'ביטול', onClick: () => store.update('crm_tasks', t.id, { due_at: prevDue }) } }); } catch (err) { toast(err.message, { kind: 'error' }); }
    }
  });
  on(el, 'click', '[data-drill]', (e, b) => {
    const { s, rep, quotesWaiting } = el._data;
    const k = b.dataset.drill;
    if (k === 'leads') showRecords('לידים חדשים החודש', { contacts: s.newLeads });
    if (k === 'open') showRecords('עסקאות פתוחות', { deals: s.open, note: 'משוקלל = סכום צפוי כפול ההסתברות של השלב.' });
    if (k === 'quotes') showRecords('הצעות מחיר שממתינות לתשובה', { deals: quotesWaiting.map((d) => d.id) });
    if (k === 'won') showRecords('עסקאות שנסגרו החודש', { deals: s.won, note: 'הכנסה שנסגרה = הסכום הסופי של עסקאות שסומנו "נסגר בהצלחה" החודש. זה לא בהכרח כסף שנגבה.' });
    if (k === 'collected') showRecords('נגבה בפועל החודש', { deals: s.collectedIds, note: 'סכומים שהוזנו כנגבו עם תאריך גבייה החודש. לא מאומת מול מערכת חיצונית.' });
    if (k === 'close') showRecords('לידים מ-90 הימים האחרונים שהפכו ללקוחות', { contacts: rep.rows.flatMap((r) => r.customers), note: `שיעור הפיכה ללקוח = לידים שנוצרו ב-90 הימים האחרונים ויש להם עסקה שנסגרה בהצלחה, חלקי כל הלידים מאותה תקופה. ${rep.total.openCohort} לידים עדיין בתהליך, ולכן השיעור עוד יכול לעלות.` });
    if (k === 'unknown') showRecords('לידים בלי מקור הגעה (90 יום)', { contacts: rep.completeness.unknownSourceIds });
  });
}
