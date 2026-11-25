// Form building blocks: labelled fields, a searchable picker (items, suppliers, sites, people), and the document-lines
// editor used by requests, RFQs and orders. Totals shown while typing are previews; the server computes the real ones.
import { h, clear, debounce } from './dom.js';
import { icon } from './icons.js';
import { money, qty as fmtQty } from '../core/format.js';
import { store } from '../core/store.js';

let uid = 0;
const nextId = (p) => `${p}-${++uid}`;

// field('שם', inputEl, { hint, required }) → <label>
export function field(label, input, { hint, required, wide } = {}) {
  const id = input.id || nextId('f');
  input.id = id;
  if (required) input.required = true;
  const hintEl = hint ? h('span.field__hint', { id: id + '-h' }, hint) : null;
  if (hint) input.setAttribute('aria-describedby', id + '-h');
  return h('div.field', { class: wide ? 'field--wide' : '' }, h('label.field__label', { for: id }, label, required ? h('span.req', { 'aria-hidden': 'true' }, ' *') : null), input, hintEl);
}
export const text = (attrs = {}) => h('input.input', { type: 'text', ...attrs });
export const number = (attrs = {}) => h('input.input.input--num', { type: 'number', inputmode: 'decimal', step: 'any', ...attrs });
export const dateInput = (attrs = {}) => h('input.input', { type: 'date', ...attrs });
export const textarea = (attrs = {}) => h('textarea.input', { rows: 3, ...attrs });
export function select(options, attrs = {}, { empty } = {}) {
  const s = h('select.input', attrs);
  if (empty !== undefined) s.append(h('option', { value: '' }, empty));
  for (const o of options) { const [v, l] = Array.isArray(o) ? o : [o.id, o.name]; s.append(h('option', { value: v, selected: String(attrs.value ?? '') === String(v) }, l)); }
  if (attrs.value !== undefined) s.value = attrs.value ?? '';
  return s;
}
export const val = (el) => (el.value === '' ? null : el.value);
export const numVal = (el) => (el.value === '' ? null : Number(el.value));

// Collects named inputs of a form element into an object (empty → null, numbers → Number).
export function formData(root) {
  const o = {};
  root.querySelectorAll('[name]').forEach((el) => {
    if (el.type === 'checkbox') o[el.name] = el.checked;
    else if (el.type === 'number') o[el.name] = el.value === '' ? null : Number(el.value);
    else o[el.name] = el.value.trim() === '' ? null : el.value.trim();
  });
  return o;
}
// Marks the first invalid field and returns false.
export function validate(root) {
  for (const el of root.querySelectorAll('input,select,textarea')) {
    el.removeAttribute('aria-invalid');
    if (!el.checkValidity()) { el.setAttribute('aria-invalid', 'true'); el.reportValidity(); el.focus(); return false; }
  }
  return true;
}

