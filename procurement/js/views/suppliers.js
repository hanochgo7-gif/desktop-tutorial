// Suppliers: the list with the performance score, the supplier card (facts, score explained, documents, agreed prices,
// orders, price history, deliveries, returns), create/edit, and a side-by-side comparison of 2–4 suppliers.
import { h, clear } from '../ui/dom.js';
import { rpc, db } from '../core/api.js';
import { store, siteName, itemName, item, categoryName, personName, setting, refreshRef } from '../core/store.js';
import { pageHeader, section, kpi, badge, tone, button, facts, tabs, empty, note } from '../ui/components.js';
import { dataTable } from '../ui/table.js';
import { field, text, number, dateInput, textarea, select, picker, itemOptions, supplierOptions, validate } from '../ui/forms.js';
import { modal, confirmDialog, toast, toastError } from '../ui/overlay.js';
import { icon } from '../ui/icons.js';
import { money, money0, moneyShort, num, pct, qty, date, isoDate, daysBetween, DOC_KIND, statusLabel } from '../core/format.js';
import { href, go, setQuery } from '../core/router.js';

const DEFAULT_WEIGHTS = { price: 25, on_time: 25, fill: 15, quality: 15, service: 10, response: 10 };
const LIVE_PO = ['approved', 'sent', 'supplier_confirmed', 'in_delivery', 'partially_received', 'received', 'inspected', 'closed'];

// The score components, in the order the server weighs them (009_analytics.sql, supplier_score).
export const COMPONENTS = [
  { key: 'price', field: 'price_score', label: 'מחיר', unit: 'נק׳',
    explain: 'המחיר נטו בכל שורת הזמנה מ־12 החודשים האחרונים מול המחיר הממוצע של אותו פריט אצל כל הספקים. מחיר בגובה הממוצע = 100; כל 1% מעל הממוצע מוריד 2 נקודות, ומחיר נמוך מהממוצע מגיע עד 100.' },
  { key: 'on_time', field: 'on_time_pct', label: 'עמידה בזמנים', unit: '%',
    explain: 'אחוז ההזמנות שהקבלה האחרונה שלהן הגיעה עד התאריך הצפוי. הזמנה שעדיין לא סופקה במלואה ותאריכה עבר נספרת כאיחור. נמדדות רק הזמנות עם תאריך צפוי.' },
  { key: 'fill', field: 'fill_pct', label: 'שלמות אספקה', unit: '%',
    explain: 'הכמות שהתקבלה, בניכוי החזרות, מתוך הכמות שהוזמנה, בהזמנות שהסתיימו (סופקו, נבדקו או נסגרו).' },
  { key: 'quality', field: 'quality_score', label: 'איכות', unit: 'נק׳',
    explain: 'ממוצע דירוגי האיכות שניתנו בקליטת סחורה (1–5, מומר ל־0–100), מופחת בשיעור הסחורה שנדחתה בקליטה או הוחזרה לספק.' },
  { key: 'service', field: 'service_score', label: 'שירות', unit: 'נק׳',
    explain: 'ממוצע דירוגי השירות שניתנו בקליטת סחורה (1–5, מומר ל־0–100).' },
  { key: 'response', field: 'response_pct', label: 'היענות לבקשות הצעה', unit: '%',
    explain: 'אחוז הבקשות להצעות מחיר מ־12 החודשים האחרונים שהספק נשלח אליהן והגיש הצעה.' },
];
export const weights = () => ({ ...DEFAULT_WEIGHTS, ...(setting('score_weights') || {}) });
export const scoreText = (r) => (!r || r.enough_data === false ? 'אין מספיק נתונים' : r.score === null || r.score === undefined ? '—' : num(r.score));
const scoreTone = (v) => (v === null || v === undefined ? null : v >= 80 ? 'good' : v >= 60 ? 'warn' : 'bad');
const lateThreshold = () => Number(setting('late_supplier_threshold') ?? 3);

const chunked = async (ids, fn, size = 80) => (await Promise.all(Array.from({ length: Math.ceil(ids.length / size) }, (_, i) => fn(ids.slice(i * size, (i + 1) * size))))).flat();
const fmtComp = (c, v) => (v === null || v === undefined ? null : c.unit === '%' ? pct(v) : num(v));

export default async function suppliers({ params, query, path, refresh }) {
  if (!(store.can('finance.view') || store.can('suppliers.manage'))) {
    return h('div.stack', pageHeader({ title: 'ספקים' }), empty('אין לכם הרשאה לנתוני ספקים', 'נתוני ספקים פתוחים למי שיש לו הרשאה לנתונים כספיים או לניהול ספקים.'));
  }
  if (path === 'suppliers/new') return form(null);
  if (params.id) {
    if (query.edit && store.can('suppliers.manage')) {
      const s = await db('suppliers').select('*').eq('org_id', store.org.id).eq('id', params.id).one();
      if (!s) return notFound();
      return form(s);
    }
    return card(params.id, query, refresh);
  }
  if (query.compare !== undefined) return compare(query);
  return list(query);
}
const notFound = () => h('div.stack', pageHeader({ title: 'הספק לא נמצא', crumbs: [['ספקים', href('suppliers')], ['לא נמצא']] }),
  empty('הספק לא נמצא', 'ייתכן שהקישור שגוי או שאין לכם הרשאה.', button('לרשימת הספקים', null, { href: href('suppliers') })));

// ---------------------------------------------------------------- list
function problems(r) {
  const out = [];
  if (r.status !== 'active') out.push(statusLabel('supplier', r.status));
  if ((r.late_90d || 0) >= lateThreshold()) out.push(`${num(r.late_90d)} איחורים ב־90 יום`);
  if (r.expiring_docs > 0) out.push(`${num(r.expiring_docs)} מסמכים פגים או עומדים לפוג`);
  return out;
}

