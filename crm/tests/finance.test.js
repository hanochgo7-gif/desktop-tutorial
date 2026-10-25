// Business finance calculations, hand-computed expectations.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { docTotals, docStatus, isOverdue, receipts, summary, receivables, vatPeriod, nextDocNumber } from '../js/core/finance.js';

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

test('money is counted once: deal payments, plus documents only when they have no deal', () => {
  const deals = [{ id: 'd1', contact_id: 'c1', outcome: 'won', amount_final: 10000, closed_at: '2026-09-10T10:00:00Z',
    props: { payments: [{ id: 'p1', amount: 5000, gross: 5900, vat: true, date: '2026-09-20', docId: 'doc1' }, { id: 'p2', amount: 3000, gross: 3540, vat: true, date: '2026-10-02' }] } }];
  const documents = [
    { id: 'doc1', deal_id: 'd1', kind: 'payment_request', total: 5900, paid: 5900, vat_rate: 18, status: 'paid', payments: [{ amount: 5900, date: '2026-09-20' }] }, // mirrored on the deal: not counted again
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
