// Leads & contacts list: search by name / phone / email, tabs by stage of life, filter by source.

import { html, render, on, fmt, normalize, toCSV, download, $ } from '../core/util.js';
import { store } from '../core/store.js';
import { setQuery } from '../core/router.js';
import { contactName, sources, sourceName, LEAD_STATUS, LIFECYCLE, label, color, nextTaskFor, dueClass } from '../core/model.js';
import { pageHeader, icon, badge, emptyState, setTitle, opt, toast } from '../ui/components.js';
import { openLeadForm } from '../ui/forms.js';

const TABS = [
  { id: 'active', label: 'לידים פעילים', test: (c) => !['customer', 'former'].includes(c.lifecycle) && !['disqualified', 'nurture'].includes(c.lead_status) },
  { id: 'nurture', label: 'לטפח בהמשך', test: (c) => c.lead_status === 'nurture' && c.lifecycle !== 'customer' },
  { id: 'customers', label: 'לקוחות', test: (c) => ['customer', 'former'].includes(c.lifecycle) },
  { id: 'disqualified', label: 'לא רלוונטיים', test: (c) => c.lead_status === 'disqualified' && c.lifecycle !== 'customer' },
  { id: 'all', label: 'הכול', test: () => true },
];
const COLS = [
  { key: 'name', label: 'שם', get: (c) => contactName(c) },
  { key: 'phone', label: 'טלפון', get: (c) => c.phone_norm || '' },
  { key: 'status', label: 'סטטוס', get: (c) => c.lead_status },
  { key: 'source', label: 'מקור', get: (c) => sourceName(c.first_source_id) },
  { key: 'next', label: 'צעד הבא', get: (c) => nextTaskFor({ contactId: c.id })?.due_at || '9999' },
  { key: 'created', label: 'נוצר', get: (c) => c.created_at },
];