async function list(query) {
  const fin = store.can('finance.view');
  const rows = await rpc('supplier_scores', { p_org: store.org.id });
  rows.sort((a, b) => a.name.localeCompare(b.name, 'he'));
  rows.forEach((r) => { r.id = r.supplier_id; });           // the table selects by row.id
  const problemRows = rows.filter((r) => problems(r).length);
  const view = query.view === 'problems' ? 'problems' : 'all';
  const shown = view === 'problems' ? problemRows : rows;

  const actions = [
    rows.length > 1 ? button('השוואת ספקים', null, { href: href('suppliers?compare='), ic: 'columns' }) : null,
    store.can('suppliers.manage') ? button('ספק חדש', null, { href: href('suppliers/new'), ic: 'plus', kind: 'primary' }) : null,
  ].filter(Boolean);

  const scored = rows.filter((r) => r.enough_data && r.score !== null);
  const avgScore = scored.length ? scored.reduce((a, r) => a + Number(r.score), 0) / scored.length : null;
  const kpis = h('div.kpis',
    kpi('ספקים פעילים', num(rows.filter((r) => r.status === 'active').length), { sub: `${num(rows.length)} ספקים בסך הכול` }),
    kpi('ציון ממוצע', avgScore === null ? '—' : num(avgScore), { sub: `${num(scored.length)} ספקים עם מספיק נתונים` }),
    kpi('ספקים בעייתיים', num(problemRows.length), { tone: problemRows.length ? 'warn' : 'good', sub: 'סטטוס, איחורים או מסמכים', href: href('suppliers?view=problems') }),
    fin ? kpi('רכש ב־12 חודשים', moneyShort(rows.reduce((a, r) => a + Number(r.spend_12m || 0), 0)), { sub: 'הזמנות מאושרות, לפני מע״מ' }) : null);

  const seg = h('div.fin-seg', { role: 'group', 'aria-label': 'תצוגה' },
    h('a.fin-seg__btn', { href: href('suppliers'), 'aria-current': view === 'all' ? 'true' : null }, 'כל הספקים', h('span.tab__count', String(rows.length))),
    h('a.fin-seg__btn', { href: href('suppliers?view=problems'), 'aria-current': view === 'problems' ? 'true' : null }, 'ספקים בעייתיים', h('span.tab__count', String(problemRows.length))));

  const columns = [
    { key: 'name', label: 'ספק' },
    { key: 'status', label: 'סטטוס', render: (r) => badge('supplier', r.status), value: (r) => statusLabel('supplier', r.status), filter: 'select',
      options: [['active', 'פעיל'], ['on_hold', 'בהמתנה'], ['blocked', 'חסום']], filterValue: (r) => r.status },
    { key: 'score', label: 'ציון ביצועים', num: true, value: (r) => (r.enough_data ? r.score : null), exportValue: (r) => (r.enough_data ? Number(r.score) : 'אין מספיק נתונים'),
      render: (r) => scoreCell(r) },
    { key: 'on_time_pct', label: 'בזמן', num: true, value: (r) => r.on_time_pct, render: (r) => pct(r.on_time_pct) },
    { key: 'price_score', label: 'ציון מחיר', num: true, value: (r) => r.price_score, render: (r) => num(r.price_score) },
    { key: 'quality_score', label: 'איכות', num: true, value: (r) => r.quality_score, render: (r) => num(r.quality_score) },
    { key: 'orders', label: 'הזמנות ב־12 ח׳', num: true, value: (r) => r.orders, render: (r) => num(r.orders) },
    fin ? { key: 'spend_12m', label: 'רכש ב־12 ח׳', num: true, value: (r) => Number(r.spend_12m), render: (r) => money0(r.spend_12m) } : null,
    { key: 'late_90d', label: 'איחורים ב־90 יום', num: true, value: (r) => r.late_90d,
      render: (r) => (r.late_90d >= lateThreshold() ? h('span.fin-bad', num(r.late_90d)) : num(r.late_90d)) },
    { key: 'expiring_docs', label: 'מסמכים פגים', num: true, value: (r) => r.expiring_docs,
      render: (r) => (r.expiring_docs > 0 ? h('span.fin-bad', num(r.expiring_docs)) : '0') },
    { key: 'problems', label: 'סיבת סימון', value: (r) => problems(r).join(' · '), hidden: view !== 'problems' },
  ].filter(Boolean);

  const table = dataTable({
    id: 'suppliers', columns, rows: shown, rowHref: (r) => href(`suppliers/${r.supplier_id}`), exportName: 'ספקים',
    selectable: rows.length > 1,
    bulk: [{ label: 'השוואה בין הנבחרים (2–4)', run: async (sel) => {
      if (sel.length > 4) toast('אפשר להשוות עד 4 ספקים; נלקחו 4 הראשונים.', 'warn');
      go(`suppliers?compare=${sel.slice(0, 4).map((r) => r.supplier_id).join(',')}`);
    } }],
    empty: view === 'problems' ? { title: 'אין ספקים בעייתיים', text: 'אין ספק חסום או בהמתנה, עם איחורים חוזרים או עם מסמך שפג.' }
      : { title: 'אין עדיין ספקים', text: 'ספק חדש נוסף כאן ומשם אפשר להזמין ממנו.', action: store.can('suppliers.manage') ? button('ספק חדש', null, { href: href('suppliers/new'), kind: 'primary', ic: 'plus' }) : null },
  });

  return h('div.stack',
    pageHeader({ title: 'ספקים', sub: 'ציון ביצועים מחושב מ־12 החודשים האחרונים: מחיר, עמידה בזמנים, שלמות אספקה, איכות, שירות והיענות להצעות.', actions }),
    kpis,
    view === 'problems' ? note(`ספק מסומן כבעייתי כשהוא חסום או בהמתנה, כשיש לו ${lateThreshold()} איחורים או יותר ב־90 הימים האחרונים (סף מההגדרות), או כשמסמך שלו פג או יפוג בתוך 30 יום.`) : null,
    seg,
    table.el);
}
function scoreCell(r) {
  if (!r.enough_data) return h('span.muted.fin-small', 'אין מספיק נתונים');
  if (r.score === null || r.score === undefined) return h('span.dash', '—');
  return h('span.fin-score', h('span.fin-score__bar', { 'aria-hidden': 'true' }, h('span', { class: `is-${scoreTone(Number(r.score))}`, style: { width: `${Math.min(100, Number(r.score))}%` } })), h('b', num(r.score)));
}

