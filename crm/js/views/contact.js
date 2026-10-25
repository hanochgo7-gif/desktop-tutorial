// Lead / contact page: who they are, the next step, quick logging, deals, and one chronological timeline.

import { html, render, on, fmt, safeUrl, whatsappUrl } from '../core/util.js';
import { store } from '../core/store.js';
import {
  contactName, sourceName, stageName, LEAD_STATUS, LIFECYCLE, FIT, TASK_TYPES, ACTIVITY_TYPES, label, color,
  nextTaskFor, dealsOf, dueClass, openTasks,
} from '../core/model.js';
import { pageHeader, icon, badge, avatar, setTitle, toast, confirmDialog, opt, menu } from '../ui/components.js';
import { openLeadForm, openActivityForm, openTaskForm, openDealForm, taskEditBtn } from '../ui/forms.js';

export function timeline({ contactId = null, dealId = null }) {
  const items = [];
  const dealIds = new Set(dealId ? [dealId] : dealsOf(contactId).map((d) => d.id));
  for (const a of store.all('crm_activities')) {
    if ((contactId && a.contact_id === contactId) || (a.deal_id && dealIds.has(a.deal_id))) items.push({ at: a.at, kind: a.type, a });
  }
  for (const t of store.all('crm_tasks')) {
    if (t.status !== 'done') continue;
    if ((contactId && t.contact_id === contactId) || (t.deal_id && dealIds.has(t.deal_id))) items.push({ at: t.completed_at, kind: 'task', t });
  }
  for (const h of store.all('crm_deal_stage_history')) if (dealIds.has(h.deal_id)) items.push({ at: h.at, kind: 'stage', h });
  if (contactId) {
    const c = store.get('crm_contacts', contactId);
    for (const tp of store.all('crm_touchpoints')) if (tp.contact_id === contactId) items.push({ at: tp.at, kind: 'touch', tp });
    if (c) items.push({ at: c.created_at, kind: 'created', c });
  }
  return items.filter((x) => x.at).sort((a, b) => (a.at < b.at ? 1 : -1));
}

export function timelineHtml(items) {
  if (!items.length) return html`<p class="muted pad">עוד אין פעילות. תעדו את השיחה הראשונה.</p>`;
  let month = '';
  return html`<ol class="tl">${items.map((it) => {
    const m = new Date(it.at).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
    const head = m !== month ? html`<li class="tl-month">${(month = m)}</li>` : '';
    if (it.kind === 'stage') {
      const d = store.get('crm_deals', it.h.deal_id);
      return html`${head}<li class="tl-item k-system"><span class="tl-ic">${icon('arrowLeft')}</span><div class="tl-card">${d ? html`<a href="#/d/${d.id}">${d.name}</a>` : 'עסקה'} ${it.h.from_stage_id ? html`עברה מ"${stageName(it.h.from_stage_id)}" ` : 'נפתחה '}ל"<b>${stageName(it.h.to_stage_id)}</b>" <span class="muted small">${fmt.dateTime(it.at)}</span></div></li>`;
    }
    if (it.kind === 'created') return html`${head}<li class="tl-item k-system"><span class="tl-ic">${icon('plus')}</span><div class="tl-card">הליד נוצר <span class="muted small">${fmt.dateTime(it.at)}</span></div></li>`;
    if (it.kind === 'touch') {
      const tp = it.tp;
      return html`${head}<li class="tl-item k-system"><span class="tl-ic">${icon('target')}</span><div class="tl-card">הגיע דרך <b>${sourceName(tp.source_id)}</b>${tp.utm_campaign ? html`, קמפיין ${tp.utm_campaign}` : ''}${tp.landing_page ? html` <span class="muted small" dir="ltr">${tp.landing_page}</span>` : ''} <span class="muted small">${fmt.dateTime(it.at)}</span></div></li>`;
    }
    if (it.kind === 'task') {
      return html`${head}<li class="tl-item k-task"><span class="tl-ic">${icon('task')}</span><div class="tl-card"><div class="tl-head"><b>${it.t.title}</b><span>בוצע ${fmt.dateTime(it.at)}</span></div>${it.t.outcome ? html`<div class="tl-body">${it.t.outcome}</div>` : ''}</div></li>`;
    }
    const a = it.a;
    const t = ACTIVITY_TYPES.find((x) => x.value === a.type);
    return html`${head}<li class="tl-item k-${a.type}"><span class="tl-ic">${icon(t?.icon || 'note')}</span><div class="tl-card">
      <div class="tl-head"><b>${t?.label || a.type}${a.outcome ? html` · ${a.outcome}` : ''}</b><span>${fmt.dateTime(a.at)}</span></div>
      ${a.body ? html`<div class="tl-body">${a.body}</div>` : ''}
      ${a.deal_id && !it.hideDeal ? html`<div class="tl-meta"><a href="#/d/${a.deal_id}">${store.get('crm_deals', a.deal_id)?.name || ''}</a></div>` : ''}
    </div></li>`;
  })}</ol>`;
}

