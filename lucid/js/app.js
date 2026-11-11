// Boot: open the local store, load the curriculum, apply settings, draw the shell, start routing
// and (when an account is connected) sync.
import { openStore, store } from './core/store.js';
import { router, navigate, topTitle, sectionOf, primeRoute, watchRelease, checkForRelease, releaseOnHide } from './core/router.js';
import * as util from './core/util.js';
import { t, tOther, setUiLang, uiLang, tt, hebrewSupport } from './core/i18n.js';
import { profile, settings, initModel, applySupport, sessionTick, hasProfile } from './core/learner.js';
import { icon, toast, clearToasts, brandMark, segColumns } from './ui/components.js';
import { auth, db, configured } from './core/api.js';
import { createSync } from './core/sync.js';
import { startSession, syncAllowed } from './core/session.js';
import { isOldCopy } from './core/home.js';

const MOVED = isOldCopy(globalThis.location?.origin || '');

const NAV = [
  ['today', 'nav.today', 'today'],
  ['path', 'nav.path', 'path'],
  ['practice', 'nav.practice', 'practice'],
  ['real-life', 'nav.reallife', 'reallife'],
  ['progress', 'nav.progress', 'progress'],
];
const MORE = [
  ['vocab', 'nav.vocab', 'vocab'],
  ['games', 'nav.games', 'sparkle'],
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

// The rail's second line: English under Hebrew in the Hebrew UI; in the English UI a Hebrew line only while the
// learner's Hebrew support is full or partial (SC-12).
function navLegend(key) {
  const other = tOther(key);
  const otherLang = uiLang() === 'he' ? 'en' : 'he';
  const show = otherLang === 'en' || ['full', 'partial'].includes(hebrewSupport());
  return html`<span class="nav-legend"><span class="l1">${t(key)}</span>${show ? html`<span class="l2" lang="${otherLang}" dir="${otherLang === 'he' ? 'rtl' : 'ltr'}">${other}</span>` : ''}</span>`;
}

// A lab route (writing, writing/:id, vocab...) highlights its own entry on the desktop rail, not Practice as
// well; the phone tab bar, which has no lab entries, keeps Practice (persona panel R2-43).
const labOf = (route) => MORE.find(([href]) => route?.path === href || route?.path?.startsWith(`${href}/`))?.[0] || null;

// "Offline" in the top bar on phones and in the rail on desktop, whatever the account state (persona panel M1).
const netBadge = () => (navigator.onLine === false ? html`<span class="net-badge" role="status" title="${t('offline')}">${icon('cloud-off', { size: 14 })}${tt('אין חיבור', 'Offline')}</span>` : '');

const { html, render } = util;

function drawShell(route) {
  document.documentElement.classList.remove('booting'); // the boot frame goes, the main column shows (B4, B5)
  const active = route?.extra?.nav || route?.path?.split('/')[0];
  const lab = labOf(route);
  const bare = route?.extra?.bare;
  document.body.classList.toggle('bare', Boolean(bare));
  const deck = document.getElementById('deck');
  const tabbar = document.getElementById('tabbar');
  const top = document.getElementById('top');
  deck.hidden = Boolean(bare);
  tabbar.hidden = Boolean(bare);
  top.hidden = Boolean(bare);
  clearToasts(); // a new screen ends the last one's notes (SB-9)
  // The skip link speaks the interface language, with its lang and dir (SB-11).
  const skip = document.querySelector('a.skip');
  if (skip && skip.textContent !== t('skip')) { skip.textContent = t('skip'); skip.lang = uiLang(); skip.dir = uiLang() === 'he' ? 'rtl' : 'ltr'; }
  // The old copy, once Lucid has its own address (IS-02): "Lucid moved" above every hub and on Welcome, never inside
  // a lesson or another full-screen activity. Loaded only there.
  if (MOVED) {
    const show = !bare || route?.path === 'welcome';
    if (show) import('./ui/moved.js').then((m) => m.drawMoved()).catch(() => {});
    else { const box = document.getElementById('moved'); if (box) box.hidden = true; }
  }
  if (bare) return;
  const p = profile();
  render(deck, html`
    <a class="brand" href="#/today">${brandMark()}<span>Lucid</span></a>
    <nav aria-label="${tt('ניווט ראשי', 'Main')}">
      ${NAV.map(([href, key, ic]) => html`<a class="nav" href="#/${href}" ${!lab && (active === ic || active === href) ? html`aria-current="page"` : ''}>${icon(ic)}${navLegend(key)}</a>`)}
      <div class="group-label">${tt('מעבדות', 'Labs')}</div>
      ${MORE.map(([href, key, ic]) => html`<a class="nav" href="#/${href}" ${lab === href ? html`aria-current="page"` : ''}>${icon(ic)}${navLegend(key)}</a>`)}
    </nav>
    <div class="foot">
      <a class="nav" href="#/help" ${active === 'help' ? html`aria-current="page"` : ''}>${icon('info')}${navLegend('nav.help')}</a>
      <a class="nav" href="#/settings" ${active === 'settings' ? html`aria-current="page"` : ''}>${icon('settings')}${navLegend('nav.settings')}</a>
      ${netBadge()}<span id="sync-status" class="xsmall">${syncLabel()}</span>
      ${p?.name ? html`<span>${p.name}</span>` : ''}
    </div>`);
  // Tab labels stay on one line; at 130-150% text a long label gives way to its short form (SC-9).
  render(tabbar, NAV.map(([href, key, ic]) => {
    const short = SHORT_TAB[key] && t(SHORT_TAB[key]) !== t(key) ? t(SHORT_TAB[key]) : '';
    return html`<a href="#/${href}" ${short ? html`aria-label="${t(key)}"` : ''} ${active === ic || active === href ? html`aria-current="page"` : ''}>${icon(ic, { size: 22 })}<span class="tab-l${short ? ' has-short' : ''}">${t(key)}</span>${short ? html`<span class="tab-l tab-short" aria-hidden="true">${short}</span>` : ''}</a>`;
  }));
  // The top-bar keys carry their names as small labels at 130-150% text (SC-9); the title survives every redraw.
  const topKey = (href, key, ic) => html`<a class="key ghost small icon-only top-key" href="${href}" aria-label="${t(key)}">${icon(ic)}<span class="top-label" aria-hidden="true">${t(key)}</span></a>`;
  render(top, html`<a class="brand" href="#/today">${brandMark()}<span class="sr-only">Lucid</span></a><span class="title grow" id="top-title">${shownTitle(route)}</span>${netBadge()}${topKey('#/help', 'nav.help', 'info')}${topKey('#/settings', 'nav.settings', 'settings')}`);
  fitTitle();
  const nav = deck.querySelector('nav');
  nav?.addEventListener('scroll', railCue, { passive: true });
  railCue();
}
// The rail's links fade out at the bottom while more of them are below (SB-8).
function railCue() {
  const nav = document.querySelector('#deck nav');
  if (!nav) return;
  nav.classList.toggle('scrolls', nav.scrollHeight > nav.clientHeight + 1 && nav.scrollTop + nav.clientHeight < nav.scrollHeight - 1);
}
const SHORT_TAB = { 'nav.reallife': 'nav.reallife.short' };
// The top bar's title has one size per text size and window width (SB-7): the size at which the longest section
// name ("מעבדת כתיבה", "Conversations") fits, so the bar does not jump between tabs. A title longer than every
// section name steps down further, to 14px, before it is cut with an ellipsis (SC-9).
const TITLE_KEYS = ['nav.today', 'nav.path', 'nav.practice', 'nav.reallife', 'nav.progress', 'nav.vocab', 'nav.games', 'nav.grammar', 'nav.reading', 'nav.listening', 'nav.speaking', 'nav.writing', 'nav.tutor', 'nav.slang', 'nav.simulations', 'nav.profile', 'nav.settings', 'nav.help'];
let titleFit = { key: '', size: 0 };
function sectionTitleSize(el) {
  el.style.fontSize = '';
  const base = parseFloat(getComputedStyle(el).fontSize);
  const key = `${uiLang()}|${base}|${el.clientWidth}`;
  if (titleFit.key === key) return titleFit.size;
  const probe = document.createElement('span');
  probe.className = 'title';
  probe.style.cssText = 'position:absolute;visibility:hidden;width:auto;max-width:none;overflow:visible';
  probe.setAttribute('aria-hidden', 'true');
  el.parentElement.append(probe);
  let widest = 0;
  for (const k of TITLE_KEYS) { probe.textContent = t(k); widest = Math.max(widest, probe.getBoundingClientRect().width); }
  probe.remove();
  const size = widest > el.clientWidth ? Math.max(14, Math.floor((base * (el.clientWidth - 1)) / widest * 2) / 2) : base;
  titleFit = { key, size };
  return size;
}
function fitTitle() {
  const el = document.getElementById('top-title');
  if (!el || el.closest('[hidden]') || !el.getClientRects().length) return;
  let size = sectionTitleSize(el);
  el.style.fontSize = `${size}px`;
  while (el.scrollWidth > el.clientWidth + 1 && size > 14) { size -= 1; el.style.fontSize = `${size}px`; }
}
// What the top bar shows for a route: the view's title, or in the Hebrew UI its section's name when the title is
// English only.
function shownTitle(route) {
  const section = sectionOf(route, NAV, MORE);
  return topTitle(route?.title, { lang: uiLang(), section: section ? t(section[1]) : '' });
}

// On a phone the chrome never covers what the learner types (SC-5). While a text field has focus the body is
// marked "typing" (CSS hides the tab bar and lets the top bar scroll away on touch screens), and when the visible
// area shrinks (an on-screen keyboard) the field is scrolled out from under any bar that still covers it.
const TEXT_FIELD = 'textarea, [contenteditable=""], [contenteditable="true"], input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="password"], input[type="number"], input[type="tel"], input[type="url"]';
const isTextField = (el) => Boolean(el?.matches?.(TEXT_FIELD)) && !el.readOnly && !el.disabled;
// The band of the screen that no bar covers, in viewport coordinates.
function freeBand() {
  const vv = window.visualViewport;
  let top = vv ? vv.offsetTop : 0;
  let bottom = vv ? vv.offsetTop + vv.height : innerHeight;
  const covers = (el) => el && !el.hidden && getComputedStyle(el).display !== 'none' && /fixed|sticky/.test(getComputedStyle(el).position);
  const bar = document.getElementById('top');
  if (covers(bar)) top = Math.max(top, bar.getBoundingClientRect().bottom);
  for (const el of [document.getElementById('tabbar'), document.querySelector('.player-foot')]) {
    if (covers(el)) bottom = Math.min(bottom, el.getBoundingClientRect().top);
  }
  return { top, bottom };
}
function keepFieldInView(el) {
  if (!el?.getBoundingClientRect) return;
  const { top, bottom } = freeBand();
  const r = el.getBoundingClientRect();
  const pad = 8;
  if (r.height > bottom - top - 2 * pad) {
    // Taller than the free band (a long textarea): the browser keeps the caret in view; only a field that is
    // wholly out of the band is brought back, by its top.
    if (r.bottom < top + pad || r.top > bottom - pad) window.scrollBy(0, r.top - (top + pad));
  } else if (r.top < top + pad) window.scrollBy(0, r.top - (top + pad));
  else if (r.bottom > bottom - pad) window.scrollBy(0, r.bottom - (bottom - pad));
}
function watchTyping() {
  let timer = 0;
  const sync = () => {
    const el = document.activeElement;
    const on = isTextField(el);
    document.body.classList.toggle('typing', on);
    if (on) keepFieldInView(el);
  };
  document.addEventListener('focusin', () => { clearTimeout(timer); sync(); timer = setTimeout(sync, 350); });
  // The next field's focusin follows a focusout at once, so moving between fields does not flash the tab bar.
  document.addEventListener('focusout', () => { clearTimeout(timer); timer = setTimeout(sync, 0); });
  (window.visualViewport || window).addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(sync, 60); });
}

