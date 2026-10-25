// Bootstrap: storage, shell (sidebar + top bar), shortcuts, notifications, onboarding, background engines.

import { html, render, $, $$, on, fmt, startOfDay, endOfDay } from './core/util.js';
import { store } from './core/store.js';
import { router, navigate } from './core/router.js';
import { startScheduler } from './core/scheduler.js';
import { modal, menu, toast, icon, avatar, confirmDialog } from './ui/components.js';
import { openPalette } from './ui/palette.js';
import { openCreate } from './ui/recordForm.js';

export const LOGO = html`<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--nav-active)"/><path d="M14.5 10.6a6 6 0 1 0 0 10.8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><path d="M17.5 21.4a6 6 0 1 0 0-10.8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>`;

const NAV = [
  { items: [{ href: 'dashboard', label: 'לוח בקרה', icon: 'dashboard' }] },
  { title: 'קשרי לקוחות', items: [
    { href: 'contacts', label: 'אנשי קשר', icon: 'user' },
    { href: 'companies', label: 'חברות', icon: 'building' },
    { href: 'deals', label: 'עסקאות', icon: 'deal' },
    { href: 'tickets', label: 'פניות שירות', icon: 'ticket', count: 'openTickets' },
  ] },
  { title: 'עבודה יומית', items: [
    { href: 'tasks', label: 'משימות', icon: 'task', count: 'dueTasks' },
    { href: 'calendar', label: 'יומן', icon: 'calendar' },
  ] },
  { title: 'שיווק ואוטומציה', items: [
    { href: 'workflows', label: 'תהליכים אוטומטיים', icon: 'workflow' },
    { href: 'sequences', label: 'רצפי מיילים', icon: 'sequence' },
    { href: 'templates', label: 'תבניות מייל', icon: 'template' },
    { href: 'forms', label: 'טפסים', icon: 'form' },
  ] },
  { title: 'מכירות ומסחר', items: [
    { href: 'products', label: 'מוצרים', icon: 'box' },
    { href: 'quotes', label: 'הצעות מחיר', icon: 'quote' },
  ] },
  { title: 'ניתוח', items: [{ href: 'reports', label: 'דוחות', icon: 'report' }] },
];

function counts() {
  const me = store.settings.currentUserId;
  const end = endOfDay();
  return {
    dueTasks: store.filter('tasks', (t) => t.status !== 'done' && t.ownerId === me && t.dueAt && new Date(t.dueAt) <= end).length,
    openTickets: store.filter('tickets', (t) => !t.closedAt).length,
  };
}

function renderSide() {
  const c = counts();
  const cur = router.current?.path?.split('/')[0] || 'dashboard';
  const curType = router.current?.params?.type;
  const routeOfType = { contact: 'contacts', company: 'companies', deal: 'deals', ticket: 'tickets' };
  const activeHref = cur === 'r' ? routeOfType[curType] : cur;
  render($('#side'), html`
    <a class="brand" href="#/dashboard">${LOGO}<span>קשר</span><small>CRM</small></a>
    <nav class="nav">
      ${NAV.map((g) => html`<div class="nav-group">${g.title ? html`<h4>${g.title}</h4>` : ''}
        ${g.items.map((it) => html`<a href="#/${it.href}" class="${activeHref === it.href ? 'active' : ''}" ${activeHref === it.href ? html`aria-current="page"` : ''}>${icon(it.icon)}<span>${it.label}</span>${it.count && c[it.count] ? html`<span class="nav-count">${c[it.count]}</span>` : ''}</a>`)}
      </div>`)}
    </nav>
    <div class="side-foot">
      <a href="#/import" class="${activeHref === 'import' ? 'active' : ''}">${icon('upload')}<span>ייבוא נתונים</span></a>
      <a href="#/settings" class="${activeHref === 'settings' ? 'active' : ''}">${icon('settings')}<span>הגדרות</span></a>
    </div>`);
}

function saveStateHtml() {
  const s = store.status;
  if (store.backend === 'memory') return html`<span class="save-state error" title="הדפדפן חוסם שמירה מקומית. הנתונים יימחקו בסגירת הלשונית.">${icon('cloudOff')}<span>לא נשמר</span></span>`;
  if (s === 'error') return html`<span class="save-state error" title="השמירה נכשלה, מנסה שוב">${icon('alert')}<span>שגיאת שמירה</span></span>`;
  if (s === 'saving') return html`<span class="save-state" title="שומר...">${icon('refresh')}<span>שומר...</span></span>`;
  return html`<span class="save-state" title="כל השינויים נשמרו בדפדפן הזה">${icon('check')}<span>נשמר</span></span>`;
}

