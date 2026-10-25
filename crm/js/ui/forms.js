// The handful of dialogs the whole app uses: lead, activity (log + next step), task, deal, won/lost, payment.

import { html, render, $, fmt, toDateTimeInput, toDateInput, addDays } from '../core/util.js';
import { store } from '../core/store.js';
import {
  LEAD_STATUS, FIT, DISQUALIFY, LOST_REASONS, TASK_TYPES, ACTIVITY_TYPES, CALL_OUTCOMES, SERVICE_TYPES,
  contactName, sources, stages, pipeline, findDuplicates, label,
} from '../core/model.js';
import { modal, drawer, toast, icon, readForm, showFieldErrors, opt } from './components.js';

const field = (labelText, control, { req = false, help = '', cls = '' } = {}) => html`<div class="field ${cls}"><label class="field-label">${labelText}${req ? html`<span class="req" aria-hidden="true">*</span>` : ''}</label>${control}${help ? html`<p class="field-help">${help}</p>` : ''}</div>`;
const inHours = (h) => { const d = new Date(Date.now() + h * 36e5); d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0); return d; };
const tomorrowAt = (hour = 10, days = 1) => { const d = addDays(new Date(), days); d.setHours(hour, 0, 0, 0); return d; };

async function save(fn, form) {
  try { return await fn(); } catch (e) {
    if (form && e.field) showFieldErrors(form, { [e.field]: e.message });
    else toast(e.message || 'השמירה נכשלה', { kind: 'error', timeout: 8000 });
    return false;
  }
}

