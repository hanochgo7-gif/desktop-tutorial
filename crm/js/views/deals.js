// Sales pipeline board. Drag a card to move it; on touch or keyboard use the card's "move" menu.
// Won/lost columns collapse to the last 30 days so the board stays about open work.

import { html, render, on, fmt, $, $$ } from '../core/util.js';
import { store } from '../core/store.js';
import { contactName, stages, openTasks } from '../core/model.js';
import { dealHealth } from '../core/metrics.js';
import { pageHeader, icon, badge, setTitle, menu, emptyState } from '../ui/components.js';
import { openDealForm, moveDeal } from '../ui/forms.js';

export default async function view(el, ctx) {
  setTitle('עסקאות');
  const draw = () => {
    const sts = stages();
    const tasks = openTasks();
    const since = Date.now() - 30 * 864e5;
    const deals = store.all('crm_deals');
    const openDeals = deals.filter((d) => d.outcome === 'open');
    render(el, html`
      ${pageHeader({
        title: 'עסקאות',
        subtitle: `${fmt.number(openDeals.length)} פתוחות, ${fmt.money(openDeals.reduce((a, d) => a + Number(d.amount_expected || 0), 0))}`,
        actions: html`<button class="btn btn-primary" data-act="new">${icon('plus')}עסקה חדשה</button>`,
      })}
      ${!deals.length ? emptyState({ icon: 'deal', title: 'עוד אין עסקאות', text: 'עסקה נפתחת מתוך ליד מתאים. כך רואים כמה כסף בדרך ובאיזה שלב.', action: { act: 'new', label: 'עסקה חדשה', icon: 'plus' } }) : ''}
      <div class="board" role="list" aria-label="שלבי מכירה">
        ${sts.map((s) => {
          const inCol = deals.filter((d) => d.stage_id === s.id && (s.kind === 'open' || new Date(d.closed_at) >= since));
          const sum = inCol.reduce((a, d) => a + Number((s.kind === 'won' ? d.amount_final : d.amount_expected) || 0), 0);
          return html`<section class="col ${s.kind}" role="listitem" data-stage="${s.id}" aria-label="${s.name}">
            <header class="col-head"><h3>${s.name} <span class="col-count">${inCol.length}</span></h3>
              <div class="col-sum"><span>${fmt.money(sum)}</span>${s.kind === 'open' ? html`<span class="muted">${s.probability}%</span>` : html`<span class="muted">30 יום</span>`}</div></header>
            <div class="col-body" data-drop="${s.id}">
              ${inCol.sort((a, b) => Number(b.amount_expected || 0) - Number(a.amount_expected || 0)).map((d) => {
                const h = dealHealth(d, { stage: s, openTasks: tasks });
                const c = store.get('crm_contacts', d.contact_id);
                return html`<article class="card ${h.stuck ? 'is-rotting' : ''}" draggable="true" data-id="${d.id}">
                  <a class="card-title" href="#/d/${d.id}">${d.name}</a>
                  <div class="card-meta"><span>${contactName(c)}</span><span class="card-amount">${fmt.money(s.kind === 'won' ? d.amount_final : d.amount_expected)}</span></div>
                  ${s.kind === 'open' ? html`<div class="card-meta">
                    ${h.noNext ? html`<span class="rot no-next">${icon('alert')}אין צעד הבא</span>` : html`<span class="${h.overdue ? 'due-overdue' : ''}">${icon('flag', 'ic-xs')} ${fmt.relative(h.nextTask.due_at) || 'בלי תאריך'}</span>`}
                    ${h.stuck ? html`<span class="rot">${h.daysInStage} ימים בשלב</span>` : ''}</div>` : ''}
                  <button class="btn-icon sm card-menu" data-act="move" data-id="${d.id}" aria-label="העברת ${d.name} לשלב אחר" aria-haspopup="menu">${icon('moreV')}</button>
                </article>`;
              })}
            </div></section>`;
        })}
      </div>`);
  };
  draw();
  ctx.watch(['crm_deals', 'crm_tasks', 'crm_stages'], draw);

  on(el, 'click', '[data-act]', (e, b) => {
    if (b.dataset.act === 'new') openDealForm();
    if (b.dataset.act === 'move') {
      const d = store.get('crm_deals', b.dataset.id);
      menu(b, [{ header: 'העברה לשלב' }, ...stages().map((s) => ({ label: s.name, checked: s.id === d.stage_id, onClick: () => moveDeal(d, s.id) }))]);
    }
  });
  // drag and drop (desktop)
  let dragId = null;
  el.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    dragId = card.dataset.id;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
  });
  el.addEventListener('dragend', () => { $$('.dragging, .drop-target', el).forEach((x) => x.classList.remove('dragging', 'drop-target')); dragId = null; });
  el.addEventListener('dragover', (e) => {
    const col = e.target.closest('.col');
    if (!col || !dragId) return;
    e.preventDefault();
    $$('.drop-target', el).forEach((x) => x !== col && x.classList.remove('drop-target'));
    col.classList.add('drop-target');
  });
  el.addEventListener('drop', async (e) => {
    const col = e.target.closest('.col');
    if (!col || !dragId) return;
    e.preventDefault();
    const d = store.get('crm_deals', dragId);
    col.classList.remove('drop-target');
    if (d) await moveDeal(d, col.dataset.stage);
  });
}
