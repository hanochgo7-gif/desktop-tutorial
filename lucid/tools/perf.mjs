// Lucid performance harness: serves the app the way GitHub Pages does and measures it in Chromium under a
// throttled phone profile and an unthrottled desktop profile. Repeatable, so a change can be compared with the
// baseline (docs/perf/baseline.json).
//
// Usage (from lucid/):
//   node tools/perf.mjs [--profiles mobile,desktop] [--runs 3] [--scenarios a,b,c,d,e,f] [--routes r1,r2]
//                       [--out result.json] [--md result.md] [--compare docs/perf/baseline.json] [--port 9300]
//   node tools/perf.mjs --serve [--net mobile|none] [--port 9300]     serve only (prints the URL and Chrome flag)
//
// Scenarios (every one is run --runs times; tables show the median):
//   a  cold first visit of #/welcome: empty cache, no service worker
//   b  cold #/today for an onboarded A1 learner (storage kept, HTTP cache and service worker cleared), then warm
//   c  cold and warm (HTTP cache fresh and service worker active) opens of the main routes
//   d  in-app transitions from Today to each route: right after a cold Today ("first session", while the service
//      worker installs) and after a warm Today ("returning")
//   e  interaction latency: lesson Check -> verdict, essay typing (300 words), word quiz answer -> verdict and
//      Next -> next question, memory card flip
//   f  service worker install: what it precaches on the first visit, when, and the first view with the worker
//      blocked for comparison
//
// Metrics: view = the route's main content visible and painted (ms from navigation start; for #/welcome its h1);
// FCP, LCP; TBT = sum of (long task - 50 ms) after FCP until the page settles; CLS = largest session window;
// reqs/KB from Resource Timing (gzKB = encoded body bytes, rawKB = decoded); netKB = bytes the server actually
// sent (page and service worker); script = Chrome's ScriptDuration. Interactions: ms = input event to the result
// painted; inp = largest Event Timing duration of the interaction (0 = under 16 ms, the API's floor). Essay:
// keydown -> next frame painted per keystroke (median/p95/max), msPerKey = how long each key's dispatch took
// beyond the 25 ms gap between keys, slowEvents = key/input events over 50 ms. Sanity: swServed (JSON only) is
// the number of resources a service worker answered, 0 on every cold load.
//
// Network model. GitHub Pages serves HTTP/2 with gzip, Cache-Control: max-age=600 and ETags. The harness serves
// lucid/ under /desktop-tutorial/lucid/ over HTTP/2 + TLS (a throwaway self-signed certificate, trusted by the
// launched Chromium through --ignore-certificate-errors-spki-list), gzips text like Pages, and shapes the
// network in the server: every response waits one RTT, the first on a connection two more (TCP + TLS), and all
// bodies share one downlink token bucket. Shaping in the server instead of CDP Network.emulateNetworkConditions
// is deliberate: CDP throttling applies to the page target only, so the service worker's precache and its
// network-first fetches of code would run unthrottled and warm loads and the install's competition with the
// first view would be wrong. CPU throttling, viewport and touch use CDP/Playwright emulation (the CPU rate
// applies to the page's main thread). Uplink shaping is not modelled (requests are a few hundred bytes).
//   mobile:  1.6 Mbps down, 150 ms RTT, CPU 4x, 390x844 @2x, touch
//   desktop: no shaping, no CPU throttling, 1440x900
// Without openssl the server falls back to HTTP/1.1 on http://localhost (still a secure context); the JSON
// records the protocol used.
//
// Needs Playwright with Chromium installed (resolved from this directory or NODE_PATH); never installs one.
import { createRequire } from 'node:module';
import http from 'node:http';
import http2 from 'node:http2';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, statSync, mkdtempSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { join, extname, dirname, resolve, normalize } from 'node:path';
import { tmpdir, cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MOUNT = '/desktop-tutorial/lucid/';

// ---------- arguments ----------
const argv = process.argv.slice(2);
const arg = (k, d = null) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
const flag = (k) => argv.includes(`--${k}`);
const PORT = Number(arg('port', 9300));
const RUNS = Math.max(1, Number(arg('runs', 3)));
const PROFILE_NAMES = arg('profiles', 'mobile,desktop').split(',').filter(Boolean);
const SCENARIOS = new Set(arg('scenarios', 'a,b,c,d,e,f').split(',').filter(Boolean));
const OUT = arg('out');
const MD = arg('md');
const COMPARE = arg('compare');
const QUIET = flag('quiet');
const ROUTES = (arg('routes') || 'lesson/a1-01,real-life,scenario/FIRST,writing,writing/final-B2,games,expressions,reading,progress').split(',');

const PROFILES = {
  mobile: {
    net: { rtt: 150, down: 1_600_000 / 8 }, cpu: 4,
    context: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  },
  desktop: { net: null, cpu: 1, context: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
};

// The route's main content: what "view" waits for. Matched on the hash path, exact first, then by prefix.
const VIEW = {
  welcome: '.welcome h1',
  today: '#view .today .plan',
  'lesson/': '.lesson-intro',
  'real-life': '#view .hub-topics',
  'scenario/': '.scenario-view .panel',
  writing: '#view .stage-num',
  'writing/': '#essay',
  games: '.game-levels',
  'games/memory/': '.mem-card',
  'games/': '[data-opt]:not([disabled])',
  expressions: '#view .entry',
  reading: '#view .lesson-row',
  progress: '#rep-h',
};

const log = (...a) => { if (!QUIET) console.log(...a); };
const median = (xs) => { const v = xs.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b); if (!v.length) return null; const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
const pct = (xs, p) => { const v = xs.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? v[Math.min(v.length - 1, Math.floor(p * v.length))] : null; };
const round = (x, d = 0) => (x == null ? null : Math.round(x * 10 ** d) / 10 ** d);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- server ----------
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.mp3': 'audio/mpeg',
};
const GZIP = /^(text\/|application\/(javascript|json|manifest\+json)|image\/svg)/;

function createServer() {
  const files = new Map(); // path -> { raw, gz, etag, mtime, type }
  let net = null;
  let entries = [];
  let inflight = 0;
  const sessions = new WeakSet();
  const now = () => performance.timeOrigin + performance.now();

  // One shared downlink: a token bucket drained round-robin across every response in flight.
  const queue = [];
  let timer = null; let last = 0;
  function tick() {
    const t = performance.now();
    let budget = ((t - last) * net.down) / 1000;
    last = t;
    while (budget >= 1 && queue.length) {
      const share = Math.max(1, Math.floor(budget / queue.length));
      for (const q of [...queue]) {
        const n = Math.min(share, q.buf.length - q.off, Math.floor(budget));
        if (n <= 0) continue;
        q.res.write(q.buf.subarray(q.off, q.off + n));
        q.off += n; budget -= n;
        if (q.off >= q.buf.length) { queue.splice(queue.indexOf(q), 1); q.res.end(); q.done(); }
      }
    }
    if (!queue.length) { clearInterval(timer); timer = null; }
  }
  function send(res, buf, done) {
    if (!net || !buf.length) { res.end(buf); done(); return; }
    queue.push({ res, buf, off: 0, done });
    if (!timer) { last = performance.now(); timer = setInterval(tick, 4); }
  }

  function load(path) {
    let f = files.get(path);
    const st = statSync(path);
    if (f && f.mtime === st.mtimeMs) return f;
    const raw = readFileSync(path);
    const type = TYPES[extname(path)] || 'application/octet-stream';
    f = { raw, gz: GZIP.test(type) ? zlib.gzipSync(raw, { level: 6 }) : null, etag: `"${crypto.createHash('sha1').update(raw).digest('hex').slice(0, 16)}"`, mtime: st.mtimeMs, type, lastModified: new Date(st.mtimeMs).toUTCString() };
    files.set(path, f);
    return f;
  }

  async function handle(req, res) {
    const arrived = now();
    const session = req.stream?.session;
    let delay = net ? net.rtt : 0;
    if (net && session && !sessions.has(session)) { sessions.add(session); delay += 2 * net.rtt; }
    if (net && !session && req.socket && !req.socket.__seen) { req.socket.__seen = true; delay += net.rtt; }
    const h = req.headers;
    const entry = { at: arrived, path: '', status: 0, wire: 0, raw: 0, end: 0, noCache: /no-cache/.test(h['cache-control'] || '') || /no-cache/.test(h.pragma || ''), dest: h['sec-fetch-dest'] || '', sw: h['service-worker'] === 'script' };
    entries.push(entry);
    inflight++;
    const finish = () => { entry.end = now(); inflight--; };
    let url;
    try { url = new URL(req.url, 'https://localhost'); } catch { res.writeHead(400); res.end(); finish(); return; }
    entry.path = url.pathname;
    if (delay) await sleep(delay);
    if (url.pathname === '/' || url.pathname === MOUNT.slice(0, -1)) { entry.status = 301; res.writeHead(301, { location: MOUNT }); res.end(); finish(); return; }
    if (!url.pathname.startsWith(MOUNT)) { entry.status = 404; res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); finish(); return; }
    let rel;
    try { rel = decodeURIComponent(url.pathname.slice(MOUNT.length)); } catch { rel = ''; }
    let path = normalize(join(APP, rel));
    if (!path.startsWith(APP)) { entry.status = 403; res.writeHead(403); res.end(); finish(); return; }
    try { if (statSync(path).isDirectory()) { if (!url.pathname.endsWith('/')) { entry.status = 301; res.writeHead(301, { location: `${url.pathname}/` }); res.end(); finish(); return; } path = join(path, 'index.html'); } } catch { /* 404 below */ }
    let f;
    try { f = load(path); } catch { entry.status = 404; res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }); send(res, Buffer.from('<h1>404</h1>'), finish); return; }
    const headers = { 'content-type': f.type, 'cache-control': 'max-age=600', etag: f.etag, 'last-modified': f.lastModified, 'access-control-allow-origin': '*', vary: 'Accept-Encoding', expires: new Date(Date.now() + 600_000).toUTCString() };
    if (h['if-none-match'] === f.etag) { entry.status = 304; res.writeHead(304, headers); res.end(); finish(); return; }
    const gz = f.gz && /\bgzip\b/.test(h['accept-encoding'] || '');
    const body = gz ? f.gz : f.raw;
    if (gz) headers['content-encoding'] = 'gzip';
    headers['content-length'] = String(body.length);
    entry.status = 200; entry.wire = body.length; entry.raw = f.raw.length;
    res.writeHead(200, headers);
    if (req.method === 'HEAD') { res.end(); finish(); return; }
    send(res, body, finish);
  }

  return {
    setNet(n) { net = n; },
    resetLog() { entries = []; },
    log() { return entries.slice(); },
    async idle(quiet = 500, max = 120_000) {
      const t0 = Date.now(); let calm = Date.now();
      while (Date.now() - t0 < max) {
        if (inflight > 0) calm = Date.now();
        else if (Date.now() - calm >= quiet && (!entries.length || now() - Math.max(...entries.map((e) => e.end || e.at)) >= quiet)) return;
        await sleep(50);
      }
    },
    handle,
  };
}

