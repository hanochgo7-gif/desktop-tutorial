// Finance: overview (income, expenses, profit, VAT estimate, receivables), documents, expenses, export for the accountant.

import { html, render, on, fmt, toCSV, download, toDateInput } from '../core/util.js';
import { store } from '../core/store.js';
import { setQuery } from '../core/router.js';
import { contactName, label } from '../core/model.js';
import { periodFor } from '../core/metrics.js';
import { summary, receivables, vatPeriod, monthlySeries, receipts, docStatus, isOverdue, DOC_KINDS, DOC_STATUS, EXPENSE_CATEGORIES } from '../core/finance.js';
import { pageHeader, icon, badge, setTitle, emptyState, opt, tabs } from '../ui/components.js';
import { openDocForm, openDocPayment, cancelDoc, openExpenseForm } from '../ui/finance-forms.js';
import { showRecords } from '../ui/drill.js';

const PERIODS = ['this_month', 'last_month', 'vat', 'this_quarter', 'this_year', 'last_12m'];
const periodOf = (key) => {
  if (key === 'vat') { const v = vatPeriod(new Date(), store.settings.vatFrequency || 'bimonthly'); return { ...v, label: `תקופת מע"מ ${v.label}` }; }
  return periodFor(key);
};
const data = () => ({ deals: store.all('crm_deals'), documents: store.all('crm_documents'), expenses: store.all('crm_expenses'), spend: store.all('crm_ad_spend'), settings: store.settings });
const name = (id) => contactName(store.get('crm_contacts', id)) || '—';

function bars(series) {
  const max = Math.max(1, ...series.map((m) => Math.max(m.income, m.costs)));
  const w = 100 / series.length;
  return html`<figure class="fin-chart" aria-label="הכנסות מול הוצאות ב-12 החודשים האחרונים">
    <svg viewBox="0 0 100 44" preserveAspectRatio="none" role="img" aria-hidden="true">
      ${series.map((m, i) => {
        const hi = (m.income / max) * 40, hc = (m.costs / max) * 40;
        // time runs in reading order (right to left): oldest month on the right, like the labels below
        const x = 100 - (i + 1) * w;
        return html`<rect x="${x + w * 0.52}" y="${42 - hi}" width="${w * 0.36}" height="${hi}" class="b-in"></rect><rect x="${x + w * 0.12}" y="${42 - hc}" width="${w * 0.36}" height="${hc}" class="b-out"></rect>`;
      })}
    </svg>
    <div class="fin-chart-x">${series.map((m) => html`<span>${m.label}</span>`)}</div>
    <figcaption class="chart-legend"><span><i class="dot b-in"></i>הכנסות שנגבו</span><span><i class="dot b-out"></i>הוצאות ופרסום</span></figcaption>
    <table class="sr"><caption>הכנסות והוצאות לפי חודש</caption><tbody>${series.map((m) => html`<tr><th>${m.label}</th><td>הכנסות ${fmt.money(m.income)}</td><td>הוצאות ${fmt.money(m.costs)}</td><td>רווח ${fmt.money(m.profit)}</td></tr>`)}</tbody></table>
  </figure>`;
}

