// Browser acceptance checks for the one-time upgrade from the release in production before the perf programme
// (RELEASE '2026-11-03.1', commit b2b669b). That release's worker serves code network-first and its page has no
// release handoff, so a tab started on it keeps its core modules (content.js, util.js, ...) and imports this
// release's screens: from the network while its own worker still runs, and from the new release cache once the new
// worker has taken over. Each check walks every screen in such a tab and fails on a screen that does not load, on an
// error screen, on a page error, or when the screen's own content is missing.
//   U1  the deploy lands while a tab is open (the old worker fetches the new screens; the HTTP cache has expired)
//   U2  a second tab opened after the deploy installs the new worker, which takes over the first tab too
//   U3  a reload within the HTTP cache's ten minutes (new index.html, old modules): no boot frame left on top
//   U4  after the upgrade: the learner's records, the essay draft and the saved lessons are kept, also offline
// and the release cache's integrity in the browser (docs/qa/security-review.md 5a):
//   U5  a genuine shell stored with a forged Refresh header (same-origin script) is served without it, and the next
//       release copies the bytes only
//   U6  a top-level navigation to release.json leaves the cached copy: offline still starts after a worker restart
//   U7  a first visit whose release.json cannot be loaded installs nothing; the next visit installs, and offline works
// and that a fix reaches the learner (S-15):
//   U8  a release whose page cannot start (boot throws, or a module fails to evaluate) is replaced by the next one at
//       the reload the page asks for, without closing the tab
//   U9  with the origin's storage nearly full, the next release still installs and takes over at a reload, keeps the
//       saved lessons, and the old release's cache is removed
// The old tree comes from `git archive b2b669b`, or from UPGRADE_FROM (a directory holding that tree's lucid/).
// E2E_ROOT=<dir> serves <dir>/lucid as the new release (for example a tree built by tools/build/build.mjs).
// The server behaves like GitHub Pages: Cache-Control max-age=600 and an ETag on every file.
// Usage: node tests/e2e/upgrade.mjs [--only <substring>]      port: UPGRADE_PORT (default 9520)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, statSync, rmSync, cpSync, appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, resolve } from 'node:path';
import { BROKEN, NOT_FOUND } from './screen-errors.mjs';
import { buildManifest } from '../../tools/build-manifest.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..', '..');
const NEW = process.env.E2E_ROOT ? join(resolve(process.env.E2E_ROOT), 'lucid') : app;
const FROM = 'b2b669b';
const LEGACY_CACHE = 'lucid-2026-11-03.1';
const PORT = Number(process.env.UPGRADE_PORT || process.env.LANE_PORT) || 9520;
const BASE = `http://127.0.0.1:${PORT}/lucid/`;
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;

const results = [];
async function check(name, fn) {
  if (ONLY && !name.toLowerCase().includes(ONLY.toLowerCase())) return;
  try { await fn(); results.push({ name, ok: true }); console.log(`PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false }); console.log(`FAIL  ${name}\n      ${String(e.message).split('\n')[0]}`); }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };

// ---------- the old release's tree ----------
let OLD = process.env.UPGRADE_FROM ? join(resolve(process.env.UPGRADE_FROM), 'lucid') : null;
let tmp = null;
if (!OLD) {
  tmp = mkdtempSync(join(tmpdir(), 'lucid-upgrade-'));
  try {
    execSync(`git -C "${join(app, '..')}" archive ${FROM} lucid | tar -x -C "${tmp}"`, { stdio: ['ignore', 'ignore', 'pipe'], shell: '/bin/bash' });
  } catch (e) {
    console.log(`FAIL  the old release's tree: git archive ${FROM} failed (a shallow clone? set UPGRADE_FROM): ${String(e.stderr || e.message).trim().split('\n')[0]}`);
    process.exit(1);
  }
  OLD = join(tmp, 'lucid');
}
assert(readFileSync(join(OLD, 'sw.js'), 'utf8').includes(`const RELEASE = '${LEGACY_CACHE.slice(6)}'`), `${OLD} is not release ${LEGACY_CACHE}`);

// ---------- a GitHub-Pages-like server whose root switches at the deploy ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
// down: the server is unreachable (every connection dropped); drop: paths whose connection is dropped.
const served = { root: OLD, down: false, drop: new Set() };
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (served.down || served.drop.has(u.pathname)) { req.socket.destroy(); return; }
  if (!u.pathname.startsWith('/lucid/')) { res.writeHead(404); res.end(); return; }
  let f = join(served.root, decodeURIComponent(u.pathname.slice('/lucid/'.length)) || 'index.html');
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!f.startsWith(served.root) || !existsSync(f)) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('Not found'); return; }
  const buf = readFileSync(f);
  const etag = `"${createHash('sha1').update(buf).digest('hex').slice(0, 16)}"`;
  const h = { 'content-type': TYPES[extname(f)] || 'application/octet-stream', 'cache-control': 'max-age=600', etag };
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, h); res.end(); return; }
  res.writeHead(200, h); res.end(buf);
});
srv.keepAliveTimeout = 1000;
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));

