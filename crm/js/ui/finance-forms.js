// Finance dialogs: payment requests, recording tax invoices issued elsewhere, payments against documents, expenses.

import { html, render, $, $$, fmt, toDateInput, addDays } from '../core/util.js';
import { store } from '../core/store.js';
import { contactName } from '../core/model.js';
import { paymentsOf } from '../core/metrics.js';
import { DOC_KINDS, EXPENSE_CATEGORIES, docTotals, nextDocNumber, r2 } from '../core/finance.js';
import { modal, toast, icon, readForm, showFieldErrors, opt, dateErrors, moneyErrors, confirmDialog } from './components.js';
import { withPayments, vatRate } from './forms.js';

const field = (label, control, help = '') => html`<label class="field"><span class="field-label">${label}</span>${control}${help ? html`<span class="field-help">${help}</span>` : ''}</label>`;
export const vatRateOf = vatRate;
const leads = () => store.all('crm_contacts').map((x) => ({ value: x.id, label: contactName(x) })).sort((a, b) => a.label.localeCompare(b.label, 'he'));
const dealsOf = (cid) => store.filter('crm_deals', (d) => !cid || d.contact_id === cid).map((d) => ({ value: d.id, label: d.name }));

async function save(fn, form) {
  try { return await fn(); } catch (e) {
    if (form && e.field) showFieldErrors(form, { [e.field]: e.message });
    else toast(e.message || 'השמירה נכשלה', { kind: 'error', timeout: 8000 });
    return false;
  }
}