// Play buttons say what they are doing (SC-6): the button that was pressed shows a playing state from the first
// sound to the end, and when nothing plays (no English voice, or a muted device) a short note says what to check.
const PLAY_BUTTON = '[data-say], [data-say-text], [data-say-tile]';
function watchSpeech() {
  let pressed = null; // { el, at }: the last play button pressed
  let silentNoted = 0;
  const playing = new Map(); // utterance id -> its button
  const recent = () => (pressed && Date.now() - pressed.at < 4000 && pressed.el.isConnected ? pressed.el : null);
  const clear = (b) => { b?.classList.remove('is-playing'); b?.removeAttribute('aria-busy'); };
  document.addEventListener('click', (e) => { const b = e.target.closest?.(PLAY_BUTTON); if (b) pressed = { el: b, at: Date.now() }; }, true);
  document.addEventListener('lucid:speech', (e) => {
    const { state, id } = e.detail || {};
    if (state === 'start') {
      const b = recent();
      pressed = null;
      playing.forEach((x) => clear(x));
      playing.clear();
      if (b) { playing.set(id, b); b.classList.add('is-playing'); b.setAttribute('aria-busy', 'true'); }
    } else if (state === 'end' || state === 'error') {
      clear(playing.get(id));
      playing.delete(id);
    } else if (state === 'silent') {
      // Only sound the learner asked for gets the note (a few seconds apart); a game's own sound stays quiet. An item
      // that says so in place (an ancestor with data-silent-inline, EX-4) needs no note (SB-9).
      const b = recent();
      if (b && !b.closest('[data-silent-inline]') && Date.now() - silentNoted > 4000) {
        silentNoted = Date.now();
        const keys = [...(b.parentElement?.querySelectorAll(PLAY_BUTTON) || [])];
        const note = toast(tt('לא שומעים? בדקו את עוצמת הקול ומצב שקט.', 'Can\'t hear it? Check the volume and silent mode.'), { ms: 7000, avoid: keys.length ? keys : [b] });
        // The note is about this play key: it ends as soon as the key leaves the page (the next item, or the placement
        // result, which is a stage of the same screen).
        const watch = setInterval(() => { if (!note?.isConnected) clearInterval(watch); else if (!b.isConnected) { note.remove(); clearInterval(watch); } }, 300);
      }
    }
  });
}

