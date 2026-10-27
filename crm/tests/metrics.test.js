// Known dataset with hand-computed expectations (see docs/analytics.md, "test dataset").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sourceReport, salesSummary, dealHealth, UNKNOWN, collectedIn, spendIn, paidTotal,
  adQualityReport, adCodeOf, adCodeOk, normAdCode, NO_CODE,
} from '../js/core/metrics.js';
import { beforeSave, afterSaveLocal } from '../js/core/rules.js';

const period = { from: new Date(2026, 8, 1), to: new Date(2026, 9, 1) }; // September 2026
const sept = (d, h = 12) => new Date(2026, 8, d, h).toISOString();
const sources = [
  { id: 'G', name: 'Google Ads', is_paid: true },
  { id: 'M', name: 'Meta Ads', is_paid: true },
  { id: 'R', name: 'הפניה', is_paid: false },
];
const stages = [
  { id: 'new', pipeline_id: 'p', position: 0, probability: 10, kind: 'open' },
  { id: 'proposal', pipeline_id: 'p', position: 1, probability: 60, kind: 'open', rot_days: 7 },
  { id: 'won', pipeline_id: 'p', position: 2, probability: 100, kind: 'won' },
  { id: 'lost', pipeline_id: 'p', position: 3, probability: 0, kind: 'lost' },
];

