// Analytics engine: pure functions over plain rows (no DOM, no store) so they can be unit-tested in Node.
// Every number comes with the record ids behind it (for drill-down) and null + a reason when it cannot be computed.
// Definitions are documented in docs/analytics.md – keep the two in sync.
//
// Inputs (arrays of rows as stored in the database):
//   contacts, deals, stages, sources, spend (crm_ad_spend), history (crm_deal_stage_history)
// Period: { from: Date, to: Date } – half-open [from, to).
// Attribution model: 'first' (default) – the lead's original source; for revenue, the source frozen on the deal
//                    when it was created (which is the contact's original source at that time).
//                    'last' – the source of the lead's most recent touch.

const inP = (d, p) => { if (!d) return false; const t = new Date(d).getTime(); return t >= p.from.getTime() && t < p.to.getTime(); };
const num = (v) => (v == null || v === '' || isNaN(Number(v)) ? 0 : Number(v));
const ratio = (a, b, why = 'אין נתונים לחישוב') => (b > 0 ? { value: a / b } : { value: null, reason: why });
export const UNKNOWN = '__unknown__';

// Payments on a deal: a list of { id, amount, date, note } in props.payments (refunds are negative).
// Older rows only have amount_paid + paid_at, which is treated as one payment on that date.
export function paymentsOf(d) {
  const list = d?.props?.payments;
  if (Array.isArray(list)) return list.filter((p) => p && p.date && Number(p.amount));
  return num(d?.amount_paid) && d?.paid_at ? [{ id: 'legacy', amount: num(d.amount_paid), date: String(d.paid_at).slice(0, 10) }] : [];
}
export const paidTotal = (d) => paymentsOf(d).reduce((a, p) => a + num(p.amount), 0);
const dayDate = (s) => new Date(`${String(s).slice(0, 10)}T12:00:00`);
export function collectedIn(d, period) {
  return paymentsOf(d).filter((p) => inP(dayDate(p.date), period)).reduce((a, p) => a + num(p.amount), 0);
}
// Spend entered for a whole month (manual entry, dated the 1st) counts by the share of the month inside the period.
export function spendIn(row, period) {
  const day = dayDate(row.day);
  const monthly = row.origin === 'manual' && day.getDate() === 1 && !row.campaign_id;
  if (!monthly) return inP(day, period) ? num(row.amount) : 0;
  const start = new Date(day.getFullYear(), day.getMonth(), 1), end = new Date(day.getFullYear(), day.getMonth() + 1, 1);
  const from = Math.max(start, period.from), to = Math.min(end, period.to);
  if (to <= from) return 0;
  return num(row.amount) * ((to - from) / (end - start));
}

export function leadSource(contact, model = 'first') {
  return (model === 'last' ? contact.last_source_id || contact.first_source_id : contact.first_source_id) || UNKNOWN;
}
export function dealSource(deal, contactsById, model = 'first') {
  if (model === 'last') { const c = contactsById.get(deal.contact_id); return (c && (c.last_source_id || c.first_source_id)) || deal.source_id || UNKNOWN; }
  return deal.source_id || UNKNOWN;
}
const isQualified = (c) => ['qualified', 'opportunity', 'customer'].includes(c.lifecycle) || c.lead_status === 'qualified';
const isOpenDeal = (d) => d.outcome === 'open';