// ---------------------------------------------------------------- compare
async function compare(query) {
  const rows = await rpc('supplier_scores', { p_org: store.org.id });
  const ids = String(query.compare || '').split(',').filter((x) => rows.some((r) => r.supplier_id === x)).slice(0, 4);
  const w = weights();
  const fin = store.can('finance.view');
  const chosen = ids.map((id) => rows.find((r) => r.supplier_id === id));

  const add = picker({ items: () => supplierOptions(true).filter((o) => !ids.includes(o.id)), label: 'הוספת ספק להשוואה', placeholder: 'הוספת ספק…',
    onPick: (id) => go(`suppliers?compare=${[...ids, id].join(',')}`) });
  const chips = h('div.fin-chips', chosen.map((r) => h('span.fin-chip', r.name,
    h('button.iconbtn', { type: 'button', 'aria-label': `הסרת ${r.name} מההשוואה`, onclick: () => go(`suppliers?compare=${ids.filter((x) => x !== r.supplier_id).join(',')}`) }, icon('x', 14)))),
  ids.length < 4 ? h('div.fin-chips__add', field('הוספת ספק', add)) : null);

  let body;
  if (chosen.length < 2) {
    body = empty('בחרו לפחות שני ספקים', 'אפשר להשוות בין 2 ל־4 ספקים. בחרו ספקים מהרשימה למעלה, או סמנו אותם ברשימת הספקים.');
  } else {
    const best = (field, higher = true) => {
      const vals = chosen.map((r) => r[field]).filter((v) => v !== null && v !== undefined).map(Number);
      if (vals.length < 2) return null; return higher ? Math.max(...vals) : Math.min(...vals);
    };
    const row = (label, sub, cells, fieldName, higher = true, fmt = (v) => num(v)) => {
      const b = fieldName ? best(fieldName, higher) : null;
      return h('tr', h('th', { scope: 'row' }, label, sub ? h('span.sub', sub) : null),
        cells.map((r) => {
          const v = fieldName ? r[fieldName] : null;
          const out = typeof fmt === 'function' && fieldName ? (v === null || v === undefined ? h('span.dash', '—') : fmt(v)) : fmt(r);
          const isBest = b !== null && v !== null && v !== undefined && Number(v) === b;
          return h('td.num', { class: isBest ? 'fin-best' : '' }, out, isBest ? h('span.sr', ' (הטוב ביותר)') : null);
        }));
    };
    const tbl = h('table.tbl.fin-compare',
      h('thead', h('tr', h('th', { scope: 'col' }, 'רכיב'), chosen.map((r) => h('th.num', { scope: 'col' }, h('a', { href: href(`suppliers/${r.supplier_id}`) }, r.name))))),
      h('tbody',
        row('ציון כולל', 'ממוצע משוקלל של הרכיבים', chosen, null, true, (r) => (r.enough_data ? h('b', num(r.score)) : h('span.muted', 'אין מספיק נתונים'))),
        COMPONENTS.map((c) => row(c.label, `משקל ${num(w[c.key])}`, chosen, c.field, true, (v) => fmtComp(c, v))),
        row('שיעור פגמים', 'נדחה בקליטה או הוחזר', chosen, 'defect_pct', false, (v) => pct(v)),
        row('הזמנות ב־12 חודשים', null, chosen, 'orders', true, (v) => num(v)),
        fin ? row('רכש ב־12 חודשים', 'לפני מע״מ', chosen, 'spend_12m', true, (v) => money0(v)) : null,
        row('איחורים ב־90 יום', null, chosen, 'late_90d', false, (v) => num(v)),
        row('מסמכים פגים או עומדים לפוג', null, chosen, 'expiring_docs', false, (v) => num(v)),
        h('tr', h('th', { scope: 'row' }, 'סטטוס'), chosen.map((r) => h('td.num', badge('supplier', r.status))))));
    body = h('div.stack', h('div.tbl__wrap', tbl),
      h('p.muted.fin-small', 'הערך הטוב ביותר בכל שורה מודגש. ציון כולל מחושב רק לספק עם 3 הזמנות לפחות ב־12 החודשים האחרונים. מקור: supplier_scores, 12 החודשים האחרונים.'));
  }
  return h('div.stack',
    pageHeader({ title: 'השוואת ספקים', sub: 'רכיבי ציון הביצועים זה לצד זה', crumbs: [['ספקים', href('suppliers')], ['השוואה']] }),
    section('ספקים בהשוואה', chips, { note: `${chosen.length} מתוך 4 לכל היותר` }),
    section('רכיבי הציון', body));
}