export default async function view(el, ctx) {
  setTitle('כספים');
  const st = { tab: ctx.query.tab || 'overview', p: ctx.query.p || 'this_month', cat: ctx.query.cat || '', docf: ctx.query.f || 'open' };

  const overview = () => {
    const period = periodOf(st.p);
    const d = data();
    const s = summary(d, period);
    const vp = vatPeriod(new Date(), store.settings.vatFrequency || 'bimonthly');
    const vs = summary(d, vp);
    const rv = receivables({ deals: d.deals, documents: d.documents });
    const exempt = store.settings.vatStatus === 'exempt';
    el._s = s; el._rv = rv;
    return html`
      <div class="toolbar">
        <select class="input period-select" data-p aria-label="תקופה">${opt(PERIODS.map((k) => ({ value: k, label: periodOf(k).label })), st.p)}</select>
        <div class="seg period-seg" role="radiogroup" aria-label="תקופה">${PERIODS.map((k) => html`<button role="radio" aria-checked="${String(k === st.p)}" class="${k === st.p ? 'active' : ''}" data-pp="${k}">${periodOf(k).label}</button>`)}</div>
      </div>
      <section class="kpis">
        <button class="kpi-btn" data-drill="income"><span class="kpi-label">הכנסות שנגבו</span><span class="kpi-value money">${fmt.money(s.income)}</span><span class="kpi-sub">לפני מע"מ, ${s.receiptsCount} תקבולים</span></button>
        <button class="kpi-btn" data-tabgo="expenses"><span class="kpi-label">הוצאות</span><span class="kpi-value">${fmt.money(s.expenseNet)}</span><span class="kpi-sub">לפני מע"מ, ${s.expensesCount} הוצאות</span></button>
        <a class="kpi-btn" href="#/sources"><span class="kpi-label">פרסום</span><span class="kpi-value">${fmt.money(s.ads)}</span><span class="kpi-sub">ממסך מקורות ופרסום</span></a>
        <div class="kpi-btn static"><span class="kpi-label">רווח</span><span class="kpi-value ${s.profit < 0 ? 'danger-text' : ''}">${fmt.money(s.profit)}</span><span class="kpi-sub">הכנסות פחות הוצאות ופרסום</span></div>
        <button class="kpi-btn" data-drill="owed"><span class="kpi-label">יתרות לגבייה</span><span class="kpi-value ${rv.total ? 'warn-text' : ''}">${fmt.money(rv.total)}</span><span class="kpi-sub">${rv.rows.length} פתוחות, לפני מע"מ</span></button>
      </section>
      <div class="grid grid-2">
        <section class="panel">
          <div class="panel-head"><h2>מע"מ: ${vp.label}</h2><span class="muted small">דיווח עד ${fmt.date(vp.dueBy)}</span></div>
          ${exempt ? html`<p class="pad small">העסק מוגדר כעוסק פטור, ולכן אין מע"מ לדיווח. אפשר לשנות בהגדרות.</p>` : html`<dl class="dl">
            <dt>מע"מ עסקאות</dt><dd class="num">${fmt.exact(vs.outputVat)} <small class="muted">מתקבולים</small></dd>
            <dt>מע"מ תשומות</dt><dd class="num">${fmt.exact(vs.inputVat)} <small class="muted">מהוצאות</small></dd>
            <dt><b>לתשלום (הערכה)</b></dt><dd class="num"><b class="${vs.vatPayable < 0 ? 'money' : ''}">${fmt.exact(vs.vatPayable)}</b>${vs.vatPayable < 0 ? html` <small class="muted">החזר</small>` : ''}</dd>
          </dl>
          <p class="panel-foot small muted">הערכה לפי תקבולים שנרשמו כאן והוצאות עם מע"מ. הדיווח הרשמי נעשה לפי החשבוניות בתוכנת החשבוניות ובידי רואה החשבון.</p>`}
        </section>
        <section class="panel">
          <div class="panel-head"><h2>מי חייב כסף</h2><span class="muted small">לפי ותק החוב</span></div>
          <div class="aging">${[['עד 30 יום', rv.aging.d30], ['31 עד 60 יום', rv.aging.d60], ['61 עד 90 יום', rv.aging.d90], ['מעל 90 יום', rv.aging.older]].map(([l, v]) => html`<div><span class="muted small">${l}</span><b class="num ${v && l !== 'עד 30 יום' ? 'warn-text' : ''}">${fmt.money(v)}</b></div>`)}</div>
          ${rv.rows.length ? html`<div class="list">${rv.rows.slice(0, 6).map((r) => html`<a class="list-row" href="${r.kind === 'deal' ? `#/d/${r.id}` : '#/finance?tab=docs'}"><span class="grow"><b>${name(r.contactId)}</b><small class="muted">${r.kind === 'deal' ? r.name : `מסמך ${r.name}`} | ${r.days} ימים</small></span><span class="num warn-text">${fmt.money(r.owed)}</span></a>`)}</div>` : html`<p class="pad muted small">אין יתרות פתוחות.</p>`}
        </section>
      </div>
      <section class="panel"><div class="panel-head"><h2>12 החודשים האחרונים</h2></div><div class="panel-body">${bars(monthlySeries(d))}</div></section>
      ${Object.keys(s.byCategory).length ? html`<section class="panel"><div class="panel-head"><h2>הוצאות לפי קטגוריה (${periodOf(st.p).label})</h2></div><ul class="cat-list">${Object.entries(s.byCategory).sort((a, b) => b[1] - a[1]).map(([k, v]) => html`<li><span>${label(EXPENSE_CATEGORIES, k)}</span><span class="cat-bar"><i style="width:${Math.max(3, (v / s.expenseNet) * 100)}%"></i></span><b class="num">${fmt.money(v)}</b></li>`)}</ul></section>` : ''}
      <p class="muted small">כל הסכומים לפני מע"מ, לפי מועד קבלת הכסף (בסיס מזומן). התקבולים מוזנים ידנית ואינם מאומתים מול הבנק או מערכת הסליקה.</p>`;
  };

  const documents = () => {
    const all = store.all('crm_documents').sort((a, b) => (a.issue_date < b.issue_date ? 1 : a.issue_date > b.issue_date ? -1 : (a.created_at < b.created_at ? 1 : -1)));
    const filt = { open: (x) => ['sent', 'partial'].includes(docStatus(x)), overdue: (x) => isOverdue(x), draft: (x) => x.status === 'draft', all: () => true }[st.docf] || (() => true);
    const list = all.filter(filt);
    const openSum = all.filter((x) => x.kind !== 'credit_note' && ['sent', 'partial'].includes(docStatus(x))).reduce((a, x) => a + Number(x.total) - Number(x.paid || 0), 0);
    return html`
      <div class="toolbar">
        <button class="btn btn-primary" data-act="new-pr">${icon('plus')}דרישת תשלום</button>
        <button class="btn" data-act="new-inv">${icon('quote')}רישום חשבונית שהופקה</button>
        <div class="grow"></div>
        <div class="seg" role="radiogroup" aria-label="סינון">${[['open', 'ממתינים לתשלום'], ['overdue', 'באיחור'], ['draft', 'טיוטות'], ['all', 'הכול']].map(([k, l]) => html`<button role="radio" aria-checked="${String(k === st.docf)}" class="${k === st.docf ? 'active' : ''}" data-f="${k}">${l}</button>`)}</div>
      </div>
      ${openSum ? html`<p class="small">ממתין לתשלום: <b>${fmt.exact(openSum)}</b> כולל מע"מ.</p>` : ''}
      ${!all.length ? emptyState({ icon: 'quote', title: 'עוד אין מסמכים', text: 'צרו דרישת תשלום ללקוח, או רשמו כאן חשבוניות שהפקתם בתוכנת החשבוניות כדי לעקוב אחרי התשלום.', action: { act: 'new-pr', label: 'דרישת תשלום', icon: 'plus' } })
        : !list.length ? html`<p class="pad muted">אין מסמכים בסינון הזה.</p>`
        : html`<div class="table-wrap"><table class="table table-docs"><thead><tr><th>מסמך</th><th>לקוח</th><th>תאריך</th><th>לתשלום עד</th><th>סה"כ</th><th>שולם</th><th>מצב</th><th><span class="sr">פעולות</span></th></tr></thead>
          <tbody>${list.map((x) => {
            const s = docStatus(x);
            const late = isOverdue(x);
            return html`<tr>
              <td data-label="מסמך"><b>${label(DOC_KINDS, x.kind)}</b> <span class="num" dir="ltr">${x.number || ''}</span>${x.external_system ? html`<small class="muted"> (${x.external_system})</small>` : ''}</td>
              <td data-label="לקוח">${x.contact_id ? html`<a href="#/c/${x.contact_id}">${name(x.contact_id)}</a>` : '—'}${x.deal_id ? html`<small class="muted"> | <a href="#/d/${x.deal_id}">${store.get('crm_deals', x.deal_id)?.name || ''}</a></small>` : ''}</td>
              <td data-label="תאריך">${fmt.date(x.issue_date)}</td>
              <td data-label="לתשלום עד" class="${late ? 'due-overdue' : ''}">${x.due_date ? fmt.date(x.due_date) : '—'}${late ? ' (באיחור)' : ''}</td>
              <td data-label="סה&quot;כ" class="num">${fmt.exact(x.total)}</td>
              <td data-label="שולם" class="num">${fmt.exact(x.paid || 0)}</td>
              <td data-label="מצב">${badge(label(DOC_STATUS, s), late ? 'red' : DOC_STATUS.find((y) => y.value === s)?.color)}</td>
              <td class="doc-acts">
                ${x.kind === 'payment_request' ? html`<a class="btn btn-sm btn-ghost" href="#/doc/${x.id}/print">${icon('printer')}הדפסה</a>` : ''}
                ${['sent', 'partial', 'draft'].includes(s) && x.kind !== 'credit_note' ? html`<button class="btn btn-sm" data-act="pay" data-id="${x.id}">${icon('money')}תשלום</button>` : ''}
                <button class="btn-icon sm" data-act="edit-doc" data-id="${x.id}" aria-label="עריכת ${x.number || 'המסמך'}">${icon('edit')}</button>
                ${s !== 'canceled' ? html`<button class="btn-icon sm" data-act="cancel-doc" data-id="${x.id}" aria-label="ביטול ${x.number || 'המסמך'}">${icon('x')}</button>` : ''}
              </td></tr>`;
          })}</tbody></table></div>`}
      <p class="muted small">HG OS לא מפיק חשבוניות מס: אותן מפיקים בתוכנה רשומה ברשות המסים (למשל חשבונית ירוקה, iCount, EZcount), ורושמים כאן את המספר כדי לעקוב אחרי התשלום.</p>`;
  };

  const expenses = () => {
    const all = store.all('crm_expenses').filter((e) => !st.cat || e.category === st.cat).sort((a, b) => (a.day < b.day ? 1 : -1));
    const groups = new Map();
    for (const e of all) { const k = String(e.day).slice(0, 7); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); }
    return html`
      <div class="toolbar">
        <button class="btn btn-primary" data-act="new-exp">${icon('plus')}הוצאה</button>
        <select class="input" data-cat aria-label="קטגוריה" style="width:auto">${opt(EXPENSE_CATEGORIES, st.cat, { empty: 'כל הקטגוריות' })}</select>
      </div>
      ${!store.all('crm_expenses').length ? emptyState({ icon: 'money', title: 'עוד אין הוצאות', text: 'רשמו הוצאות עסק (תוכנות, פרילנסרים, ציוד) כדי לראות רווח אמיתי ומע"מ תשומות.', action: { act: 'new-exp', label: 'הוצאה', icon: 'plus' } })
        : [...groups.entries()].map(([m, list]) => html`<section class="panel exp-month">
          <div class="panel-head"><h2>${new Date(`${m}-01T12:00:00`).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}</h2><span class="num">${fmt.exact(list.reduce((a, e) => a + Number(e.amount), 0))} <small class="muted">+ מע"מ ${fmt.exact(list.reduce((a, e) => a + Number(e.vat || 0), 0))}</small></span></div>
          <ul class="list">${list.map((e) => html`<li class="list-row">
            <span class="grow"><b>${e.vendor || label(EXPENSE_CATEGORIES, e.category)}</b><small class="muted">${fmt.date(e.day)} | ${label(EXPENSE_CATEGORIES, e.category)}${e.description ? ` | ${e.description}` : ''}${e.deal_id ? ` | ${store.get('crm_deals', e.deal_id)?.name || ''}` : ''}</small></span>
            <span class="num">${fmt.exact(e.amount)}</span>
            <button class="btn-icon sm" data-act="edit-exp" data-id="${e.id}" aria-label="עריכת ההוצאה ${e.vendor || ''}">${icon('edit')}</button>
          </li>`)}</ul></section>`)}`;
  };

  const draw = () => {
    setQuery({ tab: st.tab, p: st.p, cat: st.cat, f: st.docf });
    render(el, html`
      ${pageHeader({ title: 'כספים', subtitle: 'הכנסות, הוצאות, מסמכים ומע"מ', actions: html`<button class="btn btn-ghost" data-act="export">${icon('download')}ייצוא לרואה החשבון</button>` })}
      ${tabs([{ id: 'overview', label: 'סקירה', icon: 'chart' }, { id: 'docs', label: 'חשבוניות ומסמכים', icon: 'quote' }, { id: 'expenses', label: 'הוצאות', icon: 'money' }], st.tab)}
      <div class="fin-body">${st.tab === 'docs' ? documents() : st.tab === 'expenses' ? expenses() : overview()}</div>`);
  };
  draw();
  ctx.watch(['crm_documents', 'crm_expenses', 'crm_deals', 'crm_ad_spend', 'settings'], draw);

  on(el, 'click', '[data-tab]', (e, b) => { st.tab = b.dataset.tab; draw(); });
  on(el, 'click', '[data-tabgo]', (e, b) => { st.tab = b.dataset.tabgo; draw(); });
  on(el, 'click', '[data-pp]', (e, b) => { st.p = b.dataset.pp; draw(); });
  on(el, 'change', '[data-p]', (e, s) => { st.p = s.value; draw(); });
  on(el, 'change', '[data-cat]', (e, s) => { st.cat = s.value; draw(); });
  on(el, 'click', '[data-f]', (e, b) => { st.docf = b.dataset.f; draw(); });
  on(el, 'click', '[data-drill]', (e, b) => {
    if (b.dataset.drill === 'income') showRecords(`הכנסות שנגבו: ${periodOf(st.p).label}`, { deals: [...new Set(el._s.receipts.filter((r) => r.dealId).map((r) => r.dealId))], note: `${el._s.receiptsCount} תקבולים, ${fmt.money(el._s.income)} לפני מע"מ. תקבולים על מסמכים בלי עסקה מופיעים בלשונית "חשבוניות ומסמכים".` });
    if (b.dataset.drill === 'owed') showRecords('יתרות לגבייה', { deals: el._rv.rows.filter((r) => r.kind === 'deal').map((r) => r.id), note: 'עסקאות שנסגרו ועוד לא שולמו במלואן. מסמכים פתוחים בלי עסקה מופיעים בלשונית "חשבוניות ומסמכים".' });
  });
  on(el, 'click', '[data-act]', (e, b) => {
    const a = b.dataset.act;
    const doc = store.get('crm_documents', b.dataset.id);
    if (a === 'new-pr') openDocForm({ kind: 'payment_request' });
    if (a === 'new-inv') openDocForm({ kind: 'tax_invoice' });
    if (a === 'pay' && doc) openDocPayment(doc);
    if (a === 'edit-doc' && doc) openDocForm({ doc });
    if (a === 'cancel-doc' && doc) cancelDoc(doc);
    if (a === 'new-exp') openExpenseForm();
    if (a === 'edit-exp') openExpenseForm({ expense: store.get('crm_expenses', b.dataset.id) });
    if (a === 'export') exportForAccountant(periodOf(st.p));
  });
}

