// Offline support and fast repeat visits. Each release has its own cache, "lucid-<RELEASE>".
// - Install fills it: the shell, every module and the non-lesson content (content/manifest.json, `offline`). A file
//   whose bytes match release.json is copied from the previous release's cache; only changed files are fetched,
//   and each fetched file must match its hash (perf D5). Lessons the learner saved that did not change are carried
//   over too. Lessons are otherwise saved on request from Settings.
// - Code, fonts, vendor files and non-lesson content are served from the release cache first (perf D2, D6), so a
//   repeat visit waits on no network. Freshness comes from the release: the browser re-checks this file on
//   navigation, and any changed byte gives a new RELEASE, so a new worker and a new cache.
// - Integrity (docs/qa/security-review.md 5a): release.json must match LISTING, which only this file carries. Every
//   entry served from the release cache is checked against it once per worker lifetime; one that does not match
//   (written by other script on the shared origin) is never served: it is fetched again and checked. A file that
//   was missed at install is checked too before it is kept. Without release.json from the server, only a first
//   install goes ahead (unchecked, as before release hashes); with an older Lucid cache present the install fails,
//   so the active release and its saved lessons stay.
// - Lessons and the centre and pool files are stale-while-revalidate. Server API calls (another origin) are never
//   cached.
// - Activation (perf D3, contract C-4): a new release waits until the page asks for it ({type:'lucid:activate'},
//   sent between two screens) or every Lucid tab has closed, so one page never runs modules from two releases. The
//   first install, and the one-time upgrade from the old hand-numbered caches, activate at once.
// RELEASE is set by tools/build-manifest.mjs to a hash of every file listed in release.json and of this file;
// never edit it by hand. Only caches named "lucid-…" are ever deleted, because the origin is shared with other apps.
const LISTING = '1b8c7e3c2176d3625e8134bf3aac621a7894c648fb7a71be8d0bd771f20228e7';
const RELEASE = 'fdf5d754277e';
const CACHE = `lucid-${RELEASE}`;
const SHELL = ['./', 'release.json', 'config.js', 'css/app.css', 'js/app.js', 'manifest.webmanifest', 'assets/favicon.svg',
  'fonts/rubik-latin.woff2', 'fonts/rubik-hebrew.woff2', 'fonts/rubik-latin-ext.woff2', 'content/taxonomy.json', 'content/curriculum.json',
  'content/manifest.json'];
const SCOPE = new URL('./', self.location).pathname;
const HASH_LEN = 12;
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
// A stored copy of a response whose body has been read. The body is already decoded, so the transfer headers go.
function rebuild(res, buf) {
  const headers = new Headers(res.headers);
  headers.delete('content-encoding');
  headers.delete('content-length');
  return new Response(buf, { status: res.status, statusText: res.statusText, headers });
}
const mismatch = (p) => Object.assign(new Error(`${p} does not match release ${RELEASE}`), { mismatch: true });

// Fetches p, revalidating against the HTTP cache (a 304 reuses the copy the page just loaded), and checks it
// against its hash. A mismatch (an edge still serving the previous deploy) is retried once past every cache;
// a second mismatch throws, so the install fails and the current release stays.
async function fetchVerified(p, want) {
  const get = async (u) => {
    const res = await fetch(new Request(u, { cache: 'no-cache' }));
    if (!res.ok) throw new Error(`${p}: ${res.status}`);
    return [res, await res.arrayBuffer()];
  };
  let [res, buf] = await get(p);
  if (want && (await digest(buf)) !== want) {
    [res, buf] = await get(`${p}${p.includes('?') ? '&' : '?'}r=${want}`);
    if ((await digest(buf)) !== want) throw mismatch(p);
  }
  return rebuild(res, buf);
}

// A copy of p from an older Lucid cache whose bytes match want, if there is one.
async function fromOld(olds, p, want) {
  if (!want) return null;
  for (const old of olds) {
    const hit = (await old.match(p)) || (p === './' ? await old.match('index.html') : undefined);
    if (!hit || !hit.ok) continue;
    const buf = await hit.arrayBuffer();
    if ((await digest(buf)) === want) return rebuild(hit, buf);
  }
  return null;
}