// ---------------------------------------------------------------- per-source report
export function sourceReport({ contacts, deals, sources, spend, period, model = 'first' }) {
  const live = (r) => !r.deleted_at;
  contacts = contacts.filter(live); deals = deals.filter(live); spend = (spend || []).filter(live);
  const byId = new Map(contacts.map((c) => [c.id, c]));
  const keys = [...sources.map((s) => s.id), UNKNOWN];
  const rows = new Map(keys.map((k) => [k, {
    sourceId: k, spend: 0, spendIds: [], leads: [], qualified: [], customers: [], openCohort: [], wonDeals: [], revenue: 0, collected: 0, collectedDeals: [],
    directCost: 0, wonMissingCost: 0, newCustomers: [], meetings: 0,
  }]));
  const row = (k) => rows.get(k) || rows.get(UNKNOWN);

  for (const s of spend) {
    const amt = spendIn(s, period);
    if (!amt) continue;
    const r = row(s.source_id); r.spend += amt; r.spendIds.push(s.id);
  }
  // lead cohort: contacts created in the period
  const dealsByContact = new Map();
  for (const d of deals) { if (!d.contact_id) continue; if (!dealsByContact.has(d.contact_id)) dealsByContact.set(d.contact_id, []); dealsByContact.get(d.contact_id).push(d); }
  for (const c of contacts) {
    if (!inP(c.created_at, period)) continue;
    const r = row(leadSource(c, model));
    r.leads.push(c.id);
    if (isQualified(c)) r.qualified.push(c.id);
    const ds = dealsByContact.get(c.id) || [];
    if (ds.some((d) => d.outcome === 'won')) r.customers.push(c.id);
    else if (c.lead_status !== 'disqualified' && (ds.some(isOpenDeal) || !ds.length) && c.lifecycle !== 'former') r.openCohort.push(c.id);
  }
  // new customers acquired in the period (for CAC): first won deal of the contact closed in the period
  for (const c of contacts) {
    const won = (dealsByContact.get(c.id) || []).filter((d) => d.outcome === 'won' && d.closed_at).sort((a, b) => (a.closed_at < b.closed_at ? -1 : 1));
    if (won.length && inP(won[0].closed_at, period)) row(leadSource(c, model)).newCustomers.push(c.id);
  }
  // revenue: deals won in the period; collected: payments dated in the period
  for (const d of deals) {
    const k = dealSource(d, byId, model);
    if (d.outcome === 'won' && inP(d.closed_at, period)) {
      const r = row(k);
      r.wonDeals.push(d.id);
      r.revenue += num(d.amount_final ?? d.amount_expected);
      if (d.direct_cost_estimate == null || d.direct_cost_estimate === '') r.wonMissingCost++;
      else r.directCost += num(d.direct_cost_estimate);
    }
    const got = collectedIn(d, period);
    if (got) { const r = row(k); r.collected += got; r.collectedDeals.push(d.id); }
  }
  const out = [];
  for (const r of rows.values()) {
    const src = sources.find((s) => s.id === r.sourceId);
    const grossProfit = r.revenue - r.directCost;
    const m = {
      ...r,
      name: src ? src.name : 'מקור לא ידוע',
      isPaid: !!src?.is_paid,
      closeRate: ratio(r.customers.length, r.leads.length, 'אין לידים בתקופה'),
      cpl: r.spend > 0 ? ratio(r.spend, r.leads.length, 'אין לידים') : { value: null, reason: 'אין הוצאה' },
      cpql: r.spend > 0 ? ratio(r.spend, r.qualified.length, 'אין לידים מתאימים') : { value: null, reason: 'אין הוצאה' },
      cac: r.spend > 0 ? ratio(r.spend, r.newCustomers.length, 'אין לקוחות חדשים בתקופה') : { value: null, reason: 'אין הוצאה' },
      roas: ratio(r.revenue, r.spend, 'אין הוצאות פרסום'),
      roasCollected: ratio(r.collected, r.spend, 'אין הוצאות פרסום'),
      grossProfit,
      profitAfterAds: grossProfit - r.spend,
      roi: r.spend > 0 ? { value: ((grossProfit - r.spend) / r.spend) * 100 } : { value: null, reason: 'אין הוצאות פרסום' },
      costComplete: r.wonMissingCost === 0,
      avgDeal: ratio(r.revenue, r.wonDeals.length, 'אין עסקאות שנסגרו'),
    };
    if (m.leads.length || m.spend || m.wonDeals.length || m.collected || src?.active !== false) out.push(m);
  }
  // keep configured order; unknown last
  out.sort((a, b) => (a.sourceId === UNKNOWN) - (b.sourceId === UNKNOWN) || (sources.findIndex((s) => s.id === a.sourceId) - sources.findIndex((s) => s.id === b.sourceId)));
  const total = totals(out);
  return { rows: out, total, completeness: completeness({ contacts, deals, period }) };
}