function build() {
  const contacts = [], deals = [];
  let n = 0;
  const lead = (src, extra = {}) => { const c = { id: `c${++n}`, first_source_id: src, last_source_id: src, created_at: sept(1 + (n % 27)), lifecycle: 'lead', lead_status: 'new', ...extra }; contacts.push(c); return c; };
  const deal = (c, outcome, amount, extra = {}) => {
    const d = { id: `d${deals.length + 1}`, contact_id: c.id, source_id: c.first_source_id, pipeline_id: 'p', stage_id: outcome === 'open' ? 'proposal' : outcome, outcome, amount_expected: amount, amount_final: outcome === 'won' ? amount : null, opened_at: sept(2), created_at: sept(2), closed_at: outcome === 'open' ? null : sept(20), amount_paid: 0, ...extra };
    deals.push(d); return d;
  };
  // Google: 40 leads, 8 won x 5,000 (cost 1,000 each), 5 of them paid in Sept, 1 paid in Oct; 4 lost; 6 open
  const g = Array.from({ length: 40 }, () => lead('G'));
  g.slice(0, 8).forEach((c, i) => { c.lifecycle = 'customer'; deal(c, 'won', 5000, { direct_cost_estimate: 1000, amount_paid: i < 6 ? 5000 : 0, paid_at: i < 5 ? '2026-09-25' : i === 5 ? '2026-10-03' : null }); });
  deal(g[0], 'won', 2000, { direct_cost_estimate: 0 }); // repeat purchase by an existing customer: revenue yes, new customer no
  g.slice(8, 12).forEach((c) => deal(c, 'lost', 4000));
  g.slice(12, 18).forEach((c) => { c.lifecycle = 'opportunity'; deal(c, 'open', 6000); });
  g.slice(20, 25).forEach((c) => { c.last_source_id = 'M'; }); // came back later through Meta
  g.slice(30, 34).forEach((c) => { c.lead_status = 'qualified'; });
  // Meta: 30 leads, 6 won x 3,000 (cost 500 on 4, missing on 2), 3 paid; 4 lost
  const m = Array.from({ length: 30 }, () => lead('M'));
  m.slice(0, 6).forEach((c, i) => { c.lifecycle = 'customer'; deal(c, 'won', 3000, { direct_cost_estimate: i < 4 ? 500 : null, amount_paid: i < 3 ? 3000 : 0, paid_at: i < 3 ? '2026-09-28' : null }); });
  m.slice(6, 10).forEach((c) => deal(c, 'lost', 3000));
  // Referral: 20 leads, 5 won x 8,000 (cost 2,000), all paid
  const r = Array.from({ length: 20 }, () => lead('R'));
  r.slice(0, 5).forEach((c) => { c.lifecycle = 'customer'; deal(c, 'won', 8000, { direct_cost_estimate: 2000, amount_paid: 8000, paid_at: '2026-09-30' }); });
  // Unknown source: 10 leads, 1 won x 2,000 (no cost)
  const u = Array.from({ length: 10 }, () => lead(null));
  u[0].lifecycle = 'customer'; deal(u[0], 'won', 2000);
  // Edge cases: August Google lead that became a customer in September; a deleted September lead
  const aug = lead('G', { created_at: new Date(2026, 7, 15).toISOString(), lifecycle: 'customer' });
  deal(aug, 'won', 5000, { direct_cost_estimate: 1000, opened_at: new Date(2026, 7, 16).toISOString() });
  lead('G', { deleted_at: sept(5) });
  const spend = [
    { id: 's1', day: '2026-09-01', source_id: 'G', amount: 7000 }, { id: 's2', day: '2026-09-15', source_id: 'G', amount: 5000 },
    { id: 's3', day: '2026-09-10', source_id: 'M', amount: 6000 },
    { id: 's4', day: '2026-08-20', source_id: 'G', amount: 5000 }, // outside the period
  ];
  return { contacts, deals, spend };
}

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('source report – first touch, known dataset', () => {
  const { contacts, deals, spend } = build();
  const rep = sourceReport({ contacts, deals, sources, spend, period });
  const G = rep.rows.find((x) => x.sourceId === 'G');
  const M = rep.rows.find((x) => x.sourceId === 'M');
  const R = rep.rows.find((x) => x.sourceId === 'R');
  const U = rep.rows.find((x) => x.sourceId === UNKNOWN);
  // leads (cohort created in Sept, deleted excluded, August lead excluded)
  assert.equal(G.leads.length, 40); assert.equal(M.leads.length, 30); assert.equal(R.leads.length, 20); assert.equal(U.leads.length, 10);
  assert.equal(rep.total.leads, 100);
  // close rate = unique leads that became paying customers / unique leads
  near(G.closeRate.value, 8 / 40); near(M.closeRate.value, 6 / 30); near(R.closeRate.value, 5 / 20); near(U.closeRate.value, 1 / 10);
  near(rep.total.closeRate.value, 20 / 100);
  // spend only inside the period
  assert.equal(G.spend, 12000); assert.equal(M.spend, 6000); assert.equal(R.spend, 0); assert.equal(rep.total.spend, 18000);
  // revenue from deals won in Sept: G = 8*5000 + repeat 2000 + August-lead 5000
  assert.equal(G.revenue, 47000); assert.equal(G.wonDeals.length, 10);
  assert.equal(M.revenue, 18000); assert.equal(R.revenue, 40000); assert.equal(U.revenue, 2000);
  assert.equal(rep.total.revenue, 107000);
  // new customers (first win in Sept): G = 8 cohort + 1 August lead; repeat purchase not double-counted
  assert.equal(G.newCustomers.length, 9);
  near(G.cac.value, 12000 / 9); near(M.cac.value, 1000);
  assert.equal(R.cac.value, null); assert.ok(R.cac.reason);
  // ROAS (closed revenue / spend) and ROI ((gross profit - spend) / spend)
  near(G.roas.value, 47000 / 12000); near(M.roas.value, 3);
  assert.equal(R.roas.value, null);
  assert.equal(G.directCost, 9000); assert.equal(G.grossProfit, 38000); assert.equal(G.profitAfterAds, 26000);
  near(G.roi.value, (26000 / 12000) * 100);
  // Meta has 2 won deals without cost -> flagged incomplete, cost counted only where known
  assert.equal(M.wonMissingCost, 2); assert.equal(M.costComplete, false); assert.equal(M.directCost, 2000);
  // collected: only payments dated in Sept (Oct payment excluded)
  assert.equal(G.collected, 25000); assert.equal(M.collected, 9000); assert.equal(R.collected, 40000); assert.equal(rep.total.collected, 74000);
  // totals equal the sum of rows (no double counting)
  assert.equal(rep.rows.reduce((a, x) => a + x.revenue, 0), rep.total.revenue);
  assert.equal(rep.total.wonDeals, 22);
  // advertising totals use paid sources only: ROAS = (47,000 + 18,000) / 18,000; referral/unknown revenue excluded
  assert.equal(rep.total.paidRevenue, 65000);
  near(rep.total.roas.value, 65000 / 18000);
  near(rep.total.cac.value, 18000 / (9 + 6));
  near(rep.total.blendedCac.value, 18000 / (9 + 6 + 5 + 1));
  near(rep.total.roi.value, ((38000 + 16000 - 18000) / 18000) * 100);
  assert.equal(rep.total.profitAfterAds, 107000 - (9000 + 2000 + 10000) - 18000);
});

