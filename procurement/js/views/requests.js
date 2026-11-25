// Purchase requests: list, new/edit (draft or rejected, by the requester), and the request file with the automatic checks
// (stock here and elsewhere, open orders, similar requests, prices, budget) and fulfilment (hold, transfer, order, quotes).
import { h } from '../ui/dom.js';
import { rpc, db, idemKey } from '../core/api.js';
import { store, siteName, itemName, item, personName, supplierName, site } from '../core/store.js';
import { pageHeader, section, button, badge, tone, facts, empty, note } from '../ui/components.js';
import { dataTable } from '../ui/table.js';
import { field, text, textarea, dateInput, select, number, picker, siteOptions, supplierOptions, linesEditor, validate } from '../ui/forms.js';
import { modal, confirmDialog, toast, toastError } from '../ui/overlay.js';
import { money, money0, qty, num, pct, date, dateTime, ago, isoDate, STATUS, URGENCY, ROLE, statusLabel } from '../core/format.js';
import { href, go } from '../core/router.js';

const OPEN = ['submitted', 'approved', 'in_progress'];
const FILL = ['approved', 'in_progress'];
const PO_OPEN = ['draft', 'pending_approval', 'approved', 'sent', 'supplier_confirmed', 'in_delivery', 'partially_received'];

export default async function requests(args) {
  const { params, path, query } = args;
  if (path === 'requests/new') return form(args, null);
  if (params.id && query.edit) return form(args, params.id);
  if (params.id) return detail(args);
  return list(args);
}

// ================================================================= list
async function list({ query }) {
  const org = store.org.id;
  const fin = store.can('finance.view');
  const today = isoDate();
  let rows = await db('requests').select('id,number,site_id,requested_by,urgency,needed_by,est_total,status,created_at,reason,project')
    .eq('org_id', org).order('created_at', { desc: true }).limit(2000).get();
  const total = rows.length;

  // preset filters from links (command center, approvals)
  let preset = null;
  if (query.status === 'open') { rows = rows.filter((r) => OPEN.includes(r.status)); preset = 'דרישות פתוחות: ממתינות לאישור, מאושרות ובטיפול'; }
  else if (query.status && STATUS.request[query.status]) { rows = rows.filter((r) => r.status === query.status); preset = `דרישות במצב ${statusLabel('request', query.status)}`; }
  if (query.mine) { rows = rows.filter((r) => r.requested_by === store.user.id); preset = 'הדרישות שלי'; }

  const late = (r) => r.needed_by && r.needed_by < today && OPEN.includes(r.status);
  const t = dataTable({
    id: 'requests',
    rows,
    rowHref: (r) => href(`requests/${r.id}`),
    exportName: 'דרישות-רכש',
    columns: [
      { key: 'number', label: 'מספר', render: (r) => h('span', r.number, r.reason ? h('span.sub.pc-clip', r.reason) : null), value: (r) => `${r.number} ${r.reason || ''} ${r.project || ''}`, exportValue: (r) => r.number },
      { key: 'site', label: 'אתר', value: (r) => siteName(r.site_id), filter: 'select', filterValue: (r) => r.site_id,
        options: store.ref.sites.map((s) => [s.id, s.name]) },
      { key: 'requester', label: 'מבקש', value: (r) => personName(r.requested_by) },
      { key: 'urgency', label: 'דחיפות', value: (r) => URGENCY[r.urgency], sort: (r) => ['low', 'normal', 'high', 'critical'].indexOf(r.urgency),
        filter: 'select', filterValue: (r) => r.urgency, options: Object.entries(URGENCY), render: (r) => urgencyTag(r.urgency) },
      { key: 'needed_by', label: 'נדרש עד', sort: (r) => r.needed_by || '', value: (r) => date(r.needed_by),
        render: (r) => r.needed_by ? h('span', { class: late(r) ? 'pc-late' : '' }, date(r.needed_by), late(r) ? h('span.sub', 'עבר המועד') : null) : null },
      fin ? { key: 'est_total', label: 'אומדן לפני מע״מ', num: true, value: (r) => Number(r.est_total || 0), render: (r) => money(r.est_total) } : null,
      { key: 'status', label: 'סטטוס', value: (r) => statusLabel('request', r.status), filter: 'select', filterValue: (r) => r.status,
        options: Object.entries(STATUS.request).map(([k, [l]]) => [k, l]), render: (r) => badge('request', r.status) },
      { key: 'created_at', label: 'נפתחה', sort: (r) => r.created_at, value: (r) => date(r.created_at) },
    ].filter(Boolean),
    empty: { title: 'אין עדיין דרישות רכש', text: 'דרישה היא הבקשה של האתר לקבל ציוד או חומרים. אחרי אישור היא מכוסה מהמלאי, בהעברה או בהזמנה.',
      action: store.can('requests.create') ? button('דרישה חדשה', null, { href: href('requests/new'), kind: 'primary', ic: 'plus' }) : null },
  });

  const counts = { submitted: 0, approved: 0, in_progress: 0 };
  rows.forEach((r) => { if (counts[r.status] !== undefined) counts[r.status]++; });
  return h('div.stack',
    pageHeader({
      title: 'דרישות רכש',
      sub: `${num(counts.submitted)} ממתינות לאישור · ${num(counts.approved)} מאושרות לטיפול · ${num(counts.in_progress)} בטיפול`,
      actions: [
        button('הדרישות שלי', null, { href: href('requests?mine=1'), kind: 'ghost' }),
        store.can('requests.create') ? button('דרישה חדשה', null, { href: href('requests/new'), kind: 'primary', ic: 'plus' }) : null,
      ].filter(Boolean),
    }),
    preset ? h('div.pc-preset', h('span', `מוצגות ${preset} (${num(rows.length)} מתוך ${num(total)})`), h('a', { href: href('requests') }, 'הצגת כל הדרישות')) : null,
    t.el);
}