// ---------- the screens ----------
// [route, what the screen shows when it works, an optional step that loads more of its content]
const START = '#view .key.enter';
const SCREENS = [
  ['path', '.level-tabs'], // the walk starts on Today
  ['today', '.today'],
  ['path/A1', '.level-tabs'],
  ['lesson/a1-02', '.lesson-player'],
  ['checkpoint/A1', '.onboard', [START, '#exroot']], // the level's pool (content.pool)
  ['review', '.review-empty, .review, #exroot'],
  ['practice', '.page-head + .stack-lg'],
  ['drill?topic=present-simple', '.drill-primer', [START, '#exroot']],
  ['vocab', '.page-head'],
  ['games', '.game-section'],
  ['games/A1/1', '.player'],
  ['games/pictures/1', '.player'],
  ['games/memory/1', '.player'],
  ['grammar', '.page-head + .stack-lg'],
  ['reading', '.ls-row'], // the centre file (content.center, CENTERS)
  ['listening', '.ls-row'],
  ['speaking', '.sound-tabs'],
  ['writing', '.stage-panel .hub-row'],
  ['writing/free', '#essay'],
  ['writing/we-01', '.lesson-player'],
  ['writing/final-B2', '#essay'],
  ['tutor', '.page-head + .panel'],
  ['real-life', '.hub-row'],
  ['scenario/rl-airport-checkin-overweight', '.scenario-view'],
  ['expressions', '.entry'],
  ['conversations', '.hub-filters'],
  ['progress', '.page-head + .stack-lg'],
  ['profile', '.page-head'],
  ['settings', '.settings-view'],
  ['help', '.page-head'],
  ['account', '.onboard'],
];
// The router's and the views' error screens anywhere in the view, and their not-found screens (an .empty block), in
// both languages: BROKEN and NOT_FOUND (screen-errors.mjs).

// Shows `selector` (or an error) on the route; the previous screen's nodes must be gone first.
async function openScreen(page, route, selector, timeout = 20000) {
  await page.evaluate((r) => {
    for (const n of document.querySelector('#view').children) n.setAttribute('data-walked', '');
    location.hash = `#/${r}`;
  }, route);
  return page.waitForFunction(({ sel, broken, notFound }) => {
    const v = document.querySelector('#view');
    if (!v || v.querySelector('[data-walked]') || v.querySelector(':scope > .boot')) return false;
    const txt = v.innerText || '';
    const empty = [...v.querySelectorAll('.empty')].map((e) => e.innerText).join(' | ');
    if (new RegExp(broken, 'i').test(txt) || new RegExp(notFound, 'i').test(empty)) return `broken: ${(empty || txt).trim().replace(/\s+/g, ' ').slice(0, 120)}`;
    return document.querySelector(`#view :is(${sel})`) ? 'ok' : false;
  }, { sel: selector, broken: BROKEN.source, notFound: NOT_FOUND.source }, { timeout }).then((h) => h.jsonValue()).catch(async () => `missing ${selector}: "${(await page.textContent('#view').catch(() => '')).trim().replace(/\s+/g, ' ').slice(0, 120)}"`);
}
async function walk(page, label) {
  const failed = [];
  for (const [route, sel, step] of SCREENS) {
    let r = await openScreen(page, route, sel);
    if (r === 'ok' && step) {
      await page.click(step[0]).catch(() => {});
      r = await page.waitForSelector(`#view ${step[1]}`, { timeout: 15000 }).then(() => 'ok').catch(async () => `after starting, missing ${step[1]}: "${(await page.textContent('#view')).trim().replace(/\s+/g, ' ').slice(0, 120)}"`);
    }
    if (r !== 'ok') failed.push(`${route}: ${r}`);
  }
  if (page.__errors.length) failed.push(`page errors: ${[...new Set(page.__errors)].slice(0, 4).join(' | ')}`);
  assert(!failed.length, `${label}: ${failed.length} problems: ${failed.join(' || ')}`);
}