// Searchable picker. picker({ items: [{id, label, sub?}], value, placeholder, onPick(id) }) → element with .value
export function picker({ items, value = null, placeholder = 'חיפוש…', onPick, label = 'בחירה', required = false }) {
  const listId = nextId('pk');
  const input = h('input.input', { type: 'text', role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-controls': listId, placeholder, autocomplete: 'off', 'aria-label': label });
  if (required) input.required = true;
  const list = h('ul.picker__list', { id: listId, role: 'listbox', hidden: true });
  const root = h('div.picker', input, list);
  let current = value; let active = -1; let shown = [];
  const labelOf = (id) => items().find((x) => x.id === id)?.label || '';
  input.value = labelOf(current);
  const norm = (s) => String(s).toLowerCase().replace(/[״"׳']/g, '');
  function open() {
    const q = norm(input.value);
    shown = items().filter((x) => !q || norm(x.label + ' ' + (x.sub || '') + ' ' + (x.keys || '')).includes(q)).slice(0, 40);
    clear(list);
    shown.forEach((x, i) => list.append(h('li.picker__opt', { role: 'option', id: `${listId}-${i}`, 'aria-selected': x.id === current ? 'true' : 'false',
      onmousedown: (e) => { e.preventDefault(); pick(x.id); } }, h('span', x.label), x.sub ? h('span.picker__sub', x.sub) : null)));
    if (!shown.length) list.append(h('li.picker__none', 'לא נמצא'));
    list.hidden = false; input.setAttribute('aria-expanded', 'true'); active = -1;
  }
  function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
  function pick(id) { current = id; input.value = labelOf(id); input.setCustomValidity(''); close(); onPick?.(id); }
  function hi(i) {
    active = Math.max(0, Math.min(shown.length - 1, i));
    list.querySelectorAll('.picker__opt').forEach((o, j) => o.classList.toggle('is-active', j === active));
    input.setAttribute('aria-activedescendant', `${listId}-${active}`);
    list.children[active]?.scrollIntoView({ block: 'nearest' });
  }
  input.addEventListener('input', () => { current = null; if (required) input.setCustomValidity('בחרו מהרשימה'); open(); });
  input.addEventListener('focus', open);
  input.addEventListener('blur', () => setTimeout(() => { close(); if (!current) input.value = ''; }, 120));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) open(); hi(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); hi(active - 1); }
    else if (e.key === 'Enter' && !list.hidden && shown[active]) { e.preventDefault(); pick(shown[active].id); }
    else if (e.key === 'Escape') close();
  });
  Object.defineProperty(root, 'value', { get: () => current, set: (v) => { current = v; input.value = labelOf(v); } });
  root.focusInput = () => input.focus();
  return root;
}
export const itemOptions = () => store.ref.items.filter((i) => i.status !== 'discontinued').map((i) => ({ id: i.id, label: i.name, sub: i.sku, keys: i.barcode || '' }));
export const supplierOptions = (all = false) => store.ref.suppliers.filter((s) => all || s.status !== 'blocked').map((s) => ({ id: s.id, label: s.name, sub: s.status === 'on_hold' ? 'בהמתנה' : '' }));
export const siteOptions = () => store.ref.sites.filter((s) => s.status !== 'closed').map((s) => ({ id: s.id, label: s.name, sub: s.code }));
export const peopleOptions = () => store.ref.people.filter((p) => p.active).map((p) => ({ id: p.id, label: p.full_name || p.email, sub: p.email }));

