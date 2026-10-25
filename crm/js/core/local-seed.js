// Trial mode only: the same defaults the server creates in crm_bootstrap(), plus optional sample data.
// Sample records are tagged "דוגמה" so they can never be mistaken for real customers.

import { prng, DAY } from './util.js';

const STAGES = [
  // steps 1-3 of the sales process (new / attempting / connected) are the lead's status, not deal stages
  ['qualified', 'ליד מתאים', 20, 'open', 5], ['discovery_set', 'שיחת אפיון נקבעה', 35, 'open', 7], ['discovery_done', 'שיחת אפיון התקיימה', 50, 'open', 5],
  ['proposal', 'הצעת מחיר נשלחה', 65, 'open', 7], ['negotiation', 'משא ומתן', 80, 'open', 10], ['won', 'נסגר בהצלחה', 100, 'won', null], ['lost', 'נסגר בהפסד', 0, 'lost', null],
];
const SOURCES = [
  ['google_ads', 'Google Ads', 'paid_search', true], ['meta_ads', 'Meta Ads (פייסבוק/אינסטגרם)', 'paid_social', true], ['organic', 'חיפוש אורגני בגוגל', 'organic_search', false],
  ['social', 'רשתות חברתיות (אורגני)', 'organic_social', false], ['referral', 'הפניה מלקוח', 'referral', false], ['outbound', 'פנייה יזומה שלי', 'outbound', false],
  ['whatsapp', 'WhatsApp', 'whatsapp', false], ['repeat', 'לקוח חוזר', 'repeat', false], ['partner', 'שיתוף פעולה', 'partner', false], ['other', 'מקור אחר', 'other', false],
];

export function installDefaults(store) {
  const now = new Date().toISOString();
  const base = { workspace_id: 'local', created_at: now, updated_at: now };
  const pl = { id: crypto.randomUUID(), ...base, name: 'מכירות', is_default: true, position: 0 };
  store._put('crm_pipelines', pl);
  STAGES.forEach(([key, name, probability, kind, rot_days], i) => store._put('crm_stages', { id: crypto.randomUUID(), ...base, pipeline_id: pl.id, key, name, position: i, probability, kind, rot_days }));
  SOURCES.forEach(([key, name, channel, is_paid], i) => store._put('crm_sources', { id: crypto.randomUUID(), ...base, key, name, channel, is_paid, active: true, position: i, utm_sources: [] }));
  store._persistLocal();
}

const FIRST = ['נועה', 'יוסי', 'מיכל', 'אבי', 'שירן', 'דניאל', 'תמר', 'עומר', 'רותם', 'איתי', 'הילה', 'גיא', 'ליאת', 'אורי', 'מאיה', 'עידו', 'קרן', 'אלון', 'יעל', 'נדב'];
const LAST = ['כהן', 'לוי', 'מזרחי', 'פרץ', 'ביטון', 'אברהם', 'פרידמן', 'שפירא', 'אזולאי', 'דהן', 'גבאי', 'חדד'];
const BIZ = ['קליניקה', 'סטודיו', 'משרד עו"ד', 'מסעדה', 'חנות', 'גן אירועים', 'רואה חשבון', 'מאמן כושר', 'נגריה', 'מספרה'];
const SERVICES = ['אתר תדמית', 'דף נחיתה', 'חנות אונליין', 'תחזוקה', 'קידום / SEO'];

