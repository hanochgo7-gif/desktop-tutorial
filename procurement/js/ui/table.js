// DataTable: search, column filters, sorting, resizable and hideable columns, saved views, selection with bulk actions,
// export to Excel/CSV, and incremental rendering for thousands of rows.
//
// dataTable({
//   id: 'items',                         // remembers sort/columns/widths per user (and named views in the database)
//   columns: [{ key, label, num?, width?, value?(row), render?(row) → node|string, sort?(row), hidden?, filter?: 'select', options?: [[v, label]] }],
//   rows, rowHref?(row) → '#/...', selectable?, bulk?: [{ label, run(rows) }], exportName?, empty?: { title, text, action? }
//   toolbar?: [nodes]                     // extra buttons at the end of the toolbar
// }) → { el, setRows(rows) }
import { h, clear, debounce } from './dom.js';
import { icon } from './icons.js';
import { downloadCSV, downloadXLSX } from './export.js';
import { db } from '../core/api.js';
import { store } from '../core/store.js';
import { toast, toastError, modal } from './overlay.js';

const PAGE = 150;
const load = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const keep = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
const norm = (s) => String(s ?? '').toLowerCase().replace(/[״"׳']/g, '');

export function dataTable(cfg) {
  const key = `gops-tbl-${cfg.id}`;
  const saved = load(key) || {};
  const state = {
    q: '', filters: saved.filters || {}, sort: saved.sort || null, hidden: new Set(saved.hidden || cfg.columns.filter((c) => c.hidden).map((c) => c.key)),
    widths: saved.widths || {}, shown: PAGE, selected: new Set(),
  };
  let rows = cfg.rows || [];
  const persist = () => keep(key, { sort: state.sort, hidden: [...state.hidden], widths: state.widths, filters: state.filters });
  const colVal = (c, r) => (c.value ? c.value(r) : r[c.key]);
  const sortVal = (c, r) => (c.sort ? c.sort(r) : colVal(c, r));

  const visibleCols = () => cfg.columns.filter((c) => !state.hidden.has(c.key));
  function filtered() {
    let out = rows;
    for (const [k, v] of Object.entries(state.filters)) {
      if (v === '' || v === undefined || v === null) continue;
      const c = cfg.columns.find((x) => x.key === k); if (!c) continue;
      out = out.filter((r) => String(c.filterValue ? c.filterValue(r) : r[k]) === String(v));
    }
    if (state.q) {
      const words = norm(state.q).split(/\s+/).filter(Boolean);
      const searchCols = cfg.columns.filter((c) => c.search !== false);
      out = out.filter((r) => { const hay = searchCols.map((c) => norm(colVal(c, r))).join(' '); return words.every((w) => hay.includes(w)); });
    }
    if (state.sort) {
      const c = cfg.columns.find((x) => x.key === state.sort.key);
      if (c) {
        const dir = state.sort.dir === 'desc' ? -1 : 1;
        out = [...out].sort((a, b) => {
          const x = sortVal(c, a), y = sortVal(c, b);
          if (x === y) return 0; if (x === null || x === undefined || x === '') return 1; if (y === null || y === undefined || y === '') return -1;
          return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'he', { numeric: true })) * dir;
        });
      }
    }
    return out;
  }

  // ---------------- toolbar
  const search = h('input.input.tbl__search', { type: 'search', placeholder: 'חיפוש בטבלה', 'aria-label': 'חיפוש בטבלה' });
  search.addEventListener('input', debounce(() => { state.q = search.value.trim(); state.shown = PAGE; draw(); }, 150));
  const filterBox = h('div.tbl__filters');
  for (const c of cfg.columns.filter((x) => x.filter === 'select')) {
    const opts = c.options || [...new Set(rows.map((r) => (c.filterValue ? c.filterValue(r) : r[c.key])).filter((v) => v !== null && v !== undefined && v !== ''))].map((v) => [v, v]);
    const sel = h('select.input.input--sm', { 'aria-label': c.label },
      h('option', { value: '' }, `${c.label}: הכול`), opts.map(([v, l]) => h('option', { value: v, selected: String(state.filters[c.key]) === String(v) }, l)));
    sel.addEventListener('change', () => { state.filters[c.key] = sel.value; state.shown = PAGE; persist(); draw(); });
    filterBox.append(sel);
  }
  const count = h('span.tbl__count', { 'aria-live': 'polite' });
  const bulkBar = h('div.tbl__bulk', { hidden: true });

  const colsBtn = h('button.btn.btn--ghost.btn--sm', { type: 'button', 'aria-haspopup': 'true' }, icon('columns', 16), 'עמודות');
  colsBtn.addEventListener('click', () => {
    const list = h('div.checklist', cfg.columns.map((c) => {
      const cb = h('input', { type: 'checkbox', checked: !state.hidden.has(c.key) });
      cb.addEventListener('change', () => { cb.checked ? state.hidden.delete(c.key) : state.hidden.add(c.key); persist(); draw(); });
      return h('label', cb, c.label);
    }));
    modal({ title: 'עמודות מוצגות', body: list, actions: [{ label: 'סגירה', kind: 'primary' }] });
  });

  const viewsBtn = h('button.btn.btn--ghost.btn--sm', { type: 'button' }, icon('filter', 16), 'תצוגות');
  viewsBtn.addEventListener('click', async () => {
    let views = [];
    try { views = await db('saved_views').select('id,name,state').eq('org_id', store.org.id).eq('screen', cfg.id).order('name').get(); } catch (e) { return toastError(e); }
    const name = h('input.input', { placeholder: 'שם לתצוגה הנוכחית', maxlength: 60 });
    const list = h('ul.plainlist', views.length ? views.map((v) => h('li.row-between',
      h('button.linkbtn', { type: 'button', onclick: () => { apply(v.state); m.close(); } }, v.name),
      h('button.iconbtn', { type: 'button', 'aria-label': `מחיקת ${v.name}`, onclick: async (e) => { await db('saved_views').eq('id', v.id).remove(); e.target.closest('li').remove(); } }, icon('x', 16)))) :
      h('li.muted', 'אין תצוגות שמורות עדיין.'));
    const m = modal({ title: 'תצוגות שמורות', body: h('div.stack', list, h('label.field', h('span.field__label', 'שמירת התצוגה הנוכחית (חיפוש, סינון, מיון ועמודות)'), name)),
      actions: [{ label: 'סגירה' }, { label: 'שמירה', kind: 'primary', onClick: async () => {
        if (!name.value.trim()) { name.focus(); return false; }
        await db('saved_views').insert({ org_id: store.org.id, screen: cfg.id, name: name.value.trim(), state: snapshot() });
        toast('התצוגה נשמרה');
      } }] });
  });
  const snapshot = () => ({ q: state.q, filters: state.filters, sort: state.sort, hidden: [...state.hidden], widths: state.widths });
  function apply(s) {
    state.q = s.q || ''; search.value = state.q; state.filters = s.filters || {}; state.sort = s.sort || null;
    state.hidden = new Set(s.hidden || []); state.widths = s.widths || {};
    filterBox.querySelectorAll('select').forEach((sel, i) => { const c = cfg.columns.filter((x) => x.filter === 'select')[i]; sel.value = state.filters[c.key] || ''; });
    persist(); draw();
  }

  const exportBtn = h('button.btn.btn--ghost.btn--sm', { type: 'button' }, icon('download', 16), 'ייצוא');
  exportBtn.addEventListener('click', () => {
    const cols = visibleCols().filter((c) => c.export !== false);
    const data = filtered().map((r) => cols.map((c) => { const v = c.exportValue ? c.exportValue(r) : colVal(c, r); return typeof v === 'number' ? v : (v ?? ''); }));
    const heads = cols.map((c) => c.label);
    const name = cfg.exportName || cfg.id;
    modal({ title: `ייצוא ${data.length} שורות`, body: h('p.muted', 'הייצוא כולל את השורות והעמודות שמוצגות כעת, אחרי חיפוש וסינון.'),
      actions: [{ label: 'CSV', onClick: () => downloadCSV(name, heads, data) }, { label: 'Excel', kind: 'primary', onClick: () => downloadXLSX(name, heads, data) }] });
  });

  const toolbar = h('div.tbl__toolbar', search, filterBox, h('div.tbl__tools', count, colsBtn, viewsBtn, exportBtn, cfg.toolbar || null));

  // ---------------- table
  const table = h('table.tbl');
  const wrap = h('div.tbl__wrap', table);
  const more = h('button.btn.btn--ghost.tbl__more', { type: 'button', hidden: true, onclick: () => { state.shown += PAGE * 2; draw(); } });
  const emptyBox = h('div.empty', { hidden: true });
  const el = h('div.tbl__root', toolbar, bulkBar, wrap, emptyBox, more);

  function header() {
    const tr = h('tr');
    if (cfg.selectable) {
      const all = h('input', { type: 'checkbox', 'aria-label': 'בחירת כל השורות המוצגות' });
      all.addEventListener('change', () => { const f = filtered(); f.forEach((r) => (all.checked ? state.selected.add(r.id) : state.selected.delete(r.id))); draw(); });
      tr.append(h('th.tbl__check', all));
    }
    for (const c of visibleCols()) {
      const active = state.sort?.key === c.key;
      const th = h('th', { class: c.num ? 'num' : '', scope: 'col', 'aria-sort': active ? (state.sort.dir === 'desc' ? 'descending' : 'ascending') : 'none',
        style: state.widths[c.key] ? { width: state.widths[c.key] + 'px' } : (c.width ? { width: c.width } : null) });
      const btn = h('button.tbl__sort', { type: 'button' }, c.label, active ? icon(state.sort.dir === 'desc' ? 'arrowDown' : 'arrowUp', 13) : null);
      btn.addEventListener('click', () => {
        state.sort = !active ? { key: c.key, dir: c.num ? 'desc' : 'asc' } : state.sort.dir === 'asc' ? { key: c.key, dir: 'desc' } : state.sort.dir === 'desc' && !c.num ? null : { key: c.key, dir: 'asc' };
        persist(); draw();
      });
      const grip = h('span.tbl__grip', { 'aria-hidden': 'true' });
      grip.addEventListener('pointerdown', (e) => {
        e.preventDefault(); grip.setPointerCapture(e.pointerId);
        const start = e.clientX, w0 = th.getBoundingClientRect().width;
        const move = (ev) => { const w = Math.max(60, w0 + (start - ev.clientX)); th.style.width = w + 'px'; state.widths[c.key] = Math.round(w); };
        const up = () => { grip.removeEventListener('pointermove', move); persist(); };
        grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up, { once: true });
      });
      th.append(btn, grip);
      tr.append(th);
    }
    return h('thead', tr);
  }

  function draw() {
    const f = filtered();
    const cols = visibleCols();
    count.textContent = f.length === rows.length ? `${rows.length.toLocaleString('he-IL')} שורות` : `${f.length.toLocaleString('he-IL')} מתוך ${rows.length.toLocaleString('he-IL')}`;
    clear(table);
    table.append(header());
    const tb = h('tbody');
    for (const r of f.slice(0, state.shown)) {
      const tr = h('tr', { class: state.selected.has(r.id) ? 'is-selected' : '' });
      if (cfg.selectable) {
        const cb = h('input', { type: 'checkbox', checked: state.selected.has(r.id), 'aria-label': 'בחירת שורה' });
        cb.addEventListener('change', () => { cb.checked ? state.selected.add(r.id) : state.selected.delete(r.id); tr.classList.toggle('is-selected', cb.checked); drawBulk(); });
        tr.append(h('td.tbl__check', cb));
      }
      cols.forEach((c, i) => {
        let v = c.render ? c.render(r) : colVal(c, r);
        if (v === null || v === undefined || v === '') v = h('span.dash', '—');
        if (i === 0 && cfg.rowHref) v = h('a.tbl__link', { href: cfg.rowHref(r) }, v);
        tr.append(h('td', { class: c.num ? 'num' : '' }, v));
      });
      if (cfg.rowHref) tr.addEventListener('click', (e) => { if (!e.target.closest('a,button,input,select,label')) location.hash = cfg.rowHref(r).replace(/^#/, ''); });
      tb.append(tr);
    }
    table.append(tb);
    more.hidden = f.length <= state.shown;
    more.textContent = `הצגת עוד (${(f.length - state.shown).toLocaleString('he-IL')} נותרו)`;
    const isEmpty = f.length === 0;
    wrap.hidden = isEmpty; emptyBox.hidden = !isEmpty;
    if (isEmpty) {
      clear(emptyBox);
      if (rows.length === 0 && cfg.empty) emptyBox.append(h('p.empty__title', cfg.empty.title), cfg.empty.text ? h('p.muted', cfg.empty.text) : null, cfg.empty.action || null);
      else emptyBox.append(h('p.empty__title', 'אין תוצאות לחיפוש או לסינון'), h('button.btn.btn--ghost', { type: 'button', onclick: () => apply({}) }, 'ניקוי חיפוש וסינון'));
    }
    drawBulk();
  }
  function drawBulk() {
    if (!cfg.bulk) return;
    const sel = rows.filter((r) => state.selected.has(r.id));
    bulkBar.hidden = sel.length === 0;
    clear(bulkBar);
    if (!sel.length) return;
    bulkBar.append(h('span', `${sel.length} נבחרו`), ...cfg.bulk.map((b) => h('button.btn.btn--sm', { type: 'button', onclick: async () => {
      try { await b.run(sel); state.selected.clear(); draw(); } catch (e) { toastError(e); }
    } }, b.label)), h('button.linkbtn', { type: 'button', onclick: () => { state.selected.clear(); draw(); } }, 'ביטול בחירה'));
  }

  draw();
  return { el, setRows(r) { rows = r; state.selected.clear(); draw(); }, get rows() { return filtered(); } };
}