// ---------------------------------------------------------------- lead
export function openLeadForm({ contact = null, onSaved } = {}) {
  const c = contact || {};
  const editing = !!contact;
  let allowDup = false;
  return drawer({
    title: editing ? 'עריכת פרטי ליד' : 'ליד חדש',
    body: (el) => {
      render(el, html`<form class="form-grid" novalidate>
        <div class="form-2">
          ${field('שם פרטי', html`<input class="input" name="first_name" value="${c.first_name ?? ''}" autofocus autocomplete="off">`)}
          ${field('שם משפחה', html`<input class="input" name="last_name" value="${c.last_name ?? ''}" autocomplete="off">`)}
        </div>
        <div class="form-2">
          ${field('טלפון', html`<input class="input" name="phone" type="tel" dir="ltr" value="${c.phone ?? ''}" inputmode="tel">`)}
          ${field('אימייל', html`<input class="input" name="email" type="email" dir="ltr" value="${c.email ?? ''}">`)}
        </div>
        <div class="dup-warn" data-dup hidden></div>
        <div class="form-2">
          ${field('עסק / חברה', html`<input class="input" name="company_name" value="${c.company_name ?? ''}">`)}
          ${field('אתר קיים', html`<input class="input" name="website" dir="ltr" value="${c.website ?? ''}" placeholder="example.co.il">`)}
        </div>
        ${editing && c.first_source_id
          ? field('מקור הגעה מקורי', html`<input class="input" value="${store.get('crm_sources', c.first_source_id)?.name ?? ''}" disabled>`, { help: 'המקור המקורי נעול כדי שהדוחות יישארו אמינים.' })
          : field('איך הגיע אליי?', html`<select class="input" name="first_source_id">${opt(sources().map((s) => ({ value: s.id, label: s.name })), c.first_source_id, { empty: 'לא ידוע' })}</select>`, { help: 'אם לא בטוחים, השאירו "לא ידוע". עדיף מקור לא ידוע מניחוש.' })}
        ${field('מה הוא צריך?', html`<textarea class="input" name="need" rows="2" placeholder="למשל: אתר תדמית לקליניקה, 5 עמודים">${c.need ?? ''}</textarea>`)}
        <div class="form-2">
          ${field('תקציב משוער (₪)', html`<input class="input num" name="budget_estimate" type="number" min="0" step="100" dir="ltr" value="${c.budget_estimate ?? ''}">`)}
          ${field('התאמה לעסק', html`<select class="input" name="fit">${opt(FIT, c.fit, { empty: 'עוד לא ידוע' })}</select>`)}
        </div>
        ${editing ? html`<div class="form-2">
          ${field('סטטוס', html`<select class="input" name="lead_status">${opt(LEAD_STATUS, c.lead_status)}</select>`)}
          ${field('סיבת פסילה', html`<select class="input" name="disqualify_reason">${opt(DISQUALIFY, c.disqualify_reason, { empty: '—' })}</select>`)}
        </div>` : ''}
        ${editing ? '' : html`<fieldset class="next-step"><legend>פולואפ ראשון</legend>
          <div class="form-2">
            ${field('סוג', html`<select class="input" name="_task_type">${opt(TASK_TYPES.filter((t) => ['call', 'whatsapp', 'email'].includes(t.value)), 'call')}</select>`)}
            ${field('מתי', html`<input class="input" name="_task_due" type="datetime-local" value="${toDateTimeInput(inHours(1))}">`)}
          </div>
          <p class="field-help">כל ליד פעיל צריך צעד הבא. המשימה תופיע ב"היום שלי".</p>
        </fieldset>`}
        ${field('הערות', html`<textarea class="input" name="notes" rows="2">${c.notes ?? ''}</textarea>`)}
        <button type="submit" hidden></button>
      </form>`);
      const form = $('form', el);
      const dup = $('[data-dup]', el);
      const check = () => {
        const v = readForm(form);
        const d = findDuplicates(v, c.id);
        allowDup = false;
        dup.hidden = !d.length;
        if (d.length) render(dup, html`${icon('alert')}<div><b>ייתכן שזה ליד שכבר קיים</b><p>${d.slice(0, 3).map((x, i) => html`${i ? ', ' : ''}<a href="#/c/${x.id}" data-close>${contactName(x)}</a>`)} עם אותו ${d[0].email && d[0].email === String(v.email || '').toLowerCase() ? 'אימייל' : 'טלפון'}.</p></div>`);
      };
      form.addEventListener('focusout', (e) => { if (['phone', 'email'].includes(e.target.name)) check(); });
      form.addEventListener('submit', (e) => { e.preventDefault(); el.closest('.ov').querySelector('.ov-foot .btn-primary').click(); });
    },
    actions: [
      { label: 'ביטול' },
      {
        label: editing ? 'שמירה' : 'שמירת ליד', kind: 'primary',
        onClick: async ({ body }) => {
          const form = $('form', body);
          const v = readForm(form);
          const errors = {};
          if (!v.first_name && !v.last_name && !v.phone && !v.email && !v.company_name) errors.first_name = 'צריך לפחות שם, טלפון או אימייל';
          if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) errors.email = 'כתובת אימייל לא תקינה';
          if (v.lead_status === 'disqualified' && !v.disqualify_reason) errors.disqualify_reason = 'בחרו סיבה';
          if (showFieldErrors(form, errors)) return false;
          const dups = findDuplicates(v, c.id);
          if (dups.length && !allowDup) {
            allowDup = true;
            toast('נמצא ליד עם אותו טלפון או אימייל. לחצו שוב על שמירה כדי ליצור בכל זאת, או פתחו את הקיים.', { kind: 'error', timeout: 8000 });
            $('[data-dup]', body).hidden = false;
            return false;
          }
          const taskType = v._task_type, taskDue = v._task_due;
          delete v._task_type; delete v._task_due;
          if (v.budget_estimate === null) v.budget_estimate = null;
          return save(async () => {
            let rec;
            if (editing) {
              if (v.lead_status !== 'disqualified') v.disqualify_reason = null;
              rec = await store.update('crm_contacts', c.id, v);
              toast('הפרטים נשמרו', { kind: 'success' });
            } else {
              rec = await store.insert('crm_contacts', { ...v, owner_id: store.userId, origin: 'manual' });
              if (taskDue) {
                await store.insert('crm_tasks', { title: `ליצור קשר ראשוני עם ${contactName(rec)}`, type: taskType || 'call', due_at: taskDue, contact_id: rec.id, owner_id: store.userId, priority: 'high' });
              }
              toast(`הליד נשמר: ${contactName(rec)}`, { kind: 'success', action: { label: 'פתיחה', onClick: () => { location.hash = `#/c/${rec.id}`; } } });
            }
            onSaved?.(rec);
            return true;
          }, form);
        },
      },
    ],
  });
}