function totals(rows) {
  const t = { spend: 0, leads: 0, qualified: 0, customers: 0, newCustomers: 0, revenue: 0, collected: 0, directCost: 0, wonDeals: 0, wonMissingCost: 0, openCohort: 0,
    paidRevenue: 0, paidGross: 0, paidNewCustomers: 0 };
  for (const r of rows) {
    t.spend += r.spend; t.leads += r.leads.length; t.qualified += r.qualified.length; t.customers += r.customers.length;
    t.newCustomers += r.newCustomers.length; t.revenue += r.revenue; t.collected += r.collected; t.directCost += r.directCost;
    t.wonDeals += r.wonDeals.length; t.wonMissingCost += r.wonMissingCost; t.openCohort += r.openCohort.length;
    // advertising ratios only use what paid sources brought in: referrals and organic are not a return on ad spend
    if (r.isPaid || r.spend > 0) { t.paidRevenue += r.revenue; t.paidGross += r.revenue - r.directCost; t.paidNewCustomers += r.newCustomers.length; }
  }
  t.closeRate = ratio(t.customers, t.leads, 'אין לידים בתקופה');
  t.cac = t.spend > 0 ? ratio(t.spend, t.paidNewCustomers, 'אין לקוחות חדשים ממקורות ממומנים') : { value: null, reason: 'אין הוצאה' };
  t.blendedCac = t.spend > 0 ? ratio(t.spend, t.newCustomers, 'אין לקוחות חדשים בתקופה') : { value: null, reason: 'אין הוצאה' };
  t.roas = ratio(t.paidRevenue, t.spend, 'אין הוצאות פרסום');
  t.grossProfit = t.revenue - t.directCost;
  t.profitAfterAds = t.grossProfit - t.spend;
  t.roi = t.spend > 0 ? { value: ((t.paidGross - t.spend) / t.spend) * 100 } : { value: null, reason: 'אין הוצאות פרסום' };
  return t;
}

// How much of the data behind the report is filled in. Shown next to every report.
export function completeness({ contacts, deals, period }) {
  const leads = contacts.filter((c) => !c.deleted_at && inP(c.created_at, period));
  const won = deals.filter((d) => !d.deleted_at && d.outcome === 'won' && inP(d.closed_at, period));
  return {
    leads: leads.length,
    knownSource: ratio(leads.filter((c) => c.first_source_id).length, leads.length, 'אין לידים'),
    unknownSourceIds: leads.filter((c) => !c.first_source_id).map((c) => c.id),
    wonDeals: won.length,
    withFinalAmount: ratio(won.filter((d) => d.amount_final != null && d.amount_final !== '').length, won.length, 'אין עסקאות שנסגרו'),
    withCost: ratio(won.filter((d) => d.direct_cost_estimate != null && d.direct_cost_estimate !== '').length, won.length, 'אין עסקאות שנסגרו'),
    withPayment: ratio(won.filter((d) => paidTotal(d) > 0).length, won.length, 'אין עסקאות שנסגרו'),
    unpaidWonIds: won.filter((d) => paidTotal(d) < num(d.amount_final ?? d.amount_expected)).map((d) => d.id),
    unpaidAmount: won.reduce((a, d) => a + Math.max(0, num(d.amount_final ?? d.amount_expected) - paidTotal(d)), 0),
  };
}

// ---------------------------------------------------------------- ad codes and lead quality
// Every ad has a short code (M12, G3, IG-REEL1). The site puts it in the WhatsApp message and in utm_content;
// a typed code is trimmed and uppercased, and may only use A-Z, 0-9, - and _ (at most 24 characters).
export const NO_CODE = '__no_code__';
export const normAdCode = (s) => String(s ?? '').trim().toUpperCase();
export const adCodeOk = (s) => /^[A-Z0-9_-]{1,24}$/.test(normAdCode(s));
// The lead's ad code: from the first touch, else the last touch, else the latest touchpoint that has one.
export function adCodeOf(contact, touchpoints = []) {
  if (!contact) return null;
  const v = normAdCode(contact.first_utm?.utm_content) || normAdCode(contact.last_utm?.utm_content);
  if (v) return v;
  let best = null;
  for (const t of touchpoints) if (t.contact_id === contact.id && !t.deleted_at && normAdCode(t.utm_content) && (!best || (t.at || '') > (best.at || ''))) best = t;
  return best ? normAdCode(best.utm_content) : null;
}
const FITS = ['high', 'medium', 'low'];

