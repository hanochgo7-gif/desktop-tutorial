// Offline support and fast repeat visits. Each release has its own cache, "lucid-<RELEASE>".
// - Install fills it: the shell, every module and the non-lesson content (content/manifest.json, `offline`). A file
//   whose bytes match release.json is copied from the previous release's cache; only changed files are fetched,
//   and each fetched file must match its hash (perf D5). Lessons the learner saved that did not change are carried
//   over too. Lessons are otherwise saved on request from Settings.
// - Code, fonts, vendor files and non-lesson content are served from the release cache first (perf D2, D6), so a
//   repeat visit waits on no network. Freshness comes from the release: the browser re-checks this file on
//   navigation, and any changed byte gives a new RELEASE, so a new worker and a new cache.
// - Integrity (docs/qa/security-review.md 5a): release.json must match LISTING, which only this file carries. Every
//   response served cache-first (pages, config.js, js/, css/, vendor/, fonts/, and content/ except the runtime files
//   below) is hashed as it is served and carries headers this worker chooses, never stored ones; an entry that does
//   not match (written by other script on the shared origin) is never served: it is fetched again and checked. A file
//   that was missed at install is checked too before it is kept, and one that still does not match is not handed to
//   the page. Nothing installs without release.json from the server: the install fails, so the browser tries again
//   at the next visit, and an active release keeps its cache and saved lessons.
// - Stale-while-revalidate, served as stored (bytes and headers, not hashed, as at release 2026-11-03.1): lessons and
//   the centre and pool files, assets/, manifest.webmanifest, and privacy.html when it is fetched rather than
//   navigated to. Other script on the origin can change these; what they hold is data that the views escape, never
//   code. Server API calls (another origin) are never cached.
// - Storage: a full origin (QuotaExceededError) never fails an install. What did not fit is fetched and checked on
//   use, and the old release's cache is removed when the new one takes over, which makes room again.
// - Activation (perf D3, contract C-4): a new release waits until a page asks for it ({type:'lucid:activate'},
//   sent between two screens), the app is loaded again (a reload, a new tab: see handover), or every Lucid tab has
//   closed, so one page never runs modules from two releases. The first install, and the one-time upgrade from the
//   old hand-numbered caches, activate at once.
// RELEASE is set by tools/build-manifest.mjs to a hash of every file listed in release.json and of this file;
// never edit it by hand. Only caches named "lucid-…" are ever deleted, because the origin is shared with other apps.
const LISTING = '47c0daa08bbd5c717c67eb1bc1bb8ad66a4477ef9176d9e5fe8078105c4ad837';
const RELEASE = '17565f744f38';
const CACHE = `lucid-${RELEASE}`;
const SHELL = ['./', 'release.json', 'config.js', 'css/app.css', 'js/app.js', 'manifest.webmanifest', 'assets/favicon.svg',
  'fonts/rubik-latin.woff2', 'fonts/rubik-hebrew.woff2', 'fonts/rubik-latin-ext.woff2', 'content/taxonomy.json', 'content/curriculum.json',
  'content/manifest.json'];
const SCOPE = new URL('./', self.location).pathname;
// Per-file hashes: 128-bit SHA-256 prefixes (a second preimage is out of reach); RELEASE, a cache name, stays short.
const HASH_LEN = 32;
// How long an install waits for release.json before it fails (and the browser tries again at the next visit).
const RELEASE_WAIT_MS = 20000;
// Caches written by the workers before release hashes (RELEASE was a hand-bumped date).
const LEGACY = /^lucid-(v\d+|\d{4}-\d{2}-\d{2}\.\d+)$/;
// Saved or fetched on use, and refreshed in the background; carried over to a new release when unchanged.
const RUNTIME = ['content/lessons/', 'content/centers/', 'content/pool/'];

const isShell = (rel) => rel === '' || rel === 'index.html';
const isRuntime = (rel) => RUNTIME.some((p) => rel.startsWith(p));
// Served from the release cache: pages, config.js, js/, css/, vendor/, fonts/ and content/ except the runtime files.
const fromRelease = (req, rel) => req.mode === 'navigate'
  || (!isRuntime(rel) && (isShell(rel) || rel === 'config.js' || /^(js|css|vendor|fonts|content)\//.test(rel)));
const keyOf = (rel) => (isShell(rel) ? './' : rel);
const hashKey = (p) => (p === './' ? 'index.html' : p);

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function digest(buf) {
  return hex(await crypto.subtle.digest('SHA-256', buf)).slice(0, HASH_LEN);
}
// Whether a release.json's hash list is the one this worker was built with.
const listed = async (hashes) => Boolean(hashes) && typeof hashes === 'object'
  && hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(Object.entries(hashes).map(([p, h]) => `${p} ${h}\n`).join('')))) === LISTING;