// ---------------------------------------------------------------- activity: log what happened + set the next step
export function openActivityForm({ contactId, dealId = null, type = 'call', onSaved } = {}) {
  const c = store.get('crm_contacts', contactId);
  const deal = dealId ? store.get('crm_deals', dealId) : null;
  return modal({
    title: `תיעוד ${label(ACTIVITY_TYPES, type) || 'פעילות'}${c ? ` – ${contactName(c)}` : ''}`,
    size: 'md',
    body: (el) => {
      render(el, html`<form class="form-grid" novalidate>
        <div class="seg" role="radiogroup" aria-label="סוג">${ACTIVITY_TYPES.map((t) => html`<button type="button" class="${t.value === type ? 'active' : ''}" data-type="${t.value}" role="radio" aria-checked="${t.value === type}">${icon(t.icon)}${t.label}</button>`)}</div>
        <input type="hidden" name="type" value="${type}">
        <div data-outcome ${type === 'call' ? '' : 'hidden'}>${field('תוצאת השיחה', html`<div class="checks">${CALL_OUTCOMES.map((o, i) => html`<label class="check-pill"><input type="radio" name="outcome" value="${o}" ${i === 0 ? 'checked' : ''}><span>${o}</span></label>`)}</div>`)}</div>
        ${field('מה עלה?', html`<textarea class="input" name="body" rows="4" autofocus placeholder="צרכים, תקציב, לוחות זמנים, התנגדויות..."></textarea>`)}
        ${c && c.lifecycle !== 'customer' ? field('לעדכן סטטוס ליד', html`<select class="input" name="_status">${opt(LEAD_STATUS.filter((s) => s.value !== 'disqualified'), c.lead_status === 'new' ? 'connected' : c.lead_status)}</select>`) : ''}
        <fieldset class="next-step"><legend>הצעד הבא</legend>
          <label class="field-inline row"><input type="checkbox" class="cbx" name="_next" checked> <span>לקבוע משימת המשך</span></label>
          <div class="form-2" data-next>
            ${field('מה', html`<input class="input" name="_next_title" value="${deal ? 'פולואפ על ההצעה' : 'שיחת המשך'}">`)}
            ${field('מתי', html`<input class="input" name="_next_due" type="datetime-local" value="${toDateTimeInput(tomorrowAt(10, 2))}">`)}
          </div>
          <div class="chips-row" data-quick>
            ${[['מחר', 1], ['עוד 3 ימים', 3], ['שבוע', 7], ['שבועיים', 14]].map(([l, d]) => html`<button type="button" class="btn btn-sm btn-ghost" data-days="${d}">${l}</button>`)}
          </div>
        </fieldset>
      </form>`);
      const form = $('form', el);
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-type]');
        if (b) {
          form.type.value = b.dataset.type;
          el.querySelectorAll('[data-type]').forEach((x) => { x.classList.toggle('active', x === b); x.setAttribute('aria-checked', x === b); });
          $('[data-outcome]', el).hidden = b.dataset.type !== 'call';
        }
        const q = e.target.closest('[data-days]');
        if (q) form._next_due.value = toDateTimeInput(tomorrowAt(10, Number(q.dataset.days)));
      });
      form._next.addEventListener('change', () => { $('[data-next]', el).hidden = !form._next.checked; $('[data-quick]', el).hidden = !form._next.checked; });
    },
    actions: [
      { label: 'ביטול' },
      {
        label: 'שמירה', kind: 'primary',
        onClick: async ({ body }) => {
          const form = $('form', body);
          const v = readForm(form);
          if (v.type !== 'call') v.outcome = null;
          if (!v.body && v.type === 'note') { showFieldErrors(form, { body: 'כתבו את ההערה' }); return false; }
          if (v._next && !v._next_due) { showFieldErrors(form, { _next_due: 'בחרו מתי' }); return false; }
          return save(async () => {
            await store.insert('crm_activities', {
              type: v.type, body: v.body, outcome: v.outcome, at: new Date().toISOString(), direction: 'out',
              contact_id: contactId || null, deal_id: dealId, owner_id: store.userId,
            });
            if (c && v._status && v._status !== c.lead_status) {
              const patch = { lead_status: v._status };
              if (v._status === 'qualified' && c.lifecycle === 'lead') patch.lifecycle = 'qualified';
              await store.update('crm_contacts', c.id, patch);
            } else if (c && c.lead_status === 'new' && v.type === 'call' && v.outcome !== 'דיברנו') {
              await store.update('crm_contacts', c.id, { lead_status: 'attempting' });
            }
            // logging a call/WhatsApp completes the open task of the same kind that was due
            const due = store.filter('crm_tasks', (t) => t.status === 'open' && ((dealId && t.deal_id === dealId) || t.contact_id === contactId) && t.due_at && new Date(t.due_at) <= new Date(Date.now() + 864e5))
              .sort((a, b) => (a.due_at < b.due_at ? -1 : 1))[0];
            if (due) await store.update('crm_tasks', due.id, { status: 'done', outcome: v.outcome || v.body?.slice(0, 120) || null });
            if (v._next) {
              await store.insert('crm_tasks', { title: v._next_title || 'פולואפ', type: 'followup', due_at: v._next_due, contact_id: contactId || deal?.contact_id || null, deal_id: dealId, owner_id: store.userId });
            }
            toast(due ? 'נשמר. המשימה הקודמת סומנה כבוצעה.' : 'נשמר', { kind: 'success' });
            onSaved?.();
            return true;
          }, form);
        },
      },
    ],
  });
}