// Lead quality per ad code. Cohort: leads created in the period; their won deals count whenever they closed,
// so every column describes the same leads. Leads without a code get their own row.
export function adQualityReport({ contacts, deals, touchpoints = [], period }) {
  const tpBy = new Map();
  for (const t of touchpoints) { if (t.deleted_at || !t.contact_id) continue; if (!tpBy.has(t.contact_id)) tpBy.set(t.contact_id, []); tpBy.get(t.contact_id).push(t); }
  const wonBy = new Map();
  for (const d of deals) { if (d.deleted_at || d.outcome !== 'won' || !d.contact_id) continue; if (!wonBy.has(d.contact_id)) wonBy.set(d.contact_id, []); wonBy.get(d.contact_id).push(d); }
  const rows = new Map();
  for (const c of contacts) {
    if (c.deleted_at || !inP(c.created_at, period)) continue;
    const code = adCodeOf(c, tpBy.get(c.id)) || NO_CODE;
    if (!rows.has(code)) rows.set(code, { code, leads: [], high: [], medium: [], low: [], unrated: [], disqualified: [], wonDeals: [], revenue: 0 });
    const r = rows.get(code);
    r.leads.push(c.id);
    r[FITS.includes(c.fit) ? c.fit : 'unrated'].push(c.id);
    if (c.lead_status === 'disqualified') r.disqualified.push(c.id);
    for (const d of wonBy.get(c.id) || []) { r.wonDeals.push(d.id); r.revenue += num(d.amount_final ?? d.amount_expected); }
  }
  // most leads first; same count by code; "no code" last
  const out = [...rows.values()].sort((a, b) => (a.code === NO_CODE) - (b.code === NO_CODE) || b.leads.length - a.leads.length || (a.code < b.code ? -1 : 1));
  const total = { leads: 0, high: 0, medium: 0, low: 0, unrated: 0, disqualified: 0, wonDeals: 0, revenue: 0, withCode: 0 };
  for (const r of out) {
    for (const k of ['leads', 'high', 'medium', 'low', 'unrated', 'disqualified', 'wonDeals']) total[k] += r[k].length;
    total.revenue += r.revenue;
    if (r.code !== NO_CODE) total.withCode += r.leads.length;
  }
  return { rows: out, total };
}

// ---------------------------------------------------------------- sales performance
export function salesSummary({ contacts, deals, stages, history, period, now = new Date() }) {
  contacts = contacts.filter((c) => !c.deleted_at); deals = deals.filter((d) => !d.deleted_at);
  const newLeads = contacts.filter((c) => inP(c.created_at, period));
  const won = deals.filter((d) => d.outcome === 'won' && inP(d.closed_at, period));
  const lost = deals.filter((d) => d.outcome === 'lost' && inP(d.closed_at, period));
  const open = deals.filter((d) => d.outcome === 'open');
  const stageById = new Map(stages.map((s) => [s.id, s]));
  const prob = (d) => (d.probability_override ?? stageById.get(d.stage_id)?.probability ?? 0) / 100;
  const days = won.map((d) => (new Date(d.closed_at) - new Date(d.opened_at || d.created_at)) / 864e5).filter((x) => x >= 0);
  const revenue = won.reduce((a, d) => a + num(d.amount_final ?? d.amount_expected), 0);
  const collected = deals.filter((d) => collectedIn(d, period) !== 0);
  return {
    newLeads: newLeads.map((c) => c.id),
    won: won.map((d) => d.id),
    lost: lost.map((d) => d.id),
    open: open.map((d) => d.id),
    revenue,
    collected: collected.reduce((a, d) => a + collectedIn(d, period), 0),
    collectedIds: collected.map((d) => d.id),
    pipelineValue: open.reduce((a, d) => a + num(d.amount_expected), 0),
    weightedPipeline: open.reduce((a, d) => a + num(d.amount_expected) * prob(d), 0),
    winRate: ratio(won.length, won.length + lost.length, 'אין עסקאות שנסגרו בתקופה'),
    avgDeal: ratio(revenue, won.length, 'אין עסקאות שנסגרו'),
    avgDaysToClose: days.length ? { value: days.reduce((a, b) => a + b, 0) / days.length } : { value: null, reason: 'אין עסקאות שנסגרו' },
    lostReasons: countBy(lost, (d) => d.lost_reason || 'other'),
    funnel: funnel({ deals, stages, history, period }),
    forecast: forecast({ open, prob, now }),
  };
}

