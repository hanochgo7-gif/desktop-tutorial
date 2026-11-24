// Drill-down: every number in the app opens the records behind it.

import { html, fmt } from '../core/util.js';
import { store } from '../core/store.js';
import { contactName, stageName, sourceName, label, LEAD_STATUS, color } from '../core/model.js';
import { modal, badge, avatar } from './components.js';

export function showRecords(title, { contacts = null, deals = null, note = '' } = {}) {
  const cs = (contacts || []).map((id) => store.get('crm_contacts', id)).filter(Boolean);
  const ds = (deals || []).map((id) => store.get('crm_deals', id)).filter(Boolean);
  const total = ds.reduce((a, d) => a + Number(d.outcome === 'won' ? d.amount_final ?? d.amount_expected : d.amount_expected || 0), 0);
  modal({
    title, size: 'lg',
    body: html`
      ${note ? html`<p class="muted small">${note}</p>` : ''}
      ${!cs.length && !ds.length ? html`<p class="muted">אין רשומות.</p>` : ''}
      ${cs.length ? html`<p class="muted small">${fmt.number(cs.length)} לידים</p><div class="list">${cs.map((c) => html`
        <a class="list-row" href="#/c/${c.id}" data-close>${avatar(contactName(c), { size: 'sm' })}
          <span class="grow"><b>${contactName(c)}</b><small class="muted">${[c.company_name, sourceName(c.first_source_id), fmt.date(c.created_at)].filter(Boolean).join(' | ')}</small></span>
          ${badge(label(LEAD_STATUS, c.lead_status), color(LEAD_STATUS, c.lead_status))}</a>`)}</div>` : ''}
      ${ds.length ? html`<p class="muted small">${fmt.number(ds.length)} עסקאות, ${fmt.money(total)}</p><div class="list">${ds.map((d) => html`
        <a class="list-row" href="#/d/${d.id}" data-close>
          <span class="grow"><b>${d.name}</b><small class="muted">${[contactName(store.get('crm_contacts', d.contact_id)), stageName(d.stage_id), d.closed_at ? `נסגר ${fmt.date(d.closed_at)}` : ''].filter(Boolean).join(' | ')}</small></span>
          <span class="num money">${fmt.money(d.outcome === 'won' ? d.amount_final ?? d.amount_expected : d.amount_expected)}</span>
          ${Number(d.amount_paid) > 0 ? html`<small class="muted">נגבה ${fmt.money(d.amount_paid)}</small>` : ''}</a>`)}</div>` : ''}`,
  });
}
