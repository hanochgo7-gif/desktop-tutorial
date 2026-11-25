// Stock: balances per site and item from stock_status(), with the day-to-day stock operations as row actions.
// Also exports the inventory helpers the other inventory screens share (operation dialogs, row menu, monthly series).
import { h, clear } from '../ui/dom.js';
import { rpc, db, idemKey } from '../core/api.js';
import { store, siteName, item as itemOf, itemName } from '../core/store.js';
import { pageHeader, section, kpi, button, empty, note, tone } from '../ui/components.js';
import { dataTable } from '../ui/table.js';
import { field, number, textarea, text, select, picker, itemOptions } from '../ui/forms.js';
import { modal, toast, toastError } from '../ui/overlay.js';
import { icon } from '../ui/icons.js';
import { money, money0, moneyShort, qty, num, date } from '../core/format.js';
import { href, go } from '../core/router.js';
import { openTransferDialog } from './transfers.js';

export const MONTHS = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
export const uomOf = (id) => itemOf(id)?.uom || '';
export const q = (v, itemId) => qty(v, uomOf(itemId));
export const canSite = (id) => store.ref.sites.some((s) => s.id === id);
export const activeSites = () => store.ref.sites.filter((s) => s.status !== 'closed');
export const n0 = (v) => Number(v || 0);