// ---------------------------------------------------------------- card
async function card(id, query, refresh) {
  const org = store.org.id;
  const fin = store.can('finance.view');
  const canPO = fin || store.can('receipts.post');
  const [sup, scoreRows, docs, prices, pos] = await Promise.all([
    db('suppliers').select('*').eq('org_id', org).eq('id', id).one(),
    rpc('supplier_score', { p_supplier: id }),
    db('supplier_documents').select('id,kind,title,valid_until,created_at').eq('supplier_id', id).order('valid_until', { nullsLast: true }).get(),
    fin ? db('supplier_prices').select('id,item_id,unit_price,min_qty,valid_from,valid_until,source,created_at').eq('supplier_id', id).order('valid_from', { desc: true }).get() : [],
    canPO ? db('purchase_orders').select('id,number,status,order_date,expected_date,site_id,net_total,total').eq('org_id', org).eq('supplier_id', id).order('order_date', { desc: true }).limit(500).get() : [],
  ]);
  if (!sup) return notFound();
  const sc = Array.isArray(scoreRows) ? scoreRows[0] : scoreRows;
  const poIds = pos.map((p) => p.id);
  const [lines, receipts, returns] = poIds.length ? await Promise.all([
    chunked(poIds, (ids) => db('po_lines').select('id,po_id,line_no,item_id,qty,unit_price,discount_pct,received_qty,returned_qty,rejected_qty,cancelled_qty').in('po_id', ids).get()),
    chunked(poIds, (ids) => db('receipts').select('id,number,po_id,received_at,on_time,quality_rating,service_rating,delivery_note_no').in('po_id', ids).get()),
    chunked(poIds, (ids) => db('supplier_returns').select('id,number,po_id,reason,created_at').in('po_id', ids).get()),
  ]) : [[], [], []];
  const returnLines = returns.length ? await chunked(returns.map((r) => r.id), (ids) => db('supplier_return_lines').select('return_id,po_line_id,qty').in('return_id', ids).get()) : [];
  const poById = new Map(pos.map((p) => [p.id, p]));
  const lineById = new Map(lines.map((l) => [l.id, l]));
  const canManage = store.can('suppliers.manage');
  const today = isoDate();

  const expiredDocs = docs.filter((d) => d.valid_until && d.valid_until < today);
  const soonDocs = docs.filter((d) => d.valid_until && d.valid_until >= today && d.valid_until < addDaysIso(today, 30));

  const head = pageHeader({
    title: sup.name,
    sub: [sup.company_no ? `ח.פ. ${sup.company_no}` : null, (sup.category_ids || []).length ? (sup.category_ids || []).map(categoryName).join(', ') : null].filter(Boolean).join(' · ') || null,
    crumbs: [['ספקים', href('suppliers')], [sup.name]],
    actions: [
      badge('supplier', sup.status),
      button('השוואה לספקים אחרים', null, { href: href(`suppliers?compare=${id}`), ic: 'columns', kind: 'ghost' }),
      canManage ? button('עריכת פרטים', null, { href: href(`suppliers/${id}?edit=1`), ic: 'edit', kind: 'primary' }) : null,
    ].filter(Boolean),
  });

  const notes = [
    sup.status !== 'active' ? note(`הספק ${statusLabel('supplier', sup.status)}${sup.status_reason ? `: ${sup.status_reason}` : ''}.${sup.status === 'blocked' ? ' אי אפשר לפתוח לו הזמנות חדשות.' : ''}`, sup.status === 'blocked' ? 'bad' : 'warn') : null,
    expiredDocs.length ? note(`${expiredDocs.length === 1 ? 'מסמך אחד פג' : `${expiredDocs.length} מסמכים פגו`}: ${expiredDocs.map((d) => d.title).join(', ')}.`, 'bad') : null,
    soonDocs.length ? note(`יפוג בתוך 30 יום: ${soonDocs.map((d) => `${d.title} (${date(d.valid_until)})`).join(', ')}.`, 'warn') : null,
  ];

  const contacts = Array.isArray(sup.contacts) ? sup.contacts.filter((c) => c && (c.name || c.phone || c.email)) : [];
  const factsEl = facts([
    ['מספר חברה / עוסק', sup.company_no ? h('span.ltr', sup.company_no) : null],
    ['טלפון', sup.phone ? h('a.ltr', { href: `tel:${sup.phone}` }, sup.phone) : null],
    ['אימייל', sup.email ? h('a.ltr', { href: `mailto:${sup.email}` }, sup.email) : null],
    ['כתובת', sup.address || null],
    ['תנאי תשלום', sup.payment_terms || null],
    ['ימי אשראי', sup.credit_days !== null ? num(sup.credit_days) : null],
    ['תנאי אספקה', sup.delivery_terms || null],
    ['הנחה קבועה', sup.fixed_discount_pct !== null ? pct(sup.fixed_discount_pct, 2) : null],
    ['קטגוריות אספקה', (sup.category_ids || []).length ? sup.category_ids.map(categoryName).join(', ') : null],
    ['ציון ביצועים', sc ? scoreText(sc) : null],
  ]);
  const contactsEl = contacts.length ? h('div.tbl__wrap', h('table.tbl.tbl--compact',
    h('thead', h('tr', ['שם', 'תפקיד', 'טלפון', 'אימייל'].map((l) => h('th', { scope: 'col' }, l)))),
    h('tbody', contacts.map((c) => h('tr', h('td', c.name || '—'), h('td', c.role || '—'),
      h('td', c.phone ? h('a.ltr', { href: `tel:${c.phone}` }, c.phone) : '—'), h('td', c.email ? h('a.ltr', { href: `mailto:${c.email}` }, c.email) : '—')))))) : null;
  const factsSec = section('פרטי הספק', h('div.stack', factsEl, contactsEl, sup.notes ? h('p.fin-prewrap', sup.notes) : null));

  const reload = () => refresh();
  const tabList = [
    { id: 'score', label: 'ציון ביצועים', render: () => scorePanel(sc) },
    { id: 'docs', label: 'מסמכים', count: docs.length, render: () => docsPanel(sup, docs, canManage, reload) },
    fin ? { id: 'prices', label: 'מחירים מוסכמים', count: prices.length, render: () => pricesPanel(sup, prices, canManage, reload) } : null,
    canPO ? { id: 'orders', label: 'הזמנות', count: pos.length, render: () => ordersPanel(pos, fin) } : null,
    fin ? { id: 'history', label: 'היסטוריית מחירים', render: () => priceHistoryPanel(lines, poById) } : null,
    canPO ? { id: 'deliveries', label: 'אספקות', count: receipts.length, render: () => deliveriesPanel(receipts, poById) } : null,
    canPO ? { id: 'returns', label: 'החזרות', count: returns.length, render: () => returnsPanel(returns, returnLines, poById, lineById) } : null,
  ].filter(Boolean);

  return h('div.stack', head, ...notes.filter(Boolean), factsSec,
    h('section.sec', tabs(tabList, query.tab || 'score', (t) => setQuery({ tab: t }))));
}
function addDaysIso(iso, n) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return isoDate(d); }