test('source report – last touch moves leads, not totals', () => {
  const { contacts, deals, spend } = build();
  const rep = sourceReport({ contacts, deals, sources, spend, period, model: 'last' });
  assert.equal(rep.rows.find((x) => x.sourceId === 'G').leads.length, 35);
  assert.equal(rep.rows.find((x) => x.sourceId === 'M').leads.length, 35);
  assert.equal(rep.total.leads, 100);
  assert.equal(rep.total.revenue, 107000);
});

test('unknown source is never guessed and completeness is reported', () => {
  const { contacts, deals, spend } = build();
  const rep = sourceReport({ contacts, deals, sources, spend, period });
  near(rep.completeness.knownSource.value, 90 / 100);
  assert.equal(rep.completeness.unknownSourceIds.length, 10);
  assert.equal(rep.completeness.wonDeals, 22);
});

test('zero denominators give null with a reason, never Infinity or NaN', () => {
  const rep = sourceReport({ contacts: [], deals: [], sources, spend: [], period });
  for (const r of rep.rows) {
    for (const k of ['closeRate', 'cac', 'roas', 'roi', 'cpl']) {
      assert.equal(r[k].value, null, `${r.sourceId}.${k}`);
      assert.ok(r[k].reason);
    }
  }
  assert.equal(rep.total.closeRate.value, null);
});

test('sales summary', () => {
  const { contacts, deals } = build();
  const s = salesSummary({ contacts, deals, stages, history: [], period, now: new Date(2026, 8, 25) });
  assert.equal(s.won.length, 22);
  assert.equal(s.lost.length, 8);
  near(s.winRate.value, 22 / 30);
  assert.equal(s.revenue, 107000);
  assert.equal(s.collected, 74000);
  assert.equal(s.open.length, 6);
  assert.equal(s.pipelineValue, 36000);
  near(s.weightedPipeline, 36000 * 0.6);
  assert.equal(s.lostReasons.other, 8);
});

test('deal health: stuck is measured from stage entry; next action from open tasks', () => {
  const now = new Date(2026, 8, 25);
  const stage = stages[1];
  const d = { id: 'x', contact_id: 'c', outcome: 'open', stage_entered_at: new Date(2026, 8, 10).toISOString(), opened_at: new Date(2026, 8, 1).toISOString() };
  const h1 = dealHealth(d, { stage, openTasks: [], now });
  assert.equal(h1.stuck, true); assert.equal(h1.noNext, true); assert.equal(h1.daysInStage, 15);
  const h2 = dealHealth({ ...d, stage_entered_at: new Date(2026, 8, 22).toISOString() }, { stage, openTasks: [{ contact_id: 'c', due_at: new Date(2026, 8, 24).toISOString() }], now });
  assert.equal(h2.stuck, false); assert.equal(h2.noNext, false); assert.equal(h2.overdue, true);
  assert.equal(dealHealth({ ...d, outcome: 'won' }, { stage, openTasks: [], now }).noNext, false);
});

test('payments: each payment counts in its own month; a later payment never changes an earlier month', () => {
  const d = { props: { payments: [{ id: 'a', amount: 6000, date: '2026-09-20' }, { id: 'b', amount: 6000, date: '2026-10-05' }, { id: 'r', amount: -1000, date: '2026-10-10' }] } };
  const sep = { from: new Date(2026, 8, 1), to: new Date(2026, 9, 1) }, oct = { from: new Date(2026, 9, 1), to: new Date(2026, 10, 1) };
  assert.equal(collectedIn(d, sep), 6000);
  assert.equal(collectedIn(d, oct), 5000); // payment minus refund
  assert.equal(paidTotal(d), 11000);
  // legacy single amount + date still works
  assert.equal(collectedIn({ amount_paid: 3000, paid_at: '2026-09-02' }, sep), 3000);
});