// One CSV the accountant can work with: every receipt and expense in the period, with VAT split.
export function exportForAccountant(period) {
  const d = data();
  const rec = receipts(d, period);
  const exp = d.expenses.filter((x) => !x.deleted_at && new Date(`${x.day}T12:00:00`) >= period.from && new Date(`${x.day}T12:00:00`) < period.to);
  const docs = d.documents.filter((x) => !x.deleted_at && x.kind !== 'payment_request' && new Date(`${x.issue_date}T12:00:00`) >= period.from && new Date(`${x.issue_date}T12:00:00`) < period.to);
  const dd = (x) => new Date(x).toLocaleDateString('he-IL');
  const rows = [
    [`${store.settings.businessName || 'העסק'}${store.settings.taxId ? ` (${store.settings.taxId})` : ''}`, `תקופה: ${dd(period.from)} עד ${dd(new Date(period.to - 1))}`, 'הופק מ-HG OS. תקבולים מוזנים ידנית ואינם מאומתים.'],
    [],
    ['סוג', 'תאריך', 'לקוח / ספק', 'פרטים', 'לפני מע"מ', 'מע"מ', 'כולל מע"מ', 'אסמכתה'],
    ...rec.map((r) => ['תקבול', dd(r.date), name(r.contactId), r.dealId ? store.get('crm_deals', r.dealId)?.name : '', r.net, r.vat, r.gross, r.docId ? store.get('crm_documents', r.docId)?.number || '' : r.note]),
    ...exp.map((x) => ['הוצאה', dd(`${x.day}T12:00:00`), x.vendor, `${label(EXPENSE_CATEGORIES, x.category)}${x.description ? ` – ${x.description}` : ''}`, Number(x.amount), Number(x.vat || 0), Math.round((Number(x.amount) + Number(x.vat || 0)) * 100) / 100, x.reference]),
    ...docs.map((x) => [`${label(DOC_KINDS, x.kind)} (רשומה)`, dd(`${x.issue_date}T12:00:00`), name(x.contact_id), x.external_system || '', Number(x.subtotal), Number(x.vat), Number(x.total), `${x.number || ''}${x.allocation_number ? ` הקצאה ${x.allocation_number}` : ''}`]),
  ];
  const s = summary(d, period);
  rows.push([], ['סה"כ תקבולים', '', '', '', s.income, s.outputVat, Math.round((s.income + s.outputVat) * 100) / 100], ['סה"כ הוצאות', '', '', '', s.expenseNet, s.inputVat, Math.round((s.expenseNet + s.inputVat) * 100) / 100]);
  download(`hg-os-accountant-${toDateInput(period.from)}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
}