// ================================================================= new / edit
async function form({ params }, id) {
  const org = store.org.id;
  const me = store.user.id;
  const fin = store.can('finance.view');
  if (!store.can('requests.create')) return h('div.stack', pageHeader({ title: 'דרישה חדשה', crumbs: [['דרישות רכש', href('requests')], ['דרישה חדשה']] }),
    empty('אין לך הרשאה לפתוח דרישות רכש', 'פנו למנהל המערכת אם אתם צריכים לפתוח דרישות.'));
  let r = null; let lines = [];
  if (id) {
    [r, lines] = await Promise.all([
      db('requests').select('id,number,site_id,urgency,reason,needed_by,project,status,requested_by').eq('id', id).one(),
      db('request_lines').select('item_id,description,qty,est_unit_price,note').eq('request_id', id).order('line_no').get(),
    ]);
    if (!r) return notFound();
    if (!['draft', 'rejected'].includes(r.status) || r.requested_by !== me) {
      return h('div.stack', pageHeader({ title: `עריכת ${r.number}`, crumbs: [['דרישות רכש', href('requests')], [r.number, href(`requests/${id}`)], ['עריכה']] }),
        note(r.requested_by !== me ? 'רק מי שפתח את הדרישה יכול לערוך אותה.' : `אפשר לערוך רק טיוטה או דרישה שנדחתה. הדרישה במצב ${statusLabel('request', r.status)}.`, 'warn'),
        h('div', button('חזרה לדרישה', null, { href: href(`requests/${id}`) })));
    }
  }

  const sites = siteOptions();
  const sitePick = picker({ items: () => sites, value: r?.site_id || (sites.length === 1 ? sites[0].id : null), label: 'אתר', required: true });
  const urgency = select(Object.entries(URGENCY), { value: r?.urgency || 'normal' });
  const needed = dateInput({ value: r?.needed_by || '', min: r ? undefined : isoDate() });
  const project = text({ value: r?.project || '', maxlength: 120 });
  const reason = textarea({ value: r?.reason || '', maxlength: 2000, placeholder: 'למה צריך, למה ועד מתי. למשל: החלפת כבלים בחדר שרתים 2 לפני ההתקנה.' });
  const editor = linesEditor({
    cols: fin ? ['item', 'qty', 'price', 'note'] : ['item', 'qty', 'note'],
    lines: lines.filter((l) => l.item_id).map((l) => ({ item_id: l.item_id, qty: Number(l.qty), unit_price: l.est_unit_price === null ? '' : Number(l.est_unit_price), note: l.note })),
  });
  // the estimate is optional: the server prices an empty line at the last purchase price
  const unrequire = () => editor.querySelectorAll('input[aria-label="מחיר ליחידה"]').forEach((i) => { i.required = false; });
  unrequire();
  editor.addEventListener('click', () => setTimeout(unrequire));

  const formEl = h('form.stack', { novalidate: true, onsubmit: (e) => e.preventDefault() },
    section('פרטי הדרישה', h('div.form-grid',
      field('אתר', sitePick, { required: true, hint: sites.length === 1 ? 'האתר היחיד שבאחריותך' : 'האתר שאליו צריך את הציוד' }),
      field('דחיפות', urgency),
      field('נדרש עד', needed, { hint: 'התאריך שבו הציוד צריך להיות באתר' }),
      field('פרויקט', project, { hint: 'אופציונלי' }),
      field('סיבה ופירוט', reason, { wide: true }))),
    section('פריטים', h('div.stack', editor,
      fin ? h('p.field__hint', 'המחיר הוא אומדן לפני מע״מ. שורה בלי מחיר תתומחר אוטומטית לפי הרכישה האחרונה של הפריט.') : null),
    { note: 'פריטים מהקטלוג בלבד' }));

  let savedId = id;
  const submitKey = idemKey();
  async function save() {
    unrequire();
    if (!sitePick.value) { sitePick.focusInput(); toast('בחרו אתר', 'bad'); return null; }
    if (!validate(formEl) || !editor.valid()) return null;
    const p = {
      id: savedId || undefined, org_id: org, site_id: sitePick.value, urgency: urgency.value, reason: reason.value.trim() || null,
      needed_by: needed.value || null, project: project.value.trim() || null,
      lines: editor.get().map((l) => ({ item_id: l.item_id, qty: l.qty, est_unit_price: l.unit_price ?? null, note: l.note || null })),
    };
    const out = await rpc('request_save', { p });
    savedId = out.id;
    return out;
  }
  const actions = [
    button('ביטול', null, { href: href(id ? `requests/${id}` : 'requests'), kind: 'ghost' }),
    button('שמירת טיוטה', async () => {
      try { const out = await save(); if (!out) return; toast('הטיוטה נשמרה'); go(`requests/${out.id}`); } catch (e) { toastError(e); }
    }),
    button('שליחה לאישור', async () => {
      try {
        const out = await save(); if (!out) return;
        await rpc('request_submit', { p_request: out.id, p_idem: submitKey });
        toast('הדרישה נשלחה לאישור');
        go(`requests/${out.id}`);
      } catch (e) { toastError(e); }
    }, { kind: 'primary' }),
  ];
  const title = r ? `עריכת דרישה ${r.number}` : 'דרישת רכש חדשה';
  return h('div.stack',
    pageHeader({ title, crumbs: [['דרישות רכש', href('requests')], r ? [r.number, href(`requests/${id}`)] : null, [r ? 'עריכה' : 'דרישה חדשה']].filter(Boolean),
      sub: r?.status === 'rejected' ? 'הדרישה נדחתה. אחרי התיקון היא תישלח שוב לאישור כגרסה חדשה.' : 'אחרי השליחה הדרישה עוברת לאישור לפי כללי האישור של הארגון.' }),
    formEl,
    h('div.pc-formbar', actions));
}