// ---------- helpers ----------
let browser;
async function context() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL', serviceWorkers: 'allow', reducedMotion: 'reduce' });
  return ctx;
}
async function tab(ctx) {
  const page = await ctx.newPage();
  page.__errors = [];
  page.__loads = 0;
  page.on('load', () => { page.__loads += 1; });
  page.on('pageerror', (e) => page.__errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) page.__errors.push(m.text()); });
  return page;
}
// What runs in the page: the release of its core modules.
const running = (page) => page.evaluate(async () => ('withItemCount' in (await import('./js/core/content.js')) ? 'new' : 'old'));
const caches = (page) => page.evaluate(() => caches.keys());
async function records(page) {
  return page.evaluate(() => new Promise((res) => {
    const r = indexedDB.open('lucid');
    r.onsuccess = () => {
      const db = r.result; const names = [...db.objectStoreNames]; const out = {};
      if (!names.length) { res(out); return; }
      const t = db.transaction(names); let left = names.length;
      for (const s of names) { const q = t.objectStore(s).count(); q.onsuccess = () => { out[s] = q.result; if (!--left) res(out); }; }
    };
    r.onerror = () => res(null);
  }));
}
const SAVED = ['a1-01', 'a1-02', 'a1-03'];
// A learner on the old release: onboarded at A1, three lessons saved for offline use, a lesson started, an essay
// draft, then Today. The tab is controlled by the old worker. lean: no lesson and no essay opened, only the Writing
// list, so the walk opens this release's lesson and essay screens next to the old Writing list module.
async function oldLearner(ctx, { lean = false } = {}) {
  served.root = OLD;
  const page = await tab(ctx);
  await page.goto(`${BASE}#/welcome`);
  await page.waitForSelector('.welcome', { timeout: 30000 });
  await page.evaluate(async () => {
    const L = await import('./js/core/learner.js');
    const P = await import('./js/core/placement.js');
    L.saveProfile({ onboarded: true, name: 'Test', birth_year: 1990, ui_language: 'he', goals: ['travel'], created_at: new Date().toISOString() });
    L.saveSettings({ daily_minutes: 20, text_size: 100 });
    await L.applyPlacement(P.selfReportResult('A1'));
    await window.lucid.store.flush();
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller || navigator.serviceWorker.ready.then(() => false), null, { timeout: 60000 }).catch(() => {});
  await page.reload();
  await page.waitForSelector('#view .today', { timeout: 30000 });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 60000 });
  assert((await caches(page)).includes(LEGACY_CACHE), `the old worker's cache is missing: ${await caches(page)}`);
  await page.evaluate(async (ids) => { for (const id of ids) await fetch(`content/lessons/${id}.json`); }, SAVED); // as Settings saves them
  if (lean) {
    await page.evaluate(() => { location.hash = '#/writing'; });
    await page.waitForSelector('#view .stage-panel', { timeout: 30000 });
  } else {
    await page.evaluate(() => { location.hash = '#/lesson/a1-01'; });
    await page.waitForSelector('.lesson-intro, .lesson-player', { timeout: 30000 });
    await page.evaluate(() => { location.hash = '#/writing/free'; });
    await page.waitForSelector('#essay', { timeout: 30000 });
    await page.fill('#essay', 'My production draft about my family and my work.');
    await sleep(1500);
    await page.evaluate(() => window.lucid.store.flush());
  }
  await page.evaluate(() => { location.hash = '#/today'; });
  await page.waitForSelector('#view .today', { timeout: 30000 });
  assert(await running(page) === 'old', 'the old learner does not run the old release');
  page.__errors.length = 0;
  return page;
}
async function deploy(ctx, page, { expireHttpCache }) {
  served.root = NEW;
  if (expireHttpCache) await (await ctx.newCDPSession(page)).send('Network.clearBrowserCache'); // more than ten minutes later
}
// The new worker has taken over: the old release's cache is gone.
async function takenOver(page) {
  for (let i = 0; i < 200; i++) {
    const k = await caches(page);
    if (k.length && !k.includes(LEGACY_CACHE)) return;
    await sleep(300);
  }
  throw new Error(`the new worker did not take over: caches ${await caches(page)}`);
}
// The boot frame (index.html, perf B5) must not cover a drawn screen, whichever app.js and app.css drew it.
async function frameGone(page) {
  return page.waitForFunction(() => {
    const f = document.querySelector('.bootframe');
    const top = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    return !f || (getComputedStyle(f).display === 'none' || getComputedStyle(f).visibility === 'hidden' || !f.contains(top));
  }, null, { timeout: 8000 }).then(() => true).catch(() => false);
}

