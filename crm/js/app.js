// Bootstrap: sign-in (or trial mode), load data, shell (navigation, quick search, save status), router.

import { html, render, $, on, normalize } from './core/util.js';
import { auth, db } from './core/api.js';
import { store } from './core/store.js';
import { router } from './core/router.js';
import { contactName } from './core/model.js';
import { icon, toast, avatar, modal } from './ui/components.js';
import { openLeadForm } from './ui/forms.js';

const LOGO = html`<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--nav-active)"/><path d="M10 9v14M10 16h8M18 9v14" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="24" cy="21" r="2.2" fill="#fff"/></svg>`;
const NAV = [
  { href: 'today', label: 'היום שלי', icon: 'home', count: 'due' },
  { href: 'leads', label: 'לידים ולקוחות', icon: 'user' },
  { href: 'deals', label: 'עסקאות', icon: 'deal' },
  { href: 'tasks', label: 'משימות', icon: 'task' },
  { href: 'sources', label: 'מקורות ופרסום', icon: 'chart' },
  { href: 'settings', label: 'הגדרות', icon: 'settings' },
];
const ACTIVE = { c: 'leads', d: 'deals' };

function dueCount() {
  const eod = new Date(); eod.setHours(23, 59, 59, 999);
  return store.filter('crm_tasks', (t) => t.status === 'open' && t.due_at && new Date(t.due_at) <= eod).length;
}

function renderShell() {
  const cur = (router.current?.path || 'today').split('/')[0];
  const active = ACTIVE[cur] || cur;
  const n = dueCount();
  render($('#side'), html`
    <a class="brand" href="#/today">${LOGO}<span>HG OS</span></a>
    <nav class="nav" aria-label="ניווט ראשי">${NAV.map((it) => html`<a href="#/${it.href}" class="${active === it.href ? 'active' : ''}" ${active === it.href ? html`aria-current="page"` : ''}>${icon(it.icon)}<span>${it.label}</span>${it.count && n ? html`<span class="nav-count" aria-label="${n} משימות להיום">${n}</span>` : ''}</a>`)}</nav>
    ${store.mode === 'local' ? html`<div class="side-foot"><p class="trial-note">${icon('alert')}מצב ניסיון: הנתונים נשמרים רק בדפדפן הזה</p></div>` : ''}`);
  render($('#bottom-nav'), html`${NAV.slice(0, 5).map((it) => html`<a href="#/${it.href}" class="${active === it.href ? 'active' : ''}" ${active === it.href ? html`aria-current="page"` : ''}>${icon(it.icon)}<span>${it.label.split(' ')[0]}</span>${it.count && n ? html`<span class="nav-count">${n}</span>` : ''}</a>`)}`);
}

function saveState() {
  const s = store.status;
  const map = {
    saving: [icon('refresh'), 'שומר...', ''],
    pending: [icon('refresh'), `${store.outbox.length} שינויים ממתינים`, 'warn'],
    offline: [icon('cloudOff'), `אין חיבור${store.outbox.length ? `, ${store.outbox.length} שינויים יישלחו כשיחזור` : ''}`, 'error'],
    error: [icon('alert'), 'שגיאת שמירה', 'error'],
  };
  const [ic, text, cls] = map[s] || [icon('check'), store.mode === 'local' ? 'נשמר בדפדפן' : 'נשמר בשרת', ''];
  return html`<span class="save-state ${cls}" role="status">${ic}<span>${text}</span></span>`;
}

function renderTop() {
  render($('#top'), html`
    <div class="qsearch">
      ${icon('search')}
      <input type="search" placeholder="חיפוש ליד לפי שם או טלפון" aria-label="חיפוש ליד" data-qs autocomplete="off">
      <div class="qs-results" data-qs-res hidden></div>
    </div>
    <div class="top-spacer"></div>
    <span id="save-state">${saveState()}</span>
    <button class="btn btn-primary btn-sm" data-top="lead">${icon('plus')}<span>ליד חדש</span></button>`);
}

