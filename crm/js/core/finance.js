// Business finance: pure calculations over plain rows (testable in Node), cash basis.
// Money received is counted once: payments recorded on a deal (props.payments) are the source of truth;
// a payment on a document is mirrored into its deal with the same id, so a document payment counts only
// when no live deal holds a payment with that id (no deal, deal deleted, or unlinked later).
// Money received stays income even if the document is cancelled later.
// All amounts in reports are before VAT; VAT is tracked separately (output from receipts, input from expenses).

import { paymentsOf, spendIn } from './metrics.js';

const num = (v) => (v == null || v === '' || isNaN(Number(v)) ? 0 : Number(v));
// round to agorot; toPrecision removes float noise first, so 1.005 rounds to 1.01 like Postgres round()
export const r2 = (n) => Math.round(Number((Number(n) * 100).toPrecision(12))) / 100;
const dayDate = (s) => new Date(`${String(s).slice(0, 10)}T12:00:00`);
const inP = (d, p) => { const t = d.getTime(); return t >= p.from.getTime() && t < p.to.getTime(); };

export const EXPENSE_CATEGORIES = [
  { value: 'software', label: 'תוכנות ומנויים' },
  { value: 'subcontractor', label: 'פרילנסרים וקבלני משנה' },
  { value: 'materials', label: 'חומרים ומלאי' },
  { value: 'equipment', label: 'ציוד ומחשבים' },
  { value: 'office', label: 'משרד ותקשורת' },
  { value: 'vehicle', label: 'רכב ונסיעות' },
  { value: 'professional', label: 'רו"ח, ייעוץ משפטי' },
  { value: 'training', label: 'הכשרה ולימודים' },
  { value: 'fees', label: 'עמלות בנק וסליקה' },
  { value: 'other', label: 'אחר' },
];
export const DOC_KINDS = [
  { value: 'payment_request', label: 'דרישת תשלום', own: true },
  { value: 'tax_invoice', label: 'חשבונית מס' },
  { value: 'tax_invoice_receipt', label: 'חשבונית מס/קבלה' },
  { value: 'receipt', label: 'קבלה' },
  { value: 'credit_note', label: 'חשבונית זיכוי' },
];
export const DOC_STATUS = [
  { value: 'draft', label: 'טיוטה', color: 'slate' },
  { value: 'sent', label: 'נשלח, ממתין לתשלום', color: 'amber' },
  { value: 'partial', label: 'שולם חלקית', color: 'violet' },
  { value: 'paid', label: 'שולם', color: 'green' },
  { value: 'canceled', label: 'בוטל', color: 'slate' },
  { value: 'recorded', label: 'נרשם', color: 'slate' },
];

// Lines -> totals. Prices are before VAT.
export function docTotals(items = [], vatRate = 18) {
  const subtotal = r2(items.reduce((a, it) => a + r2(num(it.qty) * num(it.price)), 0));
  const vat = r2(subtotal * num(vatRate) / 100);
  return { subtotal, vat, total: r2(subtotal + vat) };
}
// Shown status. A receipt documents money already received (paid, never "awaiting payment");
// a credit note is a record, not something the customer pays.
export function docStatus(doc) {
  if (doc.status === 'canceled' || doc.status === 'draft') return doc.status;
  if (doc.kind === 'receipt' || doc.kind === 'tax_invoice_receipt') return 'paid';
  if (doc.kind === 'credit_note') return 'recorded';
  const total = num(doc.total);
  if (total > 0 && num(doc.paid) >= total - 0.005) return 'paid';
  if (num(doc.paid) > 0) return 'partial';
  return 'sent';
}
// whole calendar days from a date to today (0 for today, never negative)
const daysSince = (d, now) => {
  const a = dayDate(String(d).length === 10 ? d : toLocalDay(d)), b = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  return Math.max(0, Math.round((b - a) / 864e5));
};
const toLocalDay = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
export const isOverdue = (doc, now = new Date()) => !!doc.due_date && ['sent', 'partial'].includes(docStatus(doc)) && dayDate(doc.due_date) < new Date(now.getFullYear(), now.getMonth(), now.getDate());

// Every amount of money received in the period, once: { date, net, vat, gross, dealId, docId, contactId }
export function receipts({ deals = [], documents = [] }, period) {
  const out = [];
  const onDeals = new Set();
  for (const d of deals) if (!d.deleted_at) for (const p of paymentsOf(d)) onDeals.add(p.id);
  for (const d of deals) {
    if (d.deleted_at) continue;
    for (const p of paymentsOf(d)) {
      const date = dayDate(p.date);
      if (period && !inP(date, period)) continue;
      const net = num(p.amount);
      const gross = p.gross != null ? num(p.gross) : net;
      out.push({ date, net, gross, vat: r2(gross - net), dealId: d.id, contactId: d.contact_id, docId: p.docId || null, note: p.note || '' });
    }
  }
  for (const doc of documents) {
    if (doc.deleted_at) continue;
    for (const p of doc.payments || []) {
      if (onDeals.has(p.id)) continue;
      const date = dayDate(p.date);
      if (period && !inP(date, period)) continue;
      const gross = num(p.amount);
      const rate = num(doc.vat_rate);
      const net = r2(gross / (1 + rate / 100));
      out.push({ date, net, gross, vat: r2(gross - net), dealId: null, contactId: doc.contact_id, docId: doc.id, note: p.note || '' });
    }
  }
  return out.sort((a, b) => a.date - b.date);
}

