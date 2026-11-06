// Browser acceptance checks for the perf lane "boot" (docs/perf/plan.json): the boot preloads (B1), route module
// preloads (B2) and route data (B3), the release handoff between service-worker releases (B6), the hidden main
// column until the shell is drawn (B4) and the boot frame (B5). Serves lucid/ itself (and, for the release checks, a
// throwaway copy whose releases it rewrites), drives Chromium through Playwright, prints one line per check and
// exits 1 on any failure.
// Usage: node tests/e2e/perf-boot.mjs [--only <substring>]      ports: PERF_BOOT_PORT (default 9503) and the next one
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { mkdtempSync, cpSync, readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..', '..');
const PORT = Number(process.env.PERF_BOOT_PORT || process.env.LANE_PORT) || 9503;
const BASE = `http://127.0.0.1:${PORT}/`;
const COPY_BASE = `http://127.0.0.1:${PORT + 1}/`;
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;

const results = [];
const pageErrors = [];
async function check(name, fn) {
  if (ONLY && !name.toLowerCase().includes(ONLY.toLowerCase())) return;
  try { await fn(); results.push({ name, ok: true }); console.log(`PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false }); console.log(`FAIL  ${name}\n      ${String(e.message).split('\n')[0]}`); }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };
// Layout shifts (CLS, largest session window) from the first frame, on every document of the context.
function clsProbe() {
  const shifts = [];
  window.__shifts = shifts;
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) shifts.push([e.startTime, e.value]); })).observe({ type: 'layout-shift', buffered: true }); } catch { /* unsupported */ }
  window.__cls = () => { let cls = 0; let win = 0; let first = 0; let prev = -Infinity; for (const [t, v] of shifts) { if (t - prev > 1000 || t - first > 5000) { win = 0; first = t; } win += v; prev = t; cls = Math.max(cls, win); } return cls; };
}
async function newPage(browser, { viewport = PHONE, dark = false, sw = 'block', base = BASE } = {}) {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 800, reducedMotion: 'reduce', locale: 'he-IL', serviceWorkers: sw, colorScheme: dark ? 'dark' : 'light' });
  await ctx.addInitScript(clsProbe);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${page.url()} :: ${e.message}`));
  page.__base = base;
  return { ctx, page };
}
// An onboarded learner at a course level, made through the app's own store.
async function learnerAt(page, level = 'A1') {
  const base = page.__base;
  await page.goto(`${base}#/welcome`);
  await page.waitForSelector('.welcome');
  await page.evaluate(async (lv) => {
    const L = await import('./js/core/learner.js');
    const P = await import('./js/core/placement.js');
    L.saveProfile({ onboarded: true, name: 'Test', birth_year: 1990, ui_language: 'he', goals: ['travel'], created_at: new Date().toISOString() });
    L.saveSettings({ daily_minutes: 20, text_size: 100 });
    await L.applyPlacement(P.selfReportResult(lv));
    await window.lucid.store.flush();
  }, level);
}
const resources = (page) => page.evaluate(() => performance.getEntriesByType('resource').map((e) => ({ path: new URL(e.name).pathname.replace(/^\//, ''), initiator: e.initiatorType, start: e.startTime })));
const duplicates = (list) => { const n = new Map(); for (const r of list) n.set(r.path, (n.get(r.path) || 0) + 1); return [...n].filter(([, c]) => c > 1); };
// Answers whatever exercise is on screen (not necessarily right), as the other suites do.
function answerCurrent(page) {
  return page.evaluate(() => {
    const root = document.querySelector('#exroot');
    const opts = [...root.querySelectorAll('.option')];
    if (opts.length) { opts[0].click(); return; }
    const gaps = [...root.querySelectorAll('.gap-input:not([readonly])')];
    if (gaps.length) { gaps.forEach((g) => { g.value = 'zzz'; g.dispatchEvent(new Event('input', { bubbles: true })); }); return; }
    const chips = [...root.querySelectorAll('[data-chip]')];
    if (chips.length) { chips[0].click(); return; }
    const ta = root.querySelector('textarea');
    if (ta) { ta.value = 'I am a student.'; ta.dispatchEvent(new Event('input', { bubbles: true })); return; }
    const ins = [...root.querySelectorAll('[data-in]')];
    if (ins.length) { for (const b of ins) b.click(); return; }
    const l = [...root.querySelectorAll('[data-l]')];
    if (l.length) { for (const a of l) { a.click(); root.querySelector(`[data-r="${a.dataset.l}"]`)?.click(); } return; }
    root.querySelector('[data-self="1"]')?.click();
  });
}
const deps = (await import('../../js/core/route-deps.js')).default;

// ---------- the release copy: a throwaway app whose releases the checks rewrite ----------
// Every view module and app.js record which release they belong to; a view module evaluated under a boot of another
// release is logged in sessionStorage (a page that mixes releases).
const MIXED = 'lucid-test-mixed';
function writeRelease(dir, rel) {
  const views = join(dir, 'js/views');
  const tag = (src, line) => `${line}\n${src.replace(/^\/\/ perf-boot release probe.*\n.*\n/, '')}`;
  for (const f of readdirSync(views)) {
    const p = join(views, f);
    writeFileSync(p, tag(readFileSync(p, 'utf8'), `// perf-boot release probe\nif ((globalThis.__bootRelease || '${rel}') !== '${rel}') sessionStorage.setItem('${MIXED}', (sessionStorage.getItem('${MIXED}') || '') + location.hash + ' ${rel} under ' + globalThis.__bootRelease + ';'); (globalThis.__viewReleases ||= []).push('${rel}');`));
  }
  const appJs = join(dir, 'js/app.js');
  writeFileSync(appJs, tag(readFileSync(appJs, 'utf8'), `// perf-boot release probe\nglobalThis.__bootRelease = '${rel}';`));
  // The release's files and hashes, with the app's own generator (the delivery lane's version also writes release.json
  // and the worker's RELEASE line).
  execFileSync(process.execPath, ['tools/build-manifest.mjs'], { cwd: dir, stdio: 'ignore' });
  const swPath = join(dir, 'sw.js');
  let sw = readFileSync(swPath, 'utf8');
  if (!existsSync(join(dir, 'release.json'))) sw = sw.replace(/^const RELEASE = '[^']*';/m, `const RELEASE = 'perf-boot-${rel}';`);
  writeFileSync(swPath, sw);
}
// The worker of the release protocol (contract C-4): the delivery lane's sw.js when it is merged; otherwise the
// current worker made to behave like it (code from the release cache, a new release waits until a page asks).
function protocolWorker(dir) {
  const swPath = join(dir, 'sw.js');
  let sw = readFileSync(swPath, 'utf8');
  if (sw.includes('lucid:activate')) return 'delivery';
  const install = '.then(() => self.skipWaiting()));';
  const route = 'isCode(e.request, rel) ? networkFirst(e, cache) : staleWhileRevalidate(e, cache)';
  if (!sw.includes(install) || !sw.includes(route)) throw new Error('sw.js changed shape: update protocolWorker() in perf-boot.mjs');
  sw = sw.replace(install, '.then(() => { if (!self.registration.active) return self.skipWaiting(); }));')
    .replace(route, "isCode(e.request, rel) ? cache.match(e.request).then((c) => c || (e.request.mode === 'navigate' ? cache.match('./') : null)).then((c) => c || fetch(e.request)) : staleWhileRevalidate(e, cache)")
    + "\nself.addEventListener('message', (e) => { if (e.data?.type === 'lucid:activate') self.skipWaiting(); });\n";
  writeFileSync(swPath, sw);
  return 'simulated';
}
function makeCopy() {
  const dir = mkdtempSync(join(tmpdir(), 'lucid-perf-boot-'));
  for (const f of readdirSync(app)) if (!['node_modules', 'tests', 'docs', 'supabase', '.git'].includes(f)) cpSync(join(app, f), join(dir, f), { recursive: true });
  return dir;
}
const loads = (page) => { page.__loads = 0; page.on('load', () => { page.__loads++; }); };
const releaseOf = (page) => page.evaluate((k) => ({ boot: globalThis.__bootRelease, views: [...new Set(globalThis.__viewReleases || [])], mixed: sessionStorage.getItem(k) || '' }), MIXED);
const pretendHidden = (page) => page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
const pretendVisible = (page) => page.evaluate(() => { delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
async function waitingWorker(page) {
  await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
  await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting), null, { timeout: 60_000, polling: 200 });
}
// Waits for the page's release (and a selector), naming what it waited for when it times out.
async function onRelease(page, rel, sel, label) {
  try { await page.waitForFunction(({ rel, sel }) => globalThis.__bootRelease === rel && Boolean(document.querySelector(sel)), { rel, sel }, { timeout: 30_000 }); }
  catch { throw new Error(`${label}: still ${JSON.stringify(await releaseOf(page).catch(() => null))} at ${page.url()}`); }
}
async function goHash(page, hash, sel) {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForSelector(sel, { timeout: 30_000 });
  await page.waitForTimeout(300);
}

// ---------- servers ----------
const copy = makeCopy();
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', app], { stdio: 'ignore' });
const copyServer = spawn('python3', ['-m', 'http.server', String(PORT + 1), '--bind', '127.0.0.1', '--directory', copy], { stdio: 'ignore' });
await sleep(900);
const browser = await chromium.launch();

try {
  // ---------- B1, B2, B3: what a cold load fetches ----------
  await check('B1 cold Today: the boot JSON files are preloaded and fetched once; no file is requested twice; the next lesson is fetched once', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page);
    const next = await page.evaluate(async () => (await import('./js/core/learner.js')).model().next?.id);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.clearBrowserCache');
    await page.goto(`${BASE}?cold#/today`);
    await page.waitForSelector('#view .today .plan');
    await page.waitForTimeout(800);
    const list = await resources(page);
    assert(duplicates(list).length === 0, `requested twice: ${JSON.stringify(duplicates(list))}`);
    for (const f of ['content/curriculum.json', 'content/manifest.json']) {
      const r = list.filter((x) => x.path === f);
      assert(r.length === 1 && r[0].initiator === 'link', `${f}: ${JSON.stringify(r)}`);
    }
    // Preloaded modules start with the rest of the boot graph, before the JSON preloads that follow them in the head.
    const json = list.find((x) => x.path === 'content/curriculum.json').start;
    for (const f of ['js/core/session.js', 'js/core/placement.js']) assert(list.filter((x) => x.path === f).length === 1 && list.find((x) => x.path === f).start <= json, `${f} is not preloaded: ${JSON.stringify(list.find((x) => x.path === f))}, curriculum at ${json}`);
    assert(next && list.filter((x) => x.path === `content/lessons/${next}.json`).length === 1, `the next lesson (${next}) is not fetched once`);
    await ctx.close();
  });

  await check('B2 B3 cold lesson: its modules and its content are each requested once, its modules by preload links', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.clearBrowserCache');
    await page.goto(`${BASE}?cold#/lesson/a1-01`);
    await page.waitForSelector('.lesson-intro');
    await page.waitForTimeout(500);
    const list = await resources(page);
    assert(duplicates(list).length === 0, `requested twice: ${JSON.stringify(duplicates(list))}`);
    const links = await page.evaluate(() => [...document.head.querySelectorAll('link[rel=modulepreload]')].map((l) => new URL(l.href).pathname.replace(/^\//, '')));
    for (const f of deps['lesson/:id']) assert(links.includes(f) && list.filter((x) => x.path === f).length === 1, `${f} not preloaded once`);
    for (const f of ['content/lessons/a1-01.json', 'content/taxonomy.json']) assert(list.filter((x) => x.path === f).length === 1, `${f} not fetched once`);
    await ctx.close();
  });

  await check('B2 first session: after Today the lesson modules preload at idle; opening the lesson fetches nothing twice', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page);
    await page.goto(`${BASE}?s#/today`);
    await page.waitForSelector('#view .today .plan');
    await page.waitForFunction((n) => document.querySelectorAll('link[rel=modulepreload]').length >= n, deps['lesson/:id'].length, { timeout: 10_000 });
    await goHash(page, '#/lesson/a1-01', '.lesson-intro');
    const list = await resources(page);
    assert(duplicates(list).length === 0, `requested twice: ${JSON.stringify(duplicates(list))}`);
    await ctx.close();
  });

  await check('B3 a lesson or scenario that does not exist still shows its not-found screen', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page);
    await page.goto(`${BASE}#/lesson/zz-99`);
    await page.waitForSelector('#view .empty, #view a[href="#/path"]');
    let txt = await page.textContent('#view');
    assert(!/Something went wrong|משהו השתבש|did not load|לא נטען/.test(txt), `lesson 404: ${txt.slice(0, 120)}`);
    await page.goto(`${BASE}#/scenario/no-such-scenario`);
    await page.waitForSelector('#view a[href="#/real-life"]');
    txt = await page.textContent('#view');
    assert(/התרחיש לא נמצא|Scenario not found/.test(txt), `scenario 404: ${txt.slice(0, 120)}`);
    await ctx.close();
  });

  // ---------- B4, B5: the boot frame and the hidden main column ----------
  for (const dark of [false, true]) {
    await check(`B5 the boot frame paints before the stylesheet arrives, in the ${dark ? 'dark' : 'light'} ground (never white in dark mode), and goes once the shell is drawn`, async () => {
      const { ctx, page } = await newPage(browser, { dark });
      let release;
      const held = new Promise((r) => { release = r; });
      await page.route(/css\/app\.css$/, async (route) => { await held; await route.continue(); });
      await page.goto(`${BASE}#/welcome`, { waitUntil: 'commit' });
      await page.waitForSelector('.bootframe', { state: 'visible' });
      await page.waitForTimeout(200);
      const shotBuf = await page.screenshot();
      const px = await page.evaluate(async (b64) => {
        const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
        const c = new OffscreenCanvas(img.width, img.height); const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const at = (x, y) => [...g.getImageData(x, y, 1, 1).data.slice(0, 3)];
        return [at(5, 5), at(img.width - 5, img.height - 5), at(5, img.height >> 1)];
      }, shotBuf.toString('base64'));
      const lum = (rgb) => (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
      for (const p of px) assert(dark ? lum(p) < 0.2 : lum(p) > 0.85, `first frame colour ${JSON.stringify(p)} in ${dark ? 'dark' : 'light'} mode`);
      assert(await page.evaluate(() => document.querySelector('.bootframe').getAttribute('aria-hidden') === 'true'), 'the frame is not hidden from assistive technology');
      release();
      await page.waitForSelector('.welcome h1');
      const after = await page.evaluate(() => ({ booting: document.documentElement.classList.contains('booting'), frame: getComputedStyle(document.querySelector('.bootframe')).display, main: getComputedStyle(document.querySelector('.main')).visibility }));
      assert(!after.booting && after.frame === 'none' && after.main === 'visible', `after boot: ${JSON.stringify(after)}`);
      await ctx.close();
    });
  }

  await check('B5 the boot does not wait for the stylesheet: the first screen\'s modules and content download while it loads, and the screen draws once it arrives', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page);
    await page.route(/css\/app\.css$/, async (route) => { await sleep(1500); await route.continue(); });
    await page.goto(`${BASE}?held#/lesson/a1-01`);
    await page.waitForSelector('.lesson-intro', { timeout: 20_000 });
    const list = await resources(page);
    const css = await page.evaluate(() => performance.getEntriesByType('resource').find((e) => e.name.endsWith('css/app.css')).responseEnd);
    for (const f of ['js/views/lesson.js', 'content/lessons/a1-01.json', 'content/taxonomy.json']) {
      const r = list.find((x) => x.path === f);
      assert(r && r.start < css, `${f} started at ${r?.start}, the stylesheet arrived at ${css}`);
    }
    assert(duplicates(list).length === 0, `requested twice: ${JSON.stringify(duplicates(list))}`);
    const st = await page.evaluate(() => ({ booting: document.documentElement.classList.contains('booting'), focus: document.activeElement?.id }));
    assert(!st.booting && st.focus === 'view', `after boot: ${JSON.stringify(st)}`);
    await ctx.close();
  });

  await check('B4 desktop: no layout shift while the shell is drawn (Today, lesson, real-life, writing; cold and again)', async () => {
    const { ctx, page } = await newPage(browser, { viewport: DESKTOP });
    await learnerAt(page);
    const out = [];
    for (const r of ['today', 'lesson/a1-01', 'real-life', 'writing', 'today']) {
      await page.goto(`${BASE}?r=${out.length}#/${r}`);
      await page.waitForSelector('#view > :not(.boot)');
      await page.waitForTimeout(700);
      out.push([r, await page.evaluate(() => window.__cls())]);
    }
    assert(out.every(([, c]) => c <= 0.01), `CLS: ${JSON.stringify(out)}`);
    await ctx.close();
  });

  await check('B4 phone: no layout shift while the shell is drawn (Today, real-life, writing, progress, expressions)', async () => {
    const { ctx, page } = await newPage(browser);
    await learnerAt(page);
    const out = [];
    for (const r of ['today', 'real-life', 'writing', 'progress', 'expressions', 'today']) {
      await page.goto(`${BASE}?p=${out.length}#/${r}`);
      await page.waitForSelector('#view > :not(.boot)');
      await page.waitForTimeout(700);
      out.push([r, Math.round((await page.evaluate(() => window.__cls())) * 1000) / 1000]);
    }
    assert(out.every(([, c]) => c <= 0.01), `CLS: ${JSON.stringify(out)}`);
    await ctx.close();
  });

  await check('B4 a boot that fails still shows its message (the main column is not left hidden)', async () => {
    const { ctx, page } = await newPage(browser, { viewport: DESKTOP });
    await page.route(/content\/curriculum\.json$/, (route) => route.fulfill({ status: 500, body: '' }));
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`${BASE}#/welcome`);
    await page.waitForFunction(() => /could not start/.test(document.getElementById('view')?.textContent || ''), null, { timeout: 15_000 });
    const st = await page.evaluate(() => ({ booting: document.documentElement.classList.contains('booting'), main: getComputedStyle(document.querySelector('.main')).visibility, frame: getComputedStyle(document.querySelector('.bootframe')).display }));
    assert(!st.booting && st.main === 'visible' && st.frame === 'none', JSON.stringify(st));
    assert(await page.isVisible('#view h3'), 'the message is not visible');
    await ctx.close();
  });

  // ---------- B6: the release handoff ----------
  await check('B6 first install: the worker claiming the page never reloads it', async () => {
    writeRelease(copy, 'r0');
    const { ctx, page } = await newPage(browser, { sw: 'allow', base: COPY_BASE });
    loads(page);
    await page.goto(`${COPY_BASE}#/welcome`);
    await page.waitForSelector('.welcome');
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 60_000 });
    await goHash(page, '#/start', '#ob-form');
    await goHash(page, '#/welcome?again=1', '.welcome');
    assert(page.__loads === 1, `reloaded ${page.__loads - 1} times`);
    await ctx.close();
  });

  await check('B6 a new release takes over at the next change of screen in every tab, never mid-lesson or mid-essay, keeps the lesson place and the essay draft, and no page mixes releases', async () => {
    const kind = protocolWorker(copy);
    writeRelease(copy, 'r1');
    const { ctx, page: a } = await newPage(browser, { sw: 'allow', base: COPY_BASE });
    await learnerAt(a);
    await a.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 60_000 });
    await a.reload();
    await a.waitForSelector('.welcome, #view .today');
    await a.waitForTimeout(1500); // the precache settles
    const b = await ctx.newPage();
    b.on('pageerror', (e) => pageErrors.push(`${b.url()} :: ${e.message}`));
    loads(a);
    // Tab A: a lesson in progress. Tab B: an essay being written.
    await goHash(a, '#/lesson/a1-01', '.lesson-intro');
    await a.click('[data-skip-learn]');
    await a.waitForSelector('#exroot');
    await answerCurrent(a);
    const checkKey = await a.$('[data-check]:not([disabled])');
    if (checkKey) await checkKey.click(); // a matching board shows its verdict by itself
    await a.waitForSelector('[data-next], [data-try-again]', { timeout: 10_000 });
    if (await a.$('[data-next]')) await a.click('[data-next]');
    await a.waitForTimeout(400);
    await b.goto(`${COPY_BASE}#/writing/free`);
    await b.waitForSelector('#essay');
    loads(b);
    await b.fill('#essay', 'My first draft about travel and work.');
    await b.waitForTimeout(300);
    assert((await releaseOf(a)).boot === 'r1' && (await releaseOf(b)).boot === 'r1', 'not on release 1');

    // Release 2 is published; its worker installs and waits.
    writeRelease(copy, 'r2');
    await waitingWorker(a);
    await pretendHidden(a); await a.waitForTimeout(400); await pretendVisible(a);
    await pretendHidden(b); await b.waitForTimeout(400); await pretendVisible(b);
    await b.type('#essay', ' More words.');
    await b.waitForTimeout(400);
    assert(a.__loads === 0 && b.__loads === 0, `reloaded during the lesson or the essay (${a.__loads}, ${b.__loads})`);

    // Leaving the lesson (a change of screen): tab A asks for the new release and reloads on Today.
    await a.evaluate(() => { location.hash = '#/today'; });
    await onRelease(a, 'r2', '#view .today .plan', 'tab A leaving the lesson');
    assert(a.__loads === 1, `tab A loads: ${a.__loads}`);
    // Tab B saw the switch: it reloads at its next change of screen instead of importing a release-2 view.
    await b.evaluate(() => { location.hash = '#/progress'; });
    await onRelease(b, 'r2', '#view h1', 'tab B leaving the essay');
    assert(b.__loads === 1, `tab B loads: ${b.__loads}`);

    // What was in progress survived the reload.
    await goHash(a, '#/lesson/a1-01', '.lesson-intro');
    assert(await a.$('[data-resume-banner]'), 'the lesson place was lost');
    await goHash(b, '#/writing/free', '#essay');
    const draft = await b.inputValue('#essay');
    assert(draft.includes('My first draft about travel and work.') && draft.includes('More words.'), `the essay draft was lost: ${JSON.stringify(draft)}`);
    for (const [name, p] of [['A', a], ['B', b]]) {
      const r = await releaseOf(p);
      assert(r.boot === 'r2' && r.views.every((v) => v === 'r2') && !r.mixed, `tab ${name} (${kind} worker): ${JSON.stringify(r)}`);
    }
    assert(a.__loads === 1 && b.__loads === 1, `more than one reload per tab (${a.__loads}, ${b.__loads})`);

    // Release 3: a query-only change never reloads; a hidden tab on a hub switches at once; the other tab follows at
    // its next change of screen.
    writeRelease(copy, 'r3');
    await goHash(a, '#/today', '#view .today .plan');
    await waitingWorker(a);
    await goHash(a, '#/today?minutes=1', '#view .today .plan');
    await goHash(a, '#/today', '#view .today .plan');
    assert(a.__loads === 1, 'a query-only change reloaded the page');
    await pretendHidden(a);
    await onRelease(a, 'r3', '#view .today .plan', 'tab A hidden on Today');
    assert(a.__loads === 2, `tab A loads after hiding: ${a.__loads}`);
    await b.evaluate(() => { location.hash = '#/today'; });
    await onRelease(b, 'r3', '#view .today .plan', 'tab B after release 3');
    for (const [name, p] of [['A', a], ['B', b]]) {
      const r = await releaseOf(p);
      assert(r.boot === 'r3' && r.views.every((v) => v === 'r3') && !r.mixed, `tab ${name}: ${JSON.stringify(r)}`);
    }
    assert(a.__loads === 2 && b.__loads === 2, `loads ${a.__loads}, ${b.__loads}`);
    await ctx.close();
  });
} finally {
  await browser.close();
  server.kill();
  copyServer.kill();
  rmSync(copy, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.ok);
if (pageErrors.length) console.log(`page errors:\n  ${pageErrors.join('\n  ')}`);
console.log(`\n${results.length - failed.length} of ${results.length} passed`);
process.exit(failed.length || pageErrors.length ? 1 : 0);