function wireSearch() {
  const input = $('[data-qs]'), res = $('[data-qs-res]');
  let hits = [], active = 0;
  const draw = () => {
    const q = input.value.trim();
    const n = normalize(q), dg = q.replace(/\D/g, '').replace(/^972/, '0');
    if (!q) { res.hidden = true; return; }
    hits = store.all('crm_contacts').filter((c) => normalize(contactName(c)).includes(n) || normalize(c.company_name).includes(n) || normalize(c.email).includes(n) || (dg.length >= 3 && (c.phone_norm || '').includes(dg))).slice(0, 8);
    active = 0;
    res.hidden = false;
    render(res, hits.length ? hits.map((c, i) => html`<a class="qs-item ${i === 0 ? 'active' : ''}" href="#/c/${c.id}">${avatar(contactName(c), { size: 'sm' })}<span><b>${contactName(c)}</b><small class="muted">${[c.company_name, c.phone].filter(Boolean).join(' | ')}</small></span></a>`)
      : html`<div class="qs-empty">לא נמצא ליד. <button class="linkbtn" data-qs-new>יצירת ליד חדש</button></div>`);
  };
  input.addEventListener('input', draw);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      active = Math.max(0, Math.min(hits.length - 1, active + (e.key === 'ArrowDown' ? 1 : -1)));
      res.querySelectorAll('.qs-item').forEach((x, i) => x.classList.toggle('active', i === active));
      e.preventDefault();
    }
    if (e.key === 'Enter' && hits[active]) { location.hash = `#/c/${hits[active].id}`; input.value = ''; res.hidden = true; input.blur(); }
    if (e.key === 'Escape') { input.value = ''; res.hidden = true; }
  });
  res.addEventListener('click', (e) => {
    if (e.target.closest('[data-qs-new]')) { const q = input.value.trim(); openLeadForm({ contact: null }); setTimeout(() => { const f = document.querySelector('.ov form'); if (f && /\d{3}/.test(q)) f.phone.value = q; else if (f) f.first_name.value = q; }, 50); }
    input.value = ''; res.hidden = true;
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.qsearch')) res.hidden = true; });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.target.closest('input,textarea,select') && !document.querySelector('.ov')) { e.preventDefault(); input.focus(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.focus(); }
  });
}

// ---------------------------------------------------------------- sign-in screen
function loginScreen(message = '') {
  document.body.classList.add('bare');
  let mode = 'in';
  const draw = (msg = message, kind = 'error') => render($('#view'), html`
    <div class="auth">
      <div class="auth-card">
        <div class="auth-brand">${LOGO}<b>HG OS</b></div>
        <h1>${mode === 'in' ? 'כניסה' : mode === 'up' ? 'יצירת חשבון' : 'איפוס סיסמה'}</h1>
        ${msg ? html`<p class="notice ${kind === 'error' ? 'notice-warn' : ''}" role="alert">${msg}</p>` : ''}
        <form class="form-grid" data-auth novalidate>
          <div class="field"><label class="field-label" for="au-email">אימייל</label><input class="input" id="au-email" name="email" type="email" dir="ltr" autocomplete="email" required autofocus></div>
          ${mode !== 'reset' ? html`<div class="field"><label class="field-label" for="au-pass">סיסמה</label><input class="input" id="au-pass" name="password" type="password" dir="ltr" autocomplete="${mode === 'up' ? 'new-password' : 'current-password'}" minlength="8" required>${mode === 'up' ? html`<p class="field-help">לפחות 8 תווים.</p>` : ''}</div>` : ''}
          <button class="btn btn-primary btn-lg btn-block" type="submit">${mode === 'in' ? 'כניסה' : mode === 'up' ? 'יצירת חשבון' : 'שליחת קישור לאיפוס'}</button>
        </form>
        <div class="auth-links">
          ${mode !== 'in' ? html`<button class="linkbtn" data-mode="in">יש לי חשבון</button>` : html`<button class="linkbtn" data-mode="up">אין לי חשבון</button><button class="linkbtn" data-mode="reset">שכחתי סיסמה</button>`}
        </div>
        <div class="auth-trial"><button class="btn btn-ghost btn-block" data-trial>${icon('play')}לנסות בלי חשבון (מצב ניסיון, נתונים רק בדפדפן)</button></div>
      </div>
    </div>`);
  draw();
  on($('#view'), 'click', '[data-mode]', (e, b) => { mode = b.dataset.mode; draw(''); });
  on($('#view'), 'click', '[data-trial]', () => { localStorage.setItem('hgos-mode', 'local'); location.reload(); });
  on($('#view'), 'submit', '[data-auth]', async (e, f) => {
    e.preventDefault();
    const email = f.email.value.trim().toLowerCase();
    const password = f.password?.value || '';
    const btn = f.querySelector('button[type=submit]');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { draw('כתובת האימייל לא תקינה'); return; }
    if (mode !== 'reset' && password.length < 8) { draw('הסיסמה צריכה לפחות 8 תווים'); return; }
    btn.disabled = true;
    try {
      if (mode === 'in') { await auth.signIn(email, password); location.reload(); return; }
      if (mode === 'up') {
        const r = await auth.signUp(email, password);
        if (r.access_token) { location.reload(); return; }
        mode = 'in'; draw('נשלח אליך מייל לאישור החשבון. אחרי האישור חזרו לכאן והיכנסו.', 'ok'); return;
      }
      await auth.resetPassword(email);
      mode = 'in'; draw('אם הכתובת רשומה, נשלח אליה קישור לאיפוס הסיסמה.', 'ok');
    } catch (err) {
      const m = /invalid login|invalid_credentials/i.test(err.message) ? 'האימייל או הסיסמה שגויים'
        : /not confirmed/i.test(err.message) ? 'החשבון עוד לא אושר. בדקו את המייל ולחצו על קישור האישור.'
        : /already registered|exists/i.test(err.message) ? 'כבר קיים חשבון עם האימייל הזה. היכנסו או אפסו סיסמה.'
        : err.message;
      draw(m);
    } finally { btn.disabled = false; }
  });
}