// A next release on top of NEW, as a usual deploy makes it: one screen changed, index.html and app.js unchanged.
// change(lucidDir) makes another release instead.
function nextRelease(change = (d) => appendFileSync(join(d, 'js/views/progress.js'), '\n// the next release\n')) {
  const dir = mkdtempSync(join(tmpdir(), 'lucid-next-'));
  cpSync(NEW, join(dir, 'lucid'), { recursive: true, filter: (f) => !/[/\\](node_modules|tests|docs|\.git)$/.test(f) });
  change(join(dir, 'lucid'));
  buildManifest(join(dir, 'lucid'));
  return dir;
}
// Waits in the page for a worker that installed and waits (the update check runs first).
const waitingWorker = (page) => page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  await reg.update().catch(() => {});
  for (let i = 0; i < 150 && !reg.waiting; i++) await new Promise((r) => setTimeout(r, 200));
  return Boolean(reg.waiting);
});
// What the page runs: 'app' (Lucid drew a screen), 'could not start' (boot's own message) or 'stuck' (nothing ran).
const started = (page) => page.waitForFunction(() => {
  if (window.lucid && document.querySelector('#view > :not(.boot-first)')) return 'app';
  if (/could not start/i.test(document.querySelector('#view')?.innerText || '')) return 'could not start';
  return false;
}, null, { timeout: 8000 }).then((h) => h.jsonValue()).catch(() => 'stuck');
const cacheNames = (page) => page.evaluate(async () => (await caches.keys()).filter((k) => k.startsWith('lucid-')));
// A first visit of the new release, controlled by its worker, the precache done.
async function newVisit(ctx) {
  served.root = NEW;
  const page = await tab(ctx);
  await page.goto(`${BASE}#/welcome`);
  await page.waitForSelector('.welcome', { timeout: 30000 });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 60000 });
  await page.evaluate(() => navigator.serviceWorker.ready);
  return page;
}
async function stopWorkers(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('ServiceWorker.enable');
  await cdp.send('ServiceWorker.stopAllWorkers');
  await sleep(500);
}
// Lucid's welcome screen is on show at the app's address (not somewhere a forged header sent the page).
async function onLucid(page, label) {
  await sleep(1500);
  const url = page.url();
  assert(url.startsWith(BASE), `${label}: the page went to ${url}`);
  assert(await page.waitForSelector('#view .welcome', { timeout: 15000 }).then(() => true).catch(() => false), `${label}: the welcome screen is not drawn at ${url}`);
}