export function nextStepCard({ contactId, dealId }) {
  const next = nextTaskFor({ contactId, dealId });
  const all = openTasks().filter((t) => (contactId && t.contact_id === contactId) || (dealId && t.deal_id === dealId)).sort((a, b) => ((a.due_at || '9') < (b.due_at || '9') ? -1 : 1));
  return html`<section class="panel next-card ${next ? '' : 'missing'}">
    <div class="panel-head"><h2>${icon('flag')}הצעד הבא</h2><button class="btn btn-sm btn-ghost" data-act="task">${icon('plus')}משימה</button></div>
    ${next ? html`<ul class="task-list">${all.map((t) => html`<li class="task-row">
        <button class="task-check" data-act="done" data-id="${t.id}" aria-label="סימון כבוצע: ${t.title}">${icon('check')}</button>
        <div class="grow"><button class="linkbtn task-title" data-act="edit-task" data-id="${t.id}">${t.title}</button>
          <div class="task-meta"><span class="${dueClass(t.due_at)}">${t.due_at ? fmt.dateTime(t.due_at) : 'בלי תאריך'}</span><span>${label(TASK_TYPES, t.type)}</span></div></div>${taskEditBtn(t)}</li>`)}</ul>`
      : html`<p class="pad warn-text">${icon('alert')} אין צעד הבא. בלי משימה הליד הזה עלול להישכח.</p>`}
  </section>`;
}

export async function completeTask(id) {
  try {
    await store.update('crm_tasks', id, { status: 'done' });
    toast('בוצע', { kind: 'success', action: { label: 'ביטול', onClick: () => store.update('crm_tasks', id, { status: 'open' }) } });
  } catch (e) { toast(e.message, { kind: 'error' }); }
}