// Segmented controls (SB-6): a control whose segments do not fit on one line becomes a grid of equal cells, with as
// many columns as its widest label allows, balanced across the rows (4 segments in 2 columns, not 3 and 1). The
// lane-owned controls (Settings, onboarding, Today's minutes) keep their own layouts. A control fits again when
// it is added, when the window changes size, and when a hidden box around it opens (the Expressions filter sheet).
const SEG_OWN = '.settings-view .seg, .ob-prefs .seg, .today-minutes > .seg';
function fitSegs() {
  for (const s of document.querySelectorAll('.seg')) {
    if (s.matches(SEG_OWN) || !s.getClientRects().length) continue;
    const keys = [...s.children].filter((b) => b.tagName === 'BUTTON');
    s.classList.remove('seg-grid', 'seg-wrap');
    if (keys.length < 2) continue;
    // Measured as a plain wrapping row of natural-width segments; the cells' width with the grid's padding.
    s.classList.add('seg-measure');
    const rows = new Set(keys.map((b) => Math.round(b.getBoundingClientRect().top))).size;
    const cs = getComputedStyle(s);
    const inner = s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const gap = parseFloat(cs.columnGap) || 0;
    s.classList.add('seg-tight');
    const widest = Math.max(...keys.map((b) => b.getBoundingClientRect().width));
    s.classList.remove('seg-measure', 'seg-tight');
    if (rows < 2) continue;
    s.style.setProperty('--seg-cols', String(segColumns(keys.length, inner, widest, gap)));
    s.classList.add('seg-grid');
    if (widest > inner + 1) s.classList.add('seg-wrap');
  }
}
let segFrame = 0;
const fitSegsSoon = () => { cancelAnimationFrame(segFrame); segFrame = requestAnimationFrame(fitSegs); };
function watchSegs() {
  const hasSeg = (n) => n.nodeType === 1 && (n.matches('.seg') || n.querySelector('.seg'));
  new MutationObserver((list) => { if (list.some((m) => (m.type === 'attributes' ? hasSeg(m.target) : [...m.addedNodes].some(hasSeg)))) fitSegsSoon(); })
    .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'open'] });
  addEventListener('resize', fitSegsSoon);
  document.fonts?.ready.then(fitSegsSoon);
}

