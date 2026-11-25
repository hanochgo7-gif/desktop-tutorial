// Transfers between sites: draft → shipped (stock leaves the source, "in transit") → received at the destination.
// Exports openTransferDialog, used by the stock, item and site screens.
import { h, clear } from '../ui/dom.js';
import { rpc, db, idemKey } from '../core/api.js';
import { store, siteName, item as itemOf, itemName, personName } from '../core/store.js';
import { pageHeader, section, kpi, badge, button, facts, empty, note } from '../ui/components.js';
import { dataTable } from '../ui/table.js';
import { field, textarea, select, linesEditor } from '../ui/forms.js';
import { modal, toast, toastError, confirmDialog } from '../ui/overlay.js';
import { money, money0, qty, num, date, dateTime, MOVE } from '../core/format.js';
import { href, go } from '../core/router.js';

const n0 = (v) => Number(v || 0);
const q = (v, itemId) => qty(v, itemOf(itemId)?.uom || '');
const canSite = (id) => store.ref.sites.some((s) => s.id === id);
const STATUSES = [['draft', 'טיוטה'], ['shipped', 'בדרך'], ['received', 'התקבלה'], ['cancelled', 'בוטלה']];
const TRANSIT_NOTE = 'משלוח מוציא את הכמויות ממלאי אתר המקור מיד. עד הקליטה ביעד הן נספרות "בדרך" באתר היעד ואינן זמינות לשימוש באף אתר. בקליטה רושמים כמה הגיע בפועל; חוסר נרשם כהפסד על ההעברה, לפי העלות הממוצעת במקור.';

