// Command center: the state of the whole operation in one screen, every number a link to the records behind it.
import { h } from '../ui/dom.js';
import { rpc, db } from '../core/api.js';
import { store, siteName } from '../core/store.js';
import { pageHeader, section, kpi, button, empty, note } from '../ui/components.js';
import { barChart, rankBars } from '../ui/charts.js';
import { money0, moneyShort, num, ALERT, date, isoDate, addDays } from '../core/format.js';
import { href } from '../core/router.js';

const MONTHS = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];

export default async function home() {
  const org = store.org.id;
  const fin = store.can('finance.view');
  const [cc, alerts, chain] = await Promise.all([
    rpc('command_center', { p_org: org }),
    rpc('alerts', { p_org: org }),
    chainCounts(org, fin),
  ]);
  const hello = store.profile?.full_name ? `שלום ${store.profile.full_name.split(' ')[0]}` : 'מרכז שליטה';
  const actions = [
    store.can('requests.create') ? button('דרישת רכש חדשה', null, { href: href('requests/new'), ic: 'plus', kind: 'primary' }) : null,
    store.can('po.create') ? button('הזמנה חדשה', null, { href: href('orders/new'), ic: 'order' }) : null,
    store.can('receipts.post') ? button('קליטת סחורה', null, { href: href('orders?status=to_receive'), ic: 'truck' }) : null,
  ].filter(Boolean);

  const sub = `${store.org.name} · ${date(isoDate())}` + (cc.my_approvals ? ` · ${cc.my_approvals} מסמכים מחכים לאישור שלך` : '');
  const head = pageHeader({ title: hello, sub, actions });

  // the chain: where purchases are now
  const chainEl = h('nav.chain', { 'aria-label': 'שרשרת הרכש' }, chain.map((c) => h('a.chain__step', { href: c.href },
    h('span.chain__name', c.name), h('span.chain__value', num(c.count)), c.sub ? h('span.chain__sub', c.sub) : null, c.flag ? h('span.chain__flag', c.flag) : null)));

  const kpis = h('div.kpis',
    kpi('אתרים פעילים', num(cc.sites_active), { sub: `${num(cc.sites_total)} אתרים ומחסנים`, href: href('sites') }),
    kpi('פריטים בקטלוג', num(cc.items), { href: href('items') }),
    fin ? kpi('שווי מלאי', moneyShort(cc.stock_value), { sub: 'לפי עלות ממוצעת', href: href('stock') }) : null,
    fin ? kpi('הזמנות פתוחות', num(cc.open_pos), { sub: moneyShort(cc.open_pos_value) + ' לפני מע״מ', href: href('orders?status=open') }) : kpi('הזמנות פתוחות', num(cc.open_pos), { href: href('orders?status=open') }),
    kpi('ממתינים לאישור', num(cc.pending_approval), { tone: cc.pending_approval ? 'warn' : null, sub: cc.my_approvals ? `${cc.my_approvals} אצלך` : 'אין אצלך', href: href('approvals') }),
    kpi('אספקות באיחור', num(cc.late_deliveries), { tone: cc.late_deliveries ? 'bad' : 'good', href: href('orders?status=late') }),
    kpi('מתחת למינימום', num(cc.below_min), { tone: cc.below_min ? 'bad' : 'good', sub: `${num(cc.reorder_needed)} להזמנה מחדש`, href: href('stock?view=low') }),
    cc.budgets_over !== null && cc.budgets_over !== undefined ? kpi('חריגות תקציב', num(cc.budgets_over), { tone: cc.budgets_over ? 'bad' : 'good', href: href('budgets') }) : null,
    fin ? kpi('ספקים בעייתיים', num(cc.problem_suppliers), { tone: cc.problem_suppliers ? 'warn' : null, sub: 'איחורים, מסמכים, סטטוס', href: href('suppliers?view=problems') }) : null,
    fin ? kpi('חיסכון מהשוואת הצעות', moneyShort(cc.savings_ytd?.vs_highest_quote), { sub: `השנה, ב־${num(cc.savings_ytd?.rfqs)} השוואות, מול ההצעה היקרה`, href: href('rfqs') }) : null,
  );

  // alerts, worst first
  const sev = { high: 0, medium: 1, low: 2 };
  const sorted = [...alerts].sort((a, b) => sev[a.severity] - sev[b.severity]);
  const alertHref = (a) => ({ po: `orders/${a.entity_id}`, item: `items/${a.entity_id}`, budget: `budgets/${a.entity_id}`, invoice: `invoices/${a.entity_id}`,
    supplier: `suppliers/${a.entity_id}`, loan: 'loans', asset: `assets/${a.entity_id}` }[a.entity] || '');
  const alertMeta = (a) => {
    const d = a.detail || {};
    if (a.kind === 'late_delivery') return `${d.days_late} ימי איחור`;
    if (a.kind === 'stockout_soon' || a.kind === 'stock_out') return `${siteName(a.site_id)} · ${d.days_cover !== null && d.days_cover !== undefined ? `מספיק ל־${num(d.days_cover)} ימים` : `זמין ${num(d.available)}`}`;
    if (a.kind === 'budget_over') return `חריגה של ${money0(-a.amount)}`;
    if (a.kind === 'budget_near') return `נוצל ${d.used_pct}%`;
    if (a.kind === 'supplier_doc_expiring') return `בתוקף עד ${date(d.valid_until)}`;
    if (a.kind === 'service_due') return `טיפול ב־${date(d.next_service_on)}`;
    if (a.kind === 'loan_overdue') return `להחזרה ב־${date(d.due_on)}`;
    if (a.kind === 'invoice_exception') return money0(a.amount);
    if (a.kind === 'delivery_at_risk') return `צפויה ${date(d.expected_date)}, ספק בזמן ב־${d.on_time_pct}%`;
    return '';
  };
  const alertList = sorted.length ? h('ul.alerts', sorted.slice(0, 12).map((a) => h('li.alert', { class: `alert--${a.severity}` },
    h('span.alert__dot', { 'aria-hidden': 'true' }),
    h('div', h('span.alert__title', alertHref(a) ? h('a', { href: href(alertHref(a)) }, a.title) : a.title), h('span.alert__kind', ' · ' + (ALERT[a.kind] || a.kind))),
    h('span.alert__meta', alertMeta(a))))) : empty('אין התראות פתוחות', 'אין איחורים, חוסרים צפויים או חריגות כרגע.');
  const alertsSec = section(`התראות${sorted.length ? ` (${sorted.length})` : ''}`, alertList, { id: 'alerts', note: sorted.length > 12 ? 'מוצגות 12 החשובות' : null });

  // spend
  let spendSec = null;
  if (fin && cc.spend_12m) {
    const s = cc.spend_12m;
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ label: MONTHS[d.getMonth()], title: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, value: s.by_month.find((m) => m.month === key)?.amount || 0 });
    }
    spendSec = section('הוצאות רכש לפי חודש', s.total > 0 ? barChart(months, { label: 'הוצאות רכש ב־12 החודשים האחרונים, לפני מע״מ' }) : empty('אין עדיין הזמנות מאושרות', 'ההוצאה תופיע כאן אחרי אישור ההזמנה הראשונה.'),
      { id: 'spend', note: `${money0(s.total)} ב־12 חודשים, לפני מע״מ, לפי תאריך הזמנה`, actions: [button('לדוחות', null, { href: href('reports'), small: true, kind: 'ghost' })] });
  }
  const bySite = fin && cc.spend_12m?.by_site?.length ? section('לפי אתר', rankBars(cc.spend_12m.by_site.map((x) => ({ label: x.name, value: x.amount, href: href(`sites/${x.site_id}`) })), { label: 'הוצאות לפי אתר' }), { id: 'by-site' }) : null;
  const byCat = fin && cc.spend_12m?.by_category?.length ? section('לפי קטגוריה', rankBars(cc.spend_12m.by_category.map((x) => ({ label: x.name, value: x.amount })), { label: 'הוצאות לפי קטגוריה' }), { id: 'by-cat' }) : null;
  const bySup = fin && cc.spend_12m?.by_supplier?.length ? section('לפי ספק', rankBars(cc.spend_12m.by_supplier.map((x) => ({ label: x.name, value: x.amount, href: href(`suppliers/${x.supplier_id}`) })), { label: 'הוצאות לפי ספק' }), { id: 'by-sup' }) : null;

  return h('div.stack',
    head,
    store.org.is_demo ? note('זהו ארגון הדגמה. כל הנתונים בו לדוגמה בלבד ונפרדים מהארגון האמיתי.', 'warn') : null,
    chainEl,
    kpis,
    h('div.grid.grid--main', alertsSec, h('div.stack', bySite, byCat)),
    spendSec,
    bySup);
}