function syncLabel() {
  if (!configured() || !auth.signedIn) return t('device.only');
  const s = sync?.status();
  if (s?.offline) return t('offline');
  if (s?.pending) return t('sync.pending');
  return t('synced');
}

// app.js runs as soon as its modules are ready (async in index.html), possibly before the page below the
// stylesheet is parsed: the store, the learner model and the first route's downloads start at once, and the shell
// waits for the document.
const domReady = () => (document.readyState === 'loading' ? new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true })) : Promise.resolve());

async function boot() {
  const s = await openStore();
  await initModel();
  setUiLang(profile()?.ui_language || (navigator.language?.startsWith('he') ? 'he' : 'he'));
  applyTheme();
  applySupport();
  document.title = 'Lucid';
  try { primeRoute(); } catch (e) { console.warn(e); }
  await domReady();

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
      fitSegsSoon();
    }
  });
  router.onRoute = drawShell;
  router.onTitle = (route) => { const el = document.getElementById('top-title'); if (el) { el.textContent = shownTitle(route); fitTitle(); } };
  let fitTimer = 0;
  addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(() => { fitTitle(); railCue(); }, 100); });
  // The title lives on the route, so a redraw for a connection change keeps it.
  addEventListener('online', () => drawShell(router.current));
  addEventListener('offline', () => drawShell(router.current));
  // "עב" buttons reveal the Hebrew next to English content when Hebrew support is off (one listener for all views).
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-reveal-he]');
    const he = b?.nextElementSibling;
    if (he) { he.hidden = !he.hidden; b.setAttribute('aria-expanded', String(!he.hidden)); }
  });
  document.addEventListener('visibilitychange', () => {
    sessionTick();
    if (document.visibilityState === 'hidden') { store.flush(); if (auth.signedIn) sync?.run().catch(() => {}); releaseOnHide().catch(() => {}); }
    else checkForRelease();
  });
  sessionTick();
  watchTyping();
  watchSpeech();
  watchSegs();
  await router.start();
  // The first use of Intl loads its data: done while the learner reads the first screen (contract C-3).
  (window.requestIdleCallback || ((fn) => setTimeout(fn, 200)))(() => { try { util.warmIntl?.(); } catch { /* optional */ } });
  if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('sw.js').then((reg) => watchRelease(reg)).catch(() => {});
  window.lucid = { store, navigate, hasProfile };
}

boot().catch(async (e) => {
  console.error(e);
  await domReady();
  document.documentElement.classList.remove('booting');
  document.getElementById('view').innerHTML = '<div class="empty"><h3>Lucid could not start</h3><p>Please reload the page.</p></div>';
});