// ---------------------------------------------------------------- create dialog
// openTransferDialog({ from?, to?, lines?: [{item_id, qty?}], suggestSource?, onDone?(res) })
export function openTransferDialog({ from = null, to = null, lines = [], suggestSource = false, onDone } = {}) {
  if (!store.can('stock.transfer')) { toast('אין לכם הרשאה להעברות בין אתרים.', 'bad'); return; }
  const keyCreate = idemKey(), keyShip = idemKey();
  const sites = store.ref.sites.filter((s) => s.status !== 'closed');
  const fromSel = select(sites.map((s) => [s.id, s.name]), { value: from || '', required: true }, { empty: 'בחירת אתר מקור' });
  const toSel = select(sites.map((s) => [s.id, s.name]), { value: to || '', required: true }, { empty: 'בחירת אתר יעד' });
  const noteIn = textarea({ rows: 2, maxlength: 900, placeholder: 'למשל: לעבודות החשמל בקומה 3' });
  const err = h('p.form__error', { role: 'alert' });
  const suggest = h('div.inv-suggest', { 'aria-live': 'polite' });
  let avail = {}; // item_id → available at source
  let editor = null;

  function markLines() {
    if (!editor) return;
    const ls = editor.get();
    const trs = editor.querySelectorAll('tbody tr');
    ls.forEach((l, i) => {
      const td = trs[i]?.querySelector('.lines__item'); if (!td) return;
      let s = td.querySelector('.inv-avail');
      if (!s) { s = h('span.inv-avail'); td.append(s); }
      if (!l.item_id || !fromSel.value) { s.textContent = ''; s.className = 'inv-avail'; return; }
      const a = avail[l.item_id] ?? 0;
      s.textContent = `זמין במקור: ${q(a, l.item_id)}`;
      s.className = 'inv-avail' + (l.qty && l.qty > a ? ' is-bad' : a <= 0 ? ' is-warn' : '');
    });
  }
  async function loadSource() {
    avail = {};
    if (fromSel.value) {
      try {
        const bs = await db('stock_balances').select('item_id,on_hand,reserved').eq('site_id', fromSel.value).get();
        bs.forEach((b) => { avail[b.item_id] = n0(b.on_hand) - n0(b.reserved); });
      } catch (e) { toastError(e); }
    }
    markLines(); drawSuggest();
  }
  // where could these items come from? sites with stock of the chosen items, best coverage first
  async function drawSuggest() {
    clear(suggest);
    if (!suggestSource || fromSel.value || !editor) return;
    const ls = editor.get().filter((l) => l.item_id);
    if (!ls.length) return;
    let bs = [];
    try { bs = await db('stock_balances').select('site_id,item_id,on_hand,reserved').in('item_id', [...new Set(ls.map((l) => l.item_id))]).get(); } catch { return; }
    const by = {};
    for (const b of bs) {
      if (b.site_id === toSel.value || !canSite(b.site_id)) continue;
      const a = n0(b.on_hand) - n0(b.reserved); if (a <= 0) continue;
      const l = ls.find((x) => x.item_id === b.item_id);
      (by[b.site_id] ||= { lines: 0, full: 0 }).lines++;
      if (!l.qty || a >= l.qty) by[b.site_id].full++;
    }
    const best = Object.entries(by).sort((a, b) => b[1].full - a[1].full || b[1].lines - a[1].lines).slice(0, 3);
    if (!best.length) { suggest.append(h('span.muted', 'לאף אתר אחר אין כרגע מלאי זמין של הפריטים האלה.')); return; }
    suggest.append(h('span.muted', 'מקור מוצע: '), best.map(([sid, x]) => h('button.btn.btn--sm', { type: 'button', onclick: () => { fromSel.value = sid; loadSource(); } },
      `${siteName(sid)} · מכסה ${x.full} מתוך ${ls.length}`)));
  }
  editor = null;
  const ed = linesEditor({ cols: ['item', 'qty'], lines: lines.map((l) => ({ item_id: l.item_id, qty: l.qty ?? '' })), onChange: () => queueMicrotask(markLines) });
  editor = ed;
  fromSel.addEventListener('change', loadSource);
  toSel.addEventListener('change', drawSuggest);

  async function create(ship) {
    err.textContent = '';
    if (!fromSel.value) { fromSel.focus(); fromSel.reportValidity(); return false; }
    if (!toSel.value) { toSel.focus(); toSel.reportValidity(); return false; }
    if (fromSel.value === toSel.value) { err.textContent = 'אתר המקור והיעד זהים.'; toSel.focus(); return false; }
    if (!ed.valid()) return false;
    const ls = ed.get().map((l) => ({ item_id: l.item_id, qty: l.qty }));
    if (ship) {
      const short = ls.filter((l) => l.qty > (avail[l.item_id] ?? 0));
      if (short.length) { err.textContent = `אין מספיק מלאי זמין במקור ל${short.map((l) => itemName(l.item_id)).join(', ')}. אפשר לשמור כטיוטה ולשלוח אחרי שהמלאי יגיע.`; return false; }
    }
    let res;
    try {
      res = await rpc('transfer_create', { p_org: store.org.id, p_from: fromSel.value, p_to: toSel.value, p_lines: ls, p_note: noteIn.value.trim() || null, p_request_id: null, p_idem: keyCreate });
    } catch (e) { toastError(e); return false; }
    if (ship) {
      try { await rpc('transfer_ship', { p_transfer: res.id, p_idem: keyShip }); }
      catch (e) { toastError(e); toast(`ההעברה ${res.number} נשמרה כטיוטה אבל לא נשלחה.`, 'warn'); go(`transfers/${res.id}`); return; }
      toast(`ההעברה ${res.number} נשלחה: המלאי יצא מ${siteName(fromSel.value)} ונמצא בדרך ל${siteName(toSel.value)}`);
    } else toast(`ההעברה ${res.number} נשמרה כטיוטה`);
    if (onDone) onDone(res); else go(`transfers/${res.id}`);
  }

  modal({ title: 'העברה בין אתרים', wide: true, body: h('div.stack',
    h('div.form-grid', field('מאתר', fromSel, { required: true }), field('לאתר', toSel, { required: true })),
    suggest,
    h('div.field', h('span.field__label', 'פריטים וכמויות'), ed),
    field('הערה', noteIn, { wide: true }),
    note(TRANSIT_NOTE, 'info'), err),
    actions: [{ label: 'ביטול' }, { label: 'שמירה כטיוטה', onClick: () => create(false) }, { label: 'יצירה ומשלוח', kind: 'primary', onClick: () => create(true) }] });
  loadSource();
}

// ---------------------------------------------------------------- screens
export default async function transfers({ params, query, refresh }) {
  if (params.id) return detail(params.id, refresh);
  return list(query);
}

