// The handful of dialogs the whole app uses: lead, activity (log + next step), task, deal, won/lost, payment.

import { html, raw, render, $, fmt, toDateTimeInput, toDateInput, addDays } from '../core/util.js';
import { paymentsOf, paidTotal } from '../core/metrics.js';
import { store } from '../core/store.js';
import {
  LEAD_STATUS, FIT, DISQUALIFY, LOST_REASONS, TASK_TYPES, ACTIVITY_TYPES, CALL_OUTCOMES, SERVICE_TYPES,
  contactName, sources, stages, pipeline, findDuplicates, label,
} from '../core/model.js';
import { modal, drawer, toast, icon, readForm, showFieldErrors, opt, dateErrors, moneyErrors } from './components.js';

// A labelled field: the <label> is tied to the first input/select/textarea in `control` (screen readers read it),
// help text is linked with aria-describedby. Radio/checkbox groups get the label as their group name.
let fieldSeq = 0;
const field = (labelText, control, { req = false, help = '', cls = '' } = {}) => {
  const id = `fld${++fieldSeq}`;
  let c = String(control);
  const helpId = help ? `${id}-h` : '';
  if (/^\s*<div class="checks"/.test(c)) c = c.replace('<div class="checks"', `<div class="checks" role="group" aria-labelledby="${id}-l"`);
  else c = c.replace(/<(input|select|textarea)(?![^>]*\sid=)/, `<$1 id="${id}"${helpId ? ` aria-describedby="${helpId}"` : ''}`);
  return html`<div class="field ${cls}"><label class="field-label" id="${id}-l" for="${id}">${labelText}${req ? html`<span class="req" aria-hidden="true">*</span>` : ''}</label>${raw(c)}${help ? html`<p class="field-help" id="${helpId}">${help}</p>` : ''}</div>`;
};
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
        ${field('עסק / חברה', html`<input class="input" name="company_name" value="${c.company_name ?? ''}">`)}
        ${editing && c.first_source_id
          ? field('מקור הגעה מקורי', html`<input class="input" value="${store.get('crm_sources', c.first_source_id)?.name ?? ''}" disabled>`, { help: 'המקור המקורי נעול כדי שהדוחות יישארו אמינים.' })
          : field('איך הגיע אליי?', html`<select class="input" name="first_source_id">${opt(sources().map((s) => ({ value: s.id, label: s.is_paid ? `${s.name} – ממודעה ממומנת` : s.name })), c.first_source_id, { empty: 'לא ידוע' })}</select>`, { help: '"ממומנת" רק אם הגיע ממודעה שמשלמים עליה. אם לא בטוחים, השאירו "לא ידוע".' })}
        ${field('מה הוא צריך?', html`<textarea class="input" name="need" rows="2" placeholder="במשפט אחד">${c.need ?? ''}</textarea>`)}
        <details class="more-fields" ${editing && (c.website || c.budget_estimate != null || c.fit || c.notes) ? 'open' : ''}><summary>${icon('chevronDown')}פרטים נוספים (לא חובה)</summary><div class="form-grid">
        <div class="form-2">
          ${field('תקציב משוער (₪)', html`<input class="input num" name="budget_estimate" type="number" min="0" step="100" dir="ltr" value="${c.budget_estimate ?? ''}">`)}
          ${field('התאמה לעסק', html`<select class="input" name="fit">${opt(FIT, c.fit, { empty: 'עוד לא ידוע' })}</select>`)}
        </div>
        ${field('אתר קיים', html`<input class="input" name="website" dir="ltr" value="${c.website ?? ''}" placeholder="example.co.il">`)}
        ${editing ? '' : html`<div class="form-2">
          ${field('תאריך הפנייה', html`<input class="input" name="_created" type="date" value="${toDateInput(new Date())}" max="${toDateInput(new Date())}">`, { help: 'אם מזינים ליד ישן, בחרו מתי פנה.' })}
          ${field('קמפיין (לא חובה)', html`<input class="input" name="_campaign" dir="ltr" placeholder="למשל: google-search-tel-aviv">`)}
        </div>`}
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
        </div></details>
        <button type="submit" hidden></button>
      </form>`);
      const form = $('form', el);
      const dup = $('[data-dup]', el);
      const check = () => {
        const v = readForm(form);
        const d = findDuplicates(v, c.id);
        dup.hidden = !d.length;
        if (d.length) render(dup, html`${icon('alert')}<div><b>ייתכן שזה ליד שכבר קיים</b><p>${d.slice(0, 3).map((x, i) => html`${i ? ', ' : ''}<a href="#/c/${x.id}" data-close>${contactName(x)}</a>`)} עם ${d[0].email && d[0].email === String(v.email || '').toLowerCase() ? 'אותו אימייל' : d[0]._byName ? 'אותו שם' : 'אותו טלפון'}.</p><label class="row small"><input type="checkbox" class="cbx" data-allow-dup ${allowDup ? 'checked' : ''}> זה אדם אחר, ליצור בכל זאת</label></div>`);
      };
      dup.addEventListener('change', (e) => { if (e.target.matches('[data-allow-dup]')) allowDup = e.target.checked; });
      form.addEventListener('focusout', (e) => { if (!e.target.name || ['phone', 'email', 'first_name', 'last_name'].includes(e.target.name)) check(); });
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
          Object.assign(errors, dateErrors(v), moneyErrors(v, ['budget_estimate']));
          if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) errors.email = 'כתובת אימייל לא תקינה';
          if (v.lead_status === 'disqualified' && !v.disqualify_reason) errors.disqualify_reason = 'בחרו סיבה';
          if (showFieldErrors(form, errors)) return false;
          const dups = findDuplicates(v, c.id);
          if (dups.length && !allowDup) {
            form.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
            const box = $('[data-dup]', body);
            box.hidden = false;
            if (!box.textContent.trim()) render(box, html`${icon('alert')}<div><b>ייתכן שזה ליד שכבר קיים</b></div>`);
            box.querySelector('[data-allow-dup]')?.focus();
            return false;
          }
          const taskType = v._task_type, taskDue = v._task_due;
          const created = v._created, campaign = v._campaign;
          delete v._task_type; delete v._task_due; delete v._created; delete v._campaign;
          if (created && created > toDateInput(new Date())) { showFieldErrors(form, { _created: 'תאריך הפנייה לא יכול להיות בעתיד' }); return false; }
          if (v.budget_estimate === null) v.budget_estimate = null;
          return save(async () => {
            let rec;
            if (editing) {
              if (v.lead_status !== 'disqualified') v.disqualify_reason = null;
              const sourceAdded = !c.first_source_id && v.first_source_id;
              rec = await store.update('crm_contacts', c.id, v);
              // a source found out later also applies to this lead's deals that had no source, so revenue follows it
              if (sourceAdded) for (const d of store.filter('crm_deals', (x) => x.contact_id === c.id && !x.source_id)) await store.update('crm_deals', d.id, { source_id: v.first_source_id });
              toast('הפרטים נשמרו', { kind: 'success' });
            } else {
              const today = toDateInput(new Date());
              const at = created && created !== today ? new Date(`${created}T12:00:00`).toISOString() : undefined;
              rec = await store.insert('crm_contacts', {
                ...v, owner_id: store.userId, origin: 'manual',
                ...(at ? { created_at: at, first_touch_at: v.first_source_id ? at : undefined } : {}),
                ...(campaign ? { first_utm: { utm_campaign: campaign.trim().toLowerCase() } } : {}),
              });
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
// Quick due-time shortcuts shared by the activity and task dialogs.
export function quickTimes() {
  const now = new Date();
  const at = (days, h, m = 0) => { const d = addDays(new Date(), days); d.setHours(h, m, 0, 0); return d; };
  const inHrs = (h) => { const d = new Date(Date.now() + h * 36e5); d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0); return d; };
  const list = [['עוד שעתיים', () => inHrs(2)]];
  if (now.getHours() < 17) list.push(['הערב', () => at(0, 18)]);
  list.push(['מחר בבוקר', () => at(1, 9)], ['עוד 3 ימים', () => at(3, 10)], ['שבוע', () => at(7, 10)], ['חודש', () => { const d = new Date(); d.setMonth(d.getMonth() + 1); d.setHours(10, 0, 0, 0); return d; }]);
  return list;
}
const quickChips = (list) => html`<div class="chips-row" data-quick role="group" aria-label="קיצורי זמן">${list.map(([l], i) => html`<button type="button" class="btn btn-sm btn-ghost" data-q="${i}">${l}</button>`)}</div>`;

const NO_REACH = ['לא ענה', 'השארתי הודעה', 'מספר שגוי'];
// default follow-up by outcome: didn't answer -> try again in 2 hours; otherwise in 2 days
const defaultNext = (outcome) => (NO_REACH.includes(outcome) ? (new Date().getHours() < 18 ? inHours(2) : tomorrowAt(9, 1)) : outcome === 'ביקש לחזור אליו' ? tomorrowAt(10, 1) : tomorrowAt(10, 2));
const defaultStatus = (c, outcome, type) => {
  if (!c) return null;
  if (type === 'note') return c.lead_status; // writing a note is not contact with the lead
  if (type === 'call' && NO_REACH.includes(outcome)) return ['new', 'attempting'].includes(c.lead_status) ? 'attempting' : c.lead_status;
  return c.lead_status === 'new' || c.lead_status === 'attempting' ? 'connected' : c.lead_status;
};

export function openActivityForm({ contactId, dealId = null, type = 'call', onSaved } = {}) {
  const c = store.get('crm_contacts', contactId);
  const deal = dealId ? store.get('crm_deals', dealId) : null;
  const quick = quickTimes();
  // the task this activity most likely answers: the earliest open task for this lead/deal that is already due
  const dueTask = store.filter('crm_tasks', (t) => t.status === 'open' && ((dealId && t.deal_id === dealId) || (contactId && t.contact_id === contactId)) && t.due_at && new Date(t.due_at) <= new Date(Date.now() + 2 * 36e5))
    .sort((a, b) => (a.due_at < b.due_at ? -1 : 1))[0] || null;
  let statusTouched = false, dueTouched = false;
  return modal({
    title: `תיעוד${c ? ` – ${contactName(c)}` : ''}`,
    size: 'md',
    body: (el) => {
      render(el, html`<form class="form-grid activity-form" novalidate>
        <div class="seg seg-wrap" role="radiogroup" aria-label="מה קרה">${ACTIVITY_TYPES.map((t) => html`<button type="button" class="${t.value === type ? 'active' : ''}" data-type="${t.value}" role="radio" aria-checked="${String(t.value === type)}">${icon(t.icon)}${t.label}</button>`)}</div>
        <input type="hidden" name="type" value="${type}">
        <div data-outcome ${type === 'call' ? '' : 'hidden'}>${field('תוצאת השיחה', html`<div class="checks" role="radiogroup">${CALL_OUTCOMES.map((o, i) => html`<label class="check-pill"><input type="radio" name="outcome" value="${o}" ${i === 0 ? 'checked' : ''}><span>${o}</span></label>`)}</div>`)}</div>
        ${field('מה עלה?', html`<textarea class="input" name="body" rows="3" placeholder="צרכים, תקציב, לוחות זמנים, התנגדויות..."></textarea>`)}
        ${c && c.lifecycle !== 'customer' ? field('סטטוס הליד', html`<select class="input" name="_status">${opt(LEAD_STATUS.filter((s) => s.value !== 'disqualified'), defaultStatus(c, CALL_OUTCOMES[0], type))}</select>`) : ''}
        ${dueTask ? html`<label class="done-task row"><input type="checkbox" class="cbx" name="_done_task" ${type === 'note' ? '' : 'checked'}> <span>לסמן כבוצעה: <b>${dueTask.title}</b></span></label>` : ''}
        <fieldset class="next-step"><legend>הצעד הבא</legend>
          <label class="row"><input type="checkbox" class="cbx" name="_next" ${type === 'note' ? '' : 'checked'}> <span>לקבוע משימת המשך</span></label>
          <div data-next ${type === 'note' ? 'hidden' : ''}>
            <div class="form-2">
              ${field('מה', html`<input class="input" name="_next_title" value="${deal ? 'פולואפ על ההצעה' : 'שיחת המשך'}">`)}
              ${field('מתי', html`<input class="input" name="_next_due" type="datetime-local" value="${toDateTimeInput(defaultNext(CALL_OUTCOMES[0]))}">`)}
            </div>
            ${quickChips(quick)}
          </div>
        </fieldset>
      </form>`);
      const form = $('form', el);
      const sync = () => {
        const t = form.type.value;
        const out = t === 'call' ? form.querySelector('[name=outcome]:checked')?.value : null;
        if (form._status && !statusTouched) form._status.value = defaultStatus(c, out, t);
        if (form._done_task && !form._done_task.dataset.touched) form._done_task.checked = t !== 'note';
        if (!dueTouched) form._next_due.value = toDateTimeInput(defaultNext(out));
        if (form._next_title && !form._next_title.dataset.touched) form._next_title.value = NO_REACH.includes(out) ? 'לנסות שוב להשיג' : deal ? 'פולואפ על ההצעה' : 'שיחת המשך';
      };
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-type]');
        if (b) {
          form.type.value = b.dataset.type;
          el.querySelectorAll('[data-type]').forEach((x) => { x.classList.toggle('active', x === b); x.setAttribute('aria-checked', String(x === b)); });
          $('[data-outcome]', el).hidden = b.dataset.type !== 'call';
          sync();
        }
        const q = e.target.closest('[data-q]');
        if (q) { form._next_due.value = toDateTimeInput(quick[Number(q.dataset.q)][1]()); dueTouched = true; }
      });
      form.addEventListener('change', (e) => {
        if (e.target.name === 'outcome') sync();
        if (e.target.name === '_status') statusTouched = true;
        if (e.target.name === '_done_task') e.target.dataset.touched = '1';
        if (e.target.name === '_next_due') dueTouched = true;
        if (e.target.name === '_next') $('[data-next]', el).hidden = !form._next.checked;
      });
      form._next_title?.addEventListener('input', () => { form._next_title.dataset.touched = '1'; });
      requestAnimationFrame(() => form.body.focus());
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
          if (showFieldErrors(form, dateErrors(v))) return false;
          return save(async () => {
            await store.insert('crm_activities', {
              type: v.type, body: v.body, outcome: v.outcome, at: new Date().toISOString(), direction: 'out',
              contact_id: contactId || null, deal_id: dealId, owner_id: store.userId,
            });
            if (c && v._status && v._status !== c.lead_status) {
              const patch = { lead_status: v._status };
              if (v._status === 'qualified' && c.lifecycle === 'lead') patch.lifecycle = 'qualified';
              await store.update('crm_contacts', c.id, patch);
            }
            // only the task the user explicitly ticked is completed
            let doneTask = null;
            if (dueTask && v._done_task) {
              doneTask = dueTask;
              await store.update('crm_tasks', dueTask.id, { status: 'done', outcome: v.outcome || v.body?.slice(0, 120) || null });
            }
            if (v._next) {
              await store.insert('crm_tasks', { title: v._next_title || 'פולואפ', type: NO_REACH.includes(v.outcome) ? 'call' : 'followup', due_at: v._next_due, contact_id: contactId || deal?.contact_id || null, deal_id: dealId, owner_id: store.userId });
            }
            toast(doneTask ? `נשמר. "${doneTask.title}" סומנה כבוצעה.` : 'נשמר', { kind: 'success', action: doneTask ? { label: 'ביטול הסימון', onClick: () => store.update('crm_tasks', doneTask.id, { status: 'open', outcome: null }) } : null });
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
  const quick = quickTimes();
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
          ${quickChips(quick)}
        </div>
        ${task || !t.contact_id ? field('קשור לליד', html`<select class="input" name="contact_id">${opt(leads, t.contact_id, { empty: 'בלי ליד' })}</select>`) : ''}
        ${task ? field('סטטוס', html`<select class="input" name="status">${opt([{ value: 'open', label: 'פתוחה' }, { value: 'done', label: 'בוצעה' }, { value: 'canceled', label: 'בוטלה' }], t.status)}</select>`) : ''}
        ${field('הערות', html`<textarea class="input" name="notes" rows="2">${t.notes ?? ''}</textarea>`)}
        ${task ? field('תוצאה (אחרי ביצוע)', html`<input class="input" name="outcome" value="${t.outcome ?? ''}" placeholder="למשל: דיברנו, ביקש הצעה">`) : ''}
      </form>`);
      el.addEventListener('click', (e) => {
        const q = e.target.closest('[data-q]');
        if (q) $('[name=due_at]', el).value = toDateTimeInput(quick[Number(q.dataset.q)][1]());
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
          if (showFieldErrors(form, dateErrors(v))) return false;
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
      ${!deal || deal.outcome === 'open' ? field('שלב', html`<select class="input" name="stage_id">${opt(stages().filter((s) => s.kind === 'open').map((s) => ({ value: s.id, label: s.name })), d.stage_id)}</select>`) : html`<p class="field-help">העסקה ${deal.outcome === 'won' ? 'נסגרה בהצלחה' : 'נסגרה בהפסד'}. כדי לפתוח אותה מחדש, בחרו שלב בפס השלבים בדף העסקה.</p>`}
      ${!d.contact_id ? field('ליד', html`<select class="input" name="contact_id">${opt(store.all('crm_contacts').map((x) => ({ value: x.id, label: contactName(x) })).sort((a, b) => a.label.localeCompare(b.label, 'he')), null, { empty: 'בחירה...' })}</select>`, { req: true }) : ''}
      ${field('הצעד הבא', html`<input class="input" name="next_step" value="${d.next_step ?? ''}" placeholder="למשל: לשלוח הצעת מחיר">`)}
      ${deal ? field('מקור (לדוחות)', html`<select class="input" name="source_id">${opt(sources().map((x) => ({ value: x.id, label: x.name })), d.source_id, { empty: 'לא ידוע' })}</select>`, { help: 'המקור שאליו נספרת ההכנסה מהעסקה. נקבע אוטומטית לפי מקור הליד.' }) : ''}
    </form>`,
    actions: [
      { label: 'ביטול' },
      {
        label: deal ? 'שמירה' : 'יצירת עסקה', kind: 'primary',
        onClick: async ({ body }) => {
          const form = $('form', body);
          const v = readForm(form);
          const cid = v.contact_id ?? d.contact_id;
          if (showFieldErrors(form, { ...dateErrors(v), ...moneyErrors(v, ['amount_expected']) })) return false;
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
  const prev = deal.stage_id;
  return save(async () => {
    await store.update('crm_deals', deal.id, { stage_id: stageId });
    toast(`הועבר ל"${st.name}"`, { kind: 'success', action: { label: 'ביטול', onClick: () => store.update('crm_deals', deal.id, { stage_id: prev }) } });
    return true;
  });
}

export function openWonDialog(deal, stageId) {
  return new Promise((res) => {
    let ok = false;
    modal({
      title: `סגירה בהצלחה: ${deal.name}`, size: 'sm',
      body: html`<form class="form-grid" novalidate>
        ${field('סכום סופי (₪, לפני מע"מ)', html`<input class="input num" name="amount_final" type="number" min="0" step="1" dir="ltr" value="${deal.amount_final ?? deal.amount_expected ?? ''}" autofocus required>`, { req: true })}
        ${field('תאריך הסגירה', html`<input class="input" name="_closed" type="date" value="${toDateInput(new Date())}" max="${toDateInput(new Date())}">`)}
        ${paidTotal(deal) ? html`<p class="field-help">כבר נרשמו תשלומים בסך ${fmt.money(paidTotal(deal))}.</p>` : html`<div class="form-2">
          ${field('כבר נגבה (₪)', html`<input class="input num" name="_paid" type="number" min="0" max="100000000" step="1" dir="ltr">`, { help: 'רק כסף שהתקבל בפועל' })}
          ${field('תאריך התשלום', html`<input class="input" name="_paid_on" type="date" value="${toDateInput(new Date())}">`)}
        </div>
        <label class="row small"><input type="checkbox" class="cbx" name="_paid_vat" checked> הסכום שנגבה כולל מע"מ (${VAT * 100}%)</label>`}
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
            const errs = { ...dateErrors(v), ...moneyErrors(v, ['amount_final', '_paid', 'direct_cost_estimate']) };
            const net = v._paid ? (v._paid_vat ? v._paid / (1 + VAT) : v._paid) : 0;
            if (!errs._paid && net > (v.amount_final || 0) * 1.05) errs._paid = `הגבייה (${fmt.money(net)} לפני מע"מ) גבוהה מסכום העסקה`;
            if (v._paid && !v._paid_on) errs._paid_on = 'בחרו את תאריך התשלום';
            if (showFieldErrors(form, errs)) return false;
            const patch = { amount_final: v.amount_final, direct_cost_estimate: v.direct_cost_estimate, won_reason: v.won_reason, stage_id: stageId };
            if (v._closed) patch.closed_at = new Date(`${v._closed}T12:00:00`).toISOString();
            if (v._paid) Object.assign(patch, withPayments(deal, [...paymentsOf(deal).filter((p) => p.id !== 'legacy'), payment(v._paid, v._paid_vat, v._paid_on, '')]));
            ok = await save(async () => { await store.update('crm_deals', deal.id, patch); toast('מזל טוב! העסקה נסגרה.', { kind: 'success' }); return true; }, form);
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

export const VAT = 0.18;
// A payment is stored before VAT (like every amount in the reports); the amount actually received is kept as `gross`.
export function payment(amount, includesVat, date, note) {
  const gross = Number(amount);
  const net = includesVat ? Math.round((gross / (1 + VAT)) * 100) / 100 : gross;
  return { id: crypto.randomUUID(), amount: net, gross, vat: !!includesVat, date, note };
}
// Keep the summary columns (used by the server and older exports) in step with the payment list.
export function withPayments(deal, list) {
  const clean = list.filter((p) => p.date && Number(p.amount));
  const total = clean.reduce((a, p) => a + Number(p.amount), 0);
  const last = clean.map((p) => p.date).sort().pop() || null;
  return { props: { ...(deal.props || {}), payments: clean }, amount_paid: Math.max(0, Math.round(total * 100) / 100), paid_at: last };
}

export function openMoneyDialog(deal) {
  let list = paymentsOf(deal).map((p) => ({ ...p, id: p.id === 'legacy' ? crypto.randomUUID() : p.id }));
  const total = () => list.reduce((a, p) => a + Number(p.amount), 0);
  const dealTotal = () => Number(deal.outcome === 'won' ? deal.amount_final : deal.amount_expected) || 0;
  return modal({
    title: 'תשלומים ועלויות', size: 'md',
    body: (el) => {
      const draw = () => render(el, html`<form class="form-grid money-form" novalidate>
        <div class="form-2">
          ${deal.outcome === 'won' ? field('סכום סופי (₪, לפני מע"מ)', html`<input class="input num" name="amount_final" type="number" min="0" dir="ltr" value="${deal.amount_final ?? ''}">`) : field('סכום צפוי (₪, לפני מע"מ)', html`<input class="input num" name="amount_expected" type="number" min="0" dir="ltr" value="${deal.amount_expected ?? ''}">`)}
          ${field('עלות ישירה (₪)', html`<input class="input num" name="direct_cost_estimate" type="number" min="0" dir="ltr" value="${deal.direct_cost_estimate ?? ''}">`, { help: 'פרילנסרים, תוספים, אחסון' })}
        </div>
        <fieldset><legend>תשלומים שהתקבלו</legend>
          ${list.length ? html`<table class="table compact"><thead><tr><th>תאריך</th><th>סכום לפני מע"מ</th><th>הערה</th><th><span class="sr">מחיקה</span></th></tr></thead><tbody>
            ${list.sort((a, b) => (a.date < b.date ? -1 : 1)).map((p) => html`<tr><td>${fmt.date(p.date)}</td><td class="num ${p.amount < 0 ? 'danger-text' : ''}">${fmt.money(p.amount)}${p.vat ? html`<small class="muted"> (התקבלו ${fmt.money(p.gross)} כולל מע"מ)</small>` : ''}</td><td>${p.note || ''}</td><td><button type="button" class="btn-icon sm" data-del="${p.id}" aria-label="מחיקת התשלום של ${fmt.money(p.amount)} מ-${fmt.date(p.date)}">${icon('trash')}</button></td></tr>`)}
          </tbody></table>
          <p class="small">סה"כ נגבה: <b>${fmt.money(total())}</b>${dealTotal() ? html` | יתרה: <b class="${dealTotal() - total() > 0 ? 'warn-text' : ''}">${fmt.money(Math.max(0, dealTotal() - total()))}</b>` : ''}</p>` : html`<p class="muted small">עוד לא נרשמו תשלומים.</p>`}
          <div class="pay-add">
            ${field('סכום (₪)', html`<input class="input num" name="_amt" type="number" step="1" dir="ltr" placeholder="${Math.max(0, dealTotal() - total()) || ''}">`)}
            ${field('תאריך', html`<input class="input" name="_date" type="date" value="${toDateInput(new Date())}">`)}
            ${field('הערה', html`<input class="input" name="_note" placeholder="למשל: מקדמה, העברה בנקאית">`)}
            <label class="row small pay-vat"><input type="checkbox" class="cbx" name="_vat" checked> הסכום כולל מע"מ (${VAT * 100}%)</label>
            <div class="row-wrap pay-btns"><button type="button" class="btn" data-add="pay">${icon('plus')}הוספת תשלום</button><button type="button" class="btn btn-ghost" data-add="refund">החזר כספי</button></div>
          </div>
        </fieldset>
        <p class="field-help">התשלומים מוזנים ידנית ואינם מאומתים מול מערכת סליקה או הנהלת חשבונות.</p>
      </form>`);
      draw();
      el.addEventListener('click', (e) => {
        const del = e.target.closest('[data-del]');
        if (del) { list = list.filter((p) => p.id !== del.dataset.del); draw(); return; }
        const add = e.target.closest('[data-add]');
        if (!add) return;
        const form = $('form', el);
        const amt = Number(form._amt.value);
        if (!amt || amt <= 0 || amt > 1e8) { showFieldErrors(form, { _amt: 'הזינו סכום חיובי' }); return; }
        const d = new Date(`${form._date.value}T12:00:00`);
        if (!form._date.value || isNaN(d) || d.getFullYear() < 2000 || d > new Date(Date.now() + 864e5)) { showFieldErrors(form, { _date: 'בחרו תאריך תקין (לא בעתיד)' }); return; }
        const p = payment(add.dataset.add === 'refund' ? -amt : amt, form._vat.checked, form._date.value, form._note.value.trim() || (add.dataset.add === 'refund' ? 'החזר' : ''));
        if (total() + p.amount < -0.01) { showFieldErrors(form, { _amt: 'ההחזר גדול מסך מה שנגבה' }); return; }
        if (p.amount > 0 && dealTotal() && total() + p.amount > dealTotal() * 1.05) { showFieldErrors(form, { _amt: `סך הגבייה (${fmt.money(total() + p.amount)} לפני מע"מ) יעלה על סכום העסקה (${fmt.money(dealTotal())}). אם הסכום כולל מע"מ, סמנו זאת.` }); return; }
        list.push(p);
        draw();
      });
    },
    actions: [
      { label: 'ביטול' },
      {
        label: 'שמירה', kind: 'primary',
        onClick: async ({ body }) => {
          const form = $('form', body);
          const v = readForm(form);
          delete v._amt; delete v._date; delete v._note;
          if (showFieldErrors(form, moneyErrors(v, ['amount_final', 'amount_expected', 'direct_cost_estimate']))) return false;
          delete v._vat;
          if (form._amt.value) { showFieldErrors(form, { _amt: 'לחצו "הוספת תשלום" כדי לרשום את הסכום, או מחקו אותו' }); return false; }
          return save(async () => { await store.update('crm_deals', deal.id, { ...v, ...withPayments(deal, list) }); toast('נשמר', { kind: 'success' }); return true; }, form);
        },
      },
    ],
  });
}