// ---------------------------------------------------------------- task
export function openTaskForm({ task = null, contactId = null, dealId = null, onSaved } = {}) {
  const t = task || { type: 'call', priority: 'normal', status: 'open', due_at: tomorrowAt(10).toISOString(), contact_id: contactId, deal_id: dealId };
  const c = store.get('crm_contacts', t.contact_id);
  const leads = store.all('crm_contacts').map((x) => ({ value: x.id, label: contactName(x) })).sort((a, b) => a.label.localeCompare(b.label, 'he'));
  const later = (h) => { const d = new Date(); d.setHours(h, 0, 0, 0); return d; };
  const quick = [['היום אחה"צ', () => later(16)], ['מחר', () => tomorrowAt(10, 1)], ['עוד 3 ימים', () => tomorrowAt(10, 3)], ['שבוע', () => tomorrowAt(10, 7)]];
  return modal({
    title: task ? 'עריכת משימה' : `משימה חדשה${c ? ` – ${contactName(c)}` : ''}`,
    size: 'sm',
    body: (el) => {
      render(el, html`<form class="form-grid" novalidate>
        ${field('מה צריך לעשות', html`<input class="input" name="title" value="${t.title ?? ''}" autofocus required>`, { req: true })}
        <div class="form-2">
          ${field('סוג', html`<select class="input" name="type">${opt(TASK_TYPES, t.type)}</select>`)}
          ${field('עדיפות', html`<select class="input" name="priority">${opt([{ value: 'low', label: 'נמוכה' }, { value: 'normal', label: 'רגילה' }, { value: 'high', label: 'גבוהה' }], t.priority)}</select>`)}
        </div>
        <div class="field">
          <label class="field-label" for="task-due">מתי</label>
          <input class="input" id="task-due" name="due_at" type="datetime-local" value="${toDateTimeInput(t.due_at)}">
          <div class="chips-row">${quick.map(([l], i) => html`<button type="button" class="btn btn-sm btn-ghost" data-quick="${i}">${l}</button>`)}</div>
        </div>
        ${task || !t.contact_id ? field('קשור לליד', html`<select class="input" name="contact_id">${opt(leads, t.contact_id, { empty: 'בלי ליד' })}</select>`) : ''}
        ${task ? field('סטטוס', html`<select class="input" name="status">${opt([{ value: 'open', label: 'פתוחה' }, { value: 'done', label: 'בוצעה' }, { value: 'canceled', label: 'בוטלה' }], t.status)}</select>`) : ''}
        ${field('הערות', html`<textarea class="input" name="notes" rows="2">${t.notes ?? ''}</textarea>`)}
        ${task ? field('תוצאה (אחרי ביצוע)', html`<input class="input" name="outcome" value="${t.outcome ?? ''}" placeholder="למשל: דיברנו, ביקש הצעה">`) : ''}
      </form>`);
      el.addEventListener('click', (e) => {
        const q = e.target.closest('[data-quick]');
        if (q) $('[name=due_at]', el).value = toDateTimeInput(quick[Number(q.dataset.quick)][1]());
      });
    },
    actions: [
      ...(task ? [{
        label: 'מחיקה', kind: 'ghost', icon: 'trash',
        onClick: async () => {
          const copy = structuredClone(task);
          return save(async () => {
            await store.remove('crm_tasks', task.id);
            toast('המשימה נמחקה', { action: { label: 'ביטול', onClick: () => store.restore('crm_tasks', copy) } });
            onSaved?.();
            return true;
          });
        },
      }] : []),
      { label: 'ביטול' },
      {
        label: task ? 'שמירה' : 'יצירת משימה', kind: 'primary',
        onClick: async ({ body }) => {
          const form = $('form', body);
          const v = readForm(form);
          if (!v.title) { showFieldErrors(form, { title: 'כתבו מה צריך לעשות' }); return false; }
          return save(async () => {
            if (task) {
              // a task moved to another lead no longer belongs to the old lead's deal
              if ('contact_id' in v && v.contact_id !== task.contact_id && task.deal_id && store.get('crm_deals', task.deal_id)?.contact_id !== v.contact_id) v.deal_id = null;
              await store.update('crm_tasks', task.id, v);
            } else await store.insert('crm_tasks', { ...v, contact_id: v.contact_id ?? t.contact_id ?? null, deal_id: t.deal_id ?? null, owner_id: store.userId });
            toast(task ? 'המשימה עודכנה' : 'המשימה נוצרה', { kind: 'success' });
            onSaved?.();
            return true;
          }, form);
        },
      },
    ],
  });
}