async function olderCaches() {
  const names = (await caches.keys()).filter((k) => k.startsWith('lucid-') && k !== CACHE);
  return { names, caches: await Promise.all(names.map((k) => caches.open(k))) };
}

// release.json for this worker: fetched (never copied) and checked against RELEASE and LISTING. When the server's
// cannot be loaded (an error status or no connection), only a first install goes ahead, without hashes (as before
// them); with an older Lucid cache present the install fails, so nothing is installed unchecked over it.
async function releaseFile(cache, olds) {
  const get = async (u) => {
    const res = await fetch(new Request(u, { cache: 'no-cache' }));
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return [res, buf, JSON.parse(new TextDecoder().decode(buf))];
  };
  const ours = async (got) => Boolean(got) && got[2]?.release === RELEASE && listed(got[2].hashes);
  let got = await get('release.json').catch(() => null);
  if (!got) {
    if (olds.length) throw new Error('release.json could not be loaded; the active release stays');
    return null;
  }
  if (!(await ours(got))) {
    got = await get(`release.json?r=${RELEASE}`).catch(() => null);
    if (!(await ours(got))) throw mismatch('release.json');
  }
  await cache.put('release.json', rebuild(got[0], got[1]));
  return got[2].hashes;
}

// Puts p into the new cache: copied when an older cache holds the same bytes, fetched otherwise.
async function ensure(ctx, p, required) {
  try {
    const want = ctx.hashes?.[hashKey(p)];
    const res = (await fromOld(ctx.olds, p, want)) || (ctx.hashes ? await fetchVerified(p, want) : await fetch(new Request(p, { cache: 'no-cache' })));
    if (!res.ok) throw new Error(`${p}: ${res.status}`);
    await ctx.cache.put(p, res);
    if (ctx.hashes) checked.add(new URL(p, self.location).href);
  } catch (err) {
    // The shell must be complete and nothing may be stale; any other file is best effort, as a screen whose module
    // is missing is fetched from the network on first use.
    if (required || err.mismatch) throw err;
  }
}

// Lessons (and centre and pool files) in older caches whose bytes still match this release move to the new cache;
// a saved lesson that changed is fetched again (best effort). Run on install and again just before activation,
// for lessons saved while this worker waited.
async function carryOver(cache, hashes, olds, { refetch }) {
  if (!hashes) return;
  const have = new Set((await cache.keys()).map((r) => new URL(r.url).pathname));
  for (const old of olds) {
    for (const req of await old.keys()) {
      const url = new URL(req.url);
      const rel = url.pathname.slice(SCOPE.length);
      if (url.search || !url.pathname.startsWith(SCOPE) || !isRuntime(rel) || have.has(url.pathname) || !hashes[rel]) continue;
      have.add(url.pathname);
      const res = await fromOld([old], rel, hashes[rel]).catch(() => null);
      if (res) await cache.put(rel, res);
      else if (refetch && rel.startsWith('content/lessons/')) await fetchVerified(rel, hashes[rel]).then((r) => cache.put(rel, r)).catch(() => null);
    }
  }
}

// The per-item content files (contract C-2) are cut from three source files by tools/build-content-index.mjs, each
// as JSON.stringify(item) + "\n". When most of a source file's items are needed, the install fetches the source file
// once (or copies it from an older cache) and writes the items from it, each checked against its hash, instead of
// one request per item (perf: 66 requests fewer on a first visit). An item that does not match is fetched itself.
// The source file is only a transport: it is not kept.
const PACKS = [
  ['content/real-life/scenario/', 'content/real-life/scenarios.json', 'scenarios'],
  ['content/writing/task/', 'content/writing/exercises.json', 'exercises'],
  ['content/writing/task/', 'content/writing/assignments.json', 'assignments'],
];
const isItem = (p) => PACKS.some(([dir]) => p.startsWith(dir) && p.endsWith('.json'));
async function unpack(ctx, items) {
  const need = new Set();
  await Promise.all(items.map(async (p) => {
    const copy = await fromOld(ctx.olds, p, ctx.hashes?.[p]).catch(() => null);
    if (copy) { await ctx.cache.put(p, copy); checked.add(new URL(p, self.location).href); } else need.add(p);
  }));
  if (ctx.hashes) {
    await Promise.all(PACKS.map(async ([dir, pack, field]) => {
      const mine = [...need].filter((p) => p.startsWith(dir));
      const want = ctx.hashes[pack];
      if (!want || mine.length < 4) return; // a few changed items: fetched one by one
      const res = (await fromOld(ctx.olds, pack, want).catch(() => null)) || (await fetchVerified(pack, want).catch(() => null));
      let list = null;
      try { list = res && (await res.json())[field]; } catch { /* fetched one by one below */ }
      for (const item of Array.isArray(list) ? list : []) {
        const p = `${dir}${item?.id}.json`;
        if (!need.has(p)) continue;
        const text = `${JSON.stringify(item)}\n`;
        const buf = new TextEncoder().encode(text);
        if ((await digest(buf)) !== ctx.hashes[p]) continue;
        await ctx.cache.put(p, new Response(buf, { headers: { 'content-type': 'application/json; charset=utf-8' } }));
        checked.add(new URL(p, self.location).href);
        need.delete(p);
      }
    }));
  }
  await Promise.all([...need].map((p) => ensure(ctx, p, false)));
}

