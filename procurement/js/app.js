// מערך (Maarach). Shell: sign-in, organization, navigation, global search, and the route → screen mapping (screens load on demand).
import { auth, configured, onAuthChange, rpc, db } from './core/api.js';
import { store, loadSession, selectOrg, onStore } from './core/store.js';
import { route, current, go } from './core/router.js';
import { CONFIG } from './config.js';
import { h, clear, debounce } from './ui/dom.js';
import { icon } from './ui/icons.js';
import { toast, toastError, modal } from './ui/overlay.js';
import { skeleton, note, avatar } from './ui/components.js';
import { ROLE, errorText } from './core/format.js';

const app = document.getElementById('app');

// ---------------------------------------------------------------- routes
const screens = [
  ['', 'home', 'מרכז שליטה'],
  ['approvals', 'approvals', 'אישורים'],
  ['requests', 'requests', 'דרישות רכש'], ['requests/new', 'requests', 'דרישה חדשה'], ['requests/:id', 'requests', 'דרישת רכש'],
  ['rfqs', 'rfqs', 'הצעות מחיר'], ['rfqs/new', 'rfqs', 'בקשה להצעות מחיר'], ['rfqs/:id', 'rfqs', 'השוואת הצעות'],
  ['orders', 'orders', 'הזמנות רכש'], ['orders/new', 'orders', 'הזמנה חדשה'], ['orders/:id', 'orders', 'הזמנת רכש'], ['orders/:id/edit', 'orders', 'עריכת הזמנה'],
  ['stock', 'stock', 'מלאי'], ['items', 'items', 'פריטים'], ['items/new', 'items', 'פריט חדש'], ['items/:id', 'items', 'פריט'],
  ['transfers', 'transfers', 'העברות'], ['transfers/:id', 'transfers', 'העברה'], ['counts', 'counts', 'ספירות מלאי'], ['counts/:id', 'counts', 'ספירה'],
  ['assets', 'assets', 'ציוד קבוע'], ['assets/:id', 'assets', 'פריט ציוד'], ['loans', 'loans', 'ציוד מושאל'],
  ['sites', 'sites', 'אתרים'], ['sites/new', 'sites', 'אתר חדש'], ['sites/:id', 'sites', 'אתר'],
  ['suppliers', 'suppliers', 'ספקים'], ['suppliers/new', 'suppliers', 'ספק חדש'], ['suppliers/:id', 'suppliers', 'ספק'],
  ['invoices', 'invoices', 'חשבוניות ספקים'], ['invoices/new', 'invoices', 'קליטת חשבונית'], ['invoices/:id', 'invoices', 'חשבונית'],
  ['budgets', 'budgets', 'תקציבים'], ['budgets/:id', 'budgets', 'תקציב'],
  ['reports', 'reports', 'דוחות'], ['assistant', 'assistant', 'עוזר רכש'],
  ['settings', 'settings', 'הגדרות'], ['audit', 'audit', 'יומן פעולות'],
];
for (const [pattern, mod, title] of screens) route(pattern, mod, { title });

const NAV = [
  { items: [['', 'מרכז שליטה', 'home']] },
  { title: 'רכש', items: [['approvals', 'אישורים', 'approve', null, 'approvals'], ['requests', 'דרישות רכש', 'request'], ['rfqs', 'הצעות מחיר', 'quote', 'rfq.manage'], ['orders', 'הזמנות רכש', 'order']] },
  { title: 'מלאי ואתרים', items: [['stock', 'מלאי', 'box', 'stock.view'], ['items', 'פריטים', 'tool'], ['transfers', 'העברות', 'transfer', 'stock.view'], ['counts', 'ספירות', 'count', 'stock.view'],
    ['assets', 'ציוד קבוע', 'settings', 'stock.view'], ['loans', 'ציוד מושאל', 'users', 'stock.view'], ['sites', 'אתרים', 'site']] },
  { title: 'ספקים וכספים', items: [['suppliers', 'ספקים', 'supplier', 'finance.view|suppliers.manage'], ['invoices', 'חשבוניות', 'invoice', 'finance.view'], ['budgets', 'תקציבים', 'budget', 'budgets.view'], ['reports', 'דוחות', 'chart', 'reports.view']] },
  { items: [['assistant', 'עוזר רכש', 'spark', 'reports.view|finance.view'], ['settings', 'הגדרות', 'settings'], ['audit', 'יומן פעולות', 'history', 'audit.view']] },
];
const allowed = (perm) => !perm || perm.split('|').some((p) => store.can(p));