export default async function view(el, ctx) {
  setTitle('לידים');
  const st = { tab: ctx.query.tab || 'active', q: ctx.query.q || '', src: ctx.query.src || '', sort: ctx.query.sort || 'created', dir: Number(ctx.query.dir || -1) };

  const rows = () => {
    const tab = TABS.find((t) => t.id === st.tab) || TABS[0];
    const n = normalize(st.q);
    const digits = st.q.replace(/\D/g, '').replace(/^972/, '0');
    let list = store.all('crm_contacts').filter(tab.test);
    if (st.src) list = list.filter((c) => (st.src === 'unknown' ? !c.first_source_id : c.first_source_id === st.src));
    if (n) list = list.filter((c) => normalize(contactName(c)).includes(n) || normalize(c.company_name).includes(n) || normalize(c.email).includes(n) || (digits.length >= 3 && (c.phone_norm || '').includes(digits)));
    const col = COLS.find((x) => x.key === st.sort) || COLS[5];
    return list.sort((a, b) => { const x = col.get(a) ?? '', y = col.get(b) ?? ''; return (x < y ? -1 : x > y ? 1 : 0) * st.dir; });
  };

  const drawTable = () => {
    const list = rows();
    const box = $('[data-table]', el);
    setQuery({ tab: st.tab, q: st.q, src: st.src, sort: st.sort, dir: st.dir === -1 ? '' : st.dir });
    if (!store.all('crm_contacts').length) {
      render(box, emptyState({ icon: 'user', title: 'עוד אין לידים', text: 'הוסיפו את הליד הראשון. כל ליד מקבל מקור הגעה וצעד הבא, כדי ששום פנייה לא תישכח.', action: { act: 'new', label: 'ליד חדש', icon: 'plus' } }));
      return;
    }
    if (!list.length) {
      render(box, html`<div class="empty"><h3>${st.q ? `לא נמצא "${st.q}" בלשונית הזו` : 'אין כאן אף אחד כרגע'}</h3><p>${st.tab === 'active' ? 'לידים שהפכו ללקוחות עוברים ללשונית "לקוחות".' : ''}</p><button class="btn" data-tab="all">חיפוש בכל הלשוניות</button></div>`);
      return;
    }
    render(box, html`<div class="table-wrap"><table class="table table-leads">
      <thead><tr>${COLS.map((c) => html`<th aria-sort="${st.sort === c.key ? (st.dir === 1 ? 'ascending' : 'descending') : 'none'}"><button class="th-sort" data-sort="${c.key}">${c.label}${st.sort === c.key ? icon(st.dir === 1 ? 'arrowUp' : 'arrowDown', 'sort-ic') : ''}</button></th>`)}</tr></thead>
      <tbody>${list.slice(0, 500).map((c) => {
        const next = nextTaskFor({ contactId: c.id });
        const isActive = TABS[0].test(c);
        return html`<tr data-href="#/c/${c.id}">
          <td data-label="שם"><a class="prim" href="#/c/${c.id}"><b>${contactName(c)}</b>${c.company_name ? html`<small>${c.company_name}</small>` : ''}</a></td>
          <td data-label="טלפון" class="num" dir="ltr">${c.phone || html`<span class="nil">—</span>`}</td>
          <td data-label="סטטוס">${c.lifecycle === 'customer' ? badge('לקוח', 'green') : badge(label(LEAD_STATUS, c.lead_status), color(LEAD_STATUS, c.lead_status))}</td>
          <td data-label="מקור">${c.first_source_id ? sourceName(c.first_source_id) : html`<span class="muted">לא ידוע</span>`}</td>
          <td data-label="צעד הבא">${next ? html`<span class="${dueClass(next.due_at)}">${next.due_at ? fmt.relative(next.due_at) : 'בלי תאריך'}</span> <small class="muted">${next.title}</small>` : isActive ? badge('אין צעד הבא', 'amber') : html`<span class="nil">—</span>`}</td>
          <td data-label="נוצר" class="muted">${fmt.date(c.created_at)}</td>
        </tr>`;
      })}</tbody></table></div>
      <p class="table-foot">${fmt.number(list.length)} רשומות${list.length > 500 ? ', מוצגות 500 הראשונות. צמצמו בחיפוש.' : ''}</p>`);
  };

  render(el, html`
    ${pageHeader({ title: 'לידים ולקוחות', actions: html`<button class="btn btn-ghost" data-act="export">${icon('download')}ייצוא הרשימה לאקסל</button><button class="btn btn-primary" data-act="new">${icon('plus')}ליד חדש</button>` })}
    <div class="view-tabs" role="tablist">${TABS.map((t) => html`<button class="tab ${t.id === st.tab ? 'active' : ''}" role="tab" aria-selected="${String(t.id === st.tab)}" data-tab="${t.id}">${t.label}<span class="tab-count">${store.all('crm_contacts').filter(t.test).length}</span></button>`)}</div>
    <div class="toolbar">
      <input class="input" type="search" placeholder="חיפוש לפי שם, טלפון, אימייל או עסק" value="${st.q}" data-q aria-label="חיפוש">
      <select class="input" data-src aria-label="מקור" style="width:auto">${opt([...sources().map((s) => ({ value: s.id, label: s.name })), { value: 'unknown', label: 'מקור לא ידוע' }], st.src, { empty: 'כל המקורות' })}</select>
    </div>
    <div data-table></div>`);
  drawTable();
  ctx.watch(['crm_contacts', 'crm_tasks'], drawTable);

  on(el, 'input', '[data-q]', (e, i) => { st.q = i.value; drawTable(); });
  on(el, 'change', '[data-src]', (e, s) => { st.src = s.value; drawTable(); });
  on(el, 'click', '[data-tab]', (e, b) => {
    st.tab = b.dataset.tab;
    el.querySelectorAll('.view-tabs [data-tab]').forEach((x) => { const on = x.dataset.tab === st.tab; x.classList.toggle('active', on); x.setAttribute('aria-selected', String(on)); if (on) x.scrollIntoView({ block: 'nearest', inline: 'center' }); });
    drawTable();
  });
  on(el, 'click', '[data-sort]', (e, th) => { const k = th.dataset.sort; st.dir = st.sort === k ? -st.dir : (k === 'created' ? -1 : 1); st.sort = k; drawTable(); });
  on(el, 'click', 'tbody tr', (e, tr) => { if (!e.target.closest('a')) location.hash = tr.dataset.href; });
  on(el, 'click', '[data-act]', (e, b) => {
    if (b.dataset.act === 'new') openLeadForm({ onSaved: (c) => { location.hash = `#/c/${c.id}`; } });
    if (b.dataset.act === 'export') {
      const list = rows();
      const phoneText = (p) => { const d = String(p || '').replace(/\D/g, ''); return /^05\d{8}$/.test(d) ? `${d.slice(0, 3)}-${d.slice(3)}` : /^0\d{8}$/.test(d) ? `${d.slice(0, 2)}-${d.slice(2)}` : p; };
      toast(`יוצאו ${list.length} רשומות מהלשונית "${(TABS.find((t) => t.id === st.tab) || TABS[0]).label}"${st.q || st.src ? ' לפי הסינון הנוכחי' : ''}`, { kind: 'success' });
      download(`leads-${st.tab}-${new Date().toISOString().slice(0, 10)}.csv`, toCSV([
        ['שם פרטי', 'שם משפחה', 'עסק', 'טלפון', 'אימייל', 'סטטוס', 'שלב', 'מקור מקורי', 'מקור אחרון', 'צורך', 'תקציב', 'נוצר'],
        ...list.map((c) => [c.first_name, c.last_name, c.company_name, phoneText(c.phone), c.email, label(LEAD_STATUS, c.lead_status), label(LIFECYCLE, c.lifecycle), sourceName(c.first_source_id), sourceName(c.last_source_id), c.need, c.budget_estimate, c.created_at?.slice(0, 10)]),
      ]), 'text/csv;charset=utf-8');
    }
  });
}