// Pencil button used on every task row.
export const taskEditBtn = (t) => html`<button class="btn-icon sm task-edit" data-act="edit-task" data-id="${t.id}" aria-label="עריכת המשימה: ${t.title}" title="עריכה">${icon('edit')}</button>`;

// ---------------------------------------------------------------- deal
export function openDealForm({ deal = null, contactId = null, onSaved } = {}) {
  const d = deal || { contact_id: contactId, stage_id: stages()[0]?.id };
  const c = store.get('crm_contacts', d.contact_id);
  return modal({
    title: deal ? 'עריכת עסקה' : `עסקה חדשה${c ? ` – ${contactName(c)}` : ''}`,
    size: 'sm',
    body: html`<form class="form-grid" novalidate>
      ${field('סוג שירות', html`<select class="input" name="service_type">${opt(SERVICE_TYPES, d.service_type, { empty: 'בחירה...' })}</select>`)}
      ${field('שם העסקה', html`<input class="input" name="name" value="${d.name ?? ''}" placeholder="${c ? `אתר ל${c.company_name || contactName(c)}` : ''}">`, { help: 'אם ריק, השם ייווצר מסוג השירות ושם הליד.' })}
      <div class="form-2">
        ${field('סכום צפוי (₪, לפני מע"מ)', html`<input class="input num" name="amount_expected" type="number" min="0" step="100" dir="ltr" value="${d.amount_expected ?? c?.budget_estimate ?? ''}">`)}
        ${field('סגירה צפויה', html`<input class="input" name="expected_close" type="date" value="${d.expected_close ?? toDateInput(addDays(new Date(), 21))}">`)}
      </div>
      ${field('שלב', html`<select class="input" name="stage_id">${opt(stages().filter((s) => s.kind === 'open').map((s) => ({ value: s.id, label: s.name })), d.stage_id)}</select>`)}
      ${!d.contact_id ? field('ליד', html`<select class="input" name="contact_id">${opt(store.all('crm_contacts').map((x) => ({ value: x.id, label: contactName(x) })).sort((a, b) => a.label.localeCompare(b.label, 'he')), null, { empty: 'בחירה...' })}</select>`, { req: true }) : ''}
      ${field('הצעד הבא', html`<input class="input" name="next_step" value="${d.next_step ?? ''}" placeholder="למשל: לשלוח הצעת מחיר">`)}
    </form>`,
    actions: [
      { label: 'ביטול' },
      {
        label: deal ? 'שמירה' : 'יצירת עסקה', kind: 'primary',
        onClick: async ({ body }) => {
          const form = $('form', body);
          const v = readForm(form);
          const cid = v.contact_id ?? d.contact_id;
          if (!cid) { showFieldErrors(form, { contact_id: 'בחרו ליד' }); return false; }
          const cc = store.get('crm_contacts', cid);
          v.name ||= [v.service_type || 'עסקה', cc?.company_name || contactName(cc)].filter(Boolean).join(' – ');
          return save(async () => {
            let rec;
            if (deal) rec = await store.update('crm_deals', deal.id, v);
            else rec = await store.insert('crm_deals', { ...v, contact_id: cid, pipeline_id: pipeline().id, owner_id: store.userId });
            toast(deal ? 'העסקה עודכנה' : 'העסקה נוצרה', { kind: 'success', action: deal ? null : { label: 'פתיחה', onClick: () => { location.hash = `#/d/${rec.id}`; } } });
            onSaved?.(rec);
            return true;
          }, form);
        },
      },
    ],
  });
}