// ---------------------------------------------------------------- boot
async function boot() {
  if (!configured()) return notConfigured();
  auth.consumeRedirect();
  if (!auth.signedIn) return login();
  clear(app).append(h('div.boot', skeleton(3)));
  try { await loadSession(); } catch (e) { if (!auth.signedIn) return login(); return fatal(e); }
  if (!store.org) return noOrg();
  shell();
}
onAuthChange((s) => { if (!s) login(); });

function notConfigured() {
  clear(app).append(h('main.center', h('div.card.card--narrow',
    h('h1', 'המערכת עוד לא חוברה לשרת'),
    h('p', 'כדי שהמערכת תעבוד צריך פרויקט Supabase שבו יותקן מסד הנתונים (הקבצים בתיקייה procurement/supabase/migrations), ואת כתובתו ומפתחו הציבורי בקובץ procurement/js/config.js.'),
    h('p.muted', 'שום פעולה לא מתבצעת עד שהחיבור קיים. המערכת לא מציגה נתונים מומצאים.'))));
}
function fatal(e) {
  clear(app).append(h('main.center', h('div.card.card--narrow', h('h1', 'לא הצלחנו לטעון את המערכת'), h('p', errorText(e)),
    h('button.btn.btn--primary', { type: 'button', onclick: () => location.reload() }, 'ניסיון נוסף'))));
}

function login() {
  const email = h('input.input', { type: 'email', autocomplete: 'username', required: true, id: 'lg-e', dir: 'ltr' });
  const pass = h('input.input', { type: 'password', autocomplete: 'current-password', required: true, id: 'lg-p', dir: 'ltr' });
  const err = h('p.form__error', { role: 'alert' });
  const submit = h('button.btn.btn--primary.btn--block', { type: 'submit' }, 'כניסה');
  const form = h('form.stack', { novalidate: true },
    h('div.field', h('label.field__label', { for: 'lg-e' }, 'אימייל'), email),
    h('div.field', h('label.field__label', { for: 'lg-p' }, 'סיסמה'), pass), err, submit,
    h('button.linkbtn', { type: 'button', onclick: async () => {
      if (!email.value) { err.textContent = 'כתבו את כתובת המייל ואז לחצו שוב על איפוס סיסמה.'; email.focus(); return; }
      try { await auth.resetPassword(email.value); err.textContent = ''; toast('אם הכתובת רשומה, נשלח אליה קישור לאיפוס.', 'good'); } catch (e) { err.textContent = errorText(e); }
    } }, 'שכחתי סיסמה'));
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); err.textContent = '';
    if (!email.value || !pass.value) { err.textContent = 'מלאו אימייל וסיסמה.'; return; }
    submit.disabled = true; submit.classList.add('is-busy');
    try { await auth.signIn(email.value, pass.value); await boot(); }
    catch (e2) { err.textContent = /Invalid login/i.test(e2.message) ? 'האימייל או הסיסמה שגויים.' : errorText(e2); }
    finally { submit.disabled = false; submit.classList.remove('is-busy'); }
  });
  clear(app).append(h('main.login',
    h('div.login__card',
      h('div.brand.brand--lg', mark(), h('div', h('span.brand__name', 'מערך'), h('span.brand__product', 'רכש, מלאי וספקים'))),
      h('h1.login__title', 'כניסה למערכת'),
      form,
      CONFIG.env === 'dev' ? note('סביבת פיתוח מקומית: demo@example.com, סיסמה demo1234.') : null)));
  email.focus();
}