test('monthly spend is prorated to the part of the month inside the period', () => {
  const row = { day: '2026-09-01', amount: 3000, origin: 'manual' };
  near(spendIn(row, { from: new Date(2026, 8, 1), to: new Date(2026, 9, 1) }), 3000);
  near(spendIn(row, { from: new Date(2026, 8, 16), to: new Date(2026, 9, 16) }), 1500);
  assert.equal(spendIn(row, { from: new Date(2026, 9, 1), to: new Date(2026, 10, 1) }), 0);
  // a dated (daily / imported) row is not spread
  assert.equal(spendIn({ day: '2026-09-15', amount: 500, origin: 'csv' }, { from: new Date(2026, 8, 1), to: new Date(2026, 8, 10) }), 0);
});

test('ad code: typed codes are trimmed and uppercased; only A-Z, 0-9, - and _, at most 24', () => {
  assert.equal(normAdCode('  ig-reel1 '), 'IG-REEL1');
  assert.ok(adCodeOk(' m12 ') && adCodeOk('G_3') && adCodeOk('A'.repeat(24)));
  assert.ok(!adCodeOk('') && !adCodeOk('M 12') && !adCodeOk('מ12') && !adCodeOk('M12!') && !adCodeOk('A'.repeat(25)));
});

test('ad code of a lead: first touch, then last touch, then the latest touchpoint', () => {
  const tps = [
    { contact_id: 'a', at: sept(2), utm_content: 'old' },
    { contact_id: 'a', at: sept(5), utm_content: 'g3' },
    { contact_id: 'a', at: sept(9), utm_content: 'x9', deleted_at: sept(10) },
    { contact_id: 'b', at: sept(9), utm_content: 'B1' },
  ];
  assert.equal(adCodeOf({ id: 'a', first_utm: { utm_content: 'm12' }, last_utm: { utm_content: 'G3' } }, tps), 'M12');
  assert.equal(adCodeOf({ id: 'a', first_utm: { utm_campaign: 'spring' }, last_utm: { utm_content: 'G3' } }, tps), 'G3');
  assert.equal(adCodeOf({ id: 'a' }, tps), 'G3'); // deleted touchpoints and other leads' touchpoints are ignored
  assert.equal(adCodeOf({ id: 'z' }, tps), null);
});