function scorePanel(sc) {
  if (!sc) return empty('אין נתוני ביצועים', 'אין הרשאה לנתוני הביצועים של הספק.');
  const w = weights();
  const withData = COMPONENTS.filter((c) => sc[c.field] !== null && sc[c.field] !== undefined);
  const wsum = withData.reduce((a, c) => a + Number(w[c.key] || 0), 0);
  const big = h('div.fin-scorebig',
    h('div', h('span.kpi__label', 'ציון ביצועים כולל'),
      h('span.fin-scorebig__value', { class: sc.enough_data && sc.score !== null ? `is-${scoreTone(Number(sc.score))}` : 'is-none' }, sc.enough_data ? (sc.score === null ? '—' : num(sc.score)) : 'אין מספיק נתונים'),
      h('span.kpi__sub', sc.enough_data ? 'מתוך 100' : `${num(sc.orders)} הזמנות ב־12 החודשים האחרונים; ציון מחושב מ־3 הזמנות`)),
    h('dl.fin-mini',
      h('div', h('dt', 'הזמנות ב־12 חודשים'), h('dd', num(sc.orders))),
      h('div', h('dt', 'אספקות שנמדדו'), h('dd', num(sc.measured_deliveries))),
      h('div', h('dt', 'איחורים ב־90 יום'), h('dd', num(sc.late_90d))),
      h('div', h('dt', 'שיעור פגמים'), h('dd', pct(sc.defect_pct)))));
  const rows = COMPONENTS.map((c) => {
    const v = sc[c.field];
    const has = v !== null && v !== undefined;
    const share = has && wsum > 0 ? (Number(w[c.key] || 0) / wsum) * 100 : null;
    return h('tr',
      h('th', { scope: 'row' }, c.label, h('span.sub', c.explain)),
      h('td.num', has ? h('b', fmtComp(c, v)) : h('span.muted.fin-small', 'אין נתונים')),
      h('td.num', num(w[c.key])),
      h('td.num', has ? pct(share, 0) : h('span.muted.fin-small', 'לא נכלל')));
  });
  return h('div.stack', big,
    h('div.tbl__wrap', h('table.tbl.fin-scoretbl',
      h('thead', h('tr', h('th', { scope: 'col' }, 'רכיב ואיך הוא מחושב'), h('th.num', { scope: 'col' }, 'ערך'), h('th.num', { scope: 'col' }, 'משקל בהגדרות'), h('th.num', { scope: 'col' }, 'חלק בציון'))),
      h('tbody', rows))),
    h('p.muted.fin-small', 'הציון הכולל הוא ממוצע משוקלל של הרכיבים שיש להם נתונים, לפי המשקלות שבהגדרות הארגון. רכיב בלי נתונים לא נכלל והמשקל מתחלק בין האחרים. התקופה: 12 החודשים האחרונים (איחורים: 90 יום). הזמנות בטיוטה, ממתינות, שנדחו או בוטלו לא נספרות.'));
}

function docState(d) {
  if (!d.valid_until) return tone('ללא תפוגה', 'neutral');
  const days = daysBetween(isoDate(), d.valid_until);
  if (days < 0) return tone(`פג לפני ${num(-days)} ימים`, 'bad');
  if (days < 30) return tone(`פג בעוד ${num(days)} ימים`, 'warn');
  return tone('בתוקף', 'good');
}
function docsPanel(sup, docs, canManage, reload) {
  const edit = (d) => {
    const kind = select(Object.entries(DOC_KIND), { value: d?.kind || 'insurance' });
    const title = text({ value: d?.title || '', maxlength: 160, required: true });
    const until = dateInput({ value: d?.valid_until || '' });
    const body = h('div.form-grid', field('סוג המסמך', kind, { required: true }), field('שם המסמך', title, { required: true }), field('בתוקף עד', until, { hint: 'ריק: ללא תאריך תפוגה' }));
    modal({ title: d ? 'עריכת מסמך' : 'מסמך חדש', body, actions: [{ label: 'ביטול' }, { label: 'שמירה', kind: 'primary', onClick: async () => {
      if (!validate(body)) return false;
      const row = { kind: kind.value, title: title.value.trim(), valid_until: until.value || null };
      if (d) await db('supplier_documents').eq('id', d.id).update(row);
      else await db('supplier_documents').insert({ org_id: store.org.id, supplier_id: sup.id, ...row });
      toast(d ? 'המסמך עודכן' : 'המסמך נוסף'); reload();
    } }] });
  };
  const del = async (d) => {
    const ok = await confirmDialog({ title: 'מחיקת מסמך', text: `למחוק את "${d.title}" מרשימת המסמכים של ${sup.name}? הפעולה נרשמת ביומן הפעולות.`, confirm: 'מחיקה', danger: true });
    if (!ok) return;
    try { await db('supplier_documents').eq('id', d.id).remove(); toast('המסמך נמחק'); reload(); } catch (e) { toastError(e); }
  };
  const add = canManage ? button('מסמך חדש', () => edit(null), { ic: 'plus', small: true }) : null;
  if (!docs.length) return h('div.stack', empty('אין מסמכים', 'ביטוחים, רישיונות, תעודות והסכמי מסגרת עם תאריך תפוגה. המערכת מתריעה 30 יום לפני שמסמך פג.', add));
  return h('div.stack', add ? h('div.row', add) : null,
    h('div.tbl__wrap', h('table.tbl',
      h('thead', h('tr', ['סוג', 'מסמך', 'בתוקף עד', 'מצב', canManage ? '' : null].filter((x) => x !== null).map((l) => h('th', { scope: 'col' }, l || h('span.sr', 'פעולות'))))),
      h('tbody', docs.map((d) => h('tr', { class: d.valid_until && d.valid_until < isoDate() ? 'fin-row-bad' : '' },
        h('td', DOC_KIND[d.kind] || d.kind), h('td', d.title), h('td', date(d.valid_until)), h('td', docState(d)),
        canManage ? h('td.fin-actions', button('עריכה', () => edit(d), { small: true, kind: 'ghost' }), button('מחיקה', () => del(d), { small: true, kind: 'ghost' })) : null))))));
}