async function list(query) {
  const org = store.org.id;
  const [ts, ls] = await Promise.all([
    db('transfers').select('id,number,from_site_id,to_site_id,status,created_by,created_at,shipped_at,received_at,note').eq('org_id', org).order('created_at', { desc: true }).limit(1000).get(),
    db('transfer_lines').select('transfer_id,qty,received_qty').limit(20000).get(),
  ]);
  const lines = {};
  ls.forEach((l) => { const x = (lines[l.transfer_id] ||= { n: 0, qty: 0, short: 0 }); x.n++; x.qty += n0(l.qty); x.short += n0(l.qty) - n0(l.received_qty); });
  ts.forEach((t) => { t.lines = lines[t.id]?.n || 0; t.short = t.status === 'received' ? lines[t.id]?.short || 0 : 0; });
  const status = STATUSES.some(([s]) => s === query.status) ? query.status : '';
  const rows = status ? ts.filter((t) => t.status === status) : ts;
  const cnt = (s) => ts.filter((t) => t.status === s).length;
  const since30 = Date.now() - 30 * 86400000;

  const table = dataTable({
    id: 'transfers', rows, exportName: 'העברות', rowHref: (t) => href(`transfers/${t.id}`),
    columns: [
      { key: 'number', label: 'מספר', render: (t) => h('span.ltr', t.number) },
      { key: 'from', label: 'מאתר', value: (t) => siteName(t.from_site_id), filter: 'select' , filterValue: (t) => siteName(t.from_site_id) },
      { key: 'to', label: 'לאתר', value: (t) => siteName(t.to_site_id), filter: 'select', filterValue: (t) => siteName(t.to_site_id) },
      { key: 'status', label: 'מצב', value: (t) => STATUSES.find(([s]) => s === t.status)?.[1], render: (t) => badge('transfer', t.status), filter: 'select', filterValue: (t) => t.status, options: STATUSES },
      { key: 'lines', label: 'שורות', num: true, render: (t) => num(t.lines) },
      { key: 'short', label: 'חוסר בקליטה', num: true, value: (t) => t.short || null, render: (t) => (t.short > 0 ? h('span.inv-bad', qty(t.short)) : null), hidden: true },
      { key: 'created_at', label: 'נוצרה', value: (t) => t.created_at, render: (t) => date(t.created_at), exportValue: (t) => date(t.created_at) },
      { key: 'created_by', label: 'יצר', value: (t) => personName(t.created_by), hidden: true },
      { key: 'shipped_at', label: 'נשלחה', value: (t) => t.shipped_at || '', render: (t) => (t.shipped_at ? date(t.shipped_at) : null), exportValue: (t) => date(t.shipped_at) },
      { key: 'received_at', label: 'התקבלה', value: (t) => t.received_at || '', render: (t) => (t.received_at ? date(t.received_at) : null), exportValue: (t) => date(t.received_at) },
    ],
    empty: { title: 'אין עדיין העברות', text: 'העברה מעבירה מלאי מאתר לאתר, למשל מהמחסן המרכזי לאתר עבודה.', action: store.can('stock.transfer') ? button('העברה חדשה', () => openTransferDialog(), { kind: 'primary' }) : null },
  });
  const link = (s) => href('transfers' + (s ? `?status=${s}` : ''));
  return h('div.stack',
    pageHeader({ title: 'העברות בין אתרים', sub: `${num(ts.length)} העברות`, actions: [store.can('stock.transfer') ? button('העברה חדשה', () => openTransferDialog(), { kind: 'primary', ic: 'plus' }) : null].filter(Boolean) }),
    h('div.kpis',
      kpi('טיוטות לשליחה', num(cnt('draft')), { tone: cnt('draft') ? 'warn' : null, href: link('draft') }),
      kpi('בדרך', num(cnt('shipped')), { sub: 'נשלחו וממתינות לקליטה ביעד', tone: cnt('shipped') ? 'warn' : null, href: link('shipped') }),
      kpi('התקבלו ב־30 יום', num(ts.filter((t) => t.status === 'received' && new Date(t.received_at).getTime() >= since30).length), { href: link('received') }),
      kpi('התקבלו עם חוסר', num(ts.filter((t) => t.short > 0).length), { tone: ts.some((t) => t.short > 0) ? 'bad' : null, sub: 'כמות שהגיעה פחות ממה שנשלח' })),
    h('nav.inv-seg', { 'aria-label': 'מצב' }, [['', 'הכול'], ...STATUSES].map(([s, l]) => h('a.inv-seg__item', { href: link(s), 'aria-current': s === status ? 'page' : null }, l, s ? h('span.inv-seg__count', num(cnt(s))) : null))),
    table.el);
}