function noOrg() {
  const name = h('input.input', { id: 'no-n', required: true, maxlength: 120 });
  const demo = h('input', { type: 'checkbox', id: 'no-d' });
  clear(app).append(h('main.center', h('div.card.card--narrow',
    h('h1', 'אין לכם עדיין ארגון במערכת'),
    h('p', 'אם הוזמנתם, בקשו מהמנהל לשלוח הזמנה לכתובת ' + (store.profile?.email || auth.user?.email) + ' והיכנסו שוב.'),
    h('details', h('summary', 'פתיחת ארגון חדש (למורשים בלבד)'),
      h('div.stack', h('div.field', h('label.field__label', { for: 'no-n' }, 'שם הארגון'), name),
        h('label.check', demo, 'ארגון הדגמה (נתונים לדוגמה, נפרד לגמרי מהארגון האמיתי)'),
        h('button.btn.btn--primary', { type: 'button', onclick: async () => {
          if (!name.value.trim()) return name.focus();
          try {
            const r = await rpc('org_create', { p_name: name.value.trim(), p_is_demo: demo.checked });
            if (demo.checked) await rpc('demo_seed', { p_org: r.id });
            await loadSession(); await selectOrg(r.id); shell();
          } catch (e) { toastError(e); }
        } }, 'פתיחת הארגון'))),
    h('button.linkbtn', { type: 'button', onclick: () => auth.signOut() }, 'יציאה'))));
}

// ---------------------------------------------------------------- shell
const mark = () => h('span.brand__mark', { 'aria-hidden': 'true', html: '<svg viewBox="0 0 32 32" width="30" height="30"><rect width="32" height="32" rx="8" fill="currentColor"/><rect x="8" y="8" width="7" height="7" rx="1.6" fill="#fff"/><rect x="17" y="8" width="7" height="7" rx="1.6" fill="#fff" opacity=".55"/><rect x="8" y="17" width="7" height="7" rx="1.6" fill="#fff" opacity=".55"/><rect x="17" y="17" width="7" height="7" rx="1.6" fill="#fff" opacity=".55"/></svg>' });