// ---------------------------------------------------------------- payment request / recorded invoice
// kind 'payment_request' is produced and printed here; any other kind records a document issued in the invoicing software.
export function openDocForm({ doc = null, kind = 'payment_request', dealId = null, contactId = null, onSaved } = {}) {
  const editing = !!doc;
  const k = doc?.kind || kind;
  const own = k === 'payment_request';
  const deal = store.get('crm_deals', doc?.deal_id || dealId);
  const cid = doc?.contact_id || contactId || deal?.contact_id || null;
  const already = deal ? store.filter('crm_documents', (x) => x.deal_id === deal.id && x.status !== 'canceled' && x.id !== doc?.id && x.kind !== 'credit_note').reduce((a, x) => a + Number(x.subtotal || 0), 0) : 0;
  const dealAmount = deal ? Number(deal.outcome === 'won' ? deal.amount_final : deal.amount_expected) || 0 : 0;
  let items = doc?.items?.length ? structuredClone(doc.items) : [{ description: deal ? deal.name : '', qty: 1, price: deal ? Math.max(0, r2(dealAmount - already)) || '' : '' }];
  const rate = doc ? Number(doc.vat_rate) : vatRateOf();
  const title = editing ? `עריכת ${DOC_KINDS.find((x) => x.value === k)?.label}` : own ? 'דרישת תשלום חדשה' : 'רישום חשבונית שהופקה בתוכנת החשבוניות';
  return modal({
    title, size: 'lg',
    body: (el) => {
      let contactChanged = false;
      const draw = () => {
        const t = docTotals(items, rate);
        const keep = el.querySelector('form') ? readForm(el.querySelector('form')) : null;
        // a customer with a single deal: link the document to it, so the same debt isn't counted twice
        if (keep && contactChanged) {
          const ds = store.filter('crm_deals', (d) => d.contact_id === keep.contact_id && d.outcome !== 'lost');
          keep.deal_id = ds.length === 1 ? ds[0].id : null;
          contactChanged = false;
        }
        const v = (name, dflt) => (keep && keep[name] !== undefined ? keep[name] ?? '' : dflt ?? '');
        render(el, html`<form class="form-grid doc-form" novalidate>
          ${own ? html`<p class="notice">${icon('info')}<span>דרישת תשלום היא בקשה לתשלום ו<b>אינה חשבונית מס</b>. את חשבונית המס מפיקים בתוכנת חשבוניות מוכרת ע"י רשות המסים, ואחר כך רושמים אותה כאן.</span></p>`
            : html`<div class="form-3">
              ${field('סוג המסמך', html`<select class="input" name="kind">${opt(DOC_KINDS.filter((x) => !x.own), v('kind', k))}</select>`)}
              ${field('מספר המסמך', html`<input class="input" name="number" dir="ltr" value="${v('number', doc?.number)}" required>`)}
              ${field('הופק בתוכנה', html`<input class="input" name="external_system" value="${v('external_system', doc?.external_system ?? store.settings.invoiceSoftware ?? '')}" placeholder="למשל: חשבונית ירוקה, iCount">`)}
            </div>`}
          <div class="form-3">
            ${field('לקוח', html`<select class="input" name="contact_id">${opt(leads(), v('contact_id', cid), { empty: 'בחירה...' })}</select>`)}
            ${field('עסקה (לא חובה)', html`<select class="input" name="deal_id">${opt(dealsOf(v('contact_id', cid)), v('deal_id', deal?.id), { empty: 'בלי עסקה' })}</select>`)}
            ${field('תאריך', html`<input class="input" name="issue_date" type="date" value="${v('issue_date', doc?.issue_date ?? toDateInput(new Date()))}">`)}
          </div>
          <fieldset><legend>${own ? 'פירוט' : 'סכומים'} (מחירים לפני מע"מ)</legend>
            <div class="doc-lines">
              <div class="doc-line doc-line-head" aria-hidden="true"><span>תיאור</span><span>כמות</span><span>מחיר ליחידה</span><span>סה"כ</span><span></span></div>
              ${items.map((it, i) => html`<div class="doc-line">
                <input class="input" data-line="${i}" data-k="description" value="${it.description ?? ''}" aria-label="תיאור שורה ${i + 1}" placeholder="תיאור השירות">
                <input class="input num" data-line="${i}" data-k="qty" type="number" min="0" step="any" dir="ltr" value="${it.qty ?? 1}" aria-label="כמות שורה ${i + 1}">
                <input class="input num" data-line="${i}" data-k="price" type="number" min="0" step="any" dir="ltr" value="${it.price ?? ''}" aria-label="מחיר שורה ${i + 1}">
                <span class="num doc-line-sum">${fmt.money(r2((Number(it.qty) || 0) * (Number(it.price) || 0)))}</span>
                <button type="button" class="btn-icon sm" data-del-line="${i}" aria-label="מחיקת שורה ${i + 1}" ${items.length === 1 ? 'disabled' : ''}>${icon('trash')}</button>
              </div>`)}
            </div>
            <button type="button" class="btn btn-sm btn-ghost" data-add-line>${icon('plus')}שורה</button>
            <dl class="doc-totals">
              <dt>לפני מע"מ</dt><dd class="num">${fmt.money(t.subtotal)}</dd>
              <dt>מע"מ ${rate}%</dt><dd class="num">${fmt.money(t.vat)}</dd>
              <dt><b>סה"כ לתשלום</b></dt><dd class="num"><b>${fmt.money(t.total)}</b></dd>
            </dl>
            ${deal && dealAmount ? html`<p class="field-help">סכום העסקה: ${fmt.money(dealAmount)} לפני מע"מ${already ? `, כבר הופקו מסמכים על ${fmt.money(already)}` : ''}.</p>` : ''}
            ${!own && t.subtotal >= 5000 ? html`<p class="notice notice-warn">${icon('alert')}<span>חשבונית מס מעל הסף שבתוקף (5,000–10,000 ₪ לפני מע"מ, לפי המועד) צריכה מספר הקצאה מרשות המסים. בלי מספר הקצאה הלקוח לא יוכל לקזז את המע"מ.</span></p>` : ''}
          </fieldset>
          <div class="form-3">
            ${own ? field('לתשלום עד', html`<input class="input" name="due_date" type="date" value="${v('due_date', doc?.due_date ?? toDateInput(addDays(new Date(), 14)))}">`) : field('מספר הקצאה (אם יש)', html`<input class="input" name="allocation_number" dir="ltr" value="${v('allocation_number', doc?.allocation_number)}">`)}
            ${!own ? field('לתשלום עד', html`<input class="input" name="due_date" type="date" value="${v('due_date', doc?.due_date)}">`) : ''}
            ${field('הערות', html`<input class="input" name="notes" value="${v('notes', doc?.notes)}" placeholder="${own ? 'למשל: מקדמה 50% לפני תחילת העבודה' : ''}">`)}
          </div>
        </form>`);
      };
      draw();
      el.addEventListener('input', (e) => {
        const i = e.target.dataset.line;
        if (i == null) return;
        items[Number(i)][e.target.dataset.k] = e.target.dataset.k === 'description' ? e.target.value : e.target.value === '' ? '' : Number(e.target.value);
        const t = docTotals(items, rate);
        const sums = $$('.doc-line-sum', el);
        items.forEach((it, j) => { if (sums[j]) sums[j].textContent = fmt.money(r2((Number(it.qty) || 0) * (Number(it.price) || 0))); });
        const dd = $$('.doc-totals dd', el);
        dd[0].textContent = fmt.money(t.subtotal); dd[1].textContent = fmt.money(t.vat); dd[2].innerHTML = `<b>${fmt.money(t.total)}</b>`;
      });
      el.addEventListener('change', (e) => { if (e.target.name === 'contact_id') { contactChanged = true; draw(); } });
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-add-line]')) { items.push({ description: '', qty: 1, price: '' }); draw(); $$('[data-k=description]', el).pop()?.focus(); }
        const d = e.target.closest('[data-del-line]');
        if (d && items.length > 1) { items.splice(Number(d.dataset.delLine), 1); draw(); }
      });
    },
    actions: [
      { label: 'ביטול' },
      ...(own ? [{ label: 'שמירה כטיוטה', onClick: (ctx) => submit(ctx, 'draft') }] : []),
      { label: own ? 'שמירה והדפסה' : 'שמירה', kind: 'primary', onClick: (ctx) => submit(ctx, own ? 'sent' : 'sent', own) },
    ],
  });

  async function submit({ body }, status, print = false) {
    const form = $('form', body);
    const v = readForm(form);
    const errs = { ...dateErrors(v) };
    if (!v.contact_id) errs.contact_id = 'בחרו לקוח';
    if (!own && !v.number) errs.number = 'הזינו את מספר המסמך מתוכנת החשבוניות';
    const clean = items.map((it) => ({ description: String(it.description || '').trim(), qty: Number(it.qty) || 0, price: Number(it.price) || 0 })).filter((it) => it.description || it.price);
    if (!clean.length || clean.every((it) => !it.price)) errs[`_lines`] = 'הוסיפו לפחות שורה אחת עם מחיר';
    if (clean.some((it) => it.qty < 0 || it.price < 0 || it.price > 1e8)) errs._lines = 'כמות ומחיר לא יכולים להיות שליליים';
    if (v.due_date && v.issue_date && v.due_date < v.issue_date) errs.due_date = 'תאריך התשלום לפני תאריך המסמך';
    if (errs._lines) { toast(errs._lines, { kind: 'error' }); delete errs._lines; if (!Object.keys(errs).length) return false; }
    if (showFieldErrors(form, errs)) return false;
    const number = own ? (doc?.number || nextDocNumber(store.all('crm_documents'), 'payment_request', new Date(v.issue_date || Date.now()).getFullYear())) : v.number;
    const dup = store.find('crm_documents', (x) => x.id !== doc?.id && x.kind === (v.kind || k) && x.number === number);
    if (dup) { showFieldErrors(form, { number: `כבר נרשם מסמך עם המספר ${number}${dup.status === 'canceled' ? ' (מבוטל)' : ''}` }); return false; }
    const row = {
      kind: own ? 'payment_request' : v.kind, number, external_system: own ? null : v.external_system, allocation_number: own ? null : v.allocation_number,
      issue_date: v.issue_date || toDateInput(new Date()), due_date: v.due_date || null, contact_id: v.contact_id, deal_id: v.deal_id || null,
      items: clean, vat_rate: rate, notes: v.notes, status: doc ? (doc.status === 'draft' && status === 'sent' ? 'sent' : doc.status) : status,
    };
    return save(async () => {
      // payments already recorded on the document move with it to its new deal (or out of the old one)
      if (doc?.payments?.length && (doc.deal_id || null) !== row.deal_id) await movePayments(doc, doc.deal_id, row.deal_id);
      const rec = doc ? await store.update('crm_documents', doc.id, row) : await store.insert('crm_documents', { ...row, payments: [], paid: 0 });
      toast(doc ? 'המסמך עודכן' : own ? `דרישת תשלום ${number} נשמרה` : `${DOC_KINDS.find((x) => x.value === row.kind)?.label} ${number} נרשמה`, { kind: 'success' });
      onSaved?.(rec);
      if (print) setTimeout(() => { location.hash = `#/doc/${rec.id}/print`; }, 50);
      return true;
    }, form);
  }
}

// The deal keeps a copy of every payment on its documents (same id), so its balance is right.
const mirror = (doc, p) => {
  const rate = Number(doc.vat_rate) || 0;
  return { id: p.id, amount: r2(Number(p.amount) / (1 + rate / 100)), gross: Number(p.amount), vat: rate > 0, date: p.date, note: `${doc.number || ''} ${p.note || ''}`.trim(), docId: doc.id };
};
async function movePayments(doc, fromId, toId) {
  const ids = new Set(doc.payments.map((p) => p.id));
  const from = store.get('crm_deals', fromId);
  if (from) await store.update('crm_deals', from.id, withPayments(from, paymentsOf(from).filter((p) => p.id !== 'legacy' && !ids.has(p.id))));
  const to = store.get('crm_deals', toId);
  if (to) {
    const have = new Set(paymentsOf(to).map((p) => p.id));
    await store.update('crm_deals', to.id, withPayments(to, [...paymentsOf(to).filter((p) => p.id !== 'legacy'), ...doc.payments.filter((p) => !have.has(p.id)).map((p) => mirror(doc, p))]));
  }
}

// ---------------------------------------------------------------- payment against a document
// The payment is also recorded on the deal (if there is one), so reports count it exactly once.
export function openDocPayment(doc, { onSaved } = {}) {
  const remaining = r2(Number(doc.total) - Number(doc.paid || 0));
  return modal({
    title: `רישום תשלום: ${doc.number || ''}`, size: 'sm',
    body: html`<form class="form-grid" novalidate>
      <p class="small">סה"כ במסמך: <b>${fmt.money(doc.total)}</b> כולל מע"מ. שולם עד עכשיו: ${fmt.money(doc.paid || 0)}.</p>
      ${field('סכום שהתקבל (כולל מע"מ)', html`<input class="input num" name="amount" type="number" min="0" step="any" dir="ltr" value="${remaining > 0 ? remaining : ''}" autofocus>`)}
      ${field('תאריך', html`<input class="input" name="date" type="date" value="${toDateInput(new Date())}" max="${toDateInput(new Date())}">`)}
      ${field('אמצעי תשלום', html`<select class="input" name="method">${opt([{ value: 'transfer', label: 'העברה בנקאית' }, { value: 'bit', label: 'ביט / פייבוקס' }, { value: 'credit', label: 'אשראי' }, { value: 'cash', label: 'מזומן' }, { value: 'check', label: 'צ׳ק' }, { value: 'other', label: 'אחר' }], 'transfer')}</select>`)}
      ${doc.kind === 'payment_request' ? html`<p class="field-help">על תשלום שהתקבל צריך להפיק קבלה או חשבונית מס/קבלה בתוכנת החשבוניות.</p>` : ''}
    </form>`,
    actions: [
      { label: 'ביטול' },
      {
        label: 'רישום התשלום', kind: 'primary',
        onClick: async ({ body }) => {
          const form = $('form', body);
          const v = readForm(form);
          const errs = { ...dateErrors(v), ...moneyErrors(v, ['amount']) };
          if (!v.amount) errs.amount = 'הזינו סכום';
          else if (v.amount > remaining + 0.01) errs.amount = `הסכום גבוה מהיתרה (${fmt.money(remaining)})`;
          if (!v.date) errs.date = 'בחרו תאריך';
          if (showFieldErrors(form, errs)) return false;
          const payId = crypto.randomUUID();
          const methodLabel = form.method.selectedOptions[0]?.textContent;
          return save(async () => {
            const pay = { id: payId, amount: v.amount, date: v.date, method: v.method, note: methodLabel || '' };
            // deal first: if the document update then fails, the deal is put back, so nothing is half-saved
            const deal = store.get('crm_deals', doc.deal_id);
            const before = deal ? paymentsOf(deal).filter((p) => p.id !== 'legacy') : null;
            if (deal) await store.update('crm_deals', deal.id, withPayments(deal, [...before, mirror(doc, pay)]));
            try {
              await store.update('crm_documents', doc.id, { payments: [...(doc.payments || []), pay] });
            } catch (e) {
              if (deal) await store.update('crm_deals', deal.id, withPayments(deal, before)).catch(() => {});
              throw e;
            }
            toast('התשלום נרשם', { kind: 'success' });
            onSaved?.();
            return true;
          }, form);
        },
      },
    ],
  });
}

export async function cancelDoc(doc) {
  const paid = Number(doc.paid) > 0 ? ` התשלומים שנרשמו עליו (${fmt.money(doc.paid)}) נשארים בהכנסות. אם הכסף הוחזר, רשמו החזר כספי בעסקה.` : '';
  if (!(await confirmDialog(`לבטל את ${DOC_KINDS.find((x) => x.value === doc.kind)?.label} ${doc.number || ''}?`, { danger: true, okLabel: 'ביטול המסמך', detail: (doc.kind === 'payment_request' ? 'המסמך יישאר ברשימה כמבוטל.' : 'ביטול כאן לא מבטל את החשבונית בתוכנת החשבוניות. שם מפיקים חשבונית זיכוי.') + paid }))) return;
  try { await store.update('crm_documents', doc.id, { status: 'canceled' }); toast('המסמך בוטל'); } catch (e) { toast(e.message, { kind: 'error' }); }
}

// ---------------------------------------------------------------- expense
export function openExpenseForm({ expense = null, dealId = null, onSaved } = {}) {
  const e = expense || { day: toDateInput(new Date()), category: 'software', deal_id: dealId };
  const licensed = store.settings.vatStatus !== 'exempt';
  return modal({
    title: expense ? 'עריכת הוצאה' : 'הוצאה חדשה', size: 'md',
    body: html`<form class="form-grid" novalidate>
      <div class="form-2">
        ${field('תאריך', html`<input class="input" name="day" type="date" value="${e.day}" max="${toDateInput(addDays(new Date(), 1))}" autofocus>`)}
        ${field('ספק', html`<input class="input" name="vendor" value="${e.vendor ?? ''}" placeholder="למשל: Google Workspace, מעצב פרילנסר">`)}
      </div>
      <div class="form-2">
        ${field('קטגוריה', html`<select class="input" name="category">${opt(EXPENSE_CATEGORIES, e.category)}</select>`, 'הוצאות פרסום (Google, Meta) מזינים במסך "מקורות ופרסום", כדי שלא ייספרו פעמיים.')}
        ${field('סכום (₪)', html`<input class="input num" name="_amount" type="number" min="0" step="any" dir="ltr" value="${expense ? (licensed && Number(e.vat) ? r2(Number(e.amount) + Number(e.vat)) : e.amount) : ''}">`)}
      </div>
      ${licensed ? html`<label class="row small"><input type="checkbox" class="cbx" name="_incl_vat" ${!expense || Number(e.vat) ? 'checked' : ''}> הסכום כולל מע"מ שאפשר לקזז (יש חשבונית מס מהספק)</label>` : ''}
      ${field('תיאור', html`<input class="input" name="description" value="${e.description ?? ''}">`)}
      ${field('עלות ישירה של עסקה (לא חובה)', html`<select class="input" name="deal_id">${opt(store.all('crm_deals').map((d) => ({ value: d.id, label: d.name })), e.deal_id, { empty: 'לא קשור לעסקה מסוימת' })}</select>`)}
      <div class="form-2">
        ${field('אמצעי תשלום', html`<select class="input" name="method">${opt([{ value: 'credit', label: 'אשראי' }, { value: 'transfer', label: 'העברה' }, { value: 'standing_order', label: 'הוראת קבע' }, { value: 'bit', label: 'ביט' }, { value: 'cash', label: 'מזומן' }, { value: 'check', label: 'צ׳ק' }, { value: 'other', label: 'אחר' }], e.method, { empty: '—' })}</select>`)}
        ${field('מספר חשבונית / קבלה של הספק', html`<input class="input" name="reference" dir="ltr" value="${e.reference ?? ''}">`)}
      </div>
    </form>`,
    actions: [
      ...(expense ? [{ label: 'מחיקה', kind: 'ghost', icon: 'trash', onClick: async () => { const copy = structuredClone(expense); return save(async () => { await store.remove('crm_expenses', expense.id); toast('ההוצאה נמחקה', { action: { label: 'ביטול', onClick: () => store.restore('crm_expenses', copy) } }); onSaved?.(); return true; }); } }] : []),
      { label: 'ביטול' },
      {
        label: 'שמירה', kind: 'primary',
        onClick: async ({ body }) => {
          const form = $('form', body);
          const v = readForm(form);
          const errs = { ...dateErrors(v), ...moneyErrors(v, ['_amount']) };
          if (v._amount == null) errs._amount = 'הזינו סכום';
          if (!v.day) errs.day = 'בחרו תאריך';
          if (showFieldErrors(form, errs)) return false;
          const incl = licensed && v._incl_vat;
          const rate = vatRate() / 100;
          let amount = incl ? r2(v._amount / (1 + rate)) : v._amount;
          let vat = incl ? r2(v._amount - amount) : 0;
          // editing other fields keeps the stored split (an old expense may have been at a different VAT rate)
          if (expense && incl === !!Number(expense.vat) && Math.abs(v._amount - (incl ? r2(Number(expense.amount) + Number(expense.vat)) : Number(expense.amount))) < 0.005) { amount = Number(expense.amount); vat = Number(expense.vat); }
          const row = { day: v.day, vendor: v.vendor, category: v.category, description: v.description, deal_id: v.deal_id || null, method: v.method, reference: v.reference, amount, vat };
          return save(async () => {
            if (expense) await store.update('crm_expenses', expense.id, row); else await store.insert('crm_expenses', row);
            toast(expense ? 'ההוצאה עודכנה' : 'ההוצאה נרשמה', { kind: 'success' });
            onSaved?.();
            return true;
          }, form);
        },
      },
    ],
  });
}