function priceState(p) {
  const t = isoDate();
  if (p.valid_from > t) return tone('עתידי', 'info');
  if (p.valid_until && p.valid_until < t) return tone('פג', 'neutral');
  return tone('בתוקף', 'good');
}
function pricesPanel(sup, prices, canManage, reload) {
  const edit = (p) => {
    const it = picker({ items: itemOptions, value: p?.item_id || null, label: 'פריט', required: true });
    const price = number({ value: p?.unit_price ?? '', min: 0, required: true });
    const minq = number({ value: p?.min_qty ?? '', min: 0 });
    const from = dateInput({ value: p?.valid_from || isoDate(), required: true });
    const until = dateInput({ value: p?.valid_until || '' });
    const src = text({ value: p?.source || '', maxlength: 160, placeholder: 'למשל: הסכם מסגרת 2026' });
    const body = h('div.form-grid', field('פריט', it, { required: true, wide: true }), field('מחיר ליחידה לפני מע״מ (₪)', price, { required: true }),
      field('כמות מינימלית', minq, { hint: 'ריק: אין מינימום' }), field('בתוקף מ־', from, { required: true }), field('בתוקף עד', until, { hint: 'ריק: ללא הגבלה' }), field('מקור', src, { wide: true }));
    modal({ title: p ? 'עריכת מחיר מוסכם' : 'מחיר מוסכם חדש', body, actions: [{ label: 'ביטול' }, { label: 'שמירה', kind: 'primary', onClick: async () => {
      if (!it.value) { it.focusInput(); toast('בחרו פריט מהרשימה.', 'bad'); return false; }
      if (!validate(body)) return false;
      if (until.value && until.value < from.value) { until.setCustomValidity('תאריך הסיום לפני תאריך ההתחלה'); until.reportValidity(); until.setCustomValidity(''); return false; }
      const row = { item_id: it.value, unit_price: Number(price.value), min_qty: minq.value === '' ? null : Number(minq.value), valid_from: from.value, valid_until: until.value || null, source: src.value.trim() || null };
      if (p) await db('supplier_prices').eq('id', p.id).update(row);
      else await db('supplier_prices').insert({ org_id: store.org.id, supplier_id: sup.id, ...row });
      toast(p ? 'המחיר המוסכם עודכן' : 'המחיר המוסכם נוסף'); reload();
    } }] });
  };
  const end = async (p) => {
    const ok = await confirmDialog({ title: 'סיום תוקף המחיר', text: `המחיר של ${itemName(p.item_id)} יסומן כבתוקף עד היום (${date(isoDate())}). ההיסטוריה נשמרת.`, confirm: 'סיום תוקף' });
    if (!ok) return;
    try { await db('supplier_prices').eq('id', p.id).update({ valid_until: p.valid_from > isoDate() ? p.valid_from : isoDate() }); toast('תוקף המחיר הסתיים'); reload(); } catch (e) { toastError(e); }
  };
  const add = canManage ? button('מחיר מוסכם חדש', () => edit(null), { ic: 'plus', small: true }) : null;
  if (!prices.length) return h('div.stack', empty('אין מחירים מוסכמים', 'מחירון או הסכם מסגרת לפריט. המחיר מוצג כהצעה בהזמנות ובהשוואת הצעות.', add));
  const t = dataTable({
    id: 'supplier-prices', exportName: `מחירים-${sup.name}`, rows: prices, columns: [
      { key: 'item', label: 'פריט', value: (p) => itemName(p.item_id), render: (p) => h('a', { href: href(`items/${p.item_id}`) }, itemName(p.item_id), h('span.sub.ltr', item(p.item_id)?.sku || '')) },
      { key: 'unit_price', label: 'מחיר ליחידה', num: true, value: (p) => Number(p.unit_price), render: (p) => money(p.unit_price) },
      { key: 'min_qty', label: 'כמות מינימלית', num: true, value: (p) => p.min_qty, render: (p) => qty(p.min_qty, item(p.item_id)?.uom) },
      { key: 'valid_from', label: 'מתאריך', value: (p) => p.valid_from, render: (p) => date(p.valid_from) },
      { key: 'valid_until', label: 'עד תאריך', value: (p) => p.valid_until, render: (p) => date(p.valid_until) },
      { key: 'state', label: 'מצב', value: (p) => priceState(p).textContent, render: priceState },
      { key: 'source', label: 'מקור', value: (p) => p.source || '' },
      canManage ? { key: 'act', label: 'פעולות', search: false, export: false, value: () => '', render: (p) => h('span.fin-actions', button('עריכה', () => edit(p), { small: true, kind: 'ghost' }),
        !p.valid_until || p.valid_until >= isoDate() ? button('סיום תוקף', () => end(p), { small: true, kind: 'ghost' }) : null) } : null,
    ].filter(Boolean),
    toolbar: add ? [add] : null,
  });
  return t.el;
}

function ordersPanel(pos, fin) {
  if (!pos.length) return empty('אין הזמנות מהספק', 'הזמנות רכש מהספק יופיעו כאן.');
  return dataTable({
    id: 'supplier-orders', exportName: 'הזמנות-ספק', rows: pos, rowHref: (p) => href(`orders/${p.id}`), columns: [
      { key: 'number', label: 'הזמנה', render: (p) => h('span.ltr', p.number) },
      { key: 'site', label: 'אתר', value: (p) => siteName(p.site_id), filter: 'select', filterValue: (p) => siteName(p.site_id) },
      { key: 'order_date', label: 'תאריך', value: (p) => p.order_date, render: (p) => date(p.order_date) },
      { key: 'expected_date', label: 'צפויה', value: (p) => p.expected_date, render: (p) => date(p.expected_date) },
      { key: 'status', label: 'סטטוס', value: (p) => statusLabel('po', p.status), render: (p) => badge('po', p.status), filter: 'select', filterValue: (p) => statusLabel('po', p.status) },
      fin ? { key: 'net_total', label: 'לפני מע״מ', num: true, value: (p) => Number(p.net_total), render: (p) => money(p.net_total) } : null,
      fin ? { key: 'total', label: 'כולל מע״מ', num: true, value: (p) => Number(p.total), render: (p) => money(p.total) } : null,
    ].filter(Boolean),
  }).el;
}

