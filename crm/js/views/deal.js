// Deal page: stage path, money (expected / closed / collected / cost), source, next step, history.

import { html, render, on, fmt, whatsappUrl } from '../core/util.js';
import { store } from '../core/store.js';
import { contactName, stages, sourceName, LOST_REASONS, label } from '../core/model.js';
import { dealHealth, paymentsOf, paidTotal } from '../core/metrics.js';
import { DOC_KINDS, DOC_STATUS, docStatus, EXPENSE_CATEGORIES } from '../core/finance.js';
import { pageHeader, icon, badge, setTitle, toast, confirmDialog, navigateAfterModals } from '../ui/components.js';
import { openDealForm, openActivityForm, openTaskForm, openMoneyDialog, moveDeal } from '../ui/forms.js';
import { timeline, timelineHtml, nextStepCard, completeTask } from './contact.js';

export default async function view(el, ctx) {
  const id = ctx.params.id;
  const draw = () => {
    const d = store.get('crm_deals', id);
    if (!d) { render(el, html`<div class="empty"><h3>העסקה לא נמצאה</h3><a class="btn" href="#/deals">ללוח העסקאות</a></div>`); return; }
    setTitle(d.name);
    const c = store.get('crm_contacts', d.contact_id);
    const sts = stages(d.pipeline_id);
    const cur = sts.find((s) => s.id === d.stage_id);
    const h = dealHealth(d, { stage: cur, openTasks: store.filter('crm_tasks', (t) => t.status === 'open') });
    const total = d.outcome === 'won' ? d.amount_final : d.amount_expected;
    const unpaid = d.outcome === 'won' ? Math.max(0, Number(d.amount_final || 0) - Number(d.amount_paid || 0)) : null;
    const profit = d.outcome === 'won' && d.direct_cost_estimate != null ? Number(d.amount_final || 0) - Number(d.direct_cost_estimate) : null;
    render(el, html`
      ${pageHeader({ title: d.name, subtitle: c ? html`<a href="#/c/${c.id}">${contactName(c)}</a>${c.company_name ? ` | ${c.company_name}` : ''}` : '', back: { href: '#/deals', label: 'עסקאות' },
        actions: html`<button class="btn btn-ghost" data-act="edit">${icon('edit')}עריכה</button><button class="btn-icon" data-act="delete" aria-label="מחיקת העסקה">${icon('trash')}</button>` })}
      <nav class="stage-path" aria-label="שלב העסקה">${sts.map((s) => html`<button class="${s.id === d.stage_id ? 'current' : s.position < (cur?.position ?? 0) && s.kind === 'open' ? 'done' : ''} ${s.kind}" data-stage="${s.id}" aria-current="${s.id === d.stage_id ? 'step' : 'false'}">${s.name}</button>`)}</nav>
      ${d.outcome === 'open' && (h.stuck || h.noNext) ? html`<div class="notice notice-warn">${icon('alert')}<div>${h.noNext ? html`<b>אין צעד הבא לעסקה הזו.</b> קבעו משימה כדי שלא תישכח.` : ''} ${h.stuck ? html`<b>העסקה ${h.daysInStage} ימים בשלב "${cur?.name}"</b> (יעד: עד ${cur?.rot_days} ימים).` : ''}</div></div>` : ''}
      <div class="rec2">
        <aside class="stack">
          <section class="panel">
            <div class="panel-head"><h2>כסף</h2><button class="btn btn-sm btn-ghost" data-act="money">${icon('edit')}תשלומים ועלויות</button></div>
            <dl class="dl">
              <dt>${d.outcome === 'won' ? 'סכום סופי' : 'סכום צפוי'}</dt><dd class="num ${d.outcome === 'won' ? 'money' : ''}">${total != null ? fmt.money(total) : html`<span class="warn-text">חסר</span>`} <small class="muted">לפני מע"מ</small></dd>
              ${d.outcome === 'won' ? html`
                <dt>נגבה</dt><dd class="num">${fmt.money(d.amount_paid || 0)}${paymentsOf(d).length ? html` <small class="muted">${paymentsOf(d).length === 1 ? 'תשלום אחד' : `${paymentsOf(d).length} תשלומים`}, אחרון ${fmt.date(d.paid_at)}</small>` : ''}</dd>
                <dt>יתרה לגבייה</dt><dd class="num ${unpaid > 0 ? 'warn-text' : ''}">${fmt.money(unpaid)}</dd>
                <dt>עלות ישירה</dt><dd class="num">${d.direct_cost_estimate != null ? fmt.money(d.direct_cost_estimate) : html`<span class="warn-text">לא הוזנה</span>`}</dd>
                <dt>רווח גולמי</dt><dd class="num">${profit != null ? fmt.money(profit) : html`<span class="muted">לא ניתן לחישוב בלי עלות</span>`}</dd>`
              : html`<dt>הסתברות</dt><dd class="num">${d.probability_override ?? cur?.probability ?? 0}%</dd>
                <dt>משוקלל</dt><dd class="num">${fmt.money(Number(d.amount_expected || 0) * ((d.probability_override ?? cur?.probability ?? 0) / 100))}</dd>`}
            </dl>
          </section>
          <section class="panel">
            <div class="panel-head"><h2>פרטים</h2></div>
            <dl class="dl">
              <dt>סוג שירות</dt><dd>${d.service_type || html`<span class="nil">—</span>`}</dd>
              <dt>מקור (לדוחות)</dt><dd>${d.source_id ? sourceName(d.source_id) : html`<span class="warn-text">לא ידוע</span>`}</dd>
              <dt>נפתחה</dt><dd>${fmt.date(d.opened_at)}</dd>
              ${d.outcome === 'open' ? html`<dt>סגירה צפויה</dt><dd>${d.expected_close ? fmt.date(d.expected_close) : html`<span class="nil">—</span>`}</dd>` : html`<dt>נסגרה</dt><dd>${fmt.date(d.closed_at)}</dd>`}
              ${d.outcome === 'open' ? html`<dt>ימים בשלב</dt><dd class="num">${h.daysInStage ?? '—'}</dd>` : ''}
              ${d.next_step ? html`<dt>הצעד הבא</dt><dd>${d.next_step}</dd>` : ''}
              ${d.outcome === 'lost' ? html`<dt>סיבת הפסד</dt><dd>${label(LOST_REASONS, d.lost_reason)}${d.lost_note ? html`<br><small class="muted">${d.lost_note}</small>` : ''}</dd>` : ''}
              ${d.won_reason ? html`<dt>למה זכינו</dt><dd>${d.won_reason}</dd>` : ''}
            </dl>
          </section>
        </aside>
        <div class="stack">
          ${d.outcome === 'open' ? nextStepCard({ contactId: d.contact_id, dealId: id }) : ''}
          <div class="quick-bar">
            ${c?.phone ? html`<a class="btn btn-soft" href="tel:${c.phone}">${icon('phone')}התקשרות</a><a class="btn btn-soft" href="${whatsappUrl(c.phone)}" target="_blank" rel="noopener">${icon('whatsapp')}וואטסאפ</a>` : ''}
            <button class="btn btn-primary" data-act="log" data-type="call">${icon('note')}תיעוד שיחה / הודעה</button>
            ${d.outcome === 'open' ? html`<button class="btn" data-stage="${sts.find((s) => s.kind === 'won')?.id}">${icon('trophy')}נסגר בהצלחה</button><button class="btn btn-ghost" data-stage="${sts.find((s) => s.kind === 'lost')?.id}">נסגר בהפסד</button>` : ''}
            ${d.outcome === 'won' && unpaid > 0 ? html`<button class="btn" data-act="money">${icon('money')}רישום תשלום</button>` : ''}
          </div>
          ${(() => {
            const docs = store.filter('crm_documents', (x) => x.deal_id === id).sort((a, b) => (a.issue_date < b.issue_date ? 1 : -1));
            const exps = store.filter('crm_expenses', (x) => x.deal_id === id);
            return html`<section class="panel">
              <div class="panel-head"><h2>חשבוניות ומסמכים</h2><div class="row"><button class="btn btn-sm" data-act="pr">${icon('plus')}דרישת תשלום</button><button class="btn btn-sm btn-ghost" data-act="inv">רישום חשבונית</button></div></div>
              ${docs.length ? html`<div class="list">${docs.map((x) => html`<div class="list-row"><span class="grow"><b>${label(DOC_KINDS, x.kind)} <span dir="ltr">${x.number || ''}</span></b><small class="muted">${fmt.date(x.issue_date)} | ${fmt.money(x.total)} כולל מע"מ | שולם ${fmt.money(x.paid || 0)}</small></span>${badge(label(DOC_STATUS, docStatus(x)), DOC_STATUS.find((y) => y.value === docStatus(x))?.color)}${x.kind === 'payment_request' ? html`<a class="btn-icon sm" href="#/doc/${x.id}/print" aria-label="הדפסת ${x.number}">${icon('printer')}</a>` : ''}${['sent', 'partial'].includes(docStatus(x)) ? html`<button class="btn btn-sm" data-act="doc-pay" data-id="${x.id}">תשלום</button>` : ''}</div>`)}</div>` : html`<p class="pad muted small">עוד לא הופקו מסמכים לעסקה הזו.</p>`}
              ${exps.length ? html`<p class="panel-foot small">הוצאות בפועל על העסקה: <b>${fmt.money(exps.reduce((a, e) => a + Number(e.amount), 0))}</b> (${exps.map((e) => e.vendor || label(EXPENSE_CATEGORIES, e.category)).join(', ')})</p>` : ''}
            </section>`;
          })()}
          <section class="panel">
            <div class="panel-head"><h2>היסטוריה</h2></div>
            <div class="panel-body">${timelineHtml(timeline({ dealId: id }))}</div>
          </section>
        </div>
      </div>`);
  };
  const drawAndFocus = () => { draw(); el.querySelector('.stage-path .current')?.scrollIntoView({ block: 'nearest', inline: 'center' }); };
  drawAndFocus();
  ctx.watch(['crm_deals', 'crm_tasks', 'crm_activities', 'crm_deal_stage_history', 'crm_contacts'], drawAndFocus);

  on(el, 'click', '[data-stage]', (e, b) => { const d = store.get('crm_deals', id); if (b.dataset.stage) moveDeal(d, b.dataset.stage); });
  on(el, 'click', '[data-act]', async (e, b) => {
    const d = store.get('crm_deals', id);
    const a = b.dataset.act;
    if (a === 'edit') openDealForm({ deal: d });
    if (a === 'money') openMoneyDialog(d);
    if (a === 'pr' || a === 'inv' || a === 'doc-pay') {
      const ff = await import('../ui/finance-forms.js');
      if (a === 'pr') ff.openDocForm({ kind: 'payment_request', dealId: id });
      if (a === 'inv') ff.openDocForm({ kind: 'tax_invoice', dealId: id });
      if (a === 'doc-pay') ff.openDocPayment(store.get('crm_documents', b.dataset.id));
    }
    if (a === 'log') openActivityForm({ contactId: d.contact_id, dealId: id, type: b.dataset.type });
    if (a === 'task') openTaskForm({ contactId: d.contact_id, dealId: id });
    if (a === 'edit-task') openTaskForm({ task: store.get('crm_tasks', b.dataset.id) });
    if (a === 'done') completeTask(b.dataset.id);
    if (a === 'delete') {
      const paidSoFar = paidTotal(d);
      const docs = store.filter('crm_documents', (x) => x.deal_id === id).length;
      const detail = [paidSoFar ? `נרשמו בה תשלומים בסך ${fmt.money(paidSoFar)}. הם יוסרו מההכנסות, חוץ מתשלומים שנרשמו על מסמך.` : 'העסקה תוסר גם מהדוחות.', docs ? `המסמכים שלה (${docs}) יישארו במסך הכספים.` : ''].filter(Boolean).join(' ');
      if (!(await confirmDialog(`למחוק את העסקה "${d.name}"?`, { danger: true, okLabel: 'מחיקה', detail }))) return;
      const copy = structuredClone(d);
      try {
        await store.remove('crm_deals', id);
        await navigateAfterModals('#/deals');
        toast('העסקה נמחקה', { action: { label: 'ביטול', onClick: () => store.restore('crm_deals', copy) } });
      } catch (err) { toast(err.message, { kind: 'error' }); }
    }
  });
}