async function install() {
  const cache = await caches.open(CACHE);
  const { names, caches: olds } = await olderCaches();
  const hashes = await releaseFile(cache, olds);
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
  await carryOver(cache, hashes, olds, { refetch: true });
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
    await carryOver(cache, hashes, olds, { refetch: false }).catch(() => null);
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
// otherwise (changed or removed) a fresh copy from the server, checked the same way. null: the server has none, as
// for an install without hashes (nothing to check). UNTRUSTED: no matching release.json could be had (offline with
// the cached copy changed or removed), so nothing is served from the cache until one can; nothing is deleted either.
const UNTRUSTED = Object.freeze({});
let trust = null;
const checked = new Set(); // cache entries (URLs) whose bytes matched in this worker's lifetime
function trustedHashes(cache) {
  trust ||= (async () => {
    const json = await cache.match('release.json').then((r) => r?.json()).catch(() => null);
    if (json?.release === RELEASE && (await listed(json.hashes))) return json.hashes;
    const fresh = await fetch(new Request(`release.json?r=${RELEASE}`, { cache: 'no-cache' })).catch(() => null);
    if (fresh?.status === 404) return null;
    const buf = fresh?.ok ? await fresh.arrayBuffer() : null;
    let got = null;
    try { got = buf && JSON.parse(new TextDecoder().decode(buf)); } catch { /* not ours */ }
    if (got?.release === RELEASE && (await listed(got.hashes))) { await cache.put('release.json', rebuild(fresh, buf)); return got.hashes; }
    trust = null; // try again on the next request
    return UNTRUSTED;
  })();
  return trust;
}
// A cached response that may be served: its bytes match the release (checked once per worker lifetime). An entry
// that does not match is deleted.
async function servable(cache, key, rel, cached) {
  const hashes = await trustedHashes(cache);
  if (hashes === null || checked.has(key)) return cached;
  if (hashes === UNTRUSTED) return null;
  const want = hashes[hashKey(keyOf(rel))];
  if (want && (await digest(await cached.clone().arrayBuffer())) === want) { checked.add(key); return cached; }
  await cache.delete(key);
  return null;
}
// A miss: fetched and kept only when it matches the release (a file the install could not get, or one deleted
// above); a copy that does not match, even past the caches, is passed on unkept, as the network gave it.
async function verifiedMiss(e, cache, rel, key) {
  const hashes = await trustedHashes(cache);
  if (hashes === null) {
    const { response, stored } = fetchAndStore(cache, e.request, key);
    e.waitUntil(stored);
    return response;
  }
  const want = hashes[hashKey(keyOf(rel))];
  if (!want) return fetch(e.request); // not part of the release
  try {
    const res = await fetchVerified(new URL(key).pathname.slice(SCOPE.length) || './', want);
    e.waitUntil(cache.put(key, res.clone()).then(() => checked.add(key)).catch(() => null));
    return res;
  } catch (err) {
    if (err.mismatch) return fetch(e.request);
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

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(SCOPE)) return;
  const rel = url.pathname.slice(SCOPE.length);
  e.respondWith(caches.open(CACHE).then((cache) => (fromRelease(e.request, rel) ? cacheFirst(e, cache, rel) : staleWhileRevalidate(e, cache))));
});