function certificate() {
  try {
    const dir = mkdtempSync(join(tmpdir(), 'lucid-perf-'));
    execFileSync('openssl', ['req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1', '-nodes', '-keyout', join(dir, 'key.pem'), '-out', join(dir, 'cert.pem'), '-days', '2', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'], { stdio: 'ignore' });
    const key = readFileSync(join(dir, 'key.pem')); const cert = readFileSync(join(dir, 'cert.pem'));
    rmSync(dir, { recursive: true, force: true });
    const spki = crypto.createHash('sha256').update(new crypto.X509Certificate(cert).publicKey.export({ type: 'spki', format: 'der' })).digest('base64');
    return { key, cert, spki };
  } catch { return null; }
}

async function startServer() {
  const server = createServer();
  const tls = certificate();
  const listener = (req, res) => { server.handle(req, res).catch(() => { try { res.writeHead(500); res.end(); } catch { /* closed */ } }); };
  const srv = tls ? http2.createSecureServer({ key: tls.key, cert: tls.cert, allowHTTP1: true }, listener) : http.createServer(listener);
  await new Promise((r, j) => { srv.once('error', j); srv.listen(PORT, '127.0.0.1', r); });
  // Open connections, so a cold load can start on a new one (and pay its handshake) like a real first visit.
  const open = new Set();
  const track = (x) => { open.add(x); x.once('close', () => open.delete(x)); };
  srv.on('session', track);
  srv.on('connection', track);
  server.dropConnections = () => { for (const x of open) { try { x.destroy(); } catch { /* gone */ } } open.clear(); };
  const origin = `${tls ? 'https' : 'http'}://localhost:${PORT}`;
  return { server, srv, tls, origin, base: `${origin}${MOUNT}`, protocol: tls ? 'h2' : 'http/1.1' };
}

// ---------- in-page instrumentation (runs before the app's scripts on every document) ----------
function instrument({ VIEW }) {
  if (window.top !== window || window.__perf) return;
  const P = window.__perf = { fcp: null, lcp: null, lcpEl: '', cls: [], longtasks: [], events: [], lastResource: 0, view: null, ctrlAt: null };
  const po = (type, cb, extra = {}) => { try { new PerformanceObserver((l) => l.getEntries().forEach(cb)).observe({ type, buffered: true, ...extra }); } catch { /* unsupported */ } };
  po('paint', (e) => { if (e.name === 'first-contentful-paint') P.fcp = e.startTime; });
  po('largest-contentful-paint', (e) => { P.lcp = e.renderTime || e.loadTime || e.startTime; P.lcpEl = e.element ? `${e.element.tagName.toLowerCase()}${e.element.className && typeof e.element.className === 'string' ? `.${e.element.className.trim().split(/\s+/).join('.')}` : ''}` : ''; });
  po('layout-shift', (e) => { if (!e.hadRecentInput) P.cls.push([e.startTime, e.value]); });
  po('longtask', (e) => P.longtasks.push([e.startTime, e.duration]));
  po('event', (e) => P.events.push([e.name, e.startTime, e.duration, e.interactionId || 0]), { durationThreshold: 16 });
  po('resource', (e) => { P.lastResource = Math.max(P.lastResource, e.responseEnd); });
  try { navigator.serviceWorker?.addEventListener('controllerchange', () => { P.ctrlAt = performance.now(); }); } catch { /* none */ }
  const visible = (el) => el && el.getClientRects().length > 0 && !el.closest('[hidden]');
  const afterPaint = () => new Promise((r) => requestAnimationFrame(() => { const c = new MessageChannel(); c.port1.onmessage = () => r(performance.now()); c.port2.postMessage(0); }));
  // Resolves with the time of the first paint after pred() holds (null after the timeout).
  P.until = (pred, timeout = 60_000) => new Promise((resolve) => {
    let done = false;
    const mo = new MutationObserver(() => check());
    const stop = (v) => { if (done) return; done = true; mo.disconnect(); clearTimeout(to); resolve(v); };
    const check = () => { if (!done && pred()) { done = true; mo.disconnect(); clearTimeout(to); afterPaint().then(resolve); } };
    const loop = () => { if (done) return; check(); if (!done) requestAnimationFrame(loop); };
    const to = setTimeout(() => stop(null), timeout);
    mo.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'disabled'] });
    check(); requestAnimationFrame(loop);
  });
  // An element matching sel that did not match when this was called.
  P.untilNew = (sel, timeout) => { const before = new Set(document.querySelectorAll(sel)); return P.until(() => [...document.querySelectorAll(sel)].some((el) => !before.has(el) && visible(el)), timeout); };
  P.selFor = (hash) => {
    const path = hash.replace(/^#\/?/, '').split('?')[0].replace(/\/$/, '');
    if (VIEW[path]) return VIEW[path];
    const pre = Object.keys(VIEW).filter((k) => k.endsWith('/') && path.startsWith(k)).sort((a, b) => b.length - a.length)[0];
    return pre ? VIEW[pre] : '#view > :not(.boot)';
  };
  const sel = P.selFor(location.hash || '#/welcome');
  P.viewSel = sel;
  P.viewReady = P.until(() => visible(document.querySelector(sel))).then((t) => { P.view = t; return t; });
  // Waits until no long task and no resource has finished for `quiet` ms (at most `max`).
  P.settle = (quiet = 1000, max = 15_000) => new Promise((resolve) => {
    const t0 = performance.now();
    const poll = () => {
      const now = performance.now();
      const lt = P.longtasks.length ? Math.max(...P.longtasks.map(([s, d]) => s + d)) : 0;
      if ((now - lt >= quiet && now - P.lastResource >= quiet) || now - t0 >= max) resolve(now); else setTimeout(poll, 100);
    };
    poll();
  });
  // Interaction: arm before the input; resolves with input -> painted result and the interaction's Event Timing.
  P.arm = (sel, timeout = 20_000) => {
    let t0 = null;
    const stamp = (e) => { if (t0 == null) t0 = e.timeStamp; };
    for (const type of ['pointerdown', 'touchstart', 'mousedown', 'keydown']) addEventListener(type, stamp, { capture: true, once: true });
    const lt0 = P.longtasks.length;
    P.armed = P.untilNew(sel, timeout).then(async (t) => {
      await new Promise((r) => setTimeout(r, 120)); // Event Timing entries arrive after the paint
      if (t == null || t0 == null) return { ms: null };
      const ev = P.events.filter(([, s]) => s >= t0 - 1);
      const lts = P.longtasks.slice(lt0).filter(([s]) => s >= t0 - 1);
      return { ms: t - t0, inp: ev.length ? Math.max(...ev.map(([, , d]) => d)) : 0, longTasks: lts.length, tbt: lts.reduce((a, [, d]) => a + Math.max(0, d - 50), 0) };
    });
  };
}