export function expensesIn(expenses = [], period) {
  return expenses.filter((e) => !e.deleted_at && (!period || inP(dayDate(e.day), period)));
}

// Profit & loss + VAT estimate for a period.
export function summary({ deals = [], documents = [], expenses = [], spend = [], settings = {} }, period) {
  const rec = receipts({ deals, documents }, period);
  const exp = expensesIn(expenses, period);
  const income = r2(rec.reduce((a, x) => a + x.net, 0));
  const outputVat = r2(rec.reduce((a, x) => a + x.vat, 0));
  const expenseNet = r2(exp.reduce((a, e) => a + num(e.amount), 0));
  const inputVat = r2(exp.reduce((a, e) => a + num(e.vat), 0));
  const ads = r2((spend || []).filter((s) => !s.deleted_at).reduce((a, s) => a + spendIn(s, period), 0));
  const exempt = settings.vatStatus === 'exempt';
  const byCategory = {};
  for (const e of exp) byCategory[e.category || 'other'] = r2((byCategory[e.category || 'other'] || 0) + num(e.amount));
  return {
    income, outputVat, expenseNet, inputVat, ads,
    profit: r2(income - expenseNet - ads),
    vatPayable: exempt ? null : r2(outputVat - inputVat),
    receiptsCount: rec.length, expensesCount: exp.length, byCategory, receipts: rec, expenses: exp,
  };
}

// Money still owed to the business (before VAT): won deals not fully paid, plus open documents that no won deal
// already covers (no deal, deal deleted, or an advance requested on a deal that is still open). Credit notes are not debts.
export function receivables({ deals = [], documents = [], contactsById = new Map() }, now = new Date()) {
  const rows = [];
  const won = new Set(deals.filter((d) => !d.deleted_at && d.outcome === 'won').map((d) => d.id));
  for (const d of deals) {
    if (d.deleted_at || d.outcome !== 'won') continue;
    const paid = paymentsOf(d).reduce((a, p) => a + num(p.amount), 0);
    const owed = r2(num(d.amount_final ?? d.amount_expected) - paid);
    if (owed > 0.5) rows.push({ kind: 'deal', id: d.id, name: d.name, contactId: d.contact_id, owed, since: d.closed_at, days: daysSince(d.closed_at || d.updated_at, now) });
  }
  for (const doc of documents) {
    if (doc.deleted_at || doc.kind === 'credit_note' || won.has(doc.deal_id) || !['sent', 'partial'].includes(docStatus(doc))) continue;
    const owedGross = num(doc.total) - num(doc.paid);
    const owed = r2(owedGross / (1 + num(doc.vat_rate) / 100));
    if (owed > 0.5) rows.push({ kind: 'doc', id: doc.id, name: `${doc.number || ''}`, contactId: doc.contact_id, owed, since: doc.issue_date, days: daysSince(doc.issue_date, now), due: doc.due_date });
  }
  rows.sort((a, b) => b.days - a.days);
  const bucket = (lo, hi) => r2(rows.filter((x) => x.days >= lo && x.days <= hi).reduce((a, x) => a + x.owed, 0));
  void contactsById;
  return { rows, total: r2(rows.reduce((a, x) => a + x.owed, 0)), aging: { d30: bucket(0, 30), d60: bucket(31, 60), d90: bucket(61, 90), older: bucket(91, 1e9) } };
}

// Israeli VAT reporting periods: bimonthly (Jan–Feb, Mar–Apr, ...) or monthly.
export function vatPeriod(date = new Date(), freq = 'bimonthly') {
  const y = date.getFullYear(), m = date.getMonth();
  const start = freq === 'monthly' ? m : m - (m % 2);
  const len = freq === 'monthly' ? 1 : 2;
  const from = new Date(y, start, 1), to = new Date(y, start + len, 1);
  const name = (d) => d.toLocaleDateString('he-IL', { month: 'long' });
  // the report is due by the 15th of the month after the period
  return { from, to, label: len === 1 ? `${name(from)} ${y}` : `${name(from)}–${name(new Date(y, start + 1, 1))} ${y}`, dueBy: new Date(y, start + len, 15) };
}

// The VAT report to look at now: the previous period until its report is due (15th of the next month), then the current one.
export function vatReportPeriod(now = new Date(), freq = 'bimonthly') {
  const cur = vatPeriod(now, freq);
  const prev = vatPeriod(new Date(cur.from.getFullYear(), cur.from.getMonth() - 1, 1), freq);
  return now < new Date(prev.dueBy.getFullYear(), prev.dueBy.getMonth(), prev.dueBy.getDate() + 1) ? prev : cur;
}

// Monthly series for the last n months: income, expenses, ads, profit
export function monthlySeries(data, n = 12, now = new Date()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const from = new Date(now.getFullYear(), now.getMonth() - i, 1), to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const s = summary(data, { from, to });
    out.push({ from, label: from.toLocaleDateString('he-IL', { month: 'short' }), income: s.income, costs: r2(s.expenseNet + s.ads), profit: s.profit });
  }
  return out;
}

// Next number for documents produced here (payment requests): PR-<year>-<n>
export function nextDocNumber(documents = [], kind = 'payment_request', year = new Date().getFullYear()) {
  const prefix = kind === 'payment_request' ? `PR-${year}-` : '';
  let max = 0;
  for (const d of documents) if (d.kind === kind && String(d.number || '').startsWith(prefix)) max = Math.max(max, Number(String(d.number).slice(prefix.length)) || 0);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}