async function detail(id, refresh) {
  const t = await db('transfers').select('*').eq('id', id).one();
  if (!t) return empty('ההעברה לא נמצאה', 'ייתכן שאין לכם הרשאה לאתרי ההעברה.', h('a.btn', { href: href('transfers') }, 'לכל ההעברות'));
  const fin = store.can('finance.view');
  const [lines, movs, srcBal] = await Promise.all([
    db('transfer_lines').select('id,item_id,qty,received_qty,unit_cost,request_line_id').eq('transfer_id', id).get(),
    store.can('stock.view') ? db('stock_movements').select('id,site_id,item_id,type,qty_delta,created_at,created_by,reason').eq('ref_type', 'transfer').eq('ref_id', id).order('created_at').get().catch(() => []) : [],
    t.status === 'draft' && store.can('stock.view') && canSite(t.from_site_id) ? db('stock_balances').select('item_id,on_hand,reserved').eq('site_id', t.from_site_id).get() : [],
  ]);
  lines.sort((a, b) => itemName(a.item_id).localeCompare(itemName(b.item_id), 'he'));
  const av = Object.fromEntries(srcBal.map((b) => [b.item_id, n0(b.on_hand) - n0(b.reserved)]));
  const canShip = t.status === 'draft' && store.can('stock.transfer') && canSite(t.from_site_id);
  const canReceive = t.status === 'shipped' && (store.can('stock.move') || store.can('receipts.post')) && canSite(t.to_site_id);
  const value = lines.reduce((s, l) => s + n0(l.qty) * n0(l.unit_cost), 0);
  const shortValue = lines.reduce((s, l) => s + (n0(l.qty) - n0(l.received_qty)) * n0(l.unit_cost), 0);

  const ship = async () => {
    const short = lines.filter((l) => n0(l.qty) > (av[l.item_id] ?? 0));
    if (short.length) { toast(`אין מספיק מלאי זמין ב${siteName(t.from_site_id)} ל${short.map((l) => itemName(l.item_id)).join(', ')}.`, 'bad', 7000); return; }
    const ok = await confirmDialog({ title: `משלוח ${t.number}`, confirm: 'משלוח',
      text: `${lines.length} שורות יוצאות עכשיו ממלאי ${siteName(t.from_site_id)} ויסומנו "בדרך" ל${siteName(t.to_site_id)} עד הקליטה שם. אי אפשר לבטל העברה אחרי שנשלחה.` });
    if (!ok) return;
    try { await rpc('transfer_ship', { p_transfer: id, p_idem: idemKey() }); } catch (e) { return toastError(e); }
    toast(`ההעברה ${t.number} נשלחה – המלאי בדרך ל${siteName(t.to_site_id)}`); refresh();
  };
  const cancel = async () => {
    const reason = await confirmDialog({ title: `ביטול ${t.number}`, text: 'הטיוטה תבוטל ולא תישלח. המלאי לא זז.', confirm: 'ביטול ההעברה', danger: true, reason: true, reasonLabel: 'סיבת הביטול' });
    if (!reason) return;
    try { await rpc('transfer_cancel', { p_transfer: id, p_reason: reason }); } catch (e) { return toastError(e); }
    toast(`ההעברה ${t.number} בוטלה`); refresh();
  };
  const receive = () => receiveDialog(t, lines, refresh);

  const actions = [
    canShip ? button('משלוח', ship, { kind: 'primary', ic: 'truck' }) : null,
    canReceive ? button('קליטה ביעד', receive, { kind: 'primary', ic: 'check' }) : null,
    canShip ? button('ביטול טיוטה', cancel, { kind: 'danger' }) : null,
  ].filter(Boolean);

  const lineTable = h('div.tbl__wrap', h('table.tbl',
    h('thead', h('tr', h('th', { scope: 'col' }, 'פריט'), h('th', { scope: 'col' }, 'מק״ט'), h('th.num', { scope: 'col' }, 'כמות'),
      t.status === 'draft' && canSite(t.from_site_id) ? h('th.num', { scope: 'col' }, 'זמין במקור') : null,
      t.status === 'received' ? h('th.num', { scope: 'col' }, 'התקבל') : null, t.status === 'received' ? h('th.num', { scope: 'col' }, 'חוסר') : null,
      fin && t.status !== 'draft' ? h('th.num', { scope: 'col' }, 'עלות ליחידה') : null, fin && t.status !== 'draft' ? h('th.num', { scope: 'col' }, 'שווי') : null)),
    h('tbody', lines.map((l) => {
      const short = n0(l.qty) - n0(l.received_qty);
      return h('tr',
        h('td', h('a', { href: href(`items/${l.item_id}`) }, itemName(l.item_id))), h('td', h('span.ltr', itemOf(l.item_id)?.sku || '')),
        h('td.num', q(l.qty, l.item_id)),
        t.status === 'draft' && canSite(t.from_site_id) ? h('td.num', h('span', { class: n0(l.qty) > (av[l.item_id] ?? 0) ? 'inv-bad' : '' }, q(av[l.item_id] ?? 0, l.item_id))) : null,
        t.status === 'received' ? h('td.num', q(l.received_qty, l.item_id)) : null,
        t.status === 'received' ? h('td.num', short > 0 ? h('span.inv-bad', q(short, l.item_id)) : h('span.dash', '0')) : null,
        fin && t.status !== 'draft' ? h('td.num', money(l.unit_cost)) : null,
        fin && t.status !== 'draft' ? h('td.num', money(n0(l.qty) * n0(l.unit_cost))) : null);
    })),
    fin && t.status !== 'draft' ? h('tfoot', h('tr', h('td', { colspan: t.status === 'received' ? 6 : 4 }, 'שווי ההעברה לפי עלות ממוצעת במקור'), h('td.num', money(value)))) : null));

  const statusNote = {
    draft: note('טיוטה: המלאי עוד לא זז. ' + TRANSIT_NOTE, 'info'),
    shipped: note(`נשלחה ${dateTime(t.shipped_at)}. הכמויות יצאו ממלאי ${siteName(t.from_site_id)} ונספרות "בדרך" ל${siteName(t.to_site_id)} עד הקליטה.`, 'warn'),
    received: shortValue > 0 || lines.some((l) => n0(l.received_qty) < n0(l.qty)) ? note(`התקבלה עם חוסר${fin ? ` בשווי ${money(shortValue)}` : ''}. החוסר נרשם כהפסד על ההעברה.`, 'bad') : null,
  }[t.status];

  return h('div.stack',
    pageHeader({ title: [`העברה ${t.number}`, badge('transfer', t.status)], sub: `${siteName(t.from_site_id)} ← ${siteName(t.to_site_id)}`, crumbs: [['העברות', href('transfers')], [t.number]], actions }),
    statusNote,
    section(null, facts([
      ['מאתר', h('a', { href: href(`sites/${t.from_site_id}`) }, siteName(t.from_site_id))],
      ['לאתר', h('a', { href: href(`sites/${t.to_site_id}`) }, siteName(t.to_site_id))],
      ['מצב', badge('transfer', t.status)],
      ['נוצרה', `${dateTime(t.created_at)} · ${personName(t.created_by)}`],
      ['נשלחה', t.shipped_at ? `${dateTime(t.shipped_at)} · ${personName(t.shipped_by)}` : null],
      ['התקבלה', t.received_at ? `${dateTime(t.received_at)} · ${personName(t.received_by)}` : null],
      t.request_id ? ['דרישת רכש', h('a', { href: href(`requests/${t.request_id}`) }, 'לדרישה')] : null,
      ['הערות', t.note || null],
    ])),
    section(`שורות (${lines.length})`, lineTable, { id: 'lines' }),
    movs.length ? section('תנועות מלאי שנוצרו', h('div.tbl__wrap', h('table.tbl.tbl--compact',
      h('thead', h('tr', ['מועד', 'אתר', 'פריט', 'סוג', 'כמות', 'בוצע ע״י'].map((x, i) => h('th', { scope: 'col', class: i === 4 ? 'num' : '' }, x)))),
      h('tbody', movs.map((m) => h('tr', h('td', dateTime(m.created_at)), h('td', siteName(m.site_id)), h('td', itemName(m.item_id)), h('td', MOVE[m.type] || m.type),
        h('td.num', h('span', { class: n0(m.qty_delta) < 0 ? 'inv-neg' : 'inv-pos' }, (n0(m.qty_delta) > 0 ? '+' : '') + qty(m.qty_delta))), h('td', personName(m.created_by))))))), { id: 'moves' }) : null);
}