export function seedSample(store) {
  const R = prng(7);
  const now = Date.now();
  const iso = (t) => new Date(t).toISOString();
  const src = (k) => store.find('crm_sources', (s) => s.key === k)?.id;
  const st = (k) => store.find('crm_stages', (s) => s.key === k);
  const pl = store.all('crm_pipelines')[0];
  const put = (t, r) => store._put(t, { id: crypto.randomUUID(), workspace_id: 'local', updated_at: r.created_at || iso(now), ...r });
  for (let m = 0; m < 6; m++) {
    const day = new Date(new Date().getFullYear(), new Date().getMonth() - m, 1);
    const ds = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-01`;
    put('crm_ad_spend', { day: ds, source_id: src('google_ads'), amount: R.int(25, 45) * 100, origin: 'manual', currency: 'ILS', created_at: iso(day) });
    put('crm_ad_spend', { day: ds, source_id: src('meta_ads'), amount: R.int(12, 25) * 100, origin: 'manual', currency: 'ILS', created_at: iso(day) });
  }
  const mix = [['google_ads', 5], ['meta_ads', 4], ['organic', 2], ['referral', 2], ['whatsapp', 1], [null, 1]];
  for (let i = 0; i < 70; i++) {
    const created = now - Math.floor(Math.pow(R(), 1.3) * 175) * DAY - R.int(0, 20) * 36e5;
    const s = R.weighted(mix);
    const fn = R.pick(FIRST), ln = R.pick(LAST);
    const c = { id: crypto.randomUUID(), workspace_id: 'local', first_name: fn, last_name: ln, phone: `05${R.int(0, 8)}-${R.int(100, 999)}${R.int(1000, 9999)}`, company_name: `${R.pick(BIZ)} ${ln} (דוגמה)`,
      first_source_id: src(s), last_source_id: src(s), first_touch_at: s ? iso(created) : null, lifecycle: 'lead', lead_status: 'new', origin: 'manual',
      need: `${R.pick(SERVICES)} לעסק`, budget_estimate: R.int(3, 25) * 1000, created_at: iso(created), updated_at: iso(created), tags: ['דוגמה'] };
    c.phone_norm = c.phone.replace(/\D/g, '');
    const age = (now - created) / DAY;
    // a lead can only have closed deals if it is old enough for the sales cycle to have happened
    const path = age < 10 ? R.weighted([['none', 3], ['open', 2]]) : R.weighted([['none', 3], ['open', 2], ['won', 2], ['lost', 2]]);
    if (path === 'none') { c.lead_status = age > 3 ? R.pick(['attempting', 'connected', 'nurture', 'disqualified']) : 'new'; if (c.lead_status === 'disqualified') c.disqualify_reason = 'תקציב נמוך מדי'; }
    store._put('crm_contacts', c);
    if (age > 1 && c.lead_status !== 'new') put('crm_activities', { type: 'call', at: iso(created + 36e5 * R.int(1, 30)), contact_id: c.id, outcome: R.pick(['דיברנו', 'לא ענה']), body: 'שיחת היכרות (דוגמה)', direction: 'out', created_at: iso(created) });
    if (path === 'none') {
      if (!['disqualified', 'nurture'].includes(c.lead_status) && R.chance(0.7)) put('crm_tasks', { title: `לחזור ל${fn}`, type: 'call', status: 'open', due_at: iso(now + R.int(-3, 5) * DAY), contact_id: c.id, priority: 'normal', created_at: iso(created) });
      continue;
    }
    c.lead_status = 'qualified'; c.lifecycle = path === 'won' ? 'customer' : 'opportunity';
    const amount = R.int(4, 30) * 1000;
    const closed = path === 'open' ? null : Math.min(now - DAY, created + R.int(7, Math.max(8, Math.min(40, Math.floor(age) - 1))) * DAY);
    const stage = path === 'won' ? st('won') : path === 'lost' ? st('lost') : st(R.pick(['qualified', 'discovery_set', 'discovery_done', 'proposal', 'negotiation']));
    const d = { id: crypto.randomUUID(), workspace_id: 'local', name: `${R.pick(SERVICES)} – ${c.company_name}`, contact_id: c.id, pipeline_id: pl.id, stage_id: stage.id, outcome: stage.kind,
      amount_expected: amount, amount_final: path === 'won' ? amount - R.int(0, 2) * 500 : null, source_id: c.first_source_id, opened_at: iso(created + DAY), created_at: iso(created + DAY),
      stage_entered_at: iso(closed || now - R.int(1, 15) * DAY), expected_close: path === 'open' ? new Date(now + R.int(3, 40) * DAY).toISOString().slice(0, 10) : null,
      closed_at: closed ? iso(closed) : null, lost_reason: path === 'lost' ? R.pick(['price', 'competitor', 'no_response', 'timing']) : null,
      direct_cost_estimate: path === 'won' && R.chance(0.8) ? Math.round(amount * 0.25) : null, amount_paid: 0, updated_at: iso(created) };
    if (path === 'won' && R.chance(0.75)) { d.amount_paid = d.amount_final; d.paid_at = new Date(closed + R.int(0, 10) * DAY).toISOString().slice(0, 10); if (new Date(d.paid_at) > new Date()) d.paid_at = new Date().toISOString().slice(0, 10); }
    store._put('crm_deals', d);
    put('crm_deal_stage_history', { deal_id: d.id, from_stage_id: null, to_stage_id: st('qualified').id, at: d.opened_at, created_at: d.opened_at });
    if (stage.key !== 'qualified') put('crm_deal_stage_history', { deal_id: d.id, from_stage_id: st('qualified').id, to_stage_id: stage.id, at: d.stage_entered_at, created_at: d.stage_entered_at });
    if (path === 'open' && R.chance(0.75)) put('crm_tasks', { title: 'פולואפ על ההצעה', type: 'followup', status: 'open', due_at: iso(now + R.int(-4, 6) * DAY), contact_id: c.id, deal_id: d.id, priority: 'normal', created_at: iso(created) });
  }
  store._persistLocal();
}