// Lines editor. cols: subset of ['item','description','qty','price','discount','note'].
// linesEditor({ cols, lines: [{item_id, qty, unit_price, discount_pct, description, note}], priceHint?(item_id) → number|null, onChange?(lines) })
export function linesEditor({ cols = ['item', 'qty', 'price'], lines = [], priceHint, onChange, minLines = 1 }) {
  const body = h('tbody');
  const totalEl = h('td.num.lines__total', { colspan: 1 });
  const showMoney = cols.includes('price');
  const head = h('tr',
    h('th', { scope: 'col' }, 'פריט'),
    cols.includes('description') ? h('th', { scope: 'col' }, 'תיאור') : null,
    h('th.num', { scope: 'col' }, 'כמות'),
    showMoney ? h('th.num', { scope: 'col' }, 'מחיר ליחידה (לפני מע״מ)') : null,
    cols.includes('discount') ? h('th.num', { scope: 'col' }, 'הנחה %') : null,
    showMoney ? h('th.num', { scope: 'col' }, 'סה״כ שורה') : null,
    cols.includes('note') ? h('th', { scope: 'col' }, 'הערה') : null,
    h('th', h('span.sr', 'פעולות')));
  const table = h('table.tbl.lines', h('thead', head), body);
  const foot = showMoney ? h('tfoot', h('tr', h('td', { colspan: 1 + (cols.includes('description') ? 1 : 0) + 1 + 1 + (cols.includes('discount') ? 1 : 0) }, 'סה״כ לפני הנחת הזמנה, משלוח ומע״מ'), totalEl, h('td', { colspan: 1 + (cols.includes('note') ? 1 : 0) }))) : null;
  if (foot) table.append(foot);
  const add = h('button.btn.btn--ghost.btn--sm', { type: 'button' }, icon('plus', 16), 'הוספת שורה');
  const root = h('div.lines__root', h('div.tbl__wrap', table), add);
  const rows = [];

  function lineTotal(r) {
    const q = Number(r.qty.value || 0), p = Number(r.price?.value || 0), d = Number(r.disc?.value || 0);
    return Math.round(q * p * (1 - d / 100) * 100) / 100;
  }
  function recalc() {
    let t = 0;
    for (const r of rows) { const v = lineTotal(r); t += v; if (r.tot) r.tot.textContent = money(v); }
    if (showMoney) totalEl.textContent = money(t);
    onChange?.(get());
  }
  function addRow(l = {}) {
    const r = {};
    r.item = picker({ items: itemOptions, value: l.item_id || null, label: 'פריט', required: true, onPick: (id) => {
      const it = store.ref.items.find((x) => x.id === id);
      r.uom.textContent = it?.uom || '';
      if (r.price && !r.price.value && priceHint) { const p = priceHint(id); if (p) { r.price.value = p; } }
      recalc();
    } });
    r.desc = cols.includes('description') ? h('input.input', { type: 'text', value: l.description || '', 'aria-label': 'תיאור' }) : null;
    r.qty = h('input.input.input--num', { type: 'number', min: '0.001', step: 'any', required: true, value: l.qty ?? '', 'aria-label': 'כמות', inputmode: 'decimal' });
    r.uom = h('span.lines__uom', store.ref.items.find((x) => x.id === l.item_id)?.uom || '');
    r.price = showMoney ? h('input.input.input--num', { type: 'number', min: '0', step: 'any', required: true, value: l.unit_price ?? '', 'aria-label': 'מחיר ליחידה', inputmode: 'decimal' }) : null;
    r.disc = cols.includes('discount') ? h('input.input.input--num', { type: 'number', min: '0', max: '100', step: 'any', value: l.discount_pct ?? '', 'aria-label': 'הנחה באחוזים' }) : null;
    r.note = cols.includes('note') ? h('input.input', { type: 'text', value: l.note || '', 'aria-label': 'הערה' }) : null;
    r.tot = showMoney ? h('td.num') : null;
    r.extra = { request_line_id: l.request_line_id || null };
    const del = h('button.iconbtn', { type: 'button', 'aria-label': 'מחיקת שורה' }, icon('x', 16));
    const tr = h('tr', h('td.lines__item', r.item), r.desc ? h('td', r.desc) : null, h('td.num', h('div.lines__qty', r.qty, r.uom)),
      r.price ? h('td.num', r.price) : null, r.disc ? h('td.num', r.disc) : null, r.tot, r.note ? h('td', r.note) : null, h('td', del));
    del.addEventListener('click', () => { if (rows.length <= minLines) return; rows.splice(rows.indexOf(r), 1); tr.remove(); recalc(); });
    [r.qty, r.price, r.disc].filter(Boolean).forEach((x) => x.addEventListener('input', recalc));
    r.tr = tr; rows.push(r); body.append(tr); recalc();
    return r;
  }
  function get() {
    return rows.map((r) => ({
      item_id: r.item.value, qty: r.qty.value === '' ? null : Number(r.qty.value),
      ...(r.price ? { unit_price: r.price.value === '' ? null : Number(r.price.value) } : {}),
      ...(r.disc ? { discount_pct: r.disc.value === '' ? 0 : Number(r.disc.value) } : {}),
      ...(r.desc ? { description: r.desc.value.trim() || null } : {}),
      ...(r.note ? { note: r.note.value.trim() || null } : {}),
      ...(r.extra.request_line_id ? { request_line_id: r.extra.request_line_id } : {}),
    }));
  }
  add.addEventListener('click', () => { const r = addRow(); r.item.focusInput(); });
  (lines.length ? lines : [{}]).forEach(addRow);
  root.get = get;
  root.valid = () => {
    for (const r of rows) {
      if (!r.item.value) { r.item.focusInput(); r.item.querySelector('input').setCustomValidity('בחרו פריט מהרשימה'); r.item.querySelector('input').reportValidity(); return false; }
      for (const x of [r.qty, r.price, r.disc].filter(Boolean)) if (!x.checkValidity()) { x.reportValidity(); x.focus(); return false; }
    }
    return true;
  };
  return root;
}
export { fmtQty };
