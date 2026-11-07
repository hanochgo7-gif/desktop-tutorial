// Printable payment request (A4). Clearly not a tax invoice.

import { html, render, on, fmt } from '../core/util.js';
import { store } from '../core/store.js';
import { contactName, label } from '../core/model.js';
import { DOC_KINDS } from '../core/finance.js';
import { icon, setTitle } from '../ui/components.js';

export default async function view(el, ctx) {
  const doc = store.get('crm_documents', ctx.params.id);
  if (!doc) { render(el, html`<div class="empty"><h3>המסמך לא נמצא</h3><a class="btn" href="#/finance?tab=docs">לרשימת המסמכים</a></div>`); return; }
  const s = store.settings;
  const c = store.get('crm_contacts', doc.contact_id);
  const own = doc.kind === 'payment_request';
  setTitle(`${label(DOC_KINDS, doc.kind)} ${doc.number || ''}`);
  const missing = !s.businessName || !s.taxId;
  render(el, html`
    <div class="print-bar no-print">
      <a class="btn btn-ghost" href="${doc.deal_id ? `#/d/${doc.deal_id}` : '#/finance?tab=docs'}">${icon('arrowRight')}${doc.deal_id ? 'חזרה לעסקה' : 'חזרה למסמכים'}</a>
      ${missing ? html`<span class="warn-text small">חסרים פרטי העסק במסמך. <a href="#/settings">השלמה בהגדרות</a></span>` : ''}
      <button class="btn btn-primary" data-print>${icon('printer')}הדפסה / שמירה כ-PDF</button>
    </div>
    <article class="paper" aria-label="${label(DOC_KINDS, doc.kind)}">
      <header class="paper-head">
        <div>
          <h1>${s.businessName || 'שם העסק'}</h1>
          <p>${[s.vatStatus === 'exempt' ? 'עוסק פטור' : s.vatStatus === 'company' ? 'ח.פ.' : 'עוסק מורשה', s.taxId].filter(Boolean).join(' ')}</p>
          ${s.address ? html`<p>${s.address}</p>` : ''}
          <p dir="ltr" class="paper-contact">${[s.phone, s.email].filter(Boolean).join('  |  ')}</p>
        </div>
        <div class="paper-doc">
          <h2>${label(DOC_KINDS, doc.kind)}</h2>
          <p class="num" dir="ltr">${doc.number || ''}</p>
          <p>תאריך: ${fmt.date(doc.issue_date)}</p>
          ${doc.due_date ? html`<p>לתשלום עד: <b>${fmt.date(doc.due_date)}</b></p>` : ''}
        </div>
      </header>
      ${own ? html`<p class="paper-note">${s.vatStatus === 'exempt' ? 'מסמך זה הוא דרישת תשלום. קבלה תופק עם קבלת התשלום.' : 'מסמך זה הוא דרישת תשלום ואינו חשבונית מס. חשבונית מס / קבלה תופק עם קבלת התשלום.'}</p>` : ''}
      <section class="paper-to"><span class="muted">לכבוד</span><b>${contactName(c) || '—'}</b>${c?.company_name ? html`<span>${c.company_name}</span>` : ''}${c?.email ? html`<span dir="ltr">${c.email}</span>` : ''}</section>
      <table class="paper-lines">
        <thead><tr><th>תיאור</th><th>כמות</th><th>מחיר ליחידה</th><th>סה"כ</th></tr></thead>
        <tbody>${(doc.items || []).map((it) => html`<tr><td>${it.description}</td><td class="num">${fmt.number(it.qty)}</td><td class="num">${fmt.exact(it.price)}</td><td class="num">${fmt.exact(Math.round(Number(it.qty) * Number(it.price) * 100) / 100)}</td></tr>`)}</tbody>
      </table>
      <dl class="paper-totals">
        <dt>סה"כ לפני מע"מ</dt><dd class="num">${fmt.exact(doc.subtotal)}</dd>
        ${Number(doc.vat_rate) ? html`<dt>מע"מ ${fmt.number(doc.vat_rate)}%</dt><dd class="num">${fmt.exact(doc.vat)}</dd>` : ''}
        <dt class="grand">סה"כ לתשלום</dt><dd class="num grand">${fmt.exact(doc.total)}</dd>
        ${Number(doc.paid) ? html`<dt>שולם</dt><dd class="num">${fmt.exact(doc.paid)}</dd><dt>יתרה</dt><dd class="num">${fmt.exact(Number(doc.total) - Number(doc.paid))}</dd>` : ''}
      </dl>
      ${doc.notes ? html`<p class="paper-notes">${doc.notes}</p>` : ''}
      ${s.bankDetails ? html`<section class="paper-bank"><b>פרטים לתשלום</b><p class="pre">${s.bankDetails}</p></section>` : ''}
    </article>`);
  on(el, 'click', '[data-print]', () => window.print());
}