function renderTop() {
  const me = store.get('users', store.settings.currentUserId);
  const unread = store.filter('notifications', (n) => n.userId === store.settings.currentUserId && !n.read).length;
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  render($('#top'), html`
    <button class="btn-icon menu-btn" data-top="nav" aria-label="תפריט">${icon('menu')}</button>
    <button class="search-trigger" data-top="search">${icon('search')}<span>חיפוש</span><kbd>${mac ? '⌘K' : 'Ctrl K'}</kbd></button>
    <div class="top-spacer"></div>
    <span id="save-state">${saveStateHtml()}</span>
    <button class="btn btn-primary btn-sm" data-top="create" aria-haspopup="menu">${icon('plus')}<span>יצירה</span></button>
    <button class="btn-icon bell" data-top="notif" aria-label="התראות${unread ? ` (${unread} חדשות)` : ''}">${icon('bell')}${unread ? html`<span class="bell-dot">${unread > 9 ? '9+' : unread}</span>` : ''}</button>
    <button class="btn-icon" data-top="theme" aria-label="מצב תצוגה">${icon(isDark() ? 'sun' : 'moon')}</button>
    <button class="me-btn" data-top="me" aria-haspopup="menu" aria-label="החשבון שלי">${avatar(me?.name || '?', { size: 'sm' })}<span class="me-name">${me?.name || ''}</span></button>`);
}

const isDark = () => document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
function setTheme(t) {
  if (t === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  try { localStorage.setItem('kesher-theme', t); } catch { /* ignore */ }
  store.saveSettings({ theme: t });
  renderTop();
}

export function createMenu(anchor) {
  menu(anchor, [
    { label: 'איש קשר', icon: 'user', hint: 'C', onClick: () => openCreate('contact') },
    { label: 'חברה', icon: 'building', hint: 'O', onClick: () => openCreate('company') },
    { label: 'עסקה', icon: 'deal', hint: 'D', onClick: () => openCreate('deal') },
    { label: 'פנייה', icon: 'ticket', hint: 'T', onClick: () => openCreate('ticket') },
    { divider: true },
    { label: 'משימה', icon: 'task', hint: 'K', onClick: () => import('./views/tasks.js').then((m) => m.openTaskForm?.()) },
    { label: 'הצעת מחיר', icon: 'quote', onClick: () => navigate('quotes?new=1') },
  ]);
}

function openNotifications() {
  const me = store.settings.currentUserId;
  const list = store.filter('notifications', (n) => n.userId === me).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 50);
  const m = modal({
    title: 'התראות', kind: 'drawer', size: 'sm',
    body: list.length ? html`<div class="notif-list">${list.map((n) => html`<a class="notif ${n.read ? '' : 'unread'}" href="${n.link || '#/dashboard'}" data-close><div class="grow"><div>${n.text}</div><small class="muted">${fmt.relative(n.createdAt)}</small></div></a>`)}</div>`
      : html`<div class="empty"><div class="empty-ic">${icon('bell')}</div><h3>אין התראות</h3><p>כאן יופיעו משימות שהוקצו לך, לידים חדשים מטפסים והתראות מתהליכים אוטומטיים.</p></div>`,
    actions: list.some((n) => !n.read) ? [{ label: 'סימון הכול כנקרא', onClick: () => { for (const n of list) if (!n.read) store.update('notifications', n.id, { read: true }, { silent: true }); renderTop(); } }] : [],
  });
  m.body.addEventListener('click', (e) => { if (e.target.closest('.notif')) { for (const n of list) if (!n.read) store.update('notifications', n.id, { read: true }, { silent: true }); setTimeout(renderTop); } });
}

function meMenu(anchor) {
  const users = store.all('users').filter((u) => u.active !== false);
  menu(anchor, [
    { header: 'מחובר כ' },
    ...users.map((u) => ({ label: u.name, checked: u.id === store.settings.currentUserId, onClick: () => { store.saveSettings({ currentUserId: u.id }); renderTop(); renderSide(); router.go(); toast(`עובדים עכשיו בתור ${u.name}`); } })),
    { divider: true },
    { label: 'מצב בהיר', icon: 'sun', onClick: () => setTheme('light') },
    { label: 'מצב כהה', icon: 'moon', onClick: () => setTheme('dark') },
    { label: 'לפי המערכת', icon: 'settings', onClick: () => setTheme('system') },
    { divider: true },
    { label: 'קיצורי מקלדת', icon: 'keyboard', hint: '?', onClick: showShortcuts },
    { label: 'הורדת גיבוי מלא', icon: 'download', onClick: () => import('./views/settings.js').then((m) => m.downloadBackup?.()) },
    { label: 'הגדרות', icon: 'settings', onClick: () => navigate('settings') },
  ]);
}