// What the release cache stores and serves for p: its body, with status 200 and the content type of its extension
// as the only header. No stored status or header (a Refresh, a Content-Type, a Set-Cookie written by other script
// on the origin) ever reaches a page or a later release; only the body, which is hashed.
const TYPES = {
  html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8', json: 'application/json; charset=utf-8', webmanifest: 'application/manifest+json',
  svg: 'image/svg+xml', woff2: 'font/woff2', png: 'image/png',
};
const entry = (p, body) => new Response(body, { status: 200, headers: { 'content-type': TYPES[hashKey(p).split('.').pop()] || 'application/octet-stream' } });
const mismatch = (p) => Object.assign(new Error(`${p} does not match release ${RELEASE}`), { mismatch: true });
// The origin's storage is full (it is shared with other apps): a write that does not fit is skipped, never fatal.
const isFull = (err) => err?.name === 'QuotaExceededError';

// Fetches p, revalidating against the HTTP cache (a 304 reuses the copy the page just loaded), and checks it
// against its hash. A mismatch (an edge still serving the previous deploy) is retried once past every cache;
// a second mismatch throws, so the install fails and the current release stays.
async function fetchVerified(p, want) {
  const get = async (u) => {
    const res = await fetch(new Request(u, { cache: 'no-cache' }));
    if (!res.ok) throw new Error(`${p}: ${res.status}`);
    return res.arrayBuffer();
  };
  let buf = await get(p);
  if ((await digest(buf)) !== want) {
    buf = await get(`${p}${p.includes('?') ? '&' : '?'}r=${want}`);
    if ((await digest(buf)) !== want) throw mismatch(p);
  }
  return entry(p, buf);
}

// A copy of p from an older Lucid cache whose bytes match want, if there is one.
async function fromOld(olds, p, want) {
  if (!want) return null;
  for (const old of olds) {
    const hit = (await old.match(p)) || (p === './' ? await old.match('index.html') : undefined);
    if (!hit || !hit.ok) continue;
    const buf = await hit.arrayBuffer();
    if ((await digest(buf)) === want) return entry(p, buf);
  }
  return null;
}

async function olderCaches() {
  const names = (await caches.keys()).filter((k) => k.startsWith('lucid-') && k !== CACHE);
  return { names, caches: await Promise.all(names.map((k) => caches.open(k))) };
}

// release.json for this worker: fetched (never copied) and checked against RELEASE and LISTING. When the server's
// cannot be loaded (an error status, no connection, or no answer within RELEASE_WAIT_MS), the install fails: nothing
// is installed that this worker could not check later (it would serve nothing from it), the browser tries again at
// the next visit, and an active release (or the hand-numbered caches) keeps its cache and saved lessons.
async function releaseFile(cache) {
  const get = async (u) => {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    let timer;
    const late = new Promise((_, reject) => { timer = setTimeout(() => { ctl?.abort(); reject(new Error('release.json: no answer')); }, RELEASE_WAIT_MS); });
    const load = (async () => {
      const res = await fetch(new Request(u, { cache: 'no-cache', signal: ctl?.signal }));
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      return [buf, JSON.parse(new TextDecoder().decode(buf))];
    })();
    try { return await Promise.race([load, late]); } finally { clearTimeout(timer); }
  };
  const ours = async (got) => Boolean(got) && got[1]?.release === RELEASE && listed(got[1].hashes);
  let got = await get('release.json').catch(() => null);
  if (!got) throw new Error('release.json could not be loaded: nothing is installed without it');
  if (!(await ours(got))) {
    got = await get(`release.json?r=${RELEASE}`).catch(() => null);
    if (!(await ours(got))) throw mismatch('release.json');
  }
  // With no room even for this, the hashes are fetched again by trustedHashes when the worker next starts.
  await cache.put('release.json', entry('release.json', got[0])).catch((err) => { if (!isFull(err)) throw err; });
  return got[1].hashes;
}