// 12 months ending this month: [{key:'2026-11', label, title}]
export function lastMonths(count = 12) {
  const out = []; const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: MONTHS[d.getMonth()], title: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` });
  }
  return out;
}
// movements → monthly sums, valueOf(m) gives the amount of one movement
export function monthlySeries(movs, valueOf, count = 12) {
  const months = lastMonths(count);
  const sums = Object.fromEntries(months.map((m) => [m.key, 0]));
  for (const m of movs) { const d = new Date(m.created_at); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; if (k in sums) sums[k] += valueOf(m); }
  return months.map((m) => ({ label: m.label, title: m.title, value: Math.round(sums[m.key] * 1000) / 1000 }));
}
export const monthsAgoIso = (n) => { const d = new Date(); d.setMonth(d.getMonth() - n, 1); d.setHours(0, 0, 0, 0); return d.toISOString(); };

// A labelled number input with its unit next to it (field() labels a single element).
let ufId = 0;
export function unitField(label, input, unitEl, { required, hint } = {}) {
  input.id = input.id || `uf-${++ufId}`;
  if (required) input.required = true;
  const hintEl = hint ? h('span.field__hint', { id: input.id + '-h' }, hint) : null;
  if (hint) input.setAttribute('aria-describedby', input.id + '-h');
  return h('div.field', h('label.field__label', { for: input.id }, label, required ? h('span.req', { 'aria-hidden': 'true' }, ' *') : null), h('div.inv-qtyin', input, unitEl), hintEl);
}

// ---------------------------------------------------------------- row menu (a small popover of actions)
let openMenuEl = null;
function closeMenu() { if (openMenuEl) { openMenuEl.cleanup(); openMenuEl.remove(); openMenuEl = null; } }
export function actionMenu(items, { label = 'פעולות', kind = 'ghost', aria } = {}) {
  const list = items.filter(Boolean);
  if (!list.length) return null;
  const btn = h('button.btn.btn--sm.inv-menu__btn', { type: 'button', class: kind ? `btn--${kind}` : '', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': aria || null }, label, icon('chevronDown', 14));
  btn.addEventListener('click', (e) => { e.stopPropagation(); const was = openMenuEl?.owner === btn; closeMenu(); if (!was) showMenu(btn, list); });
  return btn;
}
function showMenu(btn, items) {
  const buttons = [];
  const m = h('div.inv-menu', { role: 'menu' }, items.map((it) => {
    if (it.sep) return h('div.inv-menu__sep', { role: 'separator' });
    if (it.href) { const a = h('a.inv-menu__item', { role: 'menuitem', href: it.href, onclick: () => closeMenu() }, it.label); buttons.push(a); return a; }
    const b = h('button.inv-menu__item', { type: 'button', role: 'menuitem', class: it.danger ? 'is-danger' : '', onclick: () => { closeMenu(); btn.focus(); it.run(); } }, it.label);
    buttons.push(b); return b;
  }));
  m.owner = btn;
  document.body.append(m);
  const r = btn.getBoundingClientRect();
  const mw = m.offsetWidth, mh = m.offsetHeight;
  let left = r.right - mw; if (left < 8) left = Math.min(r.left, innerWidth - mw - 8);
  let top = r.bottom + 4; if (top + mh > innerHeight - 8 && r.top - mh - 4 > 8) top = r.top - mh - 4;
  Object.assign(m.style, { left: Math.max(8, left) + 'px', top: top + 'px' });
  btn.setAttribute('aria-expanded', 'true');
  const outside = (e) => { if (!m.contains(e.target) && e.target !== btn && !btn.contains(e.target)) closeMenu(); };
  const key = (e) => {
    const i = buttons.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(); btn.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); buttons[(i + 1) % buttons.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); buttons[(i - 1 + buttons.length) % buttons.length].focus(); }
    else if (e.key === 'Tab') closeMenu();
  };
  const away = () => closeMenu();
  document.addEventListener('pointerdown', outside, true);
  document.addEventListener('keydown', key, true);
  window.addEventListener('scroll', away, true);
  window.addEventListener('resize', away);
  window.addEventListener('hashchange', away);
  m.cleanup = () => {
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside, true);
    document.removeEventListener('keydown', key, true);
    window.removeEventListener('scroll', away, true);
    window.removeEventListener('resize', away);
    window.removeEventListener('hashchange', away);
  };
  openMenuEl = m;
  buttons[0]?.focus();
}

// ---------------------------------------------------------------- stock operations
export const OPS = {
  issue: { label: 'ניפוק', title: 'ניפוק מהמלאי', perm: 'stock.move', reason: false, reasonLabel: 'למה או למי (עבודה, פרויקט, מקבל)', from: 'available', done: 'נופקו' },
  damaged: { label: 'סימון כפגום', title: 'סימון יחידות כפגומות', perm: 'stock.move', reason: true, reasonLabel: 'מה הפגם', from: 'available', done: 'סומנו כפגומות' },
  repaired: { label: 'החזרת פגומים למלאי', title: 'פגומים שתוקנו חוזרים למלאי', perm: 'stock.move', reason: false, reasonLabel: 'מה תוקן', from: 'damaged', done: 'הוחזרו למלאי' },
  write_off_damaged: { label: 'גריעת פגומים', title: 'גריעת יחידות פגומות', perm: 'stock.adjust', reason: true, reasonLabel: 'סיבת הגריעה', from: 'damaged', done: 'נגרעו (פגומים)' },
  adjustment: { label: 'התאמת מלאי (+/−)', title: 'התאמת מלאי', perm: 'stock.adjust', reason: true, reasonLabel: 'סיבת ההתאמה', from: 'available', done: 'הותאמו' },
  write_off: { label: 'גריעה מהמלאי', title: 'גריעה מהמלאי', perm: 'stock.adjust', reason: true, reasonLabel: 'סיבת הגריעה (פג תוקף, נגנב, נהרס…)', from: 'available', done: 'נגרעו' },
  opening: { label: 'יתרת פתיחה', title: 'רישום יתרת פתיחה', perm: 'stock.adjust', reason: true, reasonLabel: 'הערה', from: null, done: 'נרשמו כיתרת פתיחה' },
};

async function balanceOf(siteId, itemId) {
  if (!siteId || !itemId) return null;
  const b = await db('stock_balances').select('on_hand,reserved,damaged').eq('site_id', siteId).eq('item_id', itemId).one();
  return b ? { on_hand: n0(b.on_hand), reserved: n0(b.reserved), damaged: n0(b.damaged), available: n0(b.on_hand) - n0(b.reserved) } : { on_hand: 0, reserved: 0, damaged: 0, available: 0 };
}

// stockOpDialog({ op, siteId?, itemId?, row? (from stock_status), onDone })
export function stockOpDialog({ op, siteId = null, itemId = null, row = null, onDone }) {
  const o = OPS[op];
  const key = idemKey();
  let bal = row ? { on_hand: n0(row.on_hand), reserved: n0(row.reserved), damaged: n0(row.damaged), available: n0(row.available) } : null;
  const fixed = !!(siteId && itemId);
  const siteSel = fixed ? null : select(activeSites().map((s) => [s.id, s.name]), { value: siteId || '' }, { empty: 'בחירת אתר' });
  const itemPick = fixed ? null : picker({ items: itemOptions, value: itemId, label: 'פריט', required: true, onPick: (id) => { itemId = id; reload(); } });
  if (siteSel) { siteSel.required = true; siteSel.addEventListener('change', () => { siteId = siteSel.value || null; reload(); }); }
  const dir = op === 'adjustment' ? select([['+', 'הוספה למלאי (+)'], ['-', 'הפחתה מהמלאי (−)']], { value: '-' }) : null;
  const qtyIn = number({ min: '0.001', required: true, name: 'qty' });
  const uom = h('span.inv-uom', itemId ? uomOf(itemId) : '');
  const cost = op === 'opening' ? number({ min: '0', name: 'cost', placeholder: 'לא חובה' }) : null;
  const reason = textarea({ rows: 2, maxlength: 500, required: o.reason, value: op === 'opening' ? 'יתרת פתיחה' : '' });
  const ctx = h('div.inv-ctx');
  const preview = h('p.inv-preview', { 'aria-live': 'polite' });

  function drawCtx() {
    clear(ctx);
    if (!siteId || !itemId) { ctx.append(h('span.muted', 'בחרו אתר ופריט כדי לראות את היתרה.')); return; }
    uom.textContent = uomOf(itemId);
    ctx.append(h('div.inv-ctx__title', itemName(itemId), h('span.muted', ` · ${siteName(siteId)}`)),
      bal ? h('div.inv-ctx__nums',
        h('span', 'זמין ', h('b', q(bal.available, itemId))), h('span', 'במלאי ', h('b', q(bal.on_hand, itemId))),
        bal.reserved ? h('span', 'שמור לדרישות ', h('b', q(bal.reserved, itemId))) : null,
        h('span', 'פגום ', h('b', q(bal.damaged, itemId)))) : h('span.muted', 'טוען יתרה…'));
  }
  function drawPreview() {
    const v = Number(qtyIn.value || 0);
    preview.className = 'inv-preview'; clear(preview);
    if (!bal || !v || !itemId) return;
    const sign = op === 'adjustment' && dir.value === '+' ? 1 : -1;
    let line, bad = false;
    if (op === 'opening') line = `במלאי אחרי הרישום: ${q(bal.on_hand + v, itemId)}`;
    else if (op === 'adjustment') { const after = bal.on_hand + sign * v; bad = sign < 0 && v > bal.available; line = `במלאי: ${q(bal.on_hand, itemId)} ← ${q(after, itemId)}`; }
    else if (o.from === 'damaged') { bad = v > bal.damaged; line = op === 'repaired' ? `פגום: ${q(bal.damaged, itemId)} ← ${q(bal.damaged - v, itemId)} · זמין: ${q(bal.available + v, itemId)}` : `פגום: ${q(bal.damaged, itemId)} ← ${q(bal.damaged - v, itemId)}`; }
    else { bad = v > bal.available; line = `זמין: ${q(bal.available, itemId)} ← ${q(bal.available - v, itemId)}` + (op === 'damaged' ? ` · פגום: ${q(bal.damaged + v, itemId)}` : ''); }
    preview.append(h('span.muted', 'תצוגה מקדימה · '), line);
    if (bad) { preview.classList.add('is-bad'); preview.append(h('span', ` · יותר ממה שיש (${q(o.from === 'damaged' ? bal.damaged : bal.available, itemId)})`)); }
  }
  async function reload() {
    bal = null; drawCtx(); drawPreview();
    if (!siteId || !itemId) return;
    try { bal = await balanceOf(siteId, itemId); } catch (e) { toastError(e); }
    drawCtx(); drawPreview();
  }
  qtyIn.addEventListener('input', drawPreview);
  dir?.addEventListener('change', drawPreview);

  const form = h('div.stack',
    ctx,
    fixed ? null : h('div.form-grid', field('אתר', siteSel, { required: true }), field('פריט', itemPick, { required: true })),
    h('div.form-grid',
      dir ? field('כיוון', dir) : null,
      unitField('כמות', qtyIn, uom, { required: true }),
      cost ? field('עלות ליחידה (₪, לפני מע״מ)', cost, { hint: 'קובעת את שווי המלאי. ריק: לפי העלות הממוצעת הקיימת.' }) : null),
    field(o.reasonLabel, reason, { required: o.reason, wide: true }),
    preview,
    op === 'adjustment' ? note('התאמה מתקנת את היתרה בלי ספירה מלאה. כל התאמה נרשמת ביומן עם הסיבה ושם המבצע.', 'info') : null,
    op === 'write_off' || op === 'write_off_damaged' ? note('גריעה מוציאה את היחידות מהמלאי לצמיתות ונרשמת כהפסד.', 'warn') : null);

  modal({ title: o.title, body: form, actions: [
    { label: 'ביטול' },
    { label: o.label === 'יתרת פתיחה' ? 'רישום' : o.label.replace(' (+/−)', ''), kind: op.startsWith('write_off') ? 'danger' : 'primary', onClick: async () => {
      if (!siteId) { siteSel?.focus(); siteSel?.reportValidity(); return false; }
      if (!itemId) { itemPick?.focusInput(); return false; }
      const v = Number(qtyIn.value);
      if (!qtyIn.value || !(v > 0)) { qtyIn.setAttribute('aria-invalid', 'true'); qtyIn.focus(); qtyIn.reportValidity(); return false; }
      if (o.reason && !reason.value.trim()) { reason.setAttribute('aria-invalid', 'true'); reason.focus(); return false; }
      const sign = op === 'adjustment' && dir.value === '-' ? -1 : 1;
      try {
        await rpc('stock_operation', { p_org: store.org.id, p_site: siteId, p_item: itemId, p_op: op, p_qty: sign * v,
          p_reason: reason.value.trim() || null, p_unit_cost: cost && cost.value !== '' ? Number(cost.value) : null, p_idem: key });
      } catch (e) { toastError(e); return false; }
      toast(`${q(Math.abs(sign * v), itemId)} ${itemName(itemId)} ${op === 'adjustment' ? (sign > 0 ? 'נוספו בהתאמה' : 'הופחתו בהתאמה') : o.done} · ${siteName(siteId)}`);
      onDone?.();
    } }] });
  if (!bal) reload(); else drawCtx();
  if (fixed) setTimeout(() => qtyIn.focus(), 30);
}

// min / reorder / max / bin location of one item at one site (item_site_settings)
export async function settingsDialog({ siteId, itemId, onDone }) {
  let cur;
  try { cur = await db('item_site_settings').select('min_qty,max_qty,reorder_point,bin_location').eq('site_id', siteId).eq('item_id', itemId).one(); } catch (e) { return toastError(e); }
  const it = itemOf(itemId) || {};
  const def = (v) => (v === null || v === undefined ? 'אין' : num(v));
  const min = number({ min: '0', value: cur?.min_qty ?? '', placeholder: `ברירת מחדל: ${def(it.min_qty)}` });
  const rop = number({ min: '0', value: cur?.reorder_point ?? '', placeholder: 'ברירת מחדל: כמו המינימום' });
  const max = number({ min: '0', value: cur?.max_qty ?? '', placeholder: `ברירת מחדל: ${def(it.max_qty)}` });
  const bin = text({ value: cur?.bin_location || '', maxlength: 60, placeholder: 'למשל A-03-2' });
  const err = h('p.form__error', { role: 'alert' });
  modal({ title: 'רמות מלאי ומיקום באתר', body: h('div.stack',
    h('div.inv-ctx', h('div.inv-ctx__title', itemName(itemId), h('span.muted', ` · ${siteName(siteId)}`))),
    h('div.form-grid',
      field(`מינימום (${it.uom || ''})`, min, { hint: 'מתחתיו הפריט מסומן בחוסר' }),
      field('נקודת הזמנה', rop, { hint: 'זמין + בהזמנה + בדרך ≤ נקודה זו → להזמנה' }),
      field('מקסימום', max, { hint: 'עד כמה להשלים בהזמנה' }),
      field('מיקום במחסן', bin)),
    h('p.muted.inv-small', 'שדה ריק משתמש בערך הכללי של הפריט. הערכים כאן חלים רק על האתר הזה.'), err),
    actions: [{ label: 'ביטול' }, { label: 'שמירה', kind: 'primary', onClick: async () => {
      const v = (el) => (el.value === '' ? null : Number(el.value));
      const row = { min_qty: v(min), reorder_point: v(rop), max_qty: v(max), bin_location: bin.value.trim() || null };
      if (row.min_qty !== null && row.max_qty !== null && row.max_qty < row.min_qty) { err.textContent = 'המקסימום קטן מהמינימום.'; max.focus(); return false; }
      if ([row.min_qty, row.reorder_point, row.max_qty].some((x) => x !== null && (Number.isNaN(x) || x < 0))) { err.textContent = 'ערך לא תקין.'; return false; }
      try {
        if (cur) await db('item_site_settings').eq('site_id', siteId).eq('item_id', itemId).update(row);
        else await db('item_site_settings').insert({ org_id: store.org.id, site_id: siteId, item_id: itemId, ...row });
      } catch (e) { toastError(e); return false; }
      toast(`רמות המלאי של ${itemName(itemId)} ב${siteName(siteId)} נשמרו`);
      onDone?.();
    } }] });
}

// the actions a person may take on one stock_status row
export function stockActions(row, onDone) {
  if (!canSite(row.site_id)) return [];
  const op = (k) => (store.can(OPS[k].perm) ? { label: OPS[k].label, run: () => stockOpDialog({ op: k, siteId: row.site_id, itemId: row.item_id, row, onDone }) } : null);
  const a = n0(row.available) > 0, d = n0(row.damaged) > 0;
  const list = [
    a ? op('issue') : null, a ? op('damaged') : null, d ? op('repaired') : null,
    op('adjustment'), a ? op('write_off') : null, d ? op('write_off_damaged') : null, op('opening'),
    store.can('items.manage') || store.can('stock.adjust') ? { label: 'מינימום, מקסימום ומיקום', run: () => settingsDialog({ siteId: row.site_id, itemId: row.item_id, onDone }) } : null,
    store.can('stock.transfer') && a ? { label: 'העברה לאתר אחר', run: () => openTransferDialog({ from: row.site_id, lines: [{ item_id: row.item_id }] }) } : null,
  ].filter(Boolean);
  return list;
}

export function stockStatusBadge(r) {
  if (n0(r.available) <= 0 && (r.min_qty !== null || n0(r.daily_use) > 0)) return tone('אזל', 'bad');
  if (r.below_min) return tone('מתחת למינימום', 'bad');
  if (r.below_reorder) return tone('להזמנה', 'warn');
  return null;
}
const statusKey = (r) => (n0(r.available) <= 0 && (r.min_qty !== null || n0(r.daily_use) > 0) ? 'out' : r.below_min ? 'min' : r.below_reorder ? 'reorder' : 'ok');

// The columns of a stock_status table (also used on the item and site cards).
export function stockColumns({ showSite = true, showItem = true, onDone, fin = store.can('finance.view') } = {}) {
  return [
    showSite ? { key: 'site', label: 'אתר', value: (r) => siteName(r.site_id), render: (r) => h('a', { href: href(`sites/${r.site_id}`) }, siteName(r.site_id)), filter: 'select', filterValue: (r) => siteName(r.site_id) } : null,
    showItem ? { key: 'item', label: 'פריט', value: (r) => itemName(r.item_id), render: (r) => h('a.tbl__link', { href: href(`items/${r.item_id}`) }, itemName(r.item_id)) } : null,
    showItem ? { key: 'sku', label: 'מק״ט', value: (r) => itemOf(r.item_id)?.sku || '', render: (r) => h('span.ltr', itemOf(r.item_id)?.sku || '') } : null,
    { key: 'available', label: 'זמין', num: true, value: (r) => n0(r.available), render: (r) => h('span', { class: r.below_min || n0(r.available) < 0 ? 'inv-bad' : r.below_reorder ? 'inv-warn' : 'inv-strong' }, q(r.available, r.item_id)) },
    { key: 'on_hand', label: 'במלאי', num: true, value: (r) => n0(r.on_hand), render: (r) => num3(r.on_hand) },
    { key: 'reserved', label: 'שמור', num: true, value: (r) => n0(r.reserved), render: (r) => num3(r.reserved) },
    { key: 'damaged', label: 'פגום', num: true, value: (r) => n0(r.damaged), render: (r) => num3(r.damaged) },
    { key: 'on_order', label: 'בהזמנה', num: true, value: (r) => n0(r.on_order), render: (r) => num3(r.on_order) },
    { key: 'in_transit', label: 'בדרך', num: true, value: (r) => n0(r.in_transit), render: (r) => num3(r.in_transit) },
    { key: 'levels', label: 'מינ׳ / נק׳ הזמנה / מקס׳', num: true, value: (r) => `${lv(r.min_qty)} / ${lv(r.reorder_point)} / ${lv(r.max_qty)}`, sort: (r) => r.min_qty ?? null, search: false },
    { key: 'bin', label: 'מיקום', value: (r) => r.bin_location || '', hidden: true },
    { key: 'daily_use', label: 'צריכה יומית', num: true, value: (r) => (r.daily_use === null ? null : Number(r.daily_use)), render: (r) => (n0(r.daily_use) > 0 ? qty(r.daily_use) : null), hidden: true },
    { key: 'days_cover', label: 'ימי כיסוי', num: true, value: (r) => (r.days_cover === null ? null : Number(r.days_cover)), render: (r) => (r.days_cover === null ? null : h('span', { class: Number(r.days_cover) <= n0(r.lead_time_days ?? 7) ? 'inv-bad' : '' }, num(r.days_cover))) },
    { key: 'stockout', label: 'אזילה צפויה', value: (r) => r.stockout_date || '', render: (r) => (r.stockout_date ? date(r.stockout_date) : null), exportValue: (r) => r.stockout_date || '' },
    { key: 'suggested', label: 'מוצע להזמנה', num: true, value: (r) => n0(r.suggested_qty), render: (r) => (n0(r.suggested_qty) > 0 ? q(r.suggested_qty, r.item_id) : null) },
    fin ? { key: 'value', label: 'שווי', num: true, value: (r) => (r.stock_value === null ? null : Number(r.stock_value)), render: (r) => money0(r.stock_value) } : null,
    { key: 'status', label: 'מצב', value: (r) => ({ out: 'אזל', min: 'מתחת למינימום', reorder: 'להזמנה', ok: '' })[statusKey(r)], render: stockStatusBadge,
      filter: 'select', filterValue: statusKey, options: [['out', 'אזל'], ['min', 'מתחת למינימום'], ['reorder', 'להזמנה'], ['ok', 'תקין']] },
    onDone ? { key: 'actions', label: 'פעולות', search: false, export: false, value: () => '', render: (r) => actionMenu(stockActions(r, onDone), { aria: `פעולות על ${itemName(r.item_id)} ב${siteName(r.site_id)}` }) } : null,
  ].filter(Boolean);
}
const lv = (v) => (v === null || v === undefined ? '—' : num(v));
const num3 = (v) => (n0(v) === 0 ? h('span.dash', '0') : qty(v));

export const DAYS_COVER_NOTE = 'איך מחושבים ימי הכיסוי: הכמות הזמינה (במלאי פחות שמור לדרישות) חלקי הצריכה היומית באתר. הצריכה היומית היא כל מה שיצא לשימוש ב־90 הימים האחרונים – ניפוקים, ניפוקים לפי דרישה, גריעות וסימון כפגום – חלקי 90. העברות בין אתרים והחזרות לספק אינן צריכה. אזילה צפויה = היום + ימי הכיסוי. פריט שלא נצרך ב־90 יום – אין לו תחזית (—). הכמות המוצעת משלימה עד המקסימום; בלי מקסימום – לצריכה של זמן האספקה ועוד 30 יום, בניכוי מה שכבר בהזמנה ובדרך.';

// ---------------------------------------------------------------- the screen
const VIEWS = [['', 'הכול'], ['low', 'חוסרים ולהזמנה'], ['damaged', 'פגומים'], ['transit', 'בדרך ובהזמנה'], ['nostock', 'ללא מלאי']];

export default async function stock({ query, refresh }) {
  if (!store.can('stock.view')) return empty('אין לכם הרשאה לצפות במלאי', 'פנו למנהל המערכת כדי לקבל הרשאת צפייה במלאי.');
  const fin = store.can('finance.view');
  const siteId = query.site && canSite(query.site) ? query.site : '';
  const view = VIEWS.some(([v]) => v === (query.view || '')) ? (query.view || '') : '';
  const all = await rpc('stock_status', { p_org: store.org.id, p_site: siteId || null });
  all.forEach((r) => { r.id = `${r.site_id}:${r.item_id}`; });
  all.sort((a, b) => siteName(a.site_id).localeCompare(siteName(b.site_id), 'he') || itemName(a.item_id).localeCompare(itemName(b.item_id), 'he'));

  const isLow = (r) => r.below_min || r.below_reorder;
  const filters = { '': () => true, low: isLow, damaged: (r) => n0(r.damaged) > 0, transit: (r) => n0(r.in_transit) > 0 || n0(r.on_order) > 0, nostock: (r) => n0(r.on_hand) <= 0 };
  let rows = all.filter(filters[view]);
  if (view === 'low') rows = [...rows].sort((a, b) => (a.days_cover ?? 1e9) - (b.days_cover ?? 1e9) || (n0(a.available) - n0(a.min_qty)) - (n0(b.available) - n0(b.min_qty)));

  const link = (v, s = siteId) => href('stock' + (() => { const p = new URLSearchParams(Object.entries({ site: s, view: v }).filter(([, x]) => x)).toString(); return p ? '?' + p : ''; })());
  const value = all.reduce((s, r) => s + n0(r.stock_value), 0);
  const cnt = (f) => all.filter(f).length;

  const actions = [
    store.can('stock.transfer') ? button('העברה חדשה', () => openTransferDialog({ from: siteId || null }), { ic: 'transfer', kind: 'primary' }) : null,
    store.can('stock.move') ? button('ניפוק', () => stockOpDialog({ op: 'issue', siteId: siteId || null, onDone: refresh }), { ic: 'box' }) : null,
    store.can('stock.adjust') ? button('יתרת פתיחה', () => stockOpDialog({ op: 'opening', siteId: siteId || null, onDone: refresh }), { ic: 'plus' }) : null,
    store.can('stock.count') ? button('ספירות', null, { href: href('counts'), ic: 'count', kind: 'ghost' }) : null,
  ].filter(Boolean);

  const siteSel = h('select.input.input--sm#stk-site', { onchange: (e) => go(link(view, e.target.value).slice(2)) },
    h('option', { value: '' }, 'כל האתרים'), store.ref.sites.map((s) => h('option', { value: s.id, selected: s.id === siteId }, s.name)));
  const seg = h('nav.inv-seg', { 'aria-label': 'תצוגה' }, VIEWS.map(([v, l]) => h('a.inv-seg__item', { href: link(v), 'aria-current': v === view ? 'page' : null }, l,
    v ? h('span.inv-seg__count', num(cnt(filters[v]))) : null)));

  const kpis = h('div.kpis',
    kpi('שורות מלאי', num(all.length), { sub: siteId ? siteName(siteId) : `${num(new Set(all.map((r) => r.site_id)).size)} אתרים`, href: link('') }),
    kpi('מתחת למינימום', num(cnt((r) => r.below_min)), { tone: cnt((r) => r.below_min) ? 'bad' : 'good', sub: `${num(cnt((r) => r.below_reorder))} בנקודת הזמנה`, href: link('low') }),
    kpi('יגמרו בתוך זמן האספקה', num(cnt((r) => r.days_cover !== null && Number(r.days_cover) <= n0(r.lead_time_days ?? 7))), { sub: 'לפי צריכת 90 יום', href: link('low') }),
    kpi('יחידות פגומות', num(all.reduce((s, r) => s + n0(r.damaged), 0)), { sub: `ב־${num(cnt((r) => n0(r.damaged) > 0))} שורות`, href: link('damaged') }),
    kpi('בדרך מהעברות', num(cnt((r) => n0(r.in_transit) > 0)), { sub: `${num(cnt((r) => n0(r.on_order) > 0))} שורות בהזמנת רכש`, href: link('transit') }),
    fin ? kpi('שווי מלאי', moneyShort(value), { sub: 'לפי עלות ממוצעת, לפני מע״מ' }) : null);

  const bulk = [];
  if (store.can('stock.transfer')) bulk.push({ label: 'יצירת העברה', run: (sel) => {
    const sites = [...new Set(sel.map((r) => r.site_id))];
    if (sites.length !== 1) { toast('בחרו שורות של אתר יעד אחד כדי ליצור העברה אליו.', 'warn'); return; }
    openTransferDialog({ to: sites[0], suggestSource: true, lines: sel.map((r) => ({ item_id: r.item_id, qty: n0(r.suggested_qty) > 0 ? n0(r.suggested_qty) : null })) });
  } });
  if (store.can('requests.create')) bulk.push({ label: 'דרישת רכש', run: (sel) => {
    const sites = [...new Set(sel.map((r) => r.site_id))];
    if (sites.length !== 1) { toast('דרישת רכש היא לאתר אחד. בחרו שורות של אתר אחד.', 'warn'); return; }
    const items = sel.map((r) => `${r.item_id}:${n0(r.suggested_qty) > 0 ? n0(r.suggested_qty) : ''}`).join(',');
    go(`requests/new?site=${sites[0]}&items=${encodeURIComponent(items)}`);
  } });

  const table = dataTable({
    id: siteId ? 'stock-site' : 'stock', rows, selectable: bulk.length > 0, bulk, exportName: 'מלאי',
    columns: stockColumns({ showSite: !siteId, onDone: refresh, fin }),
    empty: view ? { title: 'אין שורות בתצוגה הזו', text: 'אין כרגע פריטים שמתאימים לתצוגה שנבחרה.', action: h('a.btn', { href: link('') }, 'לכל המלאי') }
      : { title: 'אין עדיין מלאי', text: 'מלאי נוצר מקליטת סחורה, מיתרת פתיחה או מהעברה בין אתרים.', action: store.can('stock.adjust') ? button('רישום יתרת פתיחה', () => stockOpDialog({ op: 'opening', siteId: siteId || null, onDone: refresh }), { kind: 'primary' }) : null },
  });

  return h('div.stack',
    pageHeader({ title: 'מלאי', sub: `${siteId ? siteName(siteId) : 'כל האתרים שלכם'} · יתרות בזמן אמת מיומן התנועות`, actions }),
    kpis,
    h('div.inv-bar', h('label.inv-inline', { for: 'stk-site' }, 'אתר'), siteSel, seg),
    view === 'low' && rows.length && bulk.length ? note('סמנו שורות כדי ליצור מהן העברה מאתר אחר או דרישת רכש. הכמות המוצעת נכנסת כברירת מחדל.', 'info') : null,
    table.el,
    h('details.inv-how', h('summary', 'איך מחושבים ימי הכיסוי והכמות המוצעת'), h('p.muted', DAYS_COVER_NOTE)));
}