function showShortcuts() {
  const rows = [
    ['Ctrl/⌘ + K', 'חיפוש ופעולות'], ['/', 'חיפוש'], ['N', 'יצירה'], ['C', 'איש קשר חדש'], ['O', 'חברה חדשה'], ['D', 'עסקה חדשה'], ['T', 'פנייה חדשה'], ['K', 'משימה חדשה'],
    ['G ואז D', 'לוח בקרה'], ['G ואז C', 'אנשי קשר'], ['G ואז O', 'חברות'], ['G ואז S', 'עסקאות'], ['G ואז T', 'פניות'], ['G ואז K', 'משימות'], ['G ואז R', 'דוחות'], ['?', 'החלון הזה'],
  ];
  modal({ title: 'קיצורי מקלדת', size: 'sm', body: html`<table class="table"><tbody>${rows.map(([k, l]) => html`<tr style="cursor:default"><td>${l}</td><td style="text-align:end">${k.split(' ').map((p) => (['ואז', '+'].includes(p) ? html` <span class="muted small">${p}</span> ` : html`<kbd>${p}</kbd>`))}</td></tr>`)}</tbody></table>` });
}

function wireShortcuts() {
  let gPending = 0;
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
    const t = e.target;
    if (t.closest('input, textarea, select, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.querySelector('.ov')) return;
    const k = e.key.toLowerCase();
    // Hebrew keyboard layout maps the same physical keys
    const map = { 'ע': 'g', 'מ': 'n', 'ב': 'c', 'ם': 'o', 'ג': 'd', 'א': 't', 'ל': 'k', 'ר': 'r', 'ד': 's' };
    const key = map[k] || k;
    if (Date.now() - gPending < 1200) {
      gPending = 0;
      const dest = { d: 'dashboard', c: 'contacts', o: 'companies', s: 'deals', t: 'tickets', k: 'tasks', r: 'reports', a: 'calendar' }[key];
      if (dest) { navigate(dest); e.preventDefault(); }
      return;
    }
    if (key === 'g') { gPending = Date.now(); return; }
    if (key === '/') { e.preventDefault(); openPalette(); }
    else if (key === '?') showShortcuts();
    else if (key === 'n') createMenu($('[data-top="create"]'));
    else if (key === 'c') openCreate('contact');
    else if (key === 'o') openCreate('company');
    else if (key === 'd') openCreate('deal');
    else if (key === 't') openCreate('ticket');
    else if (key === 'k') import('./views/tasks.js').then((m) => m.openTaskForm?.());
  });
}

async function onboarding() {
  return new Promise((resolve) => {
    const m = modal({
      title: 'ברוכים הבאים לקשר', size: 'md', dismissible: false,
      body: html`<div class="onb">
        <p>קשר היא מערכת לניהול לקוחות: אנשי קשר, חברות, עסקאות, פניות שירות, משימות, אוטומציות ודוחות. הנתונים נשמרים בדפדפן הזה, ואפשר לגבות אותם ולייבא אותם בכל רגע.</p>
        <label class="field"><span class="field-label">איך לקרוא לך?</span><input class="input" name="name" placeholder="השם שלך" autofocus autocomplete="name"></label>
        <label class="field"><span class="field-label">שם העסק</span><input class="input" name="biz" placeholder="שם העסק" autocomplete="organization"></label>
        <button class="onb-choice" data-mode="demo">${icon('sparkles')}<div><b>להתחיל עם נתוני הדגמה</b><span>כ-150 אנשי קשר, חברות, עסקאות, פניות ופעילות של שנה – כדי לראות איך הכול עובד. אפשר למחוק אותם בהגדרות.</span></div></button>
        <button class="onb-choice" data-mode="empty">${icon('plus')}<div><b>להתחיל מאפס</b><span>מערכת נקייה. אפשר להוסיף רשומות ידנית או לייבא מקובץ אקסל / CSV.</span></div></button>
        <button class="onb-choice" data-mode="restore">${icon('upload')}<div><b>לשחזר מגיבוי</b><span>קובץ JSON שהורד מקשר.</span></div></button>
        <input type="file" accept="application/json,.json" hidden data-file>
      </div>`,
    });
    m.body.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-mode]');
      if (!b) return;
      const name = $('[name=name]', m.body).value.trim() || 'אני';
      const biz = $('[name=biz]', m.body).value.trim();
      if (b.dataset.mode === 'restore') { $('[data-file]', m.body).click(); return; }
      b.disabled = true;
      if (b.dataset.mode === 'demo') {
        const { seedDemo } = await import('./core/seed.js');
        seedDemo({ myName: name });
      } else {
        const u = store.insert('users', { name, email: '', role: 'admin', active: true, color: 210 });
        store.saveSettings({ currentUserId: u.id });
        const { installDefaults } = await import('./core/seed.js');
        installDefaults();
      }
      store.saveSettings({ onboarded: true, company: { ...store.settings.company, name: biz || store.settings.company.name } });
      await store.flush();
      m.close();
      resolve();
    });
    $('[data-file]', m.body).addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const text = await f.text();
        await store.replaceAll(JSON.parse(text));
        store.saveSettings({ onboarded: true });
        m.close();
        resolve();
      } catch (err) { toast(`השחזור נכשל: ${err.message}`, { kind: 'error' }); }
    });
  });
}

