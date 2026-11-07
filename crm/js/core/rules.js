// Business rules, mirrored from the database triggers (supabase/migrations/001_crm_core.sql).
// In remote mode they only make the optimistic UI accurate – the server re-applies them and wins.
// In local mode they are the only implementation, so keep both in sync.

// round to agorot like Postgres round(x, 2); toPrecision removes float noise (1.005 -> 1.01)
const r2 = (n) => Math.round(Number((Number(n) * 100).toPrecision(12))) / 100;

export function normPhone(p) {
  let d = String(p ?? '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  return d.startsWith('972') ? `0${d.slice(3)}` : d;
}

export function beforeSave(t, row, prev, store) {
  const now = new Date().toISOString();
  if (t === 'crm_contacts') {
    row.email = row.email ? String(row.email).trim().toLowerCase() || null : null;
    row.phone = row.phone ? String(row.phone).trim() || null : null;
    row.phone_norm = normPhone(row.phone);
    if (!prev && row.first_source_id) {
      row.first_touch_at ||= now;
      row.last_source_id ||= row.first_source_id;
      row.last_campaign_id ||= row.first_campaign_id || null;
      row.last_touch_at ||= row.first_touch_at;
    }
    // the server has a unique index on email among live leads
    if (row.email && !row.deleted_at && (!prev || prev.email !== row.email) && store?.find('crm_contacts', (c) => c.id !== row.id && !c.deleted_at && c.email === row.email)) {
      const e = new Error('crm_contacts_email_uq'); e.details = 'crm_contacts_email_uq'; throw e;
    }
    if (prev?.first_source_id && row.first_source_id !== prev.first_source_id) {
      const e = new Error('first_source_locked'); e.details = 'first_source_locked'; throw e;
    }
    if (prev?.first_touch_at) { row.first_touch_at = prev.first_touch_at; row.first_campaign_id = prev.first_campaign_id; row.first_utm = prev.first_utm; }
    if (row.lifecycle === 'customer' && !row.became_customer_at) row.became_customer_at = now;
    row.lifecycle ||= 'lead';
    row.lead_status ||= 'new';
  }
  if (t === 'crm_deals') {
    const st = store.get('crm_stages', row.stage_id);
    if (st) {
      row.pipeline_id = st.pipeline_id;
      row.outcome = st.kind;
      if (!prev || prev.stage_id !== row.stage_id) row.stage_entered_at = now;
      if (st.kind === 'won' || st.kind === 'lost') {
        row.closed_at ||= now;
        if (st.kind === 'won' && (row.amount_final == null || row.amount_final === '')) row.amount_final = row.amount_expected ?? null;
        if (st.kind === 'lost' && !row.lost_reason) row.lost_reason = 'other';
      } else row.closed_at = null;
    }
    row.opened_at ||= now;
    // an old sale entered today: the deal opened no later than it closed (server check crm_deals_check)
    if (row.closed_at && row.closed_at < row.opened_at) row.opened_at = row.closed_at;
    if (!row.source_id && row.contact_id) {
      const c = store.get('crm_contacts', row.contact_id);
      if (c) { row.source_id = c.first_source_id || null; row.campaign_id ||= c.first_campaign_id || null; }
    }
    row.amount_paid ??= 0;
  }
  if (t === 'crm_documents') {
    // same as the crm_documents_rules trigger: totals from the lines, status from what was paid
    let sub = 0;
    for (const it of row.items || []) sub += r2((Number(it.qty) || 0) * (Number(it.price) || 0));
    row.subtotal = r2(sub);
    row.vat = r2(row.subtotal * (Number(row.vat_rate) || 0) / 100);
    row.total = r2(row.subtotal + row.vat);
    row.payments ||= [];
    row.paid = r2(row.payments.reduce((a, p) => a + (Number(p.amount) || 0), 0));
    if (row.status !== 'canceled') {
      if (row.total > 0 && row.paid >= row.total - 0.005) row.status = 'paid';
      else if (row.paid > 0 && ['draft', 'sent', 'paid'].includes(row.status)) row.status = 'partial';
      else if (row.status === 'paid' || row.status === 'partial') row.status = 'sent';
    }
    row.status ||= 'draft';
  }
  if (t === 'crm_touchpoints') {
    // column defaults on the server
    row.at ||= now;
    row.kind ||= 'manual';
  }
  if (t === 'crm_tasks') {
    row.status ||= 'open';
    if (row.status === 'done') row.completed_at ||= now; else row.completed_at = null;
  }
  return row;
}

// Side effects the server does in AFTER triggers; local mode only.
export function afterSaveLocal(t, row, prev, store) {
  const now = new Date().toISOString();
  if (t === 'crm_deals') {
    if (!prev || prev.stage_id !== row.stage_id) {
      store._put('crm_deal_stage_history', { id: crypto.randomUUID(), workspace_id: row.workspace_id, deal_id: row.id, from_stage_id: prev?.stage_id || null, to_stage_id: row.stage_id, at: now, seq: ++store.cursor });
    }
    const c = store.get('crm_contacts', row.contact_id);
    if (c) {
      if (row.outcome === 'won' && prev?.outcome !== 'won' && c.lifecycle !== 'customer') { c.lifecycle = 'customer'; c.became_customer_at ||= row.closed_at; }
      else if (!prev && row.outcome === 'open' && ['lead', 'qualified'].includes(c.lifecycle)) c.lifecycle = 'opportunity';
    }
  }
  // crm_touchpoint_apply: runs on insert only; first touch is set once, last touch moves forward
  if (t === 'crm_touchpoints' && !prev && !row.deleted_at) {
    const c = store.get('crm_contacts', row.contact_id);
    if (c) {
      const utm = {};
      for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'click_id_type', 'landing_page', 'referrer', 'kind']) if (row[k] != null) utm[k] = row[k];
      if (!c.first_touch_at) { c.first_source_id ||= row.source_id || null; c.first_campaign_id ||= row.campaign_id || null; c.first_utm = utm; c.first_touch_at = row.at; }
      if (!c.last_touch_at || row.at >= c.last_touch_at) { c.last_source_id = row.source_id || null; c.last_campaign_id = row.campaign_id || null; c.last_utm = utm; c.last_touch_at = row.at; }
    }
  }
}