function collect() {
  const P = window.__perf;
  const nav = performance.getEntriesByType('navigation')[0];
  const res = performance.getEntriesByType('resource');
  const all = [nav, ...res].filter(Boolean);
  const sum = (k) => all.reduce((a, e) => a + (e[k] || 0), 0);
  // CLS: the largest session window (shifts under 1 s apart, a window at most 5 s long).
  let cls = 0; let win = 0; let first = 0; let prev = -Infinity;
  for (const [t, v] of P.cls) { if (t - prev > 1000 || t - first > 5000) { win = 0; first = t; } win += v; prev = t; cls = Math.max(cls, win); }
  const after = P.longtasks.filter(([s]) => P.fcp != null && s >= P.fcp);
  const byType = {};
  for (const e of res) { const ext = (new URL(e.name).pathname.match(/\.(\w+)$/) || [, 'other'])[1]; byType[ext] = (byType[ext] || 0) + 1; }
  return {
    timeOrigin: performance.timeOrigin,
    view: P.view, fcp: P.fcp, lcp: P.lcp, lcpEl: P.lcpEl, cls,
    tbt: after.reduce((a, [, d]) => a + Math.max(0, d - 50), 0),
    longTasks: P.longtasks.length, longest: P.longtasks.reduce((a, [, d]) => Math.max(a, d), 0),
    dcl: nav?.domContentLoadedEventEnd ?? null, load: nav?.loadEventEnd ?? null,
    reqs: all.length, transferKB: sum('transferSize') / 1024, gzKB: sum('encodedBodySize') / 1024, rawKB: sum('decodedBodySize') / 1024,
    byType, controlled: Boolean(navigator.serviceWorker?.controller), ctrlAt: P.ctrlAt, swServed: res.filter((e) => e.workerStart > 0).length,
    resources: res.map((e) => [new URL(e.name).pathname.replace(/^.*?\/lucid\//, ''), Math.round(e.startTime), Math.round(e.responseEnd), e.encodedBodySize, e.decodedBodySize, e.transferSize, e.workerStart > 0 ? 'sw' : '']),
  };
}

// ---------- browser helpers ----------
async function newContext(browser, P, { sw = true } = {}) {
  const ctx = await browser.newContext({ ...P.context, locale: 'he-IL', serviceWorkers: sw ? 'allow' : 'block' });
  await ctx.addInitScript(instrument, { VIEW });
  return ctx;
}
async function openPage(ctx, P) {
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  if (P.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: P.cpu });
  return { page, cdp };
}
// An onboarded A1 learner, made through the app's own modules (as the e2e suites do), unthrottled.
async function seed(env, ctx, level = 'A1') {
  env.server.setNet(null);
  const page = await ctx.newPage();
  await page.goto(`${env.base}#/welcome`);
  await page.waitForSelector('.welcome');
  await page.evaluate(async (lv) => {
    const L = await import('./js/core/learner.js');
    const P = await import('./js/core/placement.js');
    L.saveProfile({ onboarded: true, name: 'Test', birth_year: 2000, ui_language: 'he', goals: ['travel'], created_at: new Date().toISOString() });
    L.saveSettings({ daily_minutes: 20, text_size: 100 });
    await L.applyPlacement(P.selfReportResult(lv));
  }, level);
  await page.waitForTimeout(400);
  await page.evaluate(() => window.lucid?.store?.flush?.()).catch(() => {});
  await env.server.idle(300, 30_000);
}
// Storage stays; the HTTP cache, Cache Storage and the service worker go.
async function coldReset(env, ctx) {
  for (const p of ctx.pages()) await p.close();
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Storage.clearDataForOrigin', { origin: env.origin, storageTypes: 'service_workers,cache_storage' });
  await cdp.send('Network.clearBrowserCache');
  await page.close();
  env.server.dropConnections();
}
async function waitForWorker(page, max = 120_000) {
  return page.evaluate((max) => new Promise((r) => {
    if (!('serviceWorker' in navigator)) { r(false); return; }
    if (navigator.serviceWorker.controller) { r(true); return; }
    navigator.serviceWorker.addEventListener('controllerchange', () => r(true));
    setTimeout(() => r(Boolean(navigator.serviceWorker.controller)), max);
  }), max).catch(() => false);
}
const metricsOf = (list) => Object.fromEntries(list.metrics.map((m) => [m.name, m.value]));

// Loads url in a new page and measures it until it settles.
async function measureLoad(env, ctx, P, url) {
  env.server.setNet(P.net);
  const { page, cdp } = await openPage(ctx, P);
  env.server.resetLog();
  await page.goto(url, { waitUntil: 'commit', timeout: 120_000 });
  await page.waitForFunction(() => Boolean(window.__perf), null, { polling: 50, timeout: 60_000 });
  const view = await page.evaluate(() => window.__perf.viewReady);
  await page.waitForLoadState('load', { timeout: 120_000 }).catch(() => {});
  await page.evaluate(() => window.__perf.settle(1000, 15_000));
  const m = await page.evaluate(collect);
  const pm = metricsOf(await cdp.send('Performance.getMetrics'));
  Object.assign(m, { view, script: pm.ScriptDuration * 1000, task: pm.TaskDuration * 1000, layout: pm.LayoutDuration * 1000, style: pm.RecalcStyleDuration * 1000, heapMB: pm.JSHeapUsedSize / 1048576, nodes: pm.Nodes });
  const net = env.server.log();
  m.netReqs = net.length;
  m.netKB = net.reduce((a, e) => a + e.wire, 0) / 1024;
  return { page, cdp, m };
}
// What the service worker fetched for its precache (requests sent with cache: 'reload'), in page time.
function swInstall(env, m, page0) {
  const rel = (t) => t - m.timeOrigin;
  const nav = env.server.log().find((e) => e.dest === 'document');
  const pre = env.server.log().filter((e) => e.noCache && e !== nav && !e.sw);
  if (!pre.length) return { reqs: 0 };
  const start = Math.min(...pre.map((e) => e.at)); const end = Math.max(...pre.map((e) => e.end || e.at));
  return {
    reqs: pre.length, wireKB: pre.reduce((a, e) => a + e.wire, 0) / 1024, rawKB: pre.reduce((a, e) => a + e.raw, 0) / 1024,
    startMs: rel(start), endMs: rel(end), activatedMs: page0?.ctrlAt ?? null,
    // Page requests still loading when the precache began: the worker shares the link with them.
    overlapReqs: m.resources.filter(([, , e]) => e > rel(start)).length,
    view: m.view, beforeView: m.view != null && rel(start) < m.view ? 1 : 0,
  };
}

// ---------- scenarios ----------
const pick = (m) => ({ view: m.view, fcp: m.fcp, lcp: m.lcp, tbt: m.tbt, cls: m.cls, reqs: m.reqs, gzKB: m.gzKB, rawKB: m.rawKB, netKB: m.netKB, netReqs: m.netReqs, longTasks: m.longTasks, longest: m.longest, script: m.script, layout: m.layout, style: m.style, heapMB: m.heapMB, dcl: m.dcl, load: m.load, swServed: m.swServed, lcpEl: m.lcpEl });

async function scenarioA(env, browser, P, add) {
  for (let r = 0; r < RUNS; r++) {
    const ctx = await newContext(browser, P);
    const { page, m } = await measureLoad(env, ctx, P, `${env.base}#/welcome`);
    const ok = await waitForWorker(page);
    await env.server.idle(500);
    const sw = swInstall(env, m, await page.evaluate(() => ({ ctrlAt: window.__perf.ctrlAt })));
    add('a', 'cold #/welcome', pick(m), r === 0 ? { resources: m.resources, byType: m.byType } : null);
    add('f', 'SW precache on the first visit (#/welcome)', { ...sw, activated: ok ? 1 : 0 });
    log(`  a run ${r + 1}: view ${round(m.view)} lcp ${round(m.lcp)} tbt ${round(m.tbt)} reqs ${m.reqs} gz ${round(m.gzKB)}KB; SW ${sw.reqs} reqs ${round(sw.wireKB)}KB ${round(sw.startMs)}-${round(sw.endMs)}ms`);
    await ctx.close();
  }
}

const routeUrl = (env, route) => `${env.base}#/${route}`;
async function scenarioBC(env, browser, P, add, routes, { b, c }) {
  const list = [...(b ? ['today'] : []), ...(c ? routes : [])];
  for (let r = 0; r < RUNS; r++) {
    const ctx = await newContext(browser, P);
    await seed(env, ctx);
    for (const route of list) {
      await coldReset(env, ctx);
      const cold = await measureLoad(env, ctx, P, routeUrl(env, route));
      const s = route === 'today' ? 'b' : 'c';
      add(s, `cold #/${route}`, pick(cold.m), r === 0 ? { resources: cold.m.resources, byType: cold.m.byType } : null);
      await waitForWorker(cold.page);
      await env.server.idle(500);
      if (route === 'today') add('f', 'SW precache on the first visit (#/today)', swInstall(env, cold.m, await cold.page.evaluate(() => ({ ctrlAt: window.__perf.ctrlAt }))));
      await cold.page.close();
      const warm = await measureLoad(env, ctx, P, routeUrl(env, route));
      add(s, `warm #/${route}`, { ...pick(warm.m), controlled: warm.m.controlled ? 1 : 0 });
      log(`  ${s} run ${r + 1} ${route}: cold view ${round(cold.m.view)} lcp ${round(cold.m.lcp)} tbt ${round(cold.m.tbt)} gz ${round(cold.m.gzKB)}KB | warm view ${round(warm.m.view)} tbt ${round(warm.m.tbt)}`);
      await warm.page.close();
    }
    await ctx.close();
  }
}

// Clicks a link to route on Today (a temporary one when Today has none) and waits for the route's content.
async function transition(page, route) {
  return page.evaluate(async (route) => {
    const P = window.__perf;
    const href = `#/${route}`;
    const sel = P.selFor(href);
    let a = document.querySelector(`#view a[href="${href}"], #tabbar a[href="${href}"], #deck a[href="${href}"]`);
    const tmp = !a;
    if (tmp) { a = document.createElement('a'); a.href = href; document.body.append(a); }
    const lt0 = P.longtasks.length; const r0 = performance.getEntriesByType('resource').length;
    const wait = P.untilNew(sel, 30_000);
    const t0 = performance.now();
    a.click();
    if (tmp) a.remove();
    const t = await wait;
    const lts = P.longtasks.slice(lt0);
    const res = performance.getEntriesByType('resource').slice(r0);
    return { ms: t == null ? null : t - t0, longTasks: lts.length, tbt: lts.reduce((s, [, d]) => s + Math.max(0, d - 50), 0), reqs: res.length, gzKB: res.reduce((s, e) => s + e.encodedBodySize, 0) / 1024, linked: !tmp };
  }, route);
}
async function backToToday(page) {
  await page.evaluate(async () => { const w = window.__perf.untilNew(window.__perf.selFor('#/today'), 30_000); location.hash = '#/today'; await w; });
  await page.evaluate(() => window.__perf.settle(500, 8000));
}
async function scenarioD(env, browser, P, add, routes) {
  for (let r = 0; r < RUNS; r++) {
    const ctx = await newContext(browser, P);
    await seed(env, ctx);
    await coldReset(env, ctx);
    const first = await measureLoad(env, ctx, P, routeUrl(env, 'today'));
    for (const route of routes) {
      const m = await transition(first.page, route);
      add('d', `Today -> #/${route} (first session)`, m);
      await backToToday(first.page);
    }
    await waitForWorker(first.page);
    await env.server.idle(500);
    await first.page.close();
    const warm = await measureLoad(env, ctx, P, routeUrl(env, 'today'));
    const out = [];
    for (const route of routes) {
      const m = await transition(warm.page, route);
      add('d', `Today -> #/${route} (returning)`, m);
      out.push(`${route.split('/')[0]} ${round(m.ms)}`);
      await backToToday(warm.page);
    }
    log(`  d run ${r + 1} returning: ${out.join(', ')}`);
    await ctx.close();
  }
}

// ---------- interactions ----------
async function tapMeasure(page, P, tapSel, doneSel) {
  await page.evaluate((s) => window.__perf.arm(s), doneSel);
  if (P.context.hasTouch) await page.tap(tapSel); else await page.click(tapSel);
  return page.evaluate(() => window.__perf.armed);
}
const ESSAY_SENTENCES = [
  'Many people believe that technology makes our lives easier, but I think the truth is more complicated.',
  'For example, smartphones help us stay in touch with friends and family who live far away.',
  'However, they also distract students during lessons and reduce the time we spend talking face to face.',
  'In my opinion, schools should teach young people how to use their devices in a responsible way.',
  'Some critics argue that banning phones is the only solution, yet this ignores the benefits of learning online.',
  'Research shows that short breaks without screens improve concentration and memory.',
  'Therefore, a balanced approach would protect students while keeping the advantages of modern tools.',
  'To conclude, technology is neither good nor bad by itself; what matters is how we choose to use it.',
];
function essayWords(n) {
  const words = [];
  for (let i = 0; words.length < n; i++) words.push(...ESSAY_SENTENCES[i % ESSAY_SENTENCES.length].split(' '));
  return words.slice(0, n);
}

async function scenarioE(env, browser, P, add) {
  for (let r = 0; r < RUNS; r++) {
    const ctx = await newContext(browser, P);
    await seed(env, ctx);
    await env.server.idle(500);
    // Warm state: the worker is active and the HTTP cache is fresh, as for a learner in the middle of a session.
    const warmup = await ctx.newPage();
    await warmup.goto(routeUrl(env, 'today'));
    await waitForWorker(warmup);
    await env.server.idle(500);
    await warmup.close();

    // Lesson: Skip to practice, then Check -> verdict on the choice exercises, Next -> next exercise.
    {
      const { page } = await measureLoad(env, ctx, P, routeUrl(env, 'lesson/a1-01'));
      const skip = await tapMeasure(page, P, '[data-skip-learn]', '#exroot > *');
      add('e', 'lesson: Skip to practice -> first exercise', skip);
      const checks = []; const nexts = []; const matches = [];
      for (let i = 0; i < 8 && checks.length < 3; i++) {
        await page.waitForSelector('#exroot', { timeout: 30_000 });
        await page.evaluate(() => window.__perf.settle(300, 5000));
        const kind = await page.evaluate(() => (document.querySelector('#exroot [data-l]') ? 'match' : document.querySelector('#exroot .option') ? 'option' : 'other'));
        if (kind === 'match') {
          const ls = await page.$$eval('#exroot [data-l]', (bs) => bs.map((b) => b.dataset.l));
          for (const [k, l] of ls.entries()) {
            await (P.context.hasTouch ? page.tap(`#exroot [data-l="${l}"]`) : page.click(`#exroot [data-l="${l}"]`));
            if (k === ls.length - 1) matches.push(await tapMeasure(page, P, `#exroot [data-r="${l}"]`, '[data-next], [data-try-again]'));
            else await (P.context.hasTouch ? page.tap(`#exroot [data-r="${l}"]`) : page.click(`#exroot [data-r="${l}"]`));
          }
        } else if (kind === 'option') {
          await (P.context.hasTouch ? page.tap('#exroot .option >> nth=0') : page.click('#exroot .option >> nth=0'));
          checks.push(await tapMeasure(page, P, '[data-check]:not([disabled])', '[data-next], [data-try-again]'));
        } else {
          const dk = await page.$('[data-dontknow]');
          if (dk) await (P.context.hasTouch ? dk.tap() : dk.click()); else break;
        }
        await page.waitForSelector('[data-next], [data-try-again]', { timeout: 30_000 });
        if (await page.$('[data-try-again]')) { await page.click('[data-show-answer]'); await page.waitForSelector('[data-next]'); }
        await page.evaluate(() => window.__perf.settle(300, 5000));
        nexts.push(await tapMeasure(page, P, '[data-next]', '#exroot > *, .part-end, .player h1'));
      }
      for (const c of checks) add('e', 'lesson: Check -> verdict (choice)', c);
      for (const c of matches) add('e', 'lesson: last match pair -> verdict', c);
      for (const c of nexts) add('e', 'lesson: Next -> next exercise', c);
      await page.close();
    }

    // Essay: 300 words typed into the editor at about 25-30 keys a second (25 ms between keys; a burst with no gap
    // starves the measurement's own callbacks behind Chrome's input priority), with a pause every 25 words.
    {
      const { page } = await measureLoad(env, ctx, P, routeUrl(env, 'writing/final-B2'));
      await (P.context.hasTouch ? page.tap('#essay') : page.click('#essay'));
      await page.evaluate(() => {
        const P = window.__perf; P.keys = []; P.typeLt0 = P.longtasks.length; P.typeEv0 = P.events.length;
        addEventListener('keydown', (e) => { const ts = e.timeStamp; requestAnimationFrame(() => { const c = new MessageChannel(); c.port1.onmessage = () => P.keys.push(performance.now() - ts); c.port2.postMessage(0); }); }, true);
      });
      const words = essayWords(300);
      const t0 = Date.now();
      for (let i = 0; i < words.length; i += 25) {
        await page.keyboard.type(`${words.slice(i, i + 25).join(' ')} `, { delay: 25 });
        await page.waitForTimeout(700);
      }
      const wall = Date.now() - t0 - 700 * Math.ceil(words.length / 25);
      const res = await page.evaluate(() => {
        const P = window.__perf; const lts = P.longtasks.slice(P.typeLt0); const ev = P.events.slice(P.typeEv0).filter(([n]) => /key|input|beforeinput/.test(n));
        const k = P.keys.slice().sort((a, b) => a - b);
        const at = (p) => k[Math.min(k.length - 1, Math.floor(p * k.length))];
        return { keys: k.length, median: at(0.5), p95: at(0.95), max: k.at(-1), longTasks: lts.length, tbt: lts.reduce((s, [, d]) => s + Math.max(0, d - 50), 0), longest: lts.reduce((s, [, d]) => Math.max(s, d), 0), slowEvents: ev.filter(([, , d]) => d > 50).length, inp: ev.reduce((s, [, , d]) => Math.max(s, d), 0), words: document.querySelector('#essay').value.split(/\s+/).filter(Boolean).length };
      });
      add('e', 'essay: 300 words typed (per keystroke)', { ...res, msPerKey: wall / res.keys - 25 });
      await page.close();
    }

    // Word quiz: answer -> verdict, Next -> next question.
    {
      const { page } = await measureLoad(env, ctx, P, routeUrl(env, 'games/A1/1'));
      for (let q = 0; q < 5; q++) {
        await page.waitForSelector('[data-opt]:not([disabled])', { timeout: 30_000 });
        await page.evaluate(() => window.__perf.settle(300, 5000));
        add('e', 'word quiz: answer -> verdict', await tapMeasure(page, P, '[data-opt]:not([disabled]) >> nth=0', '.game-verdict'));
        await page.waitForSelector('[data-next]');
        await page.evaluate(() => window.__perf.settle(300, 5000));
        add('e', 'word quiz: Next -> next question', await tapMeasure(page, P, '[data-next]', '[data-opt]:not([disabled])'));
      }
      await page.close();
    }

    // Memory: card flips.
    {
      const { page } = await measureLoad(env, ctx, P, routeUrl(env, 'games/memory/1'));
      for (let f = 0; f < 6; f++) {
        await page.evaluate(() => window.__perf.settle(300, 5000));
        const i = await page.evaluate(() => [...document.querySelectorAll('.mem-card')].find((c) => !c.disabled && !c.classList.contains('is-up'))?.dataset.card);
        if (i == null) break;
        add('e', 'memory: card flip', await tapMeasure(page, P, `[data-card="${i}"]`, `[data-card="${i}"].is-up`));
        await page.waitForTimeout(150);
      }
      await page.close();
    }
    log(`  e run ${r + 1} done`);
    await ctx.close();
  }
}

// The first view with the service worker blocked, to see what its install costs the first visit.
async function scenarioF(env, browser, P, add) {
  for (let r = 0; r < RUNS; r++) {
    const ctx = await newContext(browser, P, { sw: false });
    const w = await measureLoad(env, ctx, P, `${env.base}#/welcome`);
    add('f', 'cold #/welcome, SW blocked', pick(w.m));
    await w.page.close();
    await seed(env, ctx);
    await coldReset(env, ctx);
    const t = await measureLoad(env, ctx, P, routeUrl(env, 'today'));
    add('f', 'cold #/today, SW blocked', pick(t.m));
    log(`  f run ${r + 1}: SW blocked welcome view ${round(w.m.view)} lcp ${round(w.m.lcp)}; today view ${round(t.m.view)}`);
    await ctx.close();
  }
}

// ---------- results and tables ----------
const COLUMNS = {
  load: [['view', 0], ['fcp', 0], ['lcp', 0], ['tbt', 0], ['cls', 3], ['reqs', 0], ['gzKB', 0], ['rawKB', 0], ['netKB', 0], ['longTasks', 0], ['script', 0]],
  d: [['ms', 0], ['longTasks', 0], ['tbt', 0], ['reqs', 0], ['gzKB', 0]],
  e: [['ms', 0], ['inp', 0], ['longTasks', 0], ['tbt', 0]],
  essay: [['median', 0], ['p95', 0], ['max', 0], ['msPerKey', 1], ['longTasks', 0], ['tbt', 0], ['longest', 0], ['slowEvents', 0], ['inp', 0]],
  sw: [['reqs', 0], ['wireKB', 0], ['rawKB', 0], ['startMs', 0], ['endMs', 0], ['activatedMs', 0], ['view', 0], ['overlapReqs', 0]],
};
const columnsOf = (row) => (row.scenario === 'd' ? COLUMNS.d : row.scenario === 'e' ? (row.name.startsWith('essay') ? COLUMNS.essay : COLUMNS.e) : row.name.startsWith('SW precache') ? COLUMNS.sw : COLUMNS.load);
const TITLES = { a: 'a. Cold first visit', b: 'b. Today for an onboarded A1 learner', c: 'c. Routes, cold and warm', d: 'd. In-app transitions from Today (click -> content painted)', e: 'e. Interactions (input -> result painted)', f: 'f. Service worker install' };

function summarise(rows) {
  for (const row of rows) {
    const keys = new Set(row.runs.flatMap((x) => Object.keys(x)));
    row.median = {};
    for (const k of keys) { const v = row.runs.map((x) => x[k]); if (v.some((x) => typeof x === 'number')) row.median[k] = round(median(v), 3); }
  }
  return rows;
}
function tables(result, { markdown = false, compare = null } = {}) {
  const out = [];
  const prev = new Map((compare?.rows || []).map((r) => [`${r.profile}|${r.name}`, r]));
  const fmt = (v, d) => (v == null ? '-' : d ? v.toFixed(d) : String(Math.round(v)));
  for (const profile of result.meta.profiles) {
    out.push(markdown ? `\n## ${profile}\n` : `\n=== ${profile} ===`);
    for (const s of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const rows = result.rows.filter((r) => r.profile === profile && r.scenario === s);
      if (!rows.length) continue;
      out.push(markdown ? `\n### ${TITLES[s]}\n` : `\n${TITLES[s]}`);
      const groups = [];
      for (const row of rows) { const cols = columnsOf(row); const g = groups.find((x) => x.cols === cols); if (g) g.rows.push(row); else groups.push({ cols, rows: [row] }); }
      for (const g of groups) {
        const head = ['', ...g.cols.map(([k]) => k)];
        const lines = g.rows.map((row) => {
          const p = prev.get(`${row.profile}|${row.name}`);
          return [row.name, ...g.cols.map(([k, d]) => {
            const v = row.median[k];
            const old = p?.median?.[k];
            const delta = compare && old != null && v != null && old !== 0 ? ` (${v >= old ? '+' : ''}${Math.round(((v - old) / Math.abs(old)) * 100)}%)` : '';
            return fmt(v, d) + delta;
          })];
        });
        if (markdown) {
          out.push(`| ${head.join(' | ')} |`, `|${head.map((_, i) => (i ? '---:' : '---')).join('|')}|`, ...lines.map((l) => `| ${l.join(' | ')} |`), '');
        } else {
          const w = head.map((_, i) => Math.max(head[i].length, ...lines.map((l) => l[i].length)));
          out.push(head.map((h, i) => (i ? h.padStart(w[i]) : h.padEnd(w[i]))).join('  '));
          for (const l of lines) out.push(l.map((c, i) => (i ? c.padStart(w[i]) : c.padEnd(w[i]))).join('  '));
        }
      }
    }
  }
  return out.join('\n');
}

// ---------- main ----------
async function main() {
  if (flag('serve')) {
    const env = await startServer();
    env.server.setNet(PROFILES[arg('net', 'none')]?.net || null);
    console.log(`Serving ${APP} at ${env.base} (${env.protocol}, network ${arg('net', 'none')})`);
    if (env.tls) console.log(`Chrome flag to trust the certificate: --ignore-certificate-errors-spki-list=${env.tls.spki}`);
    return;
  }
  const require = createRequire(join(APP, 'package.json'));
  const { chromium } = require('playwright');
  const env = await startServer();
  const browser = await chromium.launch({ args: env.tls ? [`--ignore-certificate-errors-spki-list=${env.tls.spki}`] : [] });
  let commit = null;
  try { commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: APP }).toString().trim(); } catch { /* not a checkout */ }
  // The first scenario in the real-life file, for #/scenario/FIRST.
  const firstScenario = JSON.parse(readFileSync(join(APP, 'content/real-life/scenarios.json'), 'utf8')).scenarios[0].id;
  const routes = ROUTES.map((r) => r.replace('FIRST', firstScenario));
  const rows = [];
  const started = Date.now();
  try {
    for (const name of PROFILE_NAMES) {
      const P = PROFILES[name];
      if (!P) throw new Error(`unknown profile ${name}`);
      log(`\n[${name}]`);
      const add = (scenario, rowName, values, sample = null) => {
        let row = rows.find((x) => x.profile === name && x.name === rowName);
        if (!row) { row = { profile: name, scenario, name: rowName, runs: [] }; rows.push(row); }
        const { lcpEl, ...nums } = values;
        row.runs.push(nums);
        if (lcpEl) row.lcpEl = lcpEl;
        if (sample) row.sample = sample;
      };
      if (SCENARIOS.has('a') || SCENARIOS.has('f')) await scenarioA(env, browser, P, add);
      if (SCENARIOS.has('b') || SCENARIOS.has('c')) await scenarioBC(env, browser, P, add, routes, { b: SCENARIOS.has('b') || SCENARIOS.has('f'), c: SCENARIOS.has('c') });
      if (SCENARIOS.has('d')) await scenarioD(env, browser, P, add, routes);
      if (SCENARIOS.has('e')) await scenarioE(env, browser, P, add);
      if (SCENARIOS.has('f')) await scenarioF(env, browser, P, add);
    }
  } finally {
    await browser.close();
    env.srv.close();
  }
  const result = {
    meta: {
      tool: 'lucid/tools/perf.mjs', date: new Date().toISOString(), commit, runs: RUNS, profiles: PROFILE_NAMES, scenarios: [...SCENARIOS], routes,
      protocol: env.protocol, chromium: browser.version(), cpus: cpus().length, minutes: round((Date.now() - started) / 60000, 1),
      network: Object.fromEntries(PROFILE_NAMES.map((n) => [n, PROFILES[n].net ? { rttMs: PROFILES[n].net.rtt, downMbps: (PROFILES[n].net.down * 8) / 1e6, shaping: 'server-side, shared downlink' } : 'unshaped'])),
      cpu: Object.fromEntries(PROFILE_NAMES.map((n) => [n, PROFILES[n].cpu])),
      units: 'ms for times, KB = 1024 bytes; medians over runs',
    },
    rows: summarise(rows),
  };
  const compare = COMPARE && existsSync(COMPARE) ? JSON.parse(readFileSync(COMPARE, 'utf8')) : null;
  console.log(tables(result, { compare }));
  if (OUT) { mkdirSync(dirname(resolve(OUT)), { recursive: true }); writeFileSync(OUT, `${JSON.stringify(result, null, 1)}\n`); console.log(`\nwrote ${OUT}`); }
  if (MD) {
    mkdirSync(dirname(resolve(MD)), { recursive: true });
    const head = `# Lucid performance${compare ? ` (compared with ${COMPARE})` : ''}\n\nMeasured by \`node tools/perf.mjs\` on ${result.meta.date.slice(0, 10)} (commit ${commit || '?'}, Chromium ${result.meta.chromium}, ${result.meta.protocol}, ${RUNS} runs, median). `
      + 'mobile: 1.6 Mbps down, 150 ms RTT (server-shaped, shared by the page and the service worker), CPU 4x, 390x844 @2x, touch. desktop: unshaped, 1440x900. '
      + 'Times in ms from navigation start (loads) or from the input (interactions); KB = 1024 bytes; gzKB = bytes on the wire for the page, rawKB = decoded, netKB = everything the server sent (page and service worker). See the top of tools/perf.mjs for each metric.\n';
    writeFileSync(MD, `${head}${tables(result, { markdown: true, compare })}\n`);
    console.log(`wrote ${MD}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