// ================================================================= the request file
async function detail({ params, refresh }) {
  const org = store.org.id;
  const id = params.id;
  const me = store.user.id;
  const fin = store.can('finance.view');
  const [r, lines, mine, appr] = await Promise.all([
    db('requests').select('*').eq('id', id).one(),
    db('request_lines').select('*').eq('request_id', id).order('line_no').get(),
    rpc('my_approvals', { p_org: org }).catch(() => []),
    db('approvals').select('id,revision,step,required_role,reason,status,decided_by,decided_at,comment,created_at').eq('doc_type', 'request').eq('doc_id', id)
      .order('revision', { desc: true }).order('step').get().catch(() => []),
  ]);
  if (!r) return notFound();
  const lineIds = lines.map((l) => l.id);
  const [check, reservations, poLines, transfers, rfqs] = await Promise.all([
    rpc('request_check', { p_request: id }).catch(() => null),
    lineIds.length && store.can('stock.view') ? db('reservations').select('id,site_id,item_id,qty,consumed_qty,request_line_id,source,status,created_at').in('request_line_id', lineIds).order('created_at').get() : [],
    lineIds.length && (fin || store.can('receipts.post')) ? db('po_lines').select('po_id,request_line_id,item_id,qty,received_qty,cancelled_qty').in('request_line_id', lineIds).get() : [],
    db('transfers').select('id,number,status,from_site_id,to_site_id,created_at').eq('request_id', id).order('created_at').get().catch(() => []),
    fin ? db('rfqs').select('id,number,title,status,due_date').eq('request_id', id).order('created_at').get().catch(() => []) : [],
  ]);
  const poIds = [...new Set(poLines.map((l) => l.po_id))];
  const orders = poIds.length ? await db('purchase_orders').select('id,number,status,supplier_id,net_total,expected_date').in('id', poIds).get() : [];

  const myStep = mine.find((m) => m.doc_type === 'request' && m.doc_id === id);
  const isRequester = r.requested_by === me;
  const fillable = FILL.includes(r.status);
  const covered = (l) => Number(l.reserved_qty) + Number(l.transfer_qty) + Number(l.ordered_qty);
  const remaining = (l) => Math.max(0, Number(l.qty) - covered(l));
  const openLines = lines.filter((l) => l.item_id && remaining(l) > 0);

  // ---------------------------------------------------------------- actions
  const act = [];
  if (['draft', 'rejected'].includes(r.status) && isRequester) {
    act.push(button('עריכה', null, { href: href(`requests/${id}?edit=1`), ic: 'edit' }));
    act.push(button(r.status === 'rejected' ? 'הגשה מחדש לאישור' : 'שליחה לאישור', async () => {
      try { await rpc('request_submit', { p_request: id, p_idem: idemKey() }); toast('הדרישה נשלחה לאישור'); reload(); } catch (e) { toastError(e); }
    }, { kind: 'primary' }));
  }
  if (myStep) {
    act.push(button('דחייה', () => decide('reject'), { kind: 'danger' }));
    act.push(button('אישור הדרישה', () => decide('approve'), { kind: 'primary', ic: 'check' }));
  }
  if (fillable && openLines.length && store.can('rfq.manage')) act.push(button('בקשת הצעות מחיר', null, { href: href(`rfqs/new?request=${id}`), ic: 'quote' }));
  if (fillable && openLines.length && store.can('po.create')) act.push(button('יצירת הזמנה', orderDialog, { kind: myStep ? null : 'primary', ic: 'order' }));
  if (!['fulfilled', 'cancelled'].includes(r.status) && (isRequester || store.can('requests.approve'))) act.push(button('ביטול הדרישה', cancel, { kind: 'ghost' }));

  async function decide(decision) {
    const approve = decision === 'approve';
    const res = await confirmDialog({
      title: approve ? `לאשר את ${r.number}?` : `לדחות את ${r.number}?`,
      text: approve
        ? `הדרישה של ${personName(r.requested_by)} ל${siteName(r.site_id)}${fin ? `, אומדן ${money(r.est_total)} לפני מע״מ` : ''}. אחרי האישור אפשר לכסות אותה מהמלאי, בהעברה או בהזמנה.`
        : 'הדרישה תחזור למבקש כדחויה. כתבו מה צריך לתקן.',
      confirm: approve ? 'אישור' : 'דחייה', danger: !approve, reason: !approve || myStep.reason === 'over_budget', reasonLabel: approve ? 'הערה' : 'סיבת הדחייה',
    });
    if (!res) return;
    try {
      const out = await rpc('request_decide', { p_request: id, p_decision: decision, p_comment: typeof res === 'string' ? res : null, p_idem: idemKey() });
      toast(!approve ? 'הדרישה נדחתה' : out?.result === 'approved_step' ? 'אישרת את השלב שלך; הדרישה עברה לשלב הבא' : 'הדרישה אושרה');
      reload();
    } catch (e) { toastError(e); }
  }

  async function cancel() {
    const hasCover = lines.some((l) => Number(l.ordered_qty) > 0 || Number(l.transfer_qty) > 0);
    if (hasCover) { toast('לדרישה יש הזמנות או העברות פעילות. בטלו אותן קודם, ואז אפשר לבטל את הדרישה.', 'bad', 7000); return; }
    const reason = await confirmDialog({ title: `לבטל את ${r.number}?`, danger: true, confirm: 'ביטול הדרישה', reason: true, reasonLabel: 'סיבת הביטול',
      text: 'הדרישה תיסגר ולא תטופל. מלאי ששוריין עבורה ישוחרר ויחזור להיות זמין באתר.' });
    if (!reason) return;
    try { await rpc('request_cancel', { p_request: id, p_reason: reason }); toast('הדרישה בוטלה'); reload(); } catch (e) { toastError(e); }
  }

  function orderDialog() {
    const sup = picker({ items: () => supplierOptions(), label: 'ספק', required: true, onPick: (sid) => { warn.hidden = supplierStatus(sid) !== 'on_hold'; } });
    const warn = note('הספק בהמתנה. אפשר להזמין, אבל ההזמנה תסומן באזהרה למאשרים.', 'warn'); warn.hidden = true;
    const checks = openLines.map((l) => ({ l, cb: h('input', { type: 'checkbox', checked: true }) }));
    modal({
      title: `הזמנה מדרישה ${r.number}`, wide: true,
      body: h('div.stack',
        field('ספק', sup, { required: true }), warn,
        h('fieldset.pc-fieldset', h('legend', 'שורות להזמנה (הכמות שעוד לא מכוסה)'),
          h('div.checklist', checks.map(({ l, cb }) => h('label', cb, `${itemName(l.item_id)} · ${qty(remaining(l), item(l.item_id)?.uom)}`)))),
        h('p.muted', 'תיפתח הזמנה בטיוטה. המחיר בכל שורה: המחירון המוסכם עם הספק, אחרת המחיר האחרון אצלו, אחרת האומדן שבדרישה. אפשר לערוך לפני השליחה לאישור.')),
      actions: [{ label: 'ביטול' }, { label: 'יצירת טיוטת הזמנה', kind: 'primary', onClick: async () => {
        if (!sup.value) { sup.focusInput(); return false; }
        const ids = checks.filter((c) => c.cb.checked).map((c) => c.l.id);
        if (!ids.length) { toast('בחרו לפחות שורה אחת', 'bad'); return false; }
        const out = await rpc('po_from_request', { p_request: id, p_supplier: sup.value, p_line_ids: ids });
        toast(`נפתחה טיוטת הזמנה ${out.number}`);
        go(`orders/${out.id}`);
      } }],
    });
  }

  async function reserve(l, available) {
    const n = await qtyDialog({ title: `שריון ${itemName(l.item_id)} מהמלאי`, max: Math.min(remaining(l), available), uom: item(l.item_id)?.uom,
      text: `ב${siteName(r.site_id)} יש ${qty(available, item(l.item_id)?.uom)} זמינים. הכמות תישמר לדרישה הזו ולא תהיה זמינה לאחרים עד הניפוק או השחרור.`, confirm: 'שריון' });
    if (n === null) return;
    try { await rpc('request_reserve', { p_line: l.id, p_qty: n, p_idem: idemKey() }); toast(`שוריינו ${qty(n, item(l.item_id)?.uom)} מהמלאי של האתר`); reload(); } catch (e) { toastError(e); }
  }
  async function transfer(l, from) {
    const uom = item(l.item_id)?.uom;
    const n = await qtyDialog({ title: `העברה מ${from.site_name}`, max: Math.min(remaining(l), Number(from.surplus)), uom, withNote: true,
      text: `ב${from.site_name} יש ${qty(from.surplus, uom)} מעל המינימום שלו. תיפתח העברה בטיוטה אל ${siteName(r.site_id)}, שאותה שולחים ממסך ההעברות.`, confirm: 'פתיחת העברה' });
    if (n === null) return;
    try {
      const out = await rpc('transfer_create', { p_org: org, p_from: from.site_id, p_to: r.site_id, p_lines: [{ item_id: l.item_id, qty: n.qty, request_line_id: l.id }],
        p_note: n.note || `לדרישה ${r.number}`, p_request_id: r.id, p_idem: idemKey() });
      toast(`נפתחה העברה ${out.number} מ${from.site_name}`);
      reload();
    } catch (e) { toastError(e); }
  }

  // ---------------------------------------------------------------- facts
  const head = pageHeader({
    title: h('span.pc-title', `דרישה ${r.number}`, badge('request', r.status), r.revision > 0 ? h('span.pc-rev', `גרסה ${r.revision + 1}`) : null),
    sub: `${siteName(r.site_id)} · ${personName(r.requested_by)} · ${dateTime(r.created_at)}`,
    crumbs: [['דרישות רכש', href('requests')], [r.number]],
    actions: act,
  });
  const factsEl = facts([
    ['אתר', site(r.site_id) ? h('a', { href: href(`sites/${r.site_id}`) }, siteName(r.site_id)) : siteName(r.site_id)],
    ['מבקש', personName(r.requested_by)],
    ['דחיפות', urgencyTag(r.urgency, true)],
    ['נדרש עד', r.needed_by ? h('span', { class: r.needed_by < isoDate() && OPEN.includes(r.status) ? 'pc-late' : '' }, date(r.needed_by)) : null],
    ['פרויקט', r.project || null],
    fin ? ['אומדן לפני מע״מ', money(r.est_total)] : null,
    ['נשלחה לאישור', r.submitted_at ? dateTime(r.submitted_at) : null],
    ['החלטה', r.decided_at ? dateTime(r.decided_at) : null],
    r.closed_at ? ['נסגרה', dateTime(r.closed_at)] : null,
  ]);
  const top = section(null, h('div.stack', factsEl, r.reason ? h('div.pc-reason', h('span.facts__k', 'סיבה'), h('p', r.reason)) : null));

  const notes = [];
  if (r.status === 'submitted' && !myStep) {
    const cur = appr.filter((a) => a.revision === r.revision && a.status === 'pending').sort((a, b) => a.step - b.step)[0];
    if (cur) notes.push(note(`ממתינה לאישור ${ROLE[cur.required_role]} (שלב ${cur.step}) ${ago(cur.created_at)}.${isRequester ? ' מי שפתח את הדרישה לא יכול לאשר אותה.' : ''}`));
  }
  if (r.status === 'rejected') {
    const rej = appr.find((a) => a.status === 'rejected' && a.revision === r.revision);
    notes.push(note(`הדרישה נדחתה${rej ? ` על ידי ${personName(rej.decided_by)}: ${rej.comment || ''}` : ''}.${isRequester ? ' אפשר לערוך ולהגיש מחדש.' : ''}`, 'bad'));
  }
  if (fillable && openLines.length) notes.push(note('לפני שקונים: בדקו בכל שורה אם אפשר לשריין מהמלאי באתר או להעביר עודף מאתר אחר. רק מה שנשאר פתוח צריך הזמנה.'));
  if (r.status === 'fulfilled') notes.push(note('כל השורות מכוסות. סחורה שהגיעה בהזמנה שמורה לדרישה עד שתנופק לאתר.', 'good'));

  // ---------------------------------------------------------------- lines with checks and coverage
  const ck = (lid) => check?.lines?.find((c) => c.line_id === lid);
  const orderRows = (lid) => poLines.filter((p) => p.request_line_id === lid);
  const lineEls = lines.map((l) => {
    const c = ck(l.id);
    const it = item(l.item_id);
    const uom = it?.uom;
    const rem = remaining(l);
    // open orders for this site that are not this request's own
    const ownPos = new Set(orderRows(l.id).map((p) => orders.find((o) => o.id === p.po_id)).filter((o) => o && PO_OPEN.includes(o.status)).map((o) => o.number));
    const ownOpen = orderRows(l.id).filter((p) => ownPos.has(orders.find((o) => o.id === p.po_id)?.number)).reduce((s, p) => s + Number(p.qty) - Number(p.cancelled_qty) - Number(p.received_qty), 0);
    const findings = [];
    if (c) {
      const local = Number(c.local_available || 0);
      if (local > 0) findings.push([local >= rem && rem > 0 ? 'good' : 'info', `במלאי של ${siteName(r.site_id)} יש ${qty(local, uom)} זמינים${rem > 0 ? (local >= rem ? '. אפשר לשריין במקום לקנות.' : ', פחות ממה שנדרש.') : '.'}`]);
      else findings.push(['neutral', `אין מלאי זמין ב${siteName(r.site_id)}.`]);
      for (const o of c.other_sites || []) findings.push(['good', `עודף של ${qty(o.surplus, uom)} ב${o.site_name} (מעל המינימום שלו). אפשר להעביר במקום לקנות.`]);
      const otherOpen = Number(c.open_po_qty || 0) - ownOpen;
      const otherPos = (c.open_pos || []).filter((n) => !ownPos.has(n));
      if (otherOpen > 0) findings.push(['warn', `כבר מוזמנים לאתר ${qty(otherOpen, uom)} בהזמנות פתוחות אחרות (${otherPos.join(', ')}). ודאו שלא מזמינים פעמיים.`]);
      if (Number(c.in_transit_qty) > 0) findings.push(['info', `בדרך לאתר בהעברה: ${qty(c.in_transit_qty, uom)}.`]);
      if ((c.similar_requests || []).length) findings.push(['warn', `דרישות פתוחות לאותו פריט מ־60 הימים האחרונים: ${c.similar_requests.join(', ')}.`]);
      if (fin && (c.last_price !== null || c.avg_price !== null)) {
        let s = `מחיר רכישה אחרון ${money(c.last_price)} · ממוצע שנתי ${money(c.avg_price)}`;
        let t = 'neutral';
        if (l.est_unit_price !== null && c.last_price > 0 && Number(l.est_unit_price) > Number(c.last_price) * 1.1) {
          s += ` · האומדן גבוה ב־${pct((Number(l.est_unit_price) / Number(c.last_price) - 1) * 100)} מהמחיר האחרון`; t = 'warn';
        }
        findings.push([t, s + '.']);
      } else if (fin) findings.push(['neutral', 'הפריט לא נרכש בשנה האחרונה; אין מחיר היסטורי להשוואה.']);
    }
    const lineActs = [];
    if (fillable && rem > 0 && l.item_id) {
      const local = Number(c?.local_available || 0);
      if (local > 0 && store.can('stock.move')) lineActs.push(button('שריון מהמלאי באתר', () => reserve(l, local), { small: true }));
      if (store.can('stock.transfer')) for (const o of c?.other_sites || []) if (site(o.site_id)) lineActs.push(button(`העברה מ${o.site_name}`, () => transfer(l, o), { small: true, ic: 'transfer' }));
    }
    const ord = orderRows(l.id).map((p) => orders.find((o) => o.id === p.po_id)).filter(Boolean);
    return h('li.rq-line',
      h('div.rq-line__head',
        h('div', h('span.rq-line__no', `${l.line_no}.`), ' ', l.item_id ? h('a.rq-line__item', { href: href(`items/${l.item_id}`) }, itemName(l.item_id)) : h('span.rq-line__item', l.description),
          it ? h('span.sub.ltr', it.sku) : null, l.note ? h('span.sub', l.note) : null),
        h('div.rq-line__qty', h('span.rq-line__big', qty(l.qty, uom)), fin && l.est_unit_price !== null ? h('span.sub', `${money(l.est_unit_price)} ליחידה · ${money0(Number(l.qty) * Number(l.est_unit_price))}`) : null)),
      FILL.includes(r.status) || r.status === 'fulfilled' ? coverage(l, uom) : null,
      findings.length ? h('ul.rq-checks', findings.map(([t, s]) => h('li', { class: `is-${t}` }, s))) : null,
      ord.length ? h('p.rq-line__docs', 'הזמנות: ', ord.map((o, i) => [i ? ', ' : '', h('a', { href: href(`orders/${o.id}`) }, o.number), ` (${statusLabel('po', o.status)})`])) : null,
      lineActs.length ? h('div.rq-line__actions', lineActs) : null);
  });
  const budgets = check?.budgets || [];
  const budgetEl = !check ? null : budgets.length ? h('ul.rq-budgets', budgets.map((b) => h('li', { class: b.over ? 'is-over' : '' },
    h('span.rq-budgets__name', b.name),
    h('span', `זמין ${money0(b.available)}`),
    h('span', `אחרי הדרישה ${money0(b.after)}`),
    b.over ? tone(`חריגה של ${money0(-b.after)}`, 'bad') : tone('בתוך התקציב', 'good')))) :
    h('p.muted', 'לא נמצא תקציב פעיל לאתר ולתקופה של הדרישה.');

  const linesSec = section(`שורות ובדיקות אוטומטיות (${lines.length})`, h('div.stack', h('ol.rq-lines', lineEls),
    fin && budgetEl ? h('div.rq-budgetbox', h('h3.pc-h3', 'תקציב'), budgetEl) : null), { id: 'lines' });

  // ---------------------------------------------------------------- reservations
  let resSec = null;
  if (reservations.length) {
    const rows = reservations.map((v) => ({ ...v, open: Number(v.qty) - Number(v.consumed_qty) }));
    resSec = section('מלאי שמור לדרישה', h('div.tbl__wrap', h('table.tbl',
      h('thead', h('tr', ['פריט', 'מקור', 'נשמר', 'נופק', 'נותר שמור', 'סטטוס', 'נשמר ב', ''].map((x, i) => h('th', { class: [2, 3, 4].includes(i) ? 'num' : '', scope: 'col' }, x)))),
      h('tbody', rows.map((v) => h('tr',
        h('td', itemName(v.item_id)),
        h('td', v.source === 'po' ? 'סחורה שהגיעה בהזמנה' : 'מהמלאי באתר'),
        h('td.num', qty(v.qty, item(v.item_id)?.uom)), h('td.num', qty(v.consumed_qty)), h('td.num', qty(v.status === 'active' ? v.open : 0)),
        h('td', tone(v.status === 'active' ? 'שמור' : v.status === 'consumed' ? 'נופק' : 'שוחרר', v.status === 'active' ? 'info' : 'neutral')),
        h('td', date(v.created_at)),
        h('td', v.status === 'active' && store.can('stock.move') ? h('div.row',
          button('ניפוק לאתר', () => issue(v), { small: true }),
          button('שחרור', () => release(v), { small: true, kind: 'ghost' })) : null)))))),
    { id: 'reservations', note: 'ניפוק מוריד מהמלאי ורושם תנועה ביומן; שחרור מחזיר את הכמות להיות זמינה' });
  }
  async function issue(v) {
    const n = await qtyDialog({ title: `ניפוק ${itemName(v.item_id)}`, max: Number(v.qty) - Number(v.consumed_qty), uom: item(v.item_id)?.uom,
      text: `הכמות תצא מהמלאי של ${siteName(v.site_id)} ותירשם כניפוק לדרישה ${r.number}. אי אפשר לבטל ניפוק; מחזירים בתנועת מלאי.`, confirm: 'ניפוק' });
    if (n === null) return;
    try { await rpc('reservation_issue', { p_reservation: v.id, p_qty: n, p_idem: idemKey() }); toast(`נופקו ${qty(n, item(v.item_id)?.uom)}`); reload(); } catch (e) { toastError(e); }
  }
  async function release(v) {
    const reason = await confirmDialog({ title: 'לשחרר את המלאי השמור?', reason: true, reasonLabel: 'סיבה', confirm: 'שחרור',
      text: v.source === 'po' ? 'הסחורה שהגיעה עבור הדרישה תחזור להיות מלאי זמין באתר.' : 'הכמות תחזור להיות זמינה, והשורה בדרישה תיפתח מחדש לכיסוי.' });
    if (!reason) return;
    try { await rpc('reservation_release', { p_reservation: v.id, p_reason: reason }); toast('המלאי שוחרר'); reload(); } catch (e) { toastError(e); }
  }

  // ---------------------------------------------------------------- related documents and approvals
  const related = [];
  orders.forEach((o) => related.push(['הזמנת רכש', h('a', { href: href(`orders/${o.id}`) }, o.number), supplierName(o.supplier_id), badge('po', o.status), fin ? money(o.net_total) : '']));
  transfers.forEach((t) => related.push(['העברה', h('a', { href: href(`transfers/${t.id}`) }, t.number), `מ${siteName(t.from_site_id)}`, badge('transfer', t.status), '']));
  rfqs.forEach((q) => related.push(['בקשה להצעות', h('a', { href: href(`rfqs/${q.id}`) }, q.number), q.title, badge('rfq', q.status), q.due_date ? `עד ${date(q.due_date)}` : '']));
  const relSec = related.length ? section('מסמכים קשורים', h('div.tbl__wrap', h('table.tbl', h('tbody', related.map((x) => h('tr', x.map((c, i) => h('td', { class: i === 4 ? 'num' : '' }, c)))))))) : null;
  const apprSec = appr.length ? section('היסטוריית אישורים', approvalsTable(appr, r.revision), { id: 'approvals' }) : null;

  return h('div.stack', head, ...notes, top, linesSec, resSec, h('div.grid.grid--2', apprSec, relSec));
}

