// Business finance calculations, hand-computed expectations.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { docTotals, docStatus, isOverdue, receipts, summary, receivables, vatPeriod, vatReportPeriod, nextDocNumber } from '../js/core/finance.js';

const oct = { from: new Date(2026, 9, 1), to: new Date(2026, 10, 1) };
const sep = { from: new Date(2026, 8, 1), to: new Date(2026, 9, 1) };
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.01, `${a} != ${b}`);

test('document totals: lines before VAT, VAT 18%', () => {
  assert.deepEqual(docTotals([{ qty: 2, price: 1500 }, { qty: 1, price: 999.99 }], 18), { subtotal: 3999.99, vat: 720, total: 4719.99 });
  assert.deepEqual(docTotals([{ qty: 1, price: 1000 }], 0), { subtotal: 1000, vat: 0, total: 1000 });
});

test('document status and overdue', () => {
  assert.equal(docStatus({ status: 'sent', total: 1180, paid: 0 }), 'sent');
  assert.equal(docStatus({ status: 'sent', total: 1180, paid: 500 }), 'partial');
  assert.equal(docStatus({ status: 'partial', total: 1180, paid: 1180 }), 'paid');
  assert.equal(docStatus({ status: 'canceled', total: 1180, paid: 1180 }), 'canceled');
  assert.equal(isOverdue({ status: 'sent', total: 100, paid: 0, due_date: '2026-10-01' }, new Date(2026, 9, 10)), true);
  assert.equal(isOverdue({ status: 'sent', total: 100, paid: 100, due_date: '2026-10-01' }, new Date(2026, 9, 10)), false);
});

test('money is counted once: deal payments, plus document payments no deal holds', () => {
  const deals = [{ id: 'd1', contact_id: 'c1', outcome: 'won', amount_final: 10000, closed_at: '2026-09-10T10:00:00Z',
    props: { payments: [{ id: 'p1', amount: 5000, gross: 5900, vat: true, date: '2026-09-20', docId: 'doc1' }, { id: 'p2', amount: 3000, gross: 3540, vat: true, date: '2026-10-02' }] } }];
  const documents = [
    { id: 'doc1', deal_id: 'd1', kind: 'payment_request', total: 5900, paid: 5900, vat_rate: 18, status: 'paid', payments: [{ id: 'p1', amount: 5900, date: '2026-09-20' }] }, // mirrored on the deal (same id): not counted again
    { id: 'doc2', deal_id: null, contact_id: 'c2', kind: 'tax_invoice', total: 2360, paid: 1180, vat_rate: 18, status: 'partial', issue_date: '2026-10-01', payments: [{ amount: 1180, date: '2026-10-05' }] },
  ];
  const r = receipts({ deals, documents }, oct);
  assert.equal(r.length, 2);
  near(r.reduce((a, x) => a + x.net, 0), 3000 + 1000);
  near(r.reduce((a, x) => a + x.vat, 0), 540 + 180);
  assert.equal(receipts({ deals, documents }, sep).length, 1);
  // receivables: deal 10,000 - 8,000 paid; doc2 owes 1,180 gross = 1,000 before VAT
  const rv = receivables({ deals, documents }, new Date(2026, 9, 20));
  near(rv.total, 2000 + 1000);
  assert.equal(rv.rows.length, 2);
});

test('summary: profit and VAT estimate; exempt business has no VAT', () => {
  const deals = [{ id: 'd', outcome: 'won', props: { payments: [{ amount: 10000, gross: 11800, vat: true, date: '2026-10-10' }] } }];
  const expenses = [
    { day: '2026-10-03', amount: 1000, vat: 180, category: 'software' },
    { day: '2026-10-15', amount: 2000, vat: 0, category: 'subcontractor' },
    { day: '2026-09-30', amount: 999, vat: 0, category: 'other' }, // other month
  ];
  const spend = [{ day: '2026-10-01', amount: 1500, origin: 'manual' }];
  const s = summary({ deals, expenses, spend }, oct);
  assert.equal(s.income, 10000); assert.equal(s.outputVat, 1800);
  assert.equal(s.expenseNet, 3000); assert.equal(s.inputVat, 180); assert.equal(s.ads, 1500);
  assert.equal(s.profit, 10000 - 3000 - 1500);
  assert.equal(s.vatPayable, 1800 - 180);
  assert.equal(s.byCategory.software, 1000);
  assert.equal(summary({ deals, expenses, spend, settings: { vatStatus: 'exempt' } }, oct).vatPayable, null);
});

test('VAT periods are bimonthly by default and due on the 15th', () => {
  const p = vatPeriod(new Date(2026, 9, 25));
  assert.equal(p.from.getMonth(), 8); assert.equal(p.to.getMonth(), 10);
  assert.equal(p.dueBy.getDate(), 15); assert.equal(p.dueBy.getMonth(), 10);
  const m = vatPeriod(new Date(2026, 9, 25), 'monthly');
  assert.equal(m.from.getMonth(), 9); assert.equal(m.to.getMonth(), 10);
});

