// Move the data of browser-only mode (a downloaded backup file) into the signed-in account on the server.
// Nothing is replaced: rows are added. Stages and sources are matched by key, since the server made its own;
// a lead that already exists (same phone or email) is kept and linked instead of being added twice.
// Every row goes through the normal store insert, so the server runs its usual rules on it.

import { store } from './store.js';
import { normPhone } from './rules.js';

const LOCAL_ONLY = ['sample', 'workspace_id', 'seq', 'version', 'updated_at', 'created_by', 'phone_norm', 'outcome', 'stage_entered_at'];
const clean = (row) => { const o = { ...row }; for (const k of LOCAL_ONLY) delete o[k]; return o; };

export function planMove(backup, { skipSample = true } = {}) {
  const rows = backup.rows || {};
  const isSample = (c) => skipSample && (c.tags || []).includes('דוגמה');
  const contacts = (rows.crm_contacts || []).filter((c) => !c.deleted_at && !isSample(c));
  const ids = new Set(contacts.map((c) => c.id));
  const deals = (rows.crm_deals || []).filter((d) => !d.deleted_at && (!d.contact_id || ids.has(d.contact_id)) && !(skipSample && (d.tags || []).includes('דוגמה')));
  const dealIds = new Set(deals.map((d) => d.id));
  const linked = (x) => !x.deleted_at && (!x.contact_id || ids.has(x.contact_id)) && (!x.deal_id || dealIds.has(x.deal_id));
  return {
    contacts, deals,
    tasks: (rows.crm_tasks || []).filter(linked),
    activities: (rows.crm_activities || []).filter(linked),
    documents: (rows.crm_documents || []).filter(linked),
    expenses: (rows.crm_expenses || []).filter((x) => !x.deleted_at && (!x.deal_id || dealIds.has(x.deal_id))),
    spend: (rows.crm_ad_spend || []).filter((x) => !x.deleted_at && !(skipSample && x.sample)),
    stages: rows.crm_stages || [], sources: rows.crm_sources || [],
    settings: backup.settings || {},
  };
}

export async function moveToServer(backup, { skipSample = true, onProgress = () => {} } = {}) {
  const plan = planMove(backup, { skipSample });
  const done = { contacts: 0, linked: 0, deals: 0, tasks: 0, activities: 0, documents: 0, expenses: 0, spend: 0, skipped: [] };
  const total = plan.contacts.length + plan.deals.length + plan.tasks.length + plan.activities.length + plan.documents.length + plan.expenses.length + plan.spend.length;
  let step = 0;
  const tick = () => onProgress(++step, total);

  // stages by key, sources by key (a source the user added in the browser is created on the server)
  const stageMap = new Map();
  const serverStages = store.all('crm_stages');
  for (const s of plan.stages) {
    const m = serverStages.find((x) => x.key === s.key) || serverStages.find((x) => x.name === s.name) || serverStages.find((x) => x.kind === s.kind);
    if (m) stageMap.set(s.id, m);
  }
  const sourceMap = new Map();
  for (const s of plan.sources) {
    let m = store.find('crm_sources', (x) => x.key === s.key) || store.find('crm_sources', (x) => x.name === s.name);
    if (!m) m = await store.insert('crm_sources', { key: s.key, name: s.name, channel: s.channel || 'other', is_paid: !!s.is_paid, utm_sources: s.utm_sources || [], position: s.position || 50 });
    sourceMap.set(s.id, m.id);
  }
  const src = (id) => (id ? sourceMap.get(id) || null : null);

  const contactMap = new Map();
  for (const c of plan.contacts) {
    const phone = normPhone(c.phone);
    const same = store.find('crm_contacts', (x) => (phone && x.phone_norm === phone) || (c.email && x.email === String(c.email).toLowerCase()));
    if (same) { contactMap.set(c.id, same.id); done.linked++; tick(); continue; }
    try {
      const row = await store.insert('crm_contacts', { ...clean(c), first_source_id: src(c.first_source_id), last_source_id: src(c.last_source_id), first_campaign_id: null, last_campaign_id: null, company_id: null, owner_id: store.userId });
      contactMap.set(c.id, row.id); done.contacts++;
    } catch (e) { done.skipped.push(`ליד ${c.first_name || c.phone || c.email || ''}: ${e.message}`); }
    tick();
  }
  const cid = (id) => (id ? contactMap.get(id) || null : null);

  const dealMap = new Map();
  for (const d of plan.deals) {
    const st = stageMap.get(d.stage_id);
    if (!st) { done.skipped.push(`עסקה ${d.name}: השלב לא נמצא`); tick(); continue; }
    try {
      const row = await store.insert('crm_deals', { ...clean(d), contact_id: cid(d.contact_id), stage_id: st.id, pipeline_id: st.pipeline_id, source_id: src(d.source_id), campaign_id: null, company_id: null, owner_id: store.userId });
      dealMap.set(d.id, row.id); done.deals++;
    } catch (e) { done.skipped.push(`עסקה ${d.name}: ${e.message}`); }
    tick();
  }
  const did = (id) => (id ? dealMap.get(id) || null : null);

  // [table, rows, counter, extra columns]; expenses have a deal but no contact
  const rest = [
    ['crm_tasks', plan.tasks, 'tasks', (x) => ({ contact_id: cid(x.contact_id), owner_id: store.userId })],
    ['crm_activities', plan.activities, 'activities', (x) => ({ contact_id: cid(x.contact_id), owner_id: store.userId })],
    ['crm_documents', plan.documents, 'documents', (x) => ({ contact_id: cid(x.contact_id) })],
    ['crm_expenses', plan.expenses, 'expenses', () => ({})],
  ];
  for (const [table, list, key, extra] of rest) {
    for (const x of list) {
      try {
        await store.insert(table, { ...clean(x), deal_id: did(x.deal_id), ...extra(x) });
        done[key]++;
      } catch (e) { done.skipped.push(`${table}: ${e.message}`); }
      tick();
    }
  }
  for (const x of plan.spend) {
    try {
      const sid = src(x.source_id);
      const dup = store.find('crm_ad_spend', (s) => s.source_id === sid && String(s.day).slice(0, 10) === String(x.day).slice(0, 10) && !s.campaign_id);
      if (!dup && sid) { await store.insert('crm_ad_spend', { ...clean(x), source_id: sid, campaign_id: null, origin: 'manual' }); done.spend++; }
    } catch (e) { done.skipped.push(`הוצאת פרסום: ${e.message}`); }
    tick();
  }
  // business details: fill only what the account doesn't have yet
  const s = store.settings, fill = {};
  for (const [k, v] of Object.entries(plan.settings)) if (v != null && v !== '' && (s[k] == null || s[k] === '')) fill[k] = v;
  if (Object.keys(fill).length) await store.saveSettings(fill);
  await store.flush();
  return done;
}