// Writes into the new cache; a write that does not fit marks the install as full instead of failing it.
async function store(ctx, p, res) {
  try { await ctx.cache.put(p, res); } catch (err) {
    if (!isFull(err)) throw err;
    ctx.full = true;
  }
}
// Puts p into the new cache: copied when an older cache holds the same bytes, fetched otherwise.
async function ensure(ctx, p, required) {
  if (ctx.full && !required) return; // no room: fetched and checked on first use
  try {
    const want = ctx.hashes[hashKey(p)];
    if (!want) throw new Error(`${p} is not in release ${RELEASE}`);
    await store(ctx, p, (await fromOld(ctx.olds, p, want)) || (await fetchVerified(p, want)));
  } catch (err) {
    // The shell must be complete and nothing may be stale; any other file is best effort, as a screen whose module
    // is missing is fetched from the network on first use. Storage that is full is not a reason to fail either (an
    // install that never succeeds would keep the learner on this release's code for good): what did not fit,
    // shell included, is fetched and checked on use once the release has taken over and the old cache is gone.
    if (required || err.mismatch) throw err;
  }
}

// Lessons (and centre and pool files) in older caches whose bytes still match this release move to the new cache;
// a saved lesson that changed is fetched again (best effort). Run on install and again at activation, for lessons
// saved while this worker waited, or that did not fit at install (activating: the old caches are no longer served,
// so when storage is full their own files are dropped first to make room for the lessons).
async function carryOver(cache, hashes, olds, { refetch, activating = false }) {
  if (!hashes) return;
  const have = new Set((await cache.keys()).map((r) => new URL(r.url).pathname));
  let purged = !activating;
  const put = async (old, rel) => {
    for (;;) {
      const res = await fromOld([old], rel, hashes[rel]).catch(() => null);
      if (!res) return false;
      try { await cache.put(rel, res); return true; } catch (err) {
        if (!isFull(err) || purged) return true; // best effort
        purged = true;
        await purge(olds);
      }
    }
  };
  for (const old of olds) {
    for (const req of await old.keys()) {
      const url = new URL(req.url);
      const rel = url.pathname.slice(SCOPE.length);
      if (url.search || !url.pathname.startsWith(SCOPE) || !isRuntime(rel) || have.has(url.pathname) || !hashes[rel]) continue;
      have.add(url.pathname);
      if (await put(old, rel)) continue;
      if (refetch && rel.startsWith('content/lessons/')) await fetchVerified(rel, hashes[rel]).then((r) => cache.put(rel, r)).catch(() => null);
    }
  }
}
// Everything but the runtime files, out of the older caches (which are deleted right after).
async function purge(olds) {
  for (const old of olds) {
    for (const req of await old.keys()) {
      if (!isRuntime(new URL(req.url).pathname.slice(SCOPE.length))) await old.delete(req).catch(() => null);
    }
  }
}

// The per-item content files (contract C-2) are cut from three source files by tools/build-content-index.mjs, each
// as JSON.stringify(item) + "\n". When most of a source file's items are needed, the install fetches the source file
// once (or copies it from an older cache) and writes the items from it, each checked against its hash, instead of
// one request per item (perf: 66 requests fewer on a first visit). An item whose cut bytes do not match its hash
// (the generator and this cut disagree) is never stored from the cut: it is fetched itself and checked. The source
// file is only a transport: it is not kept.
const PACKS = [
  ['content/real-life/scenario/', 'content/real-life/scenarios.json', 'scenarios'],
  ['content/writing/task/', 'content/writing/exercises.json', 'exercises'],
  ['content/writing/task/', 'content/writing/assignments.json', 'assignments'],
];
const isItem = (p) => PACKS.some(([dir]) => p.startsWith(dir) && p.endsWith('.json'));
async function unpack(ctx, items) {
  const need = new Set();
  await Promise.all(items.map(async (p) => {
    const copy = await fromOld(ctx.olds, p, ctx.hashes[p]).catch(() => null);
    if (copy) await store(ctx, p, copy); else need.add(p);
  }));
  await Promise.all(PACKS.map(async ([dir, pack, field]) => {
    const mine = [...need].filter((p) => p.startsWith(dir));
    const want = ctx.hashes[pack];
    if (!want || mine.length < 4 || ctx.full) return; // a few changed items: fetched one by one
    const res = (await fromOld(ctx.olds, pack, want).catch(() => null)) || (await fetchVerified(pack, want).catch(() => null));
    let list = null;
    try { list = res && (await res.json())[field]; } catch { /* fetched one by one below */ }
    for (const item of Array.isArray(list) ? list : []) {
      const p = `${dir}${item?.id}.json`;
      if (!need.has(p)) continue;
      const buf = new TextEncoder().encode(`${JSON.stringify(item)}\n`);
      if ((await digest(buf)) !== ctx.hashes[p]) continue;
      await store(ctx, p, entry(p, buf));
      need.delete(p);
    }
  }));
  await Promise.all([...need].map((p) => ensure(ctx, p, false)));
}