let main, navEl, approvalsBadge;
function shell() {
  navEl = h('nav.nav', { 'aria-label': 'ניווט ראשי' });
  main = h('main.page#main', { tabindex: '-1' });
  const searchBtn = h('button.search-trigger', { type: 'button', onclick: openSearch, 'aria-keyshortcuts': 'Control+K' },
    icon('search', 16), h('span', 'חיפוש פריטים, הזמנות, ספקים, אתרים'), h('kbd', 'Ctrl K'));
  approvalsBadge = h('a.topbar__icon', { href: '#/approvals', 'aria-label': 'אישורים ממתינים' }, icon('approve'), h('span.dot', { hidden: true }));
  const orgSel = store.orgs.length > 1 ? h('select.input.input--sm.org-switch', { 'aria-label': 'ארגון', onchange: async (e) => { await selectOrg(e.target.value); shell(); } },
    store.orgs.map((o) => h('option', { value: o.id, selected: o.id === store.org.id }, o.name + (o.is_demo ? ' (הדגמה)' : '')))) : null;
  const userBtn = h('button.user', { type: 'button', 'aria-haspopup': 'dialog', onclick: userMenu }, avatar(store.profile?.full_name || store.profile?.email),
    h('span.user__text', h('span.user__name', store.profile?.full_name || store.profile?.email), h('span.user__role', ROLE[store.role])));
  const menuBtn = h('button.iconbtn.topbar__menu', { type: 'button', 'aria-label': 'תפריט', 'aria-expanded': 'false', onclick: () => {
    const open = document.body.classList.toggle('nav-open'); menuBtn.setAttribute('aria-expanded', String(open));
  } }, icon('menu'));
  clear(app).append(
    h('a.skip', { href: '#main', onclick: (e) => { e.preventDefault(); main.focus(); } }, 'דילוג לתוכן'),
    h('div.layout',
      h('aside.sidebar',
        h('a.brand', { href: '#/' }, mark(), h('div', h('span.brand__name', 'מערך'), h('span.brand__product', 'רכש, מלאי וספקים'))),
        store.org.is_demo ? h('div.env-flag', 'ארגון הדגמה: הנתונים לדוגמה בלבד') : null,
        navEl),
      h('div.workspace',
        h('header.topbar', menuBtn, searchBtn, h('div.topbar__end', orgSel, approvalsBadge, userBtn)),
        main)));
  drawNav();
  render();
  refreshApprovals();
}
function drawNav() {
  clear(navEl);
  const path = (current()?.path || '').split('/')[0];
  for (const g of NAV) {
    const items = g.items.filter(([, , , perm]) => allowed(perm));
    if (!items.length) continue;
    navEl.append(h('div.nav__group', g.title ? h('p.nav__title', g.title) : null,
      h('ul', items.map(([p, label, ic, , badgeKey]) => h('li', h('a.nav__link', { href: '#/' + p, 'aria-current': path === p ? 'page' : null },
        icon(ic, 18), h('span', label), badgeKey ? h('span.nav__count', { dataset: { badge: badgeKey }, hidden: true }) : null))))));
  }
}
async function refreshApprovals() {
  try {
    const list = await rpc('my_approvals', { p_org: store.org.id });
    const n = list.length;
    approvalsBadge.querySelector('.dot').hidden = !n;
    approvalsBadge.setAttribute('aria-label', n ? `${n} אישורים ממתינים לך` : 'אין אישורים ממתינים');
    document.querySelectorAll('[data-badge=approvals]').forEach((b) => { b.hidden = !n; b.textContent = n; });
  } catch { /* the badge is a convenience */ }
}
export const refreshShell = refreshApprovals;

let renderSeq = 0;
async function render() {
  if (!main) return;
  const seq = ++renderSeq;
  const r = current();
  document.body.classList.remove('nav-open');
  drawNav();
  if (!r) { clear(main).append(h('div.empty', h('p.empty__title', 'העמוד לא נמצא'), h('a.btn', { href: '#/' }, 'למרכז השליטה'))); return; }
  document.title = `${r.route.meta.title} · מערך`;
  clear(main).append(skeleton(8));
  try {
    const mod = await import(`./views/${r.route.handler}.js`);
    const node = await mod.default({ params: r.params, query: r.query, path: r.path, refresh: render });
    if (seq !== renderSeq) return;
    clear(main).append(node);
  } catch (e) {
    if (seq !== renderSeq) return;
    console.error(e);
    clear(main).append(h('div.empty', h('p.empty__title', 'לא הצלחנו להציג את העמוד'), h('p.muted', errorText(e)),
      h('button.btn', { type: 'button', onclick: render }, 'ניסיון נוסף')));
  }
  if (seq === renderSeq && !(r.query && r.query.keep)) main.scrollTo?.(0, 0);
}
window.addEventListener('hashchange', () => { if (store.org && main) { render(); refreshApprovals(); } });

function userMenu() {
  const name = h('input.input', { value: store.profile?.full_name || '', id: 'um-n', maxlength: 120 });
  const phone = h('input.input', { value: store.profile?.phone || '', id: 'um-p', dir: 'ltr', maxlength: 40 });
  const pw = h('input.input', { type: 'password', id: 'um-pw', autocomplete: 'new-password', minlength: 10, dir: 'ltr' });
  modal({ title: 'הפרופיל שלי', body: h('div.stack',
    h('p.muted', `${store.profile?.email} · ${ROLE[store.role]} · ${store.org.name}`),
    h('div.field', h('label.field__label', { for: 'um-n' }, 'שם מלא'), name),
    h('div.field', h('label.field__label', { for: 'um-p' }, 'טלפון'), phone),
    h('div.field', h('label.field__label', { for: 'um-pw' }, 'סיסמה חדשה (לפחות 10 תווים, אופציונלי)'), pw)),
    actions: [
      { label: 'יציאה מהמערכת', kind: 'ghost', onClick: () => auth.signOut() },
      { label: 'שמירה', kind: 'primary', onClick: async () => {
        await db('profiles').eq('id', store.profile.id).update({ full_name: name.value.trim(), phone: phone.value.trim() || null });
        if (pw.value) { if (pw.value.length < 10) { pw.focus(); return false; } await auth.updatePassword(pw.value); }
        store.profile.full_name = name.value.trim(); toast('נשמר'); shell();
      } }] });
}