function priceHistoryPanel(lines, poById) {
  const by = new Map();
  for (const l of lines) {
    const p = poById.get(l.po_id);
    if (!p || !LIVE_PO.includes(p.status)) continue;
    const unit = Number(l.unit_price) * (1 - Number(l.discount_pct || 0) / 100);
    if (!by.has(l.item_id)) by.set(l.item_id, []);
    by.get(l.item_id).push({ date: p.order_date, unit, qty: Number(l.qty), po: p });
  }
  if (!by.size) return empty('אין היסטוריית מחירים', 'מחירים נאספים מהזמנות מאושרות מהספק.');
  const groups = [...by.entries()].map(([itemId, list]) => {
    list.sort((a, b) => (a.date < b.date ? -1 : 1));
    const first = list[0].unit, last = list[list.length - 1].unit;
    return { itemId, list, first, last, min: Math.min(...list.map((x) => x.unit)), max: Math.max(...list.map((x) => x.unit)), change: first > 0 ? (last / first - 1) * 100 : null };
  }).sort((a, b) => itemName(a.itemId).localeCompare(itemName(b.itemId), 'he'));
  return h('div.stack',
    h('p.muted.fin-small', 'מחיר נטו ליחידה (אחרי הנחת שורה, לפני מע״מ) בכל הזמנה מאושרת מהספק. השינוי מחושב מהרכישה הראשונה לאחרונה.'),
    h('div.tbl__wrap', h('table.tbl',
      h('thead', h('tr', ['פריט', 'רכישות', 'מחיר ראשון', 'מחיר אחרון', 'נמוך', 'גבוה', 'שינוי'].map((l, i) => h('th', { scope: 'col', class: i ? 'num' : '' }, l)))),
      h('tbody', groups.map((g) => h('tr',
        h('td', h('details.fin-details', h('summary', itemName(g.itemId)),
          h('ul.fin-pricelist', g.list.map((x) => h('li', h('span', date(x.date)), h('a.ltr', { href: href(`orders/${x.po.id}`) }, x.po.number), h('span', qty(x.qty, item(g.itemId)?.uom)), h('b', money(x.unit))))))),
        h('td.num', num(g.list.length)), h('td.num', money(g.first)), h('td.num', money(g.last)), h('td.num', money(g.min)), h('td.num', money(g.max)),
        h('td.num', g.change === null ? '—' : h('span', { class: g.change > 0.05 ? 'fin-bad' : g.change < -0.05 ? 'fin-good' : '' }, `${g.change > 0 ? '+' : ''}${pct(g.change)}`))))))));
}

function deliveriesPanel(receipts, poById) {
  if (!receipts.length) return empty('אין עדיין אספקות', 'קליטות סחורה מהספק יופיעו כאן עם האיחור מול התאריך הצפוי.');
  const rows = receipts.map((r) => {
    const p = poById.get(r.po_id);
    const got = isoDate(new Date(r.received_at));
    const late = p?.expected_date ? daysBetween(p.expected_date, got) : null;
    return { ...r, po: p, got, late };
  }).sort((a, b) => (a.received_at < b.received_at ? 1 : -1));
  const lateCount = rows.filter((r) => r.late > 0).length;
  return h('div.stack',
    h('p.muted.fin-small', `${num(rows.length)} קליטות, ${num(lateCount)} מהן אחרי התאריך הצפוי. איחור = תאריך הקליטה פחות התאריך הצפוי בהזמנה.`),
    dataTable({
      id: 'supplier-deliveries', exportName: 'אספקות-ספק', rows, columns: [
        { key: 'number', label: 'קליטה', render: (r) => h('span.ltr', r.number) },
        { key: 'po', label: 'הזמנה', value: (r) => r.po?.number || '', render: (r) => (r.po ? h('a.ltr', { href: href(`orders/${r.po.id}`) }, r.po.number) : '—') },
        { key: 'site', label: 'אתר', value: (r) => siteName(r.po?.site_id) },
        { key: 'expected', label: 'תאריך צפוי', value: (r) => r.po?.expected_date || '', render: (r) => date(r.po?.expected_date) },
        { key: 'got', label: 'התקבלה', value: (r) => r.got, render: (r) => date(r.got) },
        { key: 'late', label: 'איחור', num: true, value: (r) => r.late, render: (r) => (r.late === null ? '—' : r.late > 0 ? h('span.fin-bad', `${num(r.late)} ימים`) : h('span.fin-good', r.late === 0 ? 'בזמן' : `${num(-r.late)} ימים מוקדם`)) },
        { key: 'quality_rating', label: 'איכות (1–5)', num: true, value: (r) => r.quality_rating },
        { key: 'service_rating', label: 'שירות (1–5)', num: true, value: (r) => r.service_rating },
        { key: 'delivery_note_no', label: 'תעודת משלוח', value: (r) => r.delivery_note_no || '' },
      ],
    }).el);
}

function returnsPanel(returns, rlines, poById, lineById) {
  if (!returns.length) return empty('אין החזרות לספק', 'סחורה שהוחזרה לספק תופיע כאן עם הסיבה.');
  return h('div.tbl__wrap', h('table.tbl',
    h('thead', h('tr', ['החזרה', 'הזמנה', 'תאריך', 'פריטים', 'סיבה'].map((l) => h('th', { scope: 'col' }, l)))),
    h('tbody', returns.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).map((r) => {
      const p = poById.get(r.po_id);
      const its = rlines.filter((x) => x.return_id === r.id).map((x) => { const l = lineById.get(x.po_line_id); return l ? `${itemName(l.item_id)} × ${qty(x.qty, item(l.item_id)?.uom)}` : qty(x.qty); });
      return h('tr', h('td.ltr', r.number), h('td', p ? h('a.ltr', { href: href(`orders/${p.id}`) }, p.number) : '—'), h('td', date(r.created_at)), h('td', its.join(', ') || '—'), h('td', r.reason));
    }))));
}