async function install() {
  const cache = await caches.open(CACHE);
  const { names, caches: olds } = await olderCaches();
  const hashes = await releaseFile(cache);
  const ctx = { cache, olds, hashes };
  await Promise.all(SHELL.filter((p) => p !== 'release.json').map((p) => ensure(ctx, p, true)));
  // Then the offline list: code first, so the modules a learner's next screen needs are in the HTTP cache early;
  // content second.
  let list = [];
  try { list = (await (await cache.match('content/manifest.json')).json()).offline || []; } catch { /* the shell is enough to start */ }
  const code = (p) => /^(js|vendor)\//.test(p);
  const todo = list.filter((p) => !SHELL.includes(p));
  await Promise.all(todo.filter(code).map((p) => ensure(ctx, p, false)));
  await Promise.all([...todo.filter((p) => !code(p) && !isItem(p)).map((p) => ensure(ctx, p, false)), unpack(ctx, todo.filter(isItem))]);
  if (!ctx.full) await carryOver(cache, hashes, olds, { refetch: true });
  // No release is active yet (first visit), or the active one predates release hashes: take over at once, as the
  // old worker did. Otherwise wait for the page's message or for every tab to close.
  if (!self.registration?.active || (names.length && names.every((n) => LEGACY.test(n)))) await self.skipWaiting();
}