// Moving a deal to won/lost asks for the facts the reports depend on.
export function moveDeal(deal, stageId) {
  const st = store.get('crm_stages', stageId);
  if (!st || stageId === deal.stage_id) return Promise.resolve(false);
  if (st.kind === 'won') return openWonDialog(deal, stageId);
  if (st.kind === 'lost') return openLostDialog(deal, stageId);
  return save(async () => { await store.update('crm_deals', deal.id, { stage_id: stageId }); toast(`הועבר ל"${st.name}"`, { kind: 'success' }); return true; });
}

export function openWonDialog(deal, stageId) {
  return new Promise((res) => {
    let ok = false;
    modal({
      title: `סגירה בהצלחה: ${deal.name}`, size: 'sm',
      body: html`<form class="form-grid" novalidate>
        ${field('סכום סופי (₪, לפני מע"מ)', html`<input class="input num" name="amount_final" type="number" min="0" step="1" dir="ltr" value="${deal.amount_final ?? deal.amount_expected ?? ''}" autofocus required>`, { req: true })}
        <div class="form-2">
          ${field('כבר נגבה (₪)', html`<input class="input num" name="amount_paid" type="number" min="0" step="1" dir="ltr" value="${deal.amount_paid || ''}">`, { help: 'רק כסף שהתקבל בפועל' })}
          ${field('תאריך גבייה', html`<input class="input" name="paid_at" type="date" value="${deal.paid_at ?? ''}">`)}
        </div>
        ${field('עלות ישירה משוערת (₪)', html`<input class="input num" name="direct_cost_estimate" type="number" min="0" step="1" dir="ltr" value="${deal.direct_cost_estimate ?? ''}">`, { help: 'פרילנסרים, תוספים, אחסון. בלי זה אי אפשר לחשב רווח.' })}
        ${field('למה זכינו? (לא חובה)', html`<input class="input" name="won_reason" value="${deal.won_reason ?? ''}">`)}
      </form>`,
      onClose: () => res(ok),
      actions: [
        { label: 'ביטול' },
        {
          label: 'סימון כנסגר', kind: 'primary',
          onClick: async ({ body }) => {
            const form = $('form', body);
            const v = readForm(form);
            if (v.amount_final == null) { showFieldErrors(form, { amount_final: 'מה הסכום הסופי?' }); return false; }
            if (v.amount_paid && !v.paid_at) v.paid_at = toDateInput(new Date());
            v.amount_paid ??= 0;
            ok = await save(async () => { await store.update('crm_deals', deal.id, { ...v, stage_id: stageId }); toast('מזל טוב! העסקה נסגרה.', { kind: 'success' }); return true; }, form);
            return ok;
          },
        },
      ],
    });
  });
}