async function main() {
  const { fresh } = await store.init();
  if (store.settings.theme && store.settings.theme !== 'system') document.documentElement.dataset.theme = store.settings.theme;
  if (fresh || !store.get('users', store.settings.currentUserId)) {
    if (!store.all('users').length) await onboarding();
    else store.saveSettings({ currentUserId: store.all('users')[0].id, onboarded: true });
  }
  renderTop();
  renderSide();
  router.onRoute = () => { renderSide(); $('#app').classList.remove('nav-open'); closeMenuSafe(); };

  on($('#top'), 'click', '[data-top]', (e, el) => {
    const a = el.dataset.top;
    if (a === 'search') openPalette();
    else if (a === 'create') createMenu(el);
    else if (a === 'notif') openNotifications();
    else if (a === 'theme') setTheme(isDark() ? 'light' : 'dark');
    else if (a === 'me') meMenu(el);
    else if (a === 'nav') $('#app').classList.toggle('nav-open');
  });
  $('#app').addEventListener('click', (e) => { if (e.target === $('#app') && $('#app').classList.contains('nav-open')) $('#app').classList.remove('nav-open'); });
  document.addEventListener('click', (e) => {
    if ($('#app').classList.contains('nav-open') && !e.target.closest('.side') && !e.target.closest('.menu-btn')) $('#app').classList.remove('nav-open');
  });
  store.on('status', () => { const el = $('#save-state'); if (el) render(el, saveStateHtml()); });
  let errShown = false;
  store.on('error', (err) => {
    if (errShown) return;
    errShown = true;
    const quota = /quota/i.test(String(err?.name || err?.message));
    toast(quota ? 'נגמר מקום האחסון בדפדפן. מומלץ להוריד גיבוי ולפנות סל מחזור.' : 'השמירה נכשלה. המערכת תנסה שוב אוטומטית.', { kind: 'error', timeout: 9000 });
    setTimeout(() => { errShown = false; }, 30000);
  });
  const refreshChrome = debounceFrame(() => { renderSide(); renderTop(); });
  store.on('change', (ev) => { if (['tasks', 'tickets', 'notifications', 'users'].includes(ev.coll)) refreshChrome(); });
  store.on('remote', (ev) => { refreshChrome(); router.current && ev.colls.length && softRefresh(); });
  store.on('settings', refreshChrome);
  wireShortcuts();
  if (store.backend !== 'indexeddb') {
    toast(store.backend === 'memory' ? 'הדפדפן לא מאפשר שמירה מקומית (אולי גלישה בסתר). שינויים לא יישמרו.' : 'שמירה במצב מוגבל (localStorage). מומלץ להוריד גיבוי באופן קבוע.', { kind: 'error', timeout: 10000 });
  }
  await router.go();

  // Background engines (automation, sequences, reminders). Each is optional and isolated.
  for (const path of ['./engines/workflows.js', './engines/sequences.js', './engines/reminders.js']) {
    import(path).then((m) => m.init?.()).catch((e) => console.warn(`[engine] ${path} not loaded`, e));
  }
  startScheduler();
  store.autoBackup().catch((e) => console.warn('[backup]', e));
}

// Another tab changed data: re-render the current view, but never while the user is typing in it.
const softRefresh = debounceFrame(() => {
  const active = document.activeElement;
  if (active && active.closest('#view') && active.matches('input, textarea, select')) return;
  if (document.querySelector('.ov')) return;
  router.go();
}, 400);

function debounceFrame(fn, ms = 60) {
  let t;
  return () => { clearTimeout(t); t = setTimeout(fn, ms); };
}
function closeMenuSafe() { document.querySelector('.menu')?.remove(); }

main().catch((e) => {
  console.error(e);
  document.getElementById('view').innerHTML = `<div class="empty"><h3>המערכת לא נטענה</h3><p>${String(e.message || e)}</p><button class="btn" onclick="location.reload()">טעינה מחדש</button></div>`;
});
