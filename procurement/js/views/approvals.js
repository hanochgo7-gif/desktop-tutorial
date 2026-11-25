// Approvals inbox: what is waiting for my decision (decide right here), what is waiting for others (the bottleneck),
// and my recent decisions.
import { h } from '../ui/dom.js';
import { rpc, db, idemKey } from '../core/api.js';
import { store, siteName, supplierName, personName } from '../core/store.js';
import { pageHeader, section, kpi, button, empty, note, tone, badge, tabs } from '../ui/components.js';
import { dataTable } from '../ui/table.js';
import { confirmDialog, toast, toastError } from '../ui/overlay.js';
import { money, money0, moneyShort, num, date, dateTime, ago, ROLE, URGENCY } from '../core/format.js';
import { href } from '../core/router.js';

const DOC = { po: 'הזמנת רכש', request: 'דרישת רכש' };
const REASON = { amount: 'לפי סכום', over_budget: 'חריגה מתקציב', exception: 'חריגה' };

export default async function approvals({ query }) {
  const org = store.org.id;
  const fin = store.can('finance.view');
  const me = store.user.id;
  const canSeeApprovals = fin || store.can('requests.approve') || store.can('requests.create');

  const [mine, pending, decided] = await Promise.all([
    rpc('my_approvals', { p_org: org }),
    canSeeApprovals ? db('approvals').select('id,doc_type,doc_id,revision,step,required_role,reason,created_at').eq('org_id', org).eq('status', 'pending').order('created_at').limit(500).get() : [],
    canSeeApprovals ? db('approvals').select('id,doc_type,doc_id,revision,step,required_role,reason,status,comment,decided_at').eq('org_id', org).eq('decided_by', me).order('decided_at', { desc: true }).limit(30).get() : [],
  ]);

  // the current (lowest pending) step of every document that is waiting
  const current = new Map();
  for (const a of pending) {
    const k = `${a.doc_type}:${a.doc_id}`;
    const c = current.get(k);
    if (!c || a.step < c.step) current.set(k, a);
  }
  const mineKeys = new Set(mine.map((m) => `${m.doc_type}:${m.doc_id}`));
  const others = [...current.values()].filter((a) => !mineKeys.has(`${a.doc_type}:${a.doc_id}`));

  // document details for everything listed
  const ids = (t) => [...new Set([...mine.filter((m) => m.doc_type === t).map((m) => m.doc_id), ...others.filter((a) => a.doc_type === t).map((a) => a.doc_id),
    ...decided.filter((a) => a.doc_type === t).map((a) => a.doc_id)])];
  const poIds = ids('po'), rqIds = ids('request');
  const [pos, rqs] = await Promise.all([
    poIds.length && (fin || store.can('receipts.post')) ? db('purchase_orders').select('id,number,revision,site_id,supplier_id,net_total,created_by,submitted_by,over_budget,warnings,expected_date').in('id', poIds).get() : [],
    rqIds.length ? db('requests').select('id,number,revision,site_id,requested_by,est_total,urgency,needed_by,reason').in('id', rqIds).get() : [],
  ]);
  const doc = (t, id) => (t === 'po' ? pos.find((p) => p.id === id) : rqs.find((r) => r.id === id)) || null;
  const docHref = (t, id) => href(t === 'po' ? `orders/${id}` : `requests/${id}`);

  // ---------------------------------------------------------------- header and figures
  const overBudget = mine.filter((m) => m.reason === 'over_budget').length;
  const oldest = mine.reduce((o, m) => (!o || m.created_at < o ? m.created_at : o), null);
  const sum = mine.reduce((s, m) => s + Number(m.amount || 0), 0);
  const head = pageHeader({
    title: 'אישורים',
    sub: mine.length ? `${num(mine.length)} מסמכים מחכים להחלטה שלך` : 'אין מסמכים שמחכים להחלטה שלך',
  });
  const kpis = h('div.kpis',
    kpi('ממתינים לך', num(mine.length), { tone: mine.length ? 'warn' : 'good' }),
    fin ? kpi('סכום ממתין להחלטתך', moneyShort(sum), { sub: 'לפני מע״מ' }) : null,
    kpi('בחריגה מתקציב', num(overBudget), { tone: overBudget ? 'bad' : null, sub: 'נדרשת הערה לאישור' }),
    kpi('הוותיק ביותר אצלך', oldest ? ago(oldest) : '—'),
    canSeeApprovals ? kpi('ממתינים לאחרים', num(others.length), { sub: 'מסמכים שאינם בסמכותך כרגע' }) : null);

  // ---------------------------------------------------------------- my inbox
  const inbox = mine.length ? h('ul.ap-list', mine.map((m) => inboxRow(m))) :
    empty('אין מה לאשר', 'כשמסמך יגיע לשלב שבסמכותך הוא יופיע כאן, עם הסכום, האתר וסיבת האישור.');

  function inboxRow(m) {
    const d = doc(m.doc_type, m.doc_id);
    const isPo = m.doc_type === 'po';
    const over = m.reason === 'over_budget';
    const warnCount = isPo && d?.warnings ? d.warnings.filter((w) => w.kind !== 'over_budget').length : 0;
    const who = isPo ? (d ? supplierName(d.supplier_id) : null) : (d ? personName(d.requested_by) : null);
    const age = ageTone(m.created_at);
    return h('li.ap-item', { class: over ? 'is-over' : '' },
      h('div.ap-item__main',
        h('div.ap-item__title',
          h('a.ap-item__no', { href: docHref(m.doc_type, m.doc_id) }, m.number || '—'),
          h('span.ap-item__type', DOC[m.doc_type]),
          over ? tone('חריגה מתקציב', 'bad') : null,
          !isPo && d && (d.urgency === 'high' || d.urgency === 'critical') ? tone(`דחיפות ${URGENCY[d.urgency]}`, d.urgency === 'critical' ? 'bad' : 'warn') : null,
          warnCount ? tone(`${warnCount} אזהרות`, 'warn') : null),
        h('p.ap-item__meta',
          [siteName(m.site_id), who ? (isPo ? `ספק: ${who}` : `מבקש: ${who}`) : null,
            `שלב ${m.step} · ${ROLE[m.required_role] || m.required_role}`, REASON[m.reason] || m.reason].filter(Boolean).join(' · ')),
        !isPo && d?.reason ? h('p.ap-item__reason', d.reason) : null),
      h('div.ap-item__side',
        fin ? h('span.ap-item__amount', money0(m.amount)) : null,
        h('span.ap-item__age', { class: age ? `is-${age}` : '' }, ago(m.created_at))),
      h('div.ap-item__actions',
        button('פתיחה', null, { href: docHref(m.doc_type, m.doc_id), small: true, kind: 'ghost' }),
        button('דחייה', () => decide(m, 'reject'), { small: true, kind: 'danger' }),
        button('אישור', () => decide(m, 'approve'), { small: true, kind: 'primary' })));
  }

  async function decide(m, decision) {
    const isPo = m.doc_type === 'po';
    const over = m.reason === 'over_budget';
    const approve = decision === 'approve';
    const amount = store.can('finance.view') ? ` בסך ${money(m.amount)} לפני מע״מ` : '';
    const text = approve
      ? `${DOC[m.doc_type]} ${m.number}${amount}, ${siteName(m.site_id)}. האישור נרשם בשמך בשלב ${m.step} (${ROLE[m.required_role]}).`
        + (over ? ' המסמך חורג מהתקציב, ולכן צריך לכתוב הערה שתישמר עם ההחלטה.' : '')
      : `${DOC[m.doc_type]} ${m.number} תוחזר ל${isPo ? 'קניין' : 'מבקש'} כדחויה. כתבו למה, כדי שיוכלו לתקן ולהגיש מחדש.`;
    const res = await confirmDialog({
      title: approve ? `לאשר את ${m.number}?` : `לדחות את ${m.number}?`, text,
      confirm: approve ? 'אישור' : 'דחייה', danger: !approve,
      reason: !approve || over, reasonLabel: approve ? 'הערה לאישור החריגה' : 'סיבת הדחייה',
    });
    if (!res) return;
    const comment = typeof res === 'string' ? res : null;
    try {
      const out = await rpc(isPo ? 'po_decide' : 'request_decide', { [isPo ? 'p_po' : 'p_request']: m.doc_id, p_decision: decision, p_comment: comment, p_idem: idemKey() });
      toast(!approve ? `${m.number} נדחתה` : out?.result === 'approved_step' ? `${m.number} אושרה בשלב שלך ועברה לשלב הבא` : `${m.number} אושרה סופית`);
      reload();
    } catch (e) { toastError(e); }
  }

  // ---------------------------------------------------------------- waiting on others
  const peopleFor = (role, creator) => store.ref.people.filter((p) => p.active && p.role === role && p.id !== creator).map((p) => p.full_name || p.email);
  const otherRows = others.map((a) => {
    const d = doc(a.doc_type, a.doc_id);
    const creator = a.doc_type === 'po' ? d?.created_by : d?.requested_by;
    const submitter = a.doc_type === 'po' ? d?.submitted_by : null;
    let why = `דורש ${ROLE[a.required_role] || a.required_role}`;
    if (creator === me || submitter === me) why = 'המסמך נוצר או הוגש על ידך (הפרדת סמכויות)';
    return { id: a.id, a, d, number: d?.number || '—', type: DOC[a.doc_type], site: d ? siteName(d.site_id) : '—', amount: a.doc_type === 'po' ? d?.net_total : d?.est_total,
      role: ROLE[a.required_role] || a.required_role, who: peopleFor(a.required_role, creator).join(', '), why, created_at: a.created_at };
  }).filter((r) => r.d);
  const othersTable = () => dataTable({
    id: 'approvals-others',
    rows: otherRows,
    rowHref: (r) => docHref(r.a.doc_type, r.a.doc_id),
    exportName: 'אישורים-ממתינים-לאחרים',
    columns: [
      { key: 'number', label: 'מסמך' },
      { key: 'type', label: 'סוג', filter: 'select' },
      { key: 'site', label: 'אתר', filter: 'select' },
      fin ? { key: 'amount', label: 'סכום לפני מע״מ', num: true, value: (r) => Number(r.amount || 0), render: (r) => money(r.amount) } : null,
      { key: 'role', label: 'ממתין ל', filter: 'select', render: (r) => h('span', `שלב ${r.a.step} · ${r.role}`, r.a.reason === 'over_budget' ? h('span.sub.is-bad', 'חריגה מתקציב') : null) },
      { key: 'who', label: 'מי יכול לאשר', render: (r) => r.who || h('span.muted', 'אין משתמש פעיל בתפקיד; מנכ״ל או מנהל מערכת יכולים לאשר') },
      { key: 'why', label: 'למה לא אצלך', hidden: false },
      { key: 'created_at', label: 'ממתין', sort: (r) => r.created_at, value: (r) => date(r.created_at),
        render: (r) => { const t = ageTone(r.created_at); return h('span', { class: t ? `pc-age is-${t}` : 'pc-age' }, ago(r.created_at)); } },
    ].filter(Boolean),
    empty: { title: 'אין מסמכים שממתינים לאחרים', text: 'כל המסמכים שממתינים לאישור נמצאים אצלך, או שאין כרגע מסמכים ממתינים.' },
  }).el;

  // ---------------------------------------------------------------- my decisions
  const decidedRows = decided.map((a) => {
    const d = doc(a.doc_type, a.doc_id);
    return { id: a.id, a, number: d?.number || '—', type: DOC[a.doc_type] || a.doc_type, site: d ? siteName(d.site_id) : '—', amount: a.doc_type === 'po' ? d?.net_total : d?.est_total };
  });
  const decidedTable = () => dataTable({
    id: 'approvals-mine-decided',
    rows: decidedRows,
    rowHref: (r) => docHref(r.a.doc_type, r.a.doc_id),
    columns: [
      { key: 'number', label: 'מסמך' },
      { key: 'type', label: 'סוג' },
      { key: 'site', label: 'אתר' },
      fin ? { key: 'amount', label: 'סכום לפני מע״מ', num: true, value: (r) => Number(r.amount || 0), render: (r) => money(r.amount) } : null,
      { key: 'status', label: 'החלטה', value: (r) => r.a.status, render: (r) => badge('approval', r.a.status) },
      { key: 'comment', label: 'הערה', value: (r) => r.a.comment || '' },
      { key: 'decided_at', label: 'מתי', sort: (r) => r.a.decided_at, value: (r) => dateTime(r.a.decided_at) },
    ].filter(Boolean),
    empty: { title: 'עוד לא קיבלת החלטות', text: 'אישורים ודחיות שלך יופיעו כאן.' },
  }).el;

  const lists = canSeeApprovals ? tabs([
    { id: 'mine', label: 'ממתינים לי', count: mine.length, render: () => inbox },
    { id: 'others', label: 'ממתינים לאחרים', count: otherRows.length, render: othersTable },
    { id: 'decided', label: 'החלטות אחרונות שלי', render: decidedTable },
  ], query.tab || 'mine') : inbox;

  return h('div.stack',
    head,
    !canSeeApprovals ? note('לתפקיד שלך אין סמכות אישור. כאן יופיעו מסמכים אם תקבלו סמכות כזו.') : null,
    kpis,
    section(null, lists));
}

// ---------------------------------------------------------------- helpers
// older than 2 days: warn; older than 5: bad
function ageTone(ts) {
  const days = (Date.now() - new Date(ts).getTime()) / 86400000;
  return days > 5 ? 'bad' : days > 2 ? 'warn' : null;
}
// Re-render the screen and the shell's approvals badge (the shell listens to hashchange).
function reload() { window.dispatchEvent(new HashChangeEvent('hashchange')); }