browser = await chromium.launch();
try {
  await check('U1. A tab open on 2026-11-03.1 when the deploy lands: every screen it opens from the new release works (the old worker fetches them)', async () => {
    const ctx = await context();
    const a = await oldLearner(ctx, { lean: true });
    const loads = a.__loads;
    await deploy(ctx, a, { expireHttpCache: true });
    await walk(a, 'tab A');
    // What the check is about: the old core modules with this release's screens, in one document.
    assert(await running(a) === 'old' && a.__loads === loads, `the tab was expected to keep running the old release without reloading (${await running(a)}, ${a.__loads - loads} reloads)`);
    await ctx.close();
  });

  await check('U2. Two tabs: a tab opened after the deploy installs the new worker, which takes over the old tab; every screen works in both', async () => {
    const ctx = await context();
    const a = await oldLearner(ctx);
    const before = await records(a);
    await deploy(ctx, a, { expireHttpCache: false });
    const b = await tab(ctx);
    await b.goto(`${BASE}#/today`);
    await b.waitForSelector('#view .today', { timeout: 30000 });
    await takenOver(a);
    await walk(a, 'tab A');
    await walk(b, 'tab B');
    const after = await records(a);
    for (const [s, n] of Object.entries(before)) assert((after[s] ?? 0) >= n, `records lost in ${s}: ${n} -> ${after[s]}`);
    await ctx.close();
  });

  await check('U3. A reload within ten minutes of the last load (new index.html, old modules): the boot frame does not cover the app, and every screen works', async () => {
    const ctx = await context();
    const a = await oldLearner(ctx);
    await deploy(ctx, a, { expireHttpCache: false });
    await a.reload();
    await a.waitForSelector('#view .today', { timeout: 30000 });
    assert(await frameGone(a), 'the boot frame still covers Today');
    await a.click('#tabbar a[href="#/progress"]', { timeout: 5000 }); // a real click: nothing covers the tab bar
    await a.waitForSelector('#view .page-head + .stack-lg', { timeout: 15000 });
    await takenOver(a);
    await walk(a, 'tab A');
    assert(await frameGone(a), 'the boot frame covers the app after the walk');
    await ctx.close();
  });

  await check('U4. After the upgrade, a load runs the new release with the learner\'s records, the essay draft and the saved lessons, also offline', async () => {
    const ctx = await context();
    const a = await oldLearner(ctx);
    const before = await records(a);
    await deploy(ctx, a, { expireHttpCache: false });
    const b = await tab(ctx);
    await b.goto(`${BASE}#/today`);
    await b.waitForSelector('#view .today', { timeout: 30000 });
    await takenOver(a);
    await b.close();
    await (await ctx.newCDPSession(a)).send('Network.clearBrowserCache');
    await a.reload();
    await a.waitForSelector('#view .today', { timeout: 30000 });
    assert(await running(a) === 'new', 'a load after the upgrade still runs the old release');
    const after = await records(a);
    for (const [s, n] of Object.entries(before)) assert((after[s] ?? 0) >= n, `records lost in ${s}: ${n} -> ${after[s]}`);
    assert(await openScreen(a, 'writing/free', '#essay') === 'ok', 'the essay screen did not open');
    assert(/production draft/.test(await a.inputValue('#essay')), `the essay draft is gone: "${await a.inputValue('#essay')}"`);
    await ctx.setOffline(true);
    for (const id of SAVED) {
      const r = await openScreen(a, `lesson/${id}`, '.lesson-player');
      assert(r === 'ok', `saved lesson ${id} offline: ${r}`);
    }
    const r = await openScreen(a, 'scenario/rl-airport-checkin-overweight', '.scenario-view');
    assert(r === 'ok', `a scenario offline: ${r}`);
    await ctx.setOffline(false);
    assert(!a.__errors.length, `page errors: ${a.__errors.slice(0, 3).join(' | ')}`);
    await ctx.close();
  });
  await check('U5. A genuine shell stored with a forged Refresh header is served without it, online after a worker restart, and the next release copies only its bytes', async () => {
    const ctx = await context();
    const a = await newVisit(ctx);
    const [name] = await cacheNames(a);
    // Same-origin script (a sibling site on the origin) writes the shell's own bytes with a header of its choosing.
    await a.evaluate(async (n) => {
      const bytes = await (await fetch('./', { cache: 'no-store' })).arrayBuffer();
      await (await caches.open(n)).put(new Request('./'), new Response(bytes, { headers: { 'content-type': 'text/html; charset=utf-8', refresh: '0; url=/phish.html' } }));
    }, name);
    await stopWorkers(a);
    await a.goto(BASE);
    await onLucid(a, 'after a worker restart');
    await a.goto(BASE);
    await onLucid(a, 'a second load');
    // The next release keeps index.html: its install copies the stored shell's bytes, and only those.
    const tmpNext = nextRelease();
    try {
      served.root = join(tmpNext, 'lucid');
      const next = await a.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        await reg.update();
        for (let i = 0; i < 150 && !reg.waiting; i++) await new Promise((r) => setTimeout(r, 200));
        if (!reg.waiting) return null;
        const changed = new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
        reg.waiting.postMessage({ type: 'lucid:activate' });
        await changed;
        let keys = [];
        for (let i = 0; i < 150; i++) { // activation (which removes the older cache) finishes after the switch
          keys = (await caches.keys()).filter((k) => k.startsWith('lucid-'));
          if (reg.active?.state === 'activated' && keys.length === 1) break;
          await new Promise((r) => setTimeout(r, 200));
        }
        const shell = await (await caches.open(keys[0])).match('./');
        return { keys, refresh: shell?.headers.get('refresh') ?? null };
      });
      assert(next && next.keys.length === 1 && next.keys[0] !== name, `the next release did not take over: ${JSON.stringify(next)}`);
      assert(next.refresh === null, `the next release carried the forged header: ${next.refresh}`);
      await stopWorkers(a);
      await a.goto(BASE);
      await onLucid(a, 'the next release, after a worker restart');
    } finally { rmSync(tmpNext, { recursive: true, force: true }); }
    assert(!a.__errors.length, `page errors: ${a.__errors.slice(0, 3).join(' | ')}`);
    await ctx.close();
  });

  await check('U6. A top-level navigation to release.json (a link from any site) leaves the cached copy: offline, Lucid still starts after a worker restart', async () => {
    const ctx = await context();
    const a = await newVisit(ctx);
    const [name] = await cacheNames(a);
    const b = await ctx.newPage();
    const r = await b.goto(`${BASE}release.json`);
    assert(r.ok(), `release.json: ${r.status()}`);
    await b.close();
    await a.goto(BASE);
    await onLucid(a, 'online');
    assert(await a.evaluate(async (n) => Boolean(await (await caches.open(n)).match('release.json')), name), 'the cached release.json is gone');
    await (await ctx.newCDPSession(a)).send('Network.clearBrowserCache'); // more than ten minutes later
    await stopWorkers(a);
    served.down = true;
    try {
      await a.goto(BASE).catch((e) => { throw new Error(`offline after a worker restart: ${e.message.split('\n')[0]}`); });
      await onLucid(a, 'offline after a worker restart');
    } finally { served.down = false; }
    await ctx.close();
  });

  await check('U7. A first visit whose release.json cannot be loaded installs no worker; the next visit installs one, and Lucid then starts offline', async () => {
    const ctx = await context();
    served.root = NEW;
    served.drop.add('/lucid/release.json');
    const a = await tab(ctx);
    try {
      await a.goto(`${BASE}#/welcome`);
      await a.waitForSelector('.welcome', { timeout: 30000 });
      // An install without release.json would be done within seconds here; give it 15.
      const first = await a.evaluate(async () => {
        for (let i = 0; i < 75; i++) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg?.active || navigator.serviceWorker.controller) break;
          await new Promise((r) => setTimeout(r, 200));
        }
        const reg = await navigator.serviceWorker.getRegistration();
        return { active: Boolean(reg?.active), controlled: Boolean(navigator.serviceWorker.controller) };
      });
      assert(!first.active && !first.controlled, `a worker installed without release.json: ${JSON.stringify(first)}`);
    } finally { served.drop.delete('/lucid/release.json'); }
    await a.reload();
    await a.waitForSelector('.welcome', { timeout: 30000 });
    await a.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 60000 });
    await (await ctx.newCDPSession(a)).send('Network.clearBrowserCache');
    await stopWorkers(a);
    served.down = true;
    try {
      await a.goto(BASE).catch((e) => { throw new Error(`offline: ${e.message.split('\n')[0]}`); });
      await onLucid(a, 'offline after the second visit');
    } finally { served.down = false; }
    await ctx.close();
  });
  // Round-3 review K1. At 40b402b the waiting release took over only at a change of screen, which a page that cannot
  // start never makes: every reload kept the broken release, until every tab was closed.
  for (const [kind, breakIt] of [
    ['boot throws', (d) => {
      const f = join(d, 'js/app.js');
      const src = readFileSync(f, 'utf8');
      const out = src.replace(/document\.title\s*=\s*(['"])Lucid\1/, '(() => { throw new Error("bad deploy"); })()');
      assert(out !== src, 'no boot statement to break in app.js');
      writeFileSync(f, out);
    }],
    ['a module fails to evaluate', (d) => {
      const f = join(d, 'js/core/router.js');
      writeFileSync(f, `throw new Error("bad deploy");\n${readFileSync(f, 'utf8')}`);
    }],
  ]) {
    await check(`U8. A release whose page cannot start (${kind}) is replaced by the fix at the reload the page asks for, in the same tab`, async () => {
      const ctx = await context();
      const a = await newVisit(ctx);
      const bad = nextRelease(breakIt);
      const fix = nextRelease();
      try {
        served.root = join(bad, 'lucid');
        assert(await waitingWorker(a), 'the bad release did not install');
        await a.evaluate(() => { location.hash = '#/start'; }); // the change of screen hands over (C-4)
        await a.waitForEvent('load', { timeout: 15000 });
        const broken = await started(a);
        assert(broken !== 'app', `the bad release started: ${broken}`);
        served.root = join(fix, 'lucid');
        const entries = await a.evaluate(() => history.length);
        let reloads = 0;
        let now = broken;
        // The first reload is served by the bad release and lets the browser find the fix; the next one hands over.
        while (now !== 'app' && reloads < 3) {
          a.__errors.length = 0; // the bad release's own errors
          await a.reload();
          reloads += 1;
          if (reloads === 1) await a.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); for (let i = 0; i < 150 && (reg.installing || !reg.waiting); i++) await new Promise((r) => setTimeout(r, 200)); });
          now = await started(a);
        }
        assert(now === 'app', `after ${reloads} reloads the page still shows "${now}"`);
        const names = await cacheNames(a);
        assert(names.length === 1, `the fix did not take over: ${names}`);
        assert(await a.evaluate(async () => (await (await fetch('js/views/progress.js')).text()).includes('the next release')), 'the page does not run the fix');
        assert(!/bad deploy/.test(a.__errors.join(' ')), `the bad release still ran: ${a.__errors.slice(0, 2).join(' | ')}`);
        assert(await a.evaluate(() => history.length) === entries, 'the handover added history entries');
        assert(reloads === 2, `the fix took ${reloads} reloads (the first one finds it, the second one runs it)`);
      } finally { rmSync(bad, { recursive: true, force: true }); rmSync(fix, { recursive: true, force: true }); }
      await ctx.close();
    });
  }

  // Round-3 review K2. At 40b402b an update needed room for a second copy of the release: with the origin nearly
  // full, every install failed and the learner stayed on the old cached code for good.
  await check('U9. With the origin\'s storage nearly full, the next release installs, takes over at a reload, keeps the saved lessons and removes the old cache', async () => {
    const ctx = await context();
    const a = await newVisit(ctx);
    await a.evaluate(async (ids) => { for (const id of ids) await fetch(`content/lessons/${id}.json`); }, SAVED); // as Settings saves them
    await sleep(1500);
    const [old] = await cacheNames(a);
    const usage = await a.evaluate(async () => (await navigator.storage.estimate()).usage);
    const cdp = await ctx.newCDPSession(a);
    await cdp.send('Storage.overrideQuotaForOrigin', { origin: new URL(BASE).origin, quotaSize: Math.round(usage * 1.5) });
    const fix = nextRelease();
    try {
      served.root = join(fix, 'lucid');
      assert(await waitingWorker(a), 'the next release did not install');
      await a.reload();
      assert(await started(a) === 'app', 'the next release did not start');
      const names = await cacheNames(a);
      assert(names.length === 1 && names[0] !== old, `the next release did not take over: ${names}`);
      assert(await a.evaluate(async () => (await (await fetch('js/views/progress.js')).text()).includes('the next release')), 'the page does not run the next release');
      const kept = await a.evaluate(async ({ n, ids }) => {
        const c = await caches.open(n);
        return (await Promise.all(ids.map((id) => c.match(`content/lessons/${id}.json`)))).filter(Boolean).length;
      }, { n: names[0], ids: SAVED });
      assert(kept === SAVED.length, `saved lessons kept: ${kept} of ${SAVED.length}`);
      // The screens work: what the install could not store is fetched and checked on use.
      await a.evaluate(async () => {
        const L = await import('./js/core/learner.js');
        const P = await import('./js/core/placement.js');
        L.saveProfile({ onboarded: true, name: 'Test', birth_year: 1990, ui_language: 'he', goals: ['travel'], created_at: new Date().toISOString() });
        L.saveSettings({ daily_minutes: 20, text_size: 100 });
        await L.applyPlacement(P.selfReportResult('A1'));
        await window.lucid.store.flush();
      });
      for (const [route, sel] of [['path', '.level-tabs'], ['progress', '.page-head + .stack-lg'], ['writing', '.stage-panel .hub-row']]) {
        const r = await openScreen(a, route, sel);
        assert(r === 'ok', `${route}: ${r}`);
      }
    } finally { rmSync(fix, { recursive: true, force: true }); }
    assert(!a.__errors.length, `page errors: ${a.__errors.slice(0, 3).join(' | ')}`);
    await ctx.close();
  });
} finally {
  await browser.close();
  srv.close();
  srv.closeAllConnections?.();
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