// Counts for the chain strip. Each step links to the list filtered to what needs action.
async function chainCounts(org, fin) {
  const cnt = async (q) => { try { const r = await q.limit(1).count().get(); return r.total ?? r.length; } catch { return null; } };
  const today = isoDate();
  const [reqOpen, reqToHandle, rfqOpen, poPending, poOpen, poLate, toReceive, invExc, invToPay] = await Promise.all([
    cnt(db('requests').select('id').eq('org_id', org).eq('status', 'submitted')),
    cnt(db('requests').select('id').eq('org_id', org).in('status', ['approved', 'in_progress'])),
    fin ? cnt(db('rfqs').select('id').eq('org_id', org).eq('status', 'open')) : null,
    cnt(db('purchase_orders').select('id').eq('org_id', org).eq('status', 'pending_approval')),
    cnt(db('purchase_orders').select('id').eq('org_id', org).in('status', ['approved', 'sent', 'supplier_confirmed', 'in_delivery'])),
    cnt(db('purchase_orders').select('id').eq('org_id', org).in('status', ['approved', 'sent', 'supplier_confirmed', 'in_delivery', 'partially_received']).lt('expected_date', today)),
    cnt(db('purchase_orders').select('id').eq('org_id', org).in('status', ['approved', 'sent', 'supplier_confirmed', 'in_delivery', 'partially_received']).lte('expected_date', addDays(today, 3))),
    fin ? cnt(db('invoices').select('id').eq('org_id', org).eq('status', 'exception')) : null,
    fin ? cnt(db('invoices').select('id').eq('org_id', org).in('status', ['matched', 'approved'])) : null,
  ]);
  return [
    { name: 'דרישות', count: (reqOpen || 0) + (reqToHandle || 0), sub: `${num(reqOpen)} לאישור · ${num(reqToHandle)} לטיפול`, href: href('requests?status=open') },
    { name: 'הצעות מחיר', count: rfqOpen, sub: 'בקשות פתוחות להשוואה', href: href('rfqs?status=open') },
    { name: 'הזמנות', count: (poPending || 0) + (poOpen || 0), sub: `${num(poPending)} לאישור · ${num(poOpen)} אצל ספקים`, href: href('orders?status=open') },
    { name: 'אספקות', count: toReceive, sub: 'צפויות עד 3 ימים או באיחור', flag: poLate ? `${poLate} באיחור` : null, href: href('orders?status=to_receive') },
    { name: 'חשבוניות', count: (invExc || 0) + (invToPay || 0), sub: `${num(invToPay)} לתשלום`, flag: invExc ? `${invExc} חריגות` : null, href: href('invoices?status=open') },
  ].filter((c) => c.count !== null);
}
