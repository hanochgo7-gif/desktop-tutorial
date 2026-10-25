// Business rules, mirrored from the database triggers (supabase/migrations/001_crm_core.sql).
// In remote mode they only make the optimistic UI accurate – the server re-applies them and wins.
// In local mode they are the only implementation, so keep both in sync.

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
      row.last_touch_at ||= row.first_touch_at;
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
    if (!row.source_id && row.contact_id && (!prev || prev.contact_id !== row.contact_id)) {
      const c = store.get('crm_contacts', row.contact_id);
      if (c) { row.source_id = c.first_source_id || null; row.campaign_id ||= c.first_campaign_id || null; }
    }
    row.amount_paid ??= 0;
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
  if (t === 'crm_touchpoints') {
    const c = store.get('crm_contacts', row.contact_id);
    if (c) {
      if (!c.first_touch_at) { c.first_source_id ||= row.source_id; c.first_campaign_id ||= row.campaign_id; c.first_touch_at = row.at; }
      if (!c.last_touch_at || row.at >= c.last_touch_at) { c.last_source_id = row.source_id; c.last_campaign_id = row.campaign_id; c.last_touch_at = row.at; }
    }
  }
}