// ---------------------------------------------------------------- helpers
function coverage(l, uom) {
  const q = Number(l.qty) || 1;
  const parts = [['reserved', 'שמור מהמלאי', Number(l.reserved_qty)], ['transfer', 'בהעברה', Number(l.transfer_qty)], ['ordered', 'הוזמן', Number(l.ordered_qty)]];
  const rem = Math.max(0, Number(l.qty) - parts.reduce((s, p) => s + p[2], 0));
  return h('div.rq-cover',
    h('div.rq-cover__bar', { role: 'img', 'aria-label': `כיסוי: ${parts.map((p) => `${p[1]} ${num(p[2])}`).join(', ')}, נותר ${num(rem)}` },
      parts.filter((p) => p[2] > 0).map(([k, , v]) => h('span', { class: `is-${k}`, style: { width: `${Math.min(100, (v / q) * 100)}%` } }))),
    h('ul.rq-cover__legend',
      parts.map(([k, label, v]) => h('li', { class: `is-${k}` }, h('i', { 'aria-hidden': 'true' }), `${label} ${qty(v)}`)),
      h('li.is-rem', h('i', { 'aria-hidden': 'true' }), rem > 0 ? `נותר לכסות ${qty(rem, uom)}` : 'מכוסה במלואה')));
}