self.addEventListener('install', (e) => { e.waitUntil(install()); });

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'lucid:activate') e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const { names, caches: olds } = await olderCaches();
    let hashes = null;
    try { hashes = (await (await cache.match('release.json')).json()).hashes; } catch { /* no hashes: nothing to carry */ }
    await carryOver(cache, hashes, olds, { refetch: false, activating: true }).catch(() => null);
    await Promise.all(names.map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Fetches and stores a fresh copy; the returned promises are the response and the cache write.
function fetchAndStore(cache, req, key = req) {
  const response = fetch(req);
  const stored = response.then((res) => (res.ok && res.type === 'basic' ? cache.put(key, res.clone()) : null)).catch(() => null);
  return { response, stored };
}

// ---------- integrity of what the release cache serves (security review 5a) ----------
// The hashes this worker trusts, read once per worker lifetime: release.json from the cache, if it matches LISTING;
// otherwise (changed or removed) a fresh copy from the server, checked the same way. UNTRUSTED: no matching
// release.json could be had (offline with the cached copy changed or removed, or the server failing), so nothing is
// served from the cache until one can; nothing is deleted either.
const UNTRUSTED = Object.freeze({});
let trust = null;
function trustedHashes(cache) {
  trust ||= (async () => {
    const json = await cache.match('release.json').then((r) => r?.json()).catch(() => null);
    if (json?.release === RELEASE && (await listed(json.hashes))) return json.hashes;
    const fresh = await fetch(new Request(`release.json?r=${RELEASE}`, { cache: 'no-cache' })).catch(() => null);
    const buf = fresh?.ok ? await fresh.arrayBuffer().catch(() => null) : null;
    let got = null;
    try { got = buf && JSON.parse(new TextDecoder().decode(buf)); } catch { /* not ours */ }
    if (got?.release === RELEASE && (await listed(got.hashes))) { await cache.put('release.json', entry('release.json', buf)).catch(() => null); return got.hashes; }
    trust = null; // try again on the next request
    return UNTRUSTED;
  })();
  return trust;
}
// The response to serve for a cache entry: its bytes, hashed now (on every response, so bytes changed after an
// earlier check are never served), with this worker's headers (entry). An entry that does not match is deleted. One
// with no hash to check it against (UNTRUSTED, or a path outside the release) is neither served nor deleted.
async function servable(cache, key, rel, cached) {
  const want = (await trustedHashes(cache))[hashKey(keyOf(rel))];
  if (!want) return null;
  const buf = await cached.arrayBuffer();
  if ((await digest(buf)) === want) return entry(keyOf(rel), buf);
  await cache.delete(key);
  return null;
}
// A miss: fetched and kept only when it matches the release (a file the install could not get, or one deleted
// above). A copy that does not match even past the caches (an edge still on another deploy) is never kept, and never
// handed to the page as a module, a stylesheet or content of this release (contract C-4): that request fails, and
// the router shows its "did not load" screen or moves the page to a waiting release. A navigation still gets the
// page as the network gave it.
async function verifiedMiss(e, cache, rel, key) {
  const want = (await trustedHashes(cache))[hashKey(keyOf(rel))];
  if (!want) return fetch(e.request); // not part of the release, or nothing to check against: passed on, not kept
  try {
    const res = await fetchVerified(new URL(key).pathname.slice(SCOPE.length) || './', want);
    e.waitUntil(cache.put(key, res.clone()).catch(() => null));
    return res;
  } catch (err) {
    if (err.mismatch) return e.request.mode === 'navigate' ? fetch(e.request) : Response.error();
    throw err;
  }
}

// The release's copy, or the network on a miss. Pages other than the app shell (privacy.html) match their own
// entry; an offline navigation with no entry gets the shell.
async function cacheFirst(e, cache, rel) {
  const req = e.request;
  const key = isShell(rel) ? new URL('./', self.location).href : new URL(req.url).href;
  const hit = await cache.match(key);
  const cached = hit && (await servable(cache, key, rel, hit));
  if (cached) return cached;
  // Another page in the scope (not part of the app) is passed through, not kept.
  if (req.mode === 'navigate' && !isShell(rel)) return fetch(req).catch(async () => (await shell(cache)) || Response.error());
  const response = verifiedMiss(e, cache, rel, key);
  if (req.mode !== 'navigate') return response;
  return response.catch(async () => (await shell(cache)) || Response.error());
}
// The app shell for an offline navigation, if its bytes are the release's.
async function shell(cache) {
  const key = new URL('./', self.location).href;
  const hit = await cache.match(key);
  return hit ? servable(cache, key, '', hit) : null;
}

async function staleWhileRevalidate(e, cache) {
  const req = e.request;
  const { response, stored } = fetchAndStore(cache, req);
  e.waitUntil(stored);
  const cached = await cache.match(req);
  return cached || response;
}

// ---------- handover at a load of the app (contract C-4) ----------
// A waiting release also takes over when the app itself is loaded again (a reload, a new tab, a link): the page about
// to start then starts on it, and tabs still on this release follow at their next change of screen, as when a page
// asks between two screens. This is what lets a fix replace a release whose page cannot start (it fails at boot, or
// a module fails to load, so it never changes screen): the reload that page asks the learner for brings the fix.
// This worker cannot hand over while it answers the navigation (the browser activates the waiting worker only when
// this one has no request in hand: waiting would never end, and a redirect comes straight back here), so it asks
// the waiting worker to take over and answers with a page of its own that reloads as soon as the waiting worker is
// no longer waiting. If it is still waiting HANDOVER_MS after the first ask, this release serves the app again.
const HANDOVER_MS = 5000;
let handover = null; // { worker, at }: the waiting worker asked to take over, and when it was first asked
function handingOver() {
  const waiting = self.registration?.waiting;
  if (!waiting) { handover = null; return false; }
  if (handover?.worker !== waiting) handover = { worker: waiting, at: Date.now() };
  if (Date.now() - handover.at > HANDOVER_MS) return false;
  try { waiting.postMessage({ type: 'lucid:activate' }); } catch { return false; }
  return true;
}
// The page for that moment: no content, one inline script allowed by its own policy (a nonce), never stored.
const HANDOVER_SCRIPT = "let n=0,done=false;const sw=navigator.serviceWorker,go=()=>{if(!done){done=true;location.reload();}};"
  + "sw.addEventListener('controllerchange',go);(function poll(){sw.getRegistration().then((r)=>(!r||!r.waiting||++n>40?go():setTimeout(poll,50)),go);})();";
function handoverPage() {
  const nonce = hex(crypto.getRandomValues(new Uint8Array(16)));
  return new Response(`<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="color-scheme" content="light dark"><title>Lucid</title><script nonce="${nonce}">${HANDOVER_SCRIPT}</script></html>`, {
    status: 200,
    headers: { 'content-type': TYPES.html, 'cache-control': 'no-store', 'content-security-policy': `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'` },
  });
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(SCOPE)) return;
  const rel = url.pathname.slice(SCOPE.length);
  // release.json is this worker's own (read at install, and checked against LISTING): a request for it, a
  // navigation included, goes to the network and never reads, writes or deletes the cached copy.
  if (rel === 'release.json') return;
  if (e.request.mode === 'navigate' && isShell(rel) && handingOver()) { e.respondWith(handoverPage()); return; }
  e.respondWith(caches.open(CACHE).then((cache) => (fromRelease(e.request, rel) ? cacheFirst(e, cache, rel) : staleWhileRevalidate(e, cache))));
});