// Of deals opened in the period: how many reached each open stage (by stage history, so moving back doesn't hide it).
export function funnel({ deals, stages, history, period }) {
  const cohort = deals.filter((d) => inP(d.opened_at || d.created_at, period));
  const pipelines = new Set(cohort.map((d) => d.pipeline_id));
  const ordered = stages.filter((s) => !s.deleted_at && pipelines.has(s.pipeline_id)).sort((a, b) => a.position - b.position);
  const reached = new Map(cohort.map((d) => [d.id, new Set([d.stage_id])]));
  for (const h of history || []) if (reached.has(h.deal_id) && h.to_stage_id) reached.get(h.deal_id).add(h.to_stage_id);
  const pos = new Map(ordered.map((s) => [s.id, s.position]));
  const maxPos = new Map();
  for (const [id, set] of reached) {
    let m = -1;
    for (const sid of set) { const s = ordered.find((x) => x.id === sid); if (s && s.kind !== 'lost') m = Math.max(m, pos.get(sid)); }
    maxPos.set(id, m);
  }
  const steps = ordered.filter((s) => s.kind !== 'lost').map((s) => ({ stageId: s.id, name: s.name, ids: cohort.filter((d) => maxPos.get(d.id) >= s.position).map((d) => d.id) }));
  steps.forEach((s, i) => { s.fromPrev = i === 0 ? null : ratio(s.ids.length, steps[i - 1].ids.length); });
  // biggest drop between consecutive stages
  let worst = null;
  for (let i = 1; i < steps.length; i++) {
    const lostN = steps[i - 1].ids.length - steps[i].ids.length;
    if (steps[i - 1].ids.length >= 3 && (!worst || lostN > worst.lost)) worst = { from: steps[i - 1].name, to: steps[i].name, lost: lostN, rate: steps[i].fromPrev };
  }
  return { cohort: cohort.length, steps, worst };
}

function forecast({ open, prob, now }) {
  const out = [];
  for (let i = 0; i < 3; i++) {
    const s = new Date(now.getFullYear(), now.getMonth() + i, 1), e = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    const ds = open.filter((d) => d.expected_close && new Date(`${d.expected_close}T12:00:00`) >= s && new Date(`${d.expected_close}T12:00:00`) < e);
    out.push({ month: s, ids: ds.map((d) => d.id), best: ds.reduce((a, d) => a + num(d.amount_expected), 0), weighted: ds.reduce((a, d) => a + num(d.amount_expected) * prob(d), 0) });
  }
  const noDate = open.filter((d) => !d.expected_close);
  return { months: out, noDate: noDate.map((d) => d.id) };
}

function countBy(arr, fn) {
  const m = {};
  for (const x of arr) { const k = fn(x); m[k] = (m[k] || 0) + 1; }
  return m;
}

// ---------------------------------------------------------------- deal health (what needs attention)
// stuck: in the same open stage longer than the stage's rot_days (measured from stage entry, not last edit)
// noNext: open deal without an open task
export function dealHealth(deal, { stage, openTasks, now = new Date() }) {
  if (deal.outcome !== 'open') return { stuck: false, noNext: false, daysInStage: 0 };
  const since = new Date(deal.stage_entered_at || deal.opened_at || deal.created_at);
  const daysInStage = Math.floor((now - since) / 864e5);
  const rot = stage?.rot_days;
  const next = openTasks.filter((t) => t.deal_id === deal.id || (deal.contact_id && t.contact_id === deal.contact_id)).sort((a, b) => (a.due_at || '9') < (b.due_at || '9') ? -1 : 1)[0];
  return {
    stuck: !!rot && daysInStage > rot,
    daysInStage,
    noNext: !next,
    nextTask: next || null,
    overdue: !!(next?.due_at && new Date(next.due_at) < now),
  };
}

export function periodFor(key, now = new Date()) {
  const y = now.getFullYear(), m = now.getMonth();
  switch (key) {
    case 'this_month': return { from: new Date(y, m, 1), to: new Date(y, m + 1, 1), label: 'החודש' };
    case 'last_month': return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1), label: 'החודש הקודם' };
    case 'last_30': return { from: new Date(now - 30 * 864e5), to: new Date(now.getTime() + 1), label: '30 הימים האחרונים' };
    case 'this_quarter': { const q = Math.floor(m / 3) * 3; return { from: new Date(y, q, 1), to: new Date(y, q + 3, 1), label: 'הרבעון' }; }
    case 'last_90': return { from: new Date(now - 90 * 864e5), to: new Date(now.getTime() + 1), label: '90 הימים האחרונים' };
    case 'this_year': return { from: new Date(y, 0, 1), to: new Date(y + 1, 0, 1), label: 'השנה' };
    case 'last_12m': return { from: new Date(y, m - 11, 1), to: new Date(y, m + 1, 1), label: '12 החודשים האחרונים' };
    case 'all': return { from: new Date(2000, 0, 1), to: new Date(y + 10, 0, 1), label: 'כל הזמן' };
    default: return periodFor('this_month', now);
  }
}