function approvalsTable(appr, revision) {
  return h('div.tbl__wrap', h('table.tbl.tbl--compact',
    h('thead', h('tr', ['שלב', 'נדרש', 'החלטה', 'מי', 'מתי', 'הערה'].map((x) => h('th', { scope: 'col' }, x)))),
    h('tbody', appr.map((a) => h('tr', { class: a.revision !== revision ? 'pc-old' : '' },
      h('td', `${a.step}${a.revision !== revision ? ` · גרסה ${a.revision + 1}` : ''}`),
      h('td', ROLE[a.required_role] || a.required_role, a.reason === 'over_budget' ? h('span.sub', 'חריגה מתקציב') : null),
      h('td', badge('approval', a.status)),
      h('td', a.decided_by ? personName(a.decided_by) : '—'),
      h('td', a.decided_at ? dateTime(a.decided_at) : '—'),
      h('td', a.comment || '—'))))));
}

function urgencyTag(u, always = false) {
  if (u === 'critical') return tone(URGENCY[u], 'bad');
  if (u === 'high') return tone(URGENCY[u], 'warn');
  return always ? URGENCY[u] || u : h('span.muted', URGENCY[u] || u);
}

const supplierStatus = (id) => store.ref.suppliers.find((s) => s.id === id)?.status;