// ---------------------------------------------------------------- start
async function main() {
  const redirectType = auth.consumeRedirect();
  const local = localStorage.getItem('hgos-mode') === 'local';
  if (local) {
    const fresh = store.initLocal();
    if (fresh || !store.all('crm_stages').length) {
      const seed = await import('./core/local-seed.js');
      seed.installDefaults(store);
      const choice = await new Promise((res) => modal({
        title: 'מצב ניסיון', size: 'sm', dismissible: false,
        body: html`<p>במצב ניסיון הכול נשמר רק בדפדפן הזה. לעבודה אמיתית עם לקוחות צריך להתחבר לחשבון.</p><p>לטעון נתוני דוגמה כדי לראות איך הדוחות נראים? (כל רשומה מסומנת "דוגמה")</p>`,
        actions: [{ label: 'להתחיל ריק', value: 'empty' }, { label: 'לטעון נתוני דוגמה', kind: 'primary', value: 'sample' }],
        onClose: res,
      }));
      if (choice === 'sample') seed.seedSample(store);
    }
  } else {
    if (!auth.signedIn) { loginScreen(); return; }
    try {
      const user = await auth.loadUser();
      const ws = await db.rpc('crm_bootstrap', { p_name: 'HG' });
      await store.initRemote({ workspaceId: ws, userId: user.id });
    } catch (e) {
      if (e.network) { render($('#view'), html`<div class="empty"><h3>אין חיבור לשרת</h3><p>בדקו את החיבור לאינטרנט ונסו שוב.</p><a class="btn btn-primary" href="">ניסיון חוזר</a></div>`); return; }
      if (/not_allowed/.test(e.message)) { await auth.signOut(); loginScreen('החשבון הזה לא מורשה להשתמש במערכת. פנו למנהל המערכת.'); return; }
      await auth.signOut();
      loginScreen(`ההתחברות נכשלה: ${e.message}`);
      return;
    }
  }
  document.body.classList.remove('bare');
  if (redirectType === 'recovery') toast('נכנסתם דרך קישור איפוס. קבעו סיסמה חדשה בהגדרות.', { timeout: 10000 });
  renderTop();
  renderShell();
  wireSearch();
  router.onRoute = () => renderShell();
  on($('#top'), 'click', '[data-top]', (e, b) => { if (b.dataset.top === 'lead') openLeadForm({ onSaved: (c) => { location.hash = `#/c/${c.id}`; } }); });
  store.on('status', () => { const el = $('#save-state'); if (el) render(el, saveState()); });
  store.on('error', (e) => toast(e.message || 'השרת דחה שינוי. הנתונים רועננו.', { kind: 'error', timeout: 9000 }));
  let t;
  store.on('change', () => { clearTimeout(t); t = setTimeout(renderShell, 80); });
  addEventListener('hgos:signed-out', () => { if (store.mode === 'remote') { toast('החיבור פג. מתחברים מחדש...', { kind: 'error' }); setTimeout(() => location.reload(), 1500); } });
  addEventListener('beforeunload', (e) => { if (store.outbox.length && store.mode === 'remote') { e.preventDefault(); e.returnValue = ''; } });
  if (!location.hash || location.hash === '#/') history.replaceState(null, '', '#/today');
  await router.go();
}

main().catch((e) => {
  console.error(e);
  render($('#view'), html`<div class="empty"><h3>המערכת לא נטענה</h3><p>${e.message || String(e)}</p><a class="btn" href="">טעינה מחדש</a></div>`);
});