// ---------------------------------------------------------------- global search (Ctrl+K or /)
function openSearch() {
  const input = h('input.input.search-input', { type: 'search', placeholder: 'מק״ט, שם פריט, מספר הזמנה, ספק, אתר…', 'aria-label': 'חיפוש', autocomplete: 'off' });
  const list = h('ul.results', { role: 'listbox' });
  const m = modal({ title: 'חיפוש', body: h('div.stack', input, list) });
  let seq = 0; let active = -1;
  const run = debounce(async () => {
    const q = input.value.trim(); const my = ++seq; active = -1;
    clear(list); if (q.length < 2) return;
    const norm = (s) => String(s || '').toLowerCase();
    const out = [];
    store.ref.items.filter((i) => norm(i.name + ' ' + i.sku + ' ' + (i.barcode || '')).includes(norm(q))).slice(0, 6).forEach((i) => out.push(['פריט', i.name, i.sku, `#/items/${i.id}`]));
    store.ref.sites.filter((s) => norm(s.name + ' ' + s.code).includes(norm(q))).slice(0, 4).forEach((s) => out.push(['אתר', s.name, s.code, `#/sites/${s.id}`]));
    store.ref.suppliers.filter((s) => norm(s.name).includes(norm(q))).slice(0, 4).forEach((s) => out.push(['ספק', s.name, '', `#/suppliers/${s.id}`]));
    try {
      const [pos, reqs, invs] = await Promise.all([
        store.can('finance.view') || store.can('receipts.post') ? db('purchase_orders').select('id,number,status').eq('org_id', store.org.id).ilike('number', q).limit(5).get() : [],
        db('requests').select('id,number,reason').eq('org_id', store.org.id).search(['number', 'reason'], q).limit(5).get(),
        store.can('finance.view') ? db('invoices').select('id,invoice_no').eq('org_id', store.org.id).ilike('invoice_no', q).limit(4).get() : [],
      ]);
      pos.forEach((p) => out.push(['הזמנה', p.number, '', `#/orders/${p.id}`]));
      reqs.forEach((r) => out.push(['דרישה', r.number, r.reason || '', `#/requests/${r.id}`]));
      invs.forEach((i) => out.push(['חשבונית', i.invoice_no, '', `#/invoices/${i.id}`]));
    } catch { /* local results still help */ }
    if (my !== seq) return;
    if (!out.length) list.append(h('li.muted', 'לא נמצאו תוצאות'));
    out.forEach(([kind, title, sub, href]) => list.append(h('li', h('a.result', { href, onclick: () => m.close() }, h('span.result__kind', kind), h('span.result__title', title), sub ? h('span.result__sub', sub) : null))));
  }, 180);
  input.addEventListener('input', run);
  input.addEventListener('keydown', (e) => {
    const links = [...list.querySelectorAll('a')]; if (!links.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); active = (active + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length; links[active].focus(); }
  });
  list.addEventListener('keydown', (e) => {
    const links = [...list.querySelectorAll('a')]; const i = links.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const n = (i + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length; links[n].focus(); }
  });
  input.focus();
}
document.addEventListener('keydown', (e) => {
  if (!main) return;
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '') || document.activeElement?.isContentEditable;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
  else if (e.key === '/' && !typing && !document.querySelector('dialog[open]')) { e.preventDefault(); openSearch(); }
});

onStore(() => { /* screens read the store directly */ });
boot();