function receiveDialog(t, lines, refresh) {
  const key = idemKey();
  const inputs = lines.map((l) => h('input.input.input--num', { type: 'number', min: '0', max: String(l.qty), step: 'any', value: String(n0(l.qty)), inputmode: 'decimal', 'aria-label': `התקבל: ${itemName(l.item_id)}` }));
  const noteIn = textarea({ rows: 2, maxlength: 500, placeholder: 'למשל: 2 יחידות נשברו בדרך' });
  const sum = h('p.inv-preview', { 'aria-live': 'polite' });
  const err = h('p.form__error', { role: 'alert' });
  const shortCells = lines.map(() => h('td.num'));
  const recalc = () => {
    let shortLines = 0;
    lines.forEach((l, i) => { const s = n0(l.qty) - Number(inputs[i].value || 0); shortCells[i].textContent = s > 0 ? q(s, l.item_id) : '0'; shortCells[i].className = 'num' + (s > 0 ? ' inv-bad' : ''); if (s > 0) shortLines++; });
    sum.className = 'inv-preview' + (shortLines ? ' is-bad' : '');
    sum.textContent = shortLines ? `חוסר ב־${shortLines} שורות. כתבו מה קרה – החוסר יירשם כהפסד על ההעברה.` : 'כל הכמויות התקבלו במלואן.';
  };
  inputs.forEach((i) => i.addEventListener('input', recalc));
  const table = h('div.tbl__wrap', h('table.tbl.lines',
    h('thead', h('tr', h('th', { scope: 'col' }, 'פריט'), h('th.num', { scope: 'col' }, 'נשלח'), h('th.num', { scope: 'col' }, 'התקבל בפועל'), h('th.num', { scope: 'col' }, 'חוסר'))),
    h('tbody', lines.map((l, i) => h('tr', h('td', itemName(l.item_id), h('span.sub.ltr', itemOf(l.item_id)?.sku || '')), h('td.num', q(l.qty, l.item_id)), h('td.num', inputs[i]), shortCells[i])))));
  recalc();
  modal({ title: `קליטת ${t.number} ב${siteName(t.to_site_id)}`, wide: true, body: h('div.stack',
    h('p.muted', 'ספרו את מה שהגיע ורשמו את הכמות בפועל בכל שורה. הכמות שהתקבלה נכנסת למלאי היעד.'), table, sum,
    field('הערה על הקליטה', noteIn, { wide: true }), err),
  actions: [{ label: 'ביטול' }, { label: 'קליטה', kind: 'primary', onClick: async () => {
    err.textContent = '';
    for (const [i, inp] of inputs.entries()) {
      const v = Number(inp.value);
      if (inp.value === '' || Number.isNaN(v) || v < 0 || v > n0(lines[i].qty)) { inp.setAttribute('aria-invalid', 'true'); inp.focus(); err.textContent = `כמות לא תקינה ב${itemName(lines[i].item_id)} (בין 0 ל־${num(lines[i].qty)}).`; return false; }
    }
    const hasShort = lines.some((l, i) => Number(inputs[i].value) < n0(l.qty));
    if (hasShort && !noteIn.value.trim()) { noteIn.setAttribute('aria-invalid', 'true'); noteIn.focus(); err.textContent = 'יש חוסר: כתבו הערה שמסבירה אותו.'; return false; }
    try {
      const r = await rpc('transfer_receive', { p_transfer: t.id, p_lines: lines.map((l, i) => ({ line_id: l.id, received_qty: Number(inputs[i].value) })), p_note: noteIn.value.trim() || null, p_idem: key });
      toast(hasShort ? `ההעברה ${t.number} נקלטה עם חוסר${store.can('finance.view') && r?.shortage_value ? ` בשווי ${money0(r.shortage_value)}` : ''}` : `ההעברה ${t.number} נקלטה במלואה ב${siteName(t.to_site_id)}`);
    } catch (e) { toastError(e); return false; }
    refresh();
  } }] });
}