test('payment request numbering', () => {
  assert.equal(nextDocNumber([], 'payment_request', 2026), 'PR-2026-001');
  assert.equal(nextDocNumber([{ kind: 'payment_request', number: 'PR-2026-009' }, { kind: 'tax_invoice', number: '50012' }], 'payment_request', 2026), 'PR-2026-010');
});

// ---- regressions from code review round 2
const wonDeal = (payments = []) => ({ id: 'D', contact_id: 'c', outcome: 'won', amount_final: 1000, closed_at: '2026-10-01T10:00:00Z', props: { payments } });
const paidDoc = (extra = {}) => ({ id: 'X', contact_id: 'c', kind: 'tax_invoice', total: 1180, paid: 1180, vat_rate: 18, status: 'paid', issue_date: '2026-10-02', payments: [{ id: 'pay1', amount: 1180, date: '2026-10-03' }], ...extra });
const mirrored = { id: 'pay1', amount: 1000, gross: 1180, vat: true, date: '2026-10-03', docId: 'X' };
const income = (data) => receipts(data, oct).reduce((a, x) => a + x.net, 0);

test('unlinking a paid document from its deal does not count the money twice', () => {
  near(income({ deals: [wonDeal([mirrored])], documents: [paidDoc({ deal_id: 'D' })] }), 1000);
  near(income({ deals: [wonDeal([mirrored])], documents: [paidDoc({ deal_id: null })] }), 1000);
});
test('linking a paid document to a deal later keeps its income', () => {
  near(income({ deals: [wonDeal([])], documents: [paidDoc({ deal_id: 'D' })] }), 1000);
});
test('a cancelled paid document and a deleted deal keep money that was received', () => {
  near(income({ deals: [], documents: [paidDoc({ status: 'canceled' })] }), 1000);
  near(income({ deals: [{ ...wonDeal([mirrored]), deleted_at: '2026-10-10T00:00:00Z' }], documents: [paidDoc({ deal_id: 'D' })] }), 1000);
});
test('credit notes are not debts; advances on open deals are', () => {
  const credit = { id: 'C', kind: 'credit_note', contact_id: 'c', total: 1180, paid: 0, vat_rate: 18, status: 'sent', issue_date: '2026-10-02' };
  near(receivables({ deals: [], documents: [credit] }, new Date(2026, 9, 20)).total, 0);
  const open = { id: 'O', contact_id: 'c', outcome: 'open', amount_expected: 10000 };
  const advance = { id: 'A', deal_id: 'O', kind: 'payment_request', contact_id: 'c', total: 5900, paid: 0, vat_rate: 18, status: 'sent', issue_date: '2026-10-02' };
  near(receivables({ deals: [open], documents: [advance] }, new Date(2026, 9, 20)).total, 5000);
  // once the deal is won, its own balance is the debt (the document is not added on top)
  near(receivables({ deals: [{ ...open, outcome: 'won', amount_final: 10000, closed_at: '2026-10-05T10:00:00Z' }], documents: [advance] }, new Date(2026, 9, 20)).total, 10000);
});
test('line totals round like Postgres', () => {
  near(docTotals([{ qty: 1, price: 1.005 }], 0).subtotal, 1.01);
  near(docTotals([{ qty: 3, price: 33.335 }], 18).subtotal, 100.01);
});

// ---- regressions from customer panel round 2
test('the VAT panel shows the report due next: the previous period until the 15th', () => {
  assert.equal(vatReportPeriod(new Date(2026, 10, 5)).from.getMonth(), 8);   // 5 Nov: Sep–Oct, due 15 Nov
  assert.equal(vatReportPeriod(new Date(2026, 10, 15, 20)).from.getMonth(), 8);
  assert.equal(vatReportPeriod(new Date(2026, 10, 16)).from.getMonth(), 10); // after the 15th: Nov–Dec
  assert.equal(vatReportPeriod(new Date(2026, 9, 25)).from.getMonth(), 8);   // inside Sep–Oct
});
test('a debt from this morning is in the first aging bucket, never "-1 days"', () => {
  const now = new Date(2026, 9, 25, 9);
  const d = { id: 'd', contact_id: 'c', outcome: 'won', amount_final: 4000, closed_at: new Date(2026, 9, 25, 12).toISOString(), props: { payments: [] } };
  const rv = receivables({ deals: [d], documents: [] }, now);
  assert.equal(rv.rows[0].days, 0);
  near(rv.aging.d30, 4000);
});
test('a recorded receipt is paid, not a debt', () => {
  const r = { id: 'R', kind: 'receipt', contact_id: 'c', total: 300, paid: 0, vat_rate: 0, status: 'sent', issue_date: '2026-10-20' };
  assert.equal(docStatus(r), 'paid');
  near(receivables({ deals: [], documents: [r] }, new Date(2026, 9, 25)).total, 0);
  assert.equal(docStatus({ kind: 'credit_note', status: 'sent', total: 500 }), 'recorded');
});