test('lead quality by ad code: cohort of the period, every number with its records', () => {
  const contacts = [
    { id: 'a1', created_at: sept(3), fit: 'high', first_utm: { utm_content: 'M12' } },
    { id: 'a2', created_at: sept(4), fit: 'high', last_utm: { utm_content: 'm12' } }, // same code, other case
    { id: 'a3', created_at: sept(5), fit: 'low', lead_status: 'disqualified', first_utm: { utm_content: 'M12' } },
    { id: 'b1', created_at: sept(6), fit: 'medium' }, // code only on a touchpoint
    { id: 'b2', created_at: sept(7) },
    { id: 'n1', created_at: sept(8), fit: 'high' },
    { id: 'n2', created_at: sept(9), lead_status: 'disqualified' },
    { id: 'old', created_at: new Date(2026, 7, 20).toISOString(), fit: 'high', first_utm: { utm_content: 'M12' } }, // August
    { id: 'del', created_at: sept(10), fit: 'high', first_utm: { utm_content: 'M12' }, deleted_at: sept(11) },
  ];
  const touchpoints = [{ contact_id: 'b1', at: sept(6), utm_content: 'G3' }, { contact_id: 'b2', at: sept(7), utm_content: 'g3 ' }];
  const deals = [
    { id: 'd1', contact_id: 'a1', outcome: 'won', amount_final: 8000, closed_at: new Date(2026, 9, 15).toISOString() }, // won after the period: still counts
    { id: 'd2', contact_id: 'a1', outcome: 'won', amount_final: null, amount_expected: 2000, closed_at: sept(20) },
    { id: 'd3', contact_id: 'a2', outcome: 'lost', amount_expected: 5000 },
    { id: 'd4', contact_id: 'n1', outcome: 'won', amount_final: 3000, closed_at: sept(25) },
    { id: 'd5', contact_id: 'old', outcome: 'won', amount_final: 9000, closed_at: sept(25) }, // lead from August: not in this cohort
    { id: 'd6', contact_id: 'a2', outcome: 'won', amount_final: 1000, closed_at: sept(25), deleted_at: sept(26) },
  ];
  const rep = adQualityReport({ contacts, deals, touchpoints, period });
  assert.deepEqual(rep.rows.map((r) => r.code), ['M12', 'G3', NO_CODE]);
  const [m, g, none] = rep.rows;
  assert.deepEqual(m.leads, ['a1', 'a2', 'a3']);
  assert.deepEqual(m.high, ['a1', 'a2']); assert.deepEqual(m.medium, []); assert.deepEqual(m.low, ['a3']); assert.deepEqual(m.unrated, []);
  assert.deepEqual(m.disqualified, ['a3']);
  assert.deepEqual(m.wonDeals, ['d1', 'd2']); assert.equal(m.revenue, 10000);
  assert.deepEqual(g.leads, ['b1', 'b2']); assert.deepEqual(g.medium, ['b1']); assert.deepEqual(g.unrated, ['b2']); assert.equal(g.revenue, 0);
  assert.deepEqual(none.leads, ['n1', 'n2']); assert.deepEqual(none.high, ['n1']); assert.deepEqual(none.unrated, ['n2']);
  assert.deepEqual(none.disqualified, ['n2']); assert.deepEqual(none.wonDeals, ['d4']); assert.equal(none.revenue, 3000);
  assert.deepEqual(rep.total, { leads: 7, high: 3, medium: 1, low: 1, unrated: 2, disqualified: 2, wonDeals: 3, revenue: 13000, withCode: 5 });
  // no leads in the period: nothing to show, not zeros invented per code
  assert.deepEqual(adQualityReport({ contacts, deals, touchpoints, period: { from: new Date(2025, 0, 1), to: new Date(2025, 1, 1) } }).rows, []);
});

test('local mode mirrors crm_touchpoint_apply: the ad code fills first_utm once and moves last_utm', () => {
  const rows = new Map();
  const store = { get: (t, id) => rows.get(id) };
  // lead created with a source: first touch already set, so the code lands on the last touch only
  const c = beforeSave('crm_contacts', { id: 'c1', first_name: 'דנה', first_source_id: 'W', first_utm: { utm_campaign: 'spring' } }, null, store);
  rows.set('c1', c);
  const tp = beforeSave('crm_touchpoints', { id: 't1', contact_id: 'c1', at: c.first_touch_at, kind: 'whatsapp', source_id: 'W', utm_content: 'M12' }, null, store);
  afterSaveLocal('crm_touchpoints', tp, null, store);
  assert.deepEqual(c.first_utm, { utm_campaign: 'spring' });
  assert.deepEqual(c.last_utm, { utm_content: 'M12', kind: 'whatsapp' });
  assert.equal(c.last_source_id, 'W');
  assert.equal(adCodeOf(c), 'M12');
  // lead without a source: the code is its first touch, and a later touch does not replace it
  const u = { id: 'c2', first_source_id: null };
  rows.set('c2', u);
  afterSaveLocal('crm_touchpoints', beforeSave('crm_touchpoints', { contact_id: 'c2', at: sept(3), utm_content: 'G3' }, null, store), null, store);
  assert.equal(u.first_touch_at, sept(3)); assert.equal(u.first_source_id, null);
  assert.deepEqual(u.first_utm, { utm_content: 'G3', kind: 'manual' });
  afterSaveLocal('crm_touchpoints', { contact_id: 'c2', at: sept(8), kind: 'form', source_id: 'G', utm_content: 'X1' }, null, store);
  assert.equal(u.first_utm.utm_content, 'G3'); assert.equal(u.last_utm.utm_content, 'X1'); assert.equal(u.last_source_id, 'G');
  assert.equal(adCodeOf(u), 'G3');
  // edits of a touchpoint never move attribution (the server trigger runs on insert only)
  afterSaveLocal('crm_touchpoints', { contact_id: 'c2', at: sept(9), utm_content: 'Y' }, { contact_id: 'c2' }, store);
  assert.equal(u.last_utm.utm_content, 'X1');
});