// Ask for a quantity (and optionally a note). Resolves to the number, {qty, note} with withNote, or null.
function qtyDialog({ title, text: msg, max, uom, confirm = 'אישור', withNote = false }) {
  return new Promise((resolve) => {
    let done = false;
    const inp = number({ min: '0.001', max: String(max), value: String(Math.round(max * 1000) / 1000), required: true });
    const nt = withNote ? text({ maxlength: 500 }) : null;
    modal({
      title,
      body: h('div.stack', msg ? h('p.muted', msg) : null,
        field(`כמות${uom ? ` (${uom})` : ''}`, inp, { required: true, hint: `עד ${qty(max, uom)}` }),
        nt ? field('הערה', nt) : null),
      onClose: () => { if (!done) resolve(null); },
      actions: [{ label: 'ביטול' }, { label: confirm, kind: 'primary', onClick: () => {
        const v = Number(inp.value);
        if (!inp.value || !(v > 0) || v > max + 1e-9) { inp.setAttribute('aria-invalid', 'true'); inp.focus(); toast(`כמות בין 0 ל־${num(max)}`, 'bad'); return false; }
        done = true; resolve(withNote ? { qty: v, note: nt.value.trim() } : v);
      } }],
    });
  });
}

function notFound() {
  return h('div.stack', pageHeader({ title: 'הדרישה לא נמצאה', crumbs: [['דרישות רכש', href('requests')], ['לא נמצאה']] }),
    empty('הדרישה לא נמצאה', 'ייתכן שהיא שייכת לאתר שאין לך גישה אליו.', button('לכל הדרישות', null, { href: href('requests') })));
}

// Re-render the screen and the shell's approvals badge (the shell listens to hashchange).
function reload() { window.dispatchEvent(new HashChangeEvent('hashchange')); }