// ---------------------------------------------------------------- create / edit
function form(s) {
  const isNew = !s;
  const v = s || { status: 'active', contacts: [], category_ids: [] };
  const name = text({ value: v.name || '', maxlength: 160, required: true, autocomplete: 'organization' });
  const companyNo = text({ value: v.company_no || '', maxlength: 20, dir: 'ltr', inputmode: 'numeric' });
  const phone = text({ value: v.phone || '', maxlength: 40, dir: 'ltr', type: 'tel' });
  const email = text({ value: v.email || '', maxlength: 160, dir: 'ltr', type: 'email' });
  const address = text({ value: v.address || '', maxlength: 300 });
  const terms = text({ value: v.payment_terms || '', maxlength: 120, placeholder: 'למשל: שוטף + 60' });
  const credit = number({ value: v.credit_days ?? '', min: 0, max: 365, step: 1 });
  const delivery = text({ value: v.delivery_terms || '', maxlength: 200, placeholder: 'למשל: הובלה עד האתר, 3 ימי עבודה' });
  const discount = number({ value: v.fixed_discount_pct ?? '', min: 0, max: 100 });
  const status = select([['active', 'פעיל'], ['on_hold', 'בהמתנה'], ['blocked', 'חסום']], { value: v.status });
  const reason = textarea({ value: v.status_reason || '', maxlength: 500, rows: 2 });
  const notesEl = textarea({ value: v.notes || '', maxlength: 4000 });
  const reasonField = field('סיבת הסטטוס', reason, { wide: true, hint: 'חובה כשהספק בהמתנה או חסום. מוצג בכרטיס הספק ובהזמנות.' });
  const syncReason = () => { const need = status.value !== 'active'; reasonField.hidden = !need; reason.required = need; };
  status.addEventListener('change', syncReason); syncReason();

  // categories: a checklist grouped by parent
  const cats = store.ref.categories.filter((c) => c.active || (v.category_ids || []).includes(c.id));
  const catChecks = h('div.fin-checkgrid', cats.length ? cats.sort((a, b) => categoryName(a.id).localeCompare(categoryName(b.id), 'he')).map((c) =>
    h('label.check', h('input', { type: 'checkbox', value: c.id, checked: (v.category_ids || []).includes(c.id) }), categoryName(c.id))) : h('p.muted', 'אין קטגוריות מוגדרות.'));
  const catBox = h('fieldset.fin-fieldset', h('legend.field__label', 'קטגוריות אספקה'), catChecks);

  // contacts editor
  const contactRows = h('div.fin-contacts');
  const addContact = (c = {}) => {
    const n = text({ value: c.name || '', maxlength: 120, 'aria-label': 'שם איש הקשר' });
    const r = text({ value: c.role || '', maxlength: 80, 'aria-label': 'תפקיד' });
    const p = text({ value: c.phone || '', maxlength: 40, dir: 'ltr', type: 'tel', 'aria-label': 'טלפון' });
    const e = text({ value: c.email || '', maxlength: 160, dir: 'ltr', type: 'email', 'aria-label': 'אימייל' });
    const row = h('div.fin-contact', field('שם', n), field('תפקיד', r), field('טלפון', p), field('אימייל', e),
      h('button.iconbtn.fin-contact__del', { type: 'button', 'aria-label': 'הסרת איש קשר', onclick: () => row.remove() }, icon('x', 16)));
    row.get = () => ({ name: n.value.trim(), role: r.value.trim(), phone: p.value.trim(), email: e.value.trim() });
    contactRows.append(row);
  };
  (Array.isArray(v.contacts) ? v.contacts : []).forEach(addContact);
  const contactsBox = h('fieldset.fin-fieldset', h('legend.field__label', 'אנשי קשר'), contactRows,
    h('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: () => addContact() }, icon('plus', 15), 'הוספת איש קשר'));

  const root = h('form.stack', { novalidate: true },
    section('פרטים', h('div.form-grid',
      field('שם הספק', name, { required: true }), field('ח.פ. / עוסק מורשה', companyNo), field('טלפון', phone), field('אימייל', email), field('כתובת', address, { wide: true }))),
    section('אנשי קשר', contactsBox),
    section('תנאים מסחריים', h('div.form-grid',
      field('תנאי תשלום', terms), field('ימי אשראי', credit, { hint: '0–365. משמש לחישוב מועד תשלום חשבונית.' }), field('תנאי אספקה', delivery), field('הנחה קבועה (%)', discount))),
    section('קטגוריות', catBox),
    section('סטטוס והערות', h('div.form-grid', field('סטטוס', status, { required: true }), reasonField, field('הערות', notesEl, { wide: true }))));

  const save = async () => {
    if (!validate(root)) return;
    const row = {
      name: name.value.trim(), company_no: companyNo.value.trim() || null, phone: phone.value.trim() || null, email: email.value.trim() || null,
      address: address.value.trim() || null, payment_terms: terms.value.trim() || null, credit_days: credit.value === '' ? null : Math.round(Number(credit.value)),
      delivery_terms: delivery.value.trim() || null, fixed_discount_pct: discount.value === '' ? null : Number(discount.value),
      status: status.value, status_reason: status.value === 'active' ? null : reason.value.trim(), notes: notesEl.value.trim() || null,
      contacts: [...contactRows.children].map((r) => r.get()).filter((c) => c.name || c.phone || c.email),
      category_ids: [...catChecks.querySelectorAll('input:checked')].map((x) => x.value),
    };
    try {
      let id = s?.id;
      if (isNew) id = (await db('suppliers').insert({ org_id: store.org.id, ...row })).id;
      else await db('suppliers').eq('id', s.id).update(row);
      await refreshRef('suppliers');
      toast(isNew ? `הספק ${row.name} נוסף` : 'פרטי הספק נשמרו');
      go(`suppliers/${id}`);
    } catch (e) { toastError(e); }
  };
  root.addEventListener('submit', (e) => { e.preventDefault(); save(); });
  const title = isNew ? 'ספק חדש' : `עריכת ${s.name}`;
  return h('div.stack',
    pageHeader({ title, crumbs: [['ספקים', href('suppliers')], ...(isNew ? [] : [[s.name, href(`suppliers/${s.id}`)]]), [isNew ? 'ספק חדש' : 'עריכה']] }),
    root,
    h('div.fin-formbar', button('ביטול', null, { href: href(isNew ? 'suppliers' : `suppliers/${s.id}`), kind: 'ghost' }), button(isNew ? 'יצירת הספק' : 'שמירת השינויים', save, { kind: 'primary' })));
}