export default async function view(el, ctx) {
  const id = ctx.params.id;
  const draw = () => {
    const c = store.get('crm_contacts', id);
    if (!c) { render(el, html`<div class="empty"><h3>הליד לא נמצא</h3><p>ייתכן שנמחק.</p><a class="btn" href="#/leads">לרשימת הלידים</a></div>`); return; }
    setTitle(contactName(c));
    const deals = dealsOf(id).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    const won = deals.filter((d) => d.outcome === 'won');
    const site = safeUrl(c.website);
    render(el, html`
      ${pageHeader({ title: contactName(c), subtitle: [c.company_name, c.lifecycle === 'customer' ? 'לקוח' : label(LEAD_STATUS, c.lead_status)].filter(Boolean).join(' | '), back: { href: '#/leads', label: 'לידים' },
        actions: html`<button class="btn btn-ghost" data-act="edit">${icon('edit')}עריכה</button><button class="btn-icon" data-act="more" aria-label="פעולות נוספות" aria-haspopup="menu">${icon('moreV')}</button>` })}
      <div class="quick-bar">
        ${c.phone ? html`<a class="btn btn-soft" href="tel:${c.phone}">${icon('phone')}התקשרות</a><a class="btn btn-soft" href="${whatsappUrl(c.phone)}" target="_blank" rel="noopener">${icon('whatsapp')}וואטסאפ</a>` : ''}
        ${c.email ? html`<a class="btn btn-soft" href="mailto:${c.email}">${icon('mail')}אימייל</a>` : ''}
        <button class="btn btn-primary" data-act="log" data-type="call">${icon('note')}תיעוד שיחה / הודעה</button>
        <button class="btn" data-act="deal">${icon('deal')}עסקה חדשה</button>
      </div>
      <div class="rec2">
        <aside class="stack">
          <section class="panel">
            <div class="panel-head"><h2>פרטים</h2></div>
            <dl class="dl">
              <dt>סטטוס</dt><dd><select class="input sm" data-field="lead_status" aria-label="סטטוס ליד">${opt(LEAD_STATUS, c.lead_status)}</select></dd>
              <dt>שלב</dt><dd>${badge(label(LIFECYCLE, c.lifecycle), color(LIFECYCLE, c.lifecycle))}</dd>
              <dt>טלפון</dt><dd dir="ltr" class="num">${c.phone ? html`<a class="lnk" href="tel:${c.phone}">${c.phone}</a>` : html`<span class="nil">—</span>`}</dd>
              <dt>אימייל</dt><dd dir="ltr">${c.email ? html`<a class="lnk" href="mailto:${c.email}">${c.email}</a>` : html`<span class="nil">—</span>`}</dd>
              <dt>עסק</dt><dd>${c.company_name || html`<span class="nil">—</span>`}</dd>
              <dt>אתר</dt><dd dir="ltr">${site ? html`<a class="lnk" href="${site}" target="_blank" rel="noopener">${c.website}</a>` : html`<span class="nil">—</span>`}</dd>
              <dt>צורך</dt><dd class="pre">${c.need || html`<span class="nil">—</span>`}</dd>
              <dt>תקציב משוער</dt><dd class="num">${c.budget_estimate != null ? fmt.money(c.budget_estimate) : html`<span class="nil">—</span>`}</dd>
              <dt>התאמה</dt><dd>${c.fit ? badge(label(FIT, c.fit), color(FIT, c.fit)) : html`<span class="nil">—</span>`}</dd>
              ${c.lead_status === 'disqualified' ? html`<dt>סיבת פסילה</dt><dd>${c.disqualify_reason}</dd>` : ''}
              ${c.notes ? html`<dt>הערות</dt><dd class="pre">${c.notes}</dd>` : ''}
            </dl>
          </section>
          <section class="panel">
            <div class="panel-head"><h2>מקור הגעה</h2></div>
            <dl class="dl">
              <dt>מקור מקורי</dt><dd>${c.first_source_id ? html`<b>${sourceName(c.first_source_id)}</b>` : html`<span class="warn-text">לא ידוע</span> <button class="linkbtn" data-act="set-source">קביעה</button>`}</dd>
              ${c.first_utm?.utm_campaign ? html`<dt>קמפיין</dt><dd dir="ltr">${c.first_utm.utm_campaign}</dd>` : ''}
              <dt>מקור אחרון</dt><dd>${c.last_source_id ? sourceName(c.last_source_id) : html`<span class="nil">—</span>`}</dd>
              ${c.reported_source ? html`<dt>לדבריו</dt><dd>${c.reported_source}</dd>` : ''}
              <dt>נוצר</dt><dd>${fmt.dateTime(c.created_at)}</dd>
            </dl>
          </section>
        </aside>
        <div class="stack">
          ${c.lead_status !== 'disqualified' ? nextStepCard({ contactId: id }) : ''}
          <section class="panel">
            <div class="panel-head"><h2>עסקאות</h2><button class="btn btn-sm btn-ghost" data-act="deal">${icon('plus')}עסקה</button></div>
            ${deals.length ? html`<div class="list">${deals.map((d) => html`<a class="list-row" href="#/d/${d.id}"><span class="grow"><b>${d.name}</b><small class="muted">${stageName(d.stage_id)}${d.closed_at ? ` | נסגר ${fmt.date(d.closed_at)}` : d.expected_close ? ` | סגירה צפויה ${fmt.date(d.expected_close)}` : ''}</small></span>
              <span class="num ${d.outcome === 'won' ? 'money' : ''}">${fmt.money(d.outcome === 'won' ? d.amount_final : d.amount_expected)}</span>${d.outcome !== 'open' ? badge(d.outcome === 'won' ? 'נסגר' : 'הפסד', d.outcome === 'won' ? 'green' : 'slate') : ''}</a>`)}</div>
              ${won.length ? html`<p class="panel-foot small muted">סה"כ נסגר: <b class="money">${fmt.money(won.reduce((a, d) => a + Number(d.amount_final || 0), 0))}</b> | נגבה: <b>${fmt.money(won.reduce((a, d) => a + Number(d.amount_paid || 0), 0))}</b></p>` : ''}`
              : html`<p class="pad muted small">אין עסקאות. כשהליד מתאים, פתחו עסקה כדי לעקוב אחרי הסכום והשלב.</p>`}
          </section>
          <section class="panel">
            <div class="panel-head"><h2>היסטוריה</h2>
              <div class="row">${ACTIVITY_TYPES.map((t) => html`<button class="btn-icon sm" data-act="log" data-type="${t.value}" aria-label="תיעוד ${t.label}" title="${t.label}">${icon(t.icon)}</button>`)}</div></div>
            <div class="panel-body">${timelineHtml(timeline({ contactId: id }))}</div>
          </section>
        </div>
      </div>`);
  };
  draw();
  ctx.watch(['crm_contacts', 'crm_tasks', 'crm_activities', 'crm_deals', 'crm_deal_stage_history', 'crm_touchpoints'], draw);

  on(el, 'change', '[data-field]', async (e, s) => {
    const c = store.get('crm_contacts', id);
    const patch = { [s.dataset.field]: s.value };
    if (s.value === 'disqualified') {
      const { promptDialog } = await import('../ui/components.js');
      const reason = await promptDialog('למה הליד לא רלוונטי?', { title: 'סימון כלא רלוונטי', placeholder: 'תקציב נמוך, לא בתחום, לא ענה...', okLabel: 'סימון' });
      if (!reason) { s.value = c.lead_status; return; }
      patch.disqualify_reason = reason;
      const open = openTasks().filter((t) => t.contact_id === id);
      for (const t of open) await store.update('crm_tasks', t.id, { status: 'canceled' });
    } else if (s.value === 'qualified' && c.lifecycle === 'lead') patch.lifecycle = 'qualified';
    try { await store.update('crm_contacts', id, patch); toast('הסטטוס עודכן', { kind: 'success' }); } catch (err) { toast(err.message, { kind: 'error' }); draw(); }
  });
  on(el, 'click', '[data-act]', async (e, b) => {
    const a = b.dataset.act;
    const c = store.get('crm_contacts', id);
    if (a === 'log') openActivityForm({ contactId: id, type: b.dataset.type });
    if (a === 'task') openTaskForm({ contactId: id });
    if (a === 'edit-task') openTaskForm({ task: store.get('crm_tasks', b.dataset.id) });
    if (a === 'done') completeTask(b.dataset.id);
    if (a === 'deal') openDealForm({ contactId: id });
    if (a === 'edit' || a === 'set-source') openLeadForm({ contact: c });
    if (a === 'more') {
      menu(b, [
        { label: 'עריכת פרטים', icon: 'edit', onClick: () => openLeadForm({ contact: c }) },
        { label: c.lifecycle === 'customer' ? 'סימון כלקוח לשעבר' : 'סימון כלקוח', icon: 'star', onClick: () => store.update('crm_contacts', id, { lifecycle: c.lifecycle === 'customer' ? 'former' : 'customer' }).catch((err) => toast(err.message, { kind: 'error' })) },
        { divider: true },
        { label: 'מחיקת הליד', icon: 'trash', danger: true, onClick: async () => {
          if (!(await confirmDialog(`למחוק את ${contactName(c)}?`, { danger: true, okLabel: 'מחיקה', detail: 'המשימות הפתוחות שלו יבוטלו. העסקאות שלו יישארו בדוחות.' }))) return;
          const copy = structuredClone(c);
          const open = openTasks().filter((t) => t.contact_id === id);
          try {
            for (const t of open) await store.update('crm_tasks', t.id, { status: 'canceled' });
            await store.remove('crm_contacts', id);
            location.hash = '#/leads';
            toast('הליד נמחק', { action: { label: 'ביטול', onClick: async () => { await store.restore('crm_contacts', copy); for (const t of open) await store.update('crm_tasks', t.id, { status: 'open' }); location.hash = `#/c/${id}`; } } });
          } catch (err) { toast(err.message, { kind: 'error' }); }
        } },
      ]);
    }
  });
}