export function openLostDialog(deal, stageId) {
  return new Promise((res) => {
    let ok = false;
    modal({
      title: `סגירה בהפסד: ${deal.name}`, size: 'sm',
      body: html`<form class="form-grid" novalidate>
        ${field('הסיבה העיקרית', html`<div class="checks">${LOST_REASONS.map((r, i) => html`<label class="check-pill"><input type="radio" name="lost_reason" value="${r.value}" ${i === 0 ? 'checked' : ''}><span>${r.label}</span></label>`)}</div>`)}
        ${field('פירוט (לא חובה)', html`<textarea class="input" name="lost_note" rows="2">${deal.lost_note ?? ''}</textarea>`)}
      </form>`,
      onClose: () => res(ok),
      actions: [
        { label: 'ביטול' },
        {
          label: 'סימון כהפסד', kind: 'danger',
          onClick: async ({ body }) => {
            const v = readForm($('form', body));
            ok = await save(async () => { await store.update('crm_deals', deal.id, { ...v, stage_id: stageId }); toast('העסקה סומנה כהפסד'); return true; });
            return ok;
          },
        },
      ],
    });
  });
}

export function openMoneyDialog(deal) {
  return modal({
    title: 'כסף ועלויות', size: 'sm',
    body: html`<form class="form-grid" novalidate>
      ${deal.outcome === 'won' ? field('סכום סופי (₪, לפני מע"מ)', html`<input class="input num" name="amount_final" type="number" min="0" dir="ltr" value="${deal.amount_final ?? ''}">`) : field('סכום צפוי (₪)', html`<input class="input num" name="amount_expected" type="number" min="0" dir="ltr" value="${deal.amount_expected ?? ''}">`)}
      <div class="form-2">
        ${field('סך הכול נגבה עד היום (₪)', html`<input class="input num" name="amount_paid" type="number" min="0" dir="ltr" value="${deal.amount_paid || ''}" autofocus>`)}
        ${field('תאריך הגבייה האחרונה', html`<input class="input" name="paid_at" type="date" value="${deal.paid_at ?? ''}">`)}
      </div>
      ${field('עלות ישירה (₪)', html`<input class="input num" name="direct_cost_estimate" type="number" min="0" dir="ltr" value="${deal.direct_cost_estimate ?? ''}">`)}
      <p class="field-help">הגבייה מוזנת ידנית ואינה מאומתת מול מערכת סליקה או הנהלת חשבונות.</p>
    </form>`,
    actions: [
      { label: 'ביטול' },
      {
        label: 'שמירה', kind: 'primary',
        onClick: async ({ body }) => {
          const form = $('form', body);
          const v = readForm(form);
          v.amount_paid ??= 0;
          if (v.amount_paid > 0 && !v.paid_at) v.paid_at = toDateInput(new Date());
          const total = v.amount_final ?? deal.amount_final ?? deal.amount_expected;
          if (total != null && v.amount_paid > total * 1.2) { showFieldErrors(form, { amount_paid: `הסכום שנגבה גבוה מסכום העסקה (${fmt.money(total)}). בדקו שוב.` }); return false; }
          return save(async () => { await store.update('crm_deals', deal.id, v); toast('נשמר', { kind: 'success' }); return true; }, form);
        },
      },
    ],
  });
}
