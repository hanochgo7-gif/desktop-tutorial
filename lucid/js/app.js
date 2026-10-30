// Boot: open the local store, load the curriculum, apply settings, draw the shell, start routing
// and (when an account is connected) sync.
import { openStore, store } from './core/store.js';
import { router, navigate } from './core/router.js';
import { html, render } from './core/util.js';
import { t, tOther, setUiLang, uiLang, tt } from './core/i18n.js';
import { profile, settings, initModel, applySupport, sessionTick, hasProfile } from './core/learner.js';
import { icon, toast, brandMark } from './ui/components.js';
import { auth, db, configured } from './core/api.js';
import { createSync } from './core/sync.js';
import { startSession, syncAllowed } from './core/session.js';

const NAV = [
  ['today', 'nav.today', 'today'],
  ['path', 'nav.path', 'path'],
  ['practice', 'nav.practice', 'practice'],
  ['real-life', 'nav.reallife', 'reallife'],
  ['progress', 'nav.progress', 'progress'],
];
const MORE = [
  ['vocab', 'nav.vocab', 'vocab'],
  ['grammar', 'nav.grammar', 'grammar'],
  ['reading', 'nav.reading', 'reading'],
  ['listening', 'nav.listening', 'listening'],
  ['speaking', 'nav.speaking', 'speaking'],
  ['writing', 'nav.writing', 'writing'],
  ['tutor', 'nav.tutor', 'tutor'],
];

export let sync = null;

function applyTheme() {
  const ts = settings().text_size;
  if (ts && ts !== 100) document.documentElement.dataset.text = String(ts); else delete document.documentElement.dataset.text;
  const th = settings().theme;
  if (th === 'light' || th === 'dark') document.documentElement.dataset.theme = th;
  else delete document.documentElement.dataset.theme;
}

function navLegend(key) {
  const other = tOther(key);
  const otherLang = uiLang() === 'he' ? 'en' : 'he';
  return html`<span class="nav-legend"><span class="l1">${t(key)}</span><span class="l2" lang="${otherLang}" dir="${otherLang === 'he' ? 'rtl' : 'ltr'}">${other}</span></span>`;
}

function drawShell(route) {
  const active = route?.extra?.nav || route?.path?.split('/')[0];
  const bare = route?.extra?.bare;
  document.body.classList.toggle('bare', Boolean(bare));
  const deck = document.getElementById('deck');
  const tabbar = document.getElementById('tabbar');
  const top = document.getElementById('top');
  deck.hidden = Boolean(bare);
  tabbar.hidden = Boolean(bare);
  top.hidden = Boolean(bare);
  if (bare) return;
  const p = profile();
  render(deck, html`
    <a class="brand" href="#/today">${brandMark()}<span>Lucid</span></a>
    <nav aria-label="${tt('ניווט ראשי', 'Main')}">
      ${NAV.map(([href, key, ic]) => html`<a class="nav" href="#/${href}" ${active === ic || active === href ? html`aria-current="page"` : ''}>${icon(ic)}${navLegend(key)}</a>`)}
      <div class="group-label">${tt('מעבדות', 'Labs')}</div>
      ${MORE.map(([href, key, ic]) => html`<a class="nav" href="#/${href}" ${route?.path === href ? html`aria-current="page"` : ''}>${icon(ic)}${navLegend(key)}</a>`)}
    </nav>
    <div class="foot">
      <a class="nav" href="#/help" ${active === 'help' ? html`aria-current="page"` : ''}>${icon('info')}${navLegend('nav.help')}</a>
      <a class="nav" href="#/settings" ${active === 'settings' ? html`aria-current="page"` : ''}>${icon('settings')}${navLegend('nav.settings')}</a>
      <span id="sync-status" class="xsmall">${syncLabel()}</span>
      ${p?.name ? html`<span>${p.name}</span>` : ''}
    </div>`);
  render(tabbar, NAV.map(([href, key, ic]) => html`<a href="#/${href}" ${active === ic || active === href ? html`aria-current="page"` : ''}>${icon(ic, { size: 22 })}<span>${t(key)}</span></a>`));
  render(top, html`<a class="brand" href="#/today">${brandMark()}<span class="sr-only">Lucid</span></a><span class="title grow" id="top-title"></span><a class="key ghost small icon-only" href="#/help" aria-label="${t('nav.help')}">${icon('info')}</a><a class="key ghost small icon-only" href="#/settings" aria-label="${t('nav.settings')}">${icon('settings')}</a>`);
}


function syncLabel() {
  if (!configured() || !auth.signedIn) return t('device.only');
  const s = sync?.status();
  if (s?.offline) return t('offline');
  if (s?.pending) return t('sync.pending');
  return t('synced');
}

async function boot() {
  const s = await openStore();
  await initModel();
  setUiLang(profile()?.ui_language || (navigator.language?.startsWith('he') ? 'he' : 'he'));
  applyTheme();
  applySupport();
  document.title = 'Lucid';

  if (configured()) {
    // Sync runs only once session.js has confirmed the device data and the server profile belong to this account.
    sync = createSync({ store: s, api: db, cursorKey: () => `lucid-sync-cursor:${auth.user?.id || 'anon'}`, guard: syncAllowed });
    sync.onStatus(() => { const el = document.getElementById('sync-status'); if (el) el.textContent = syncLabel(); });
    await startSession(sync); // email links (adopted only if requested on this device), returning sessions
    setInterval(() => { if (auth.signedIn && document.visibilityState === 'visible') sync.run().catch(() => {}); }, 60_000);
  }

  store.on('change', (e) => {
    if (e.colls.includes('settings') || e.colls.includes('profile')) {
      setUiLang(profile()?.ui_language || 'he');
      applyTheme();
      applySupport();
      drawShell(router.current);
    }
  });
  router.onRoute = drawShell;
  // "עב" buttons reveal the Hebrew next to English content when Hebrew support is off (one listener for all views).
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-reveal-he]');
    const he = b?.nextElementSibling;
    if (he) { he.hidden = !he.hidden; b.setAttribute('aria-expanded', String(!he.hidden)); }
  });
  document.addEventListener('visibilitychange', () => {
    sessionTick();
    if (document.visibilityState === 'hidden') { store.flush(); if (auth.signedIn) sync?.run().catch(() => {}); }
  });
  sessionTick();
  await router.start();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  window.lucid = { store, navigate, hasProfile };
}

boot().catch((e) => {
  console.error(e);
  document.getElementById('view').innerHTML = '<div class="empty"><h3>Lucid could not start</h3><p>Please reload the page.</p></div>';
});
