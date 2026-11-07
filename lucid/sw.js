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
// - Storage: a release installs only when its release.json and its whole shell are in its cache, so it can start
//   offline. Room is measured by writing (see ROOM), never estimated: before its first write the install writes and
//   deletes a probe of the shell's size; when that, or a write of the shell, does not fit the origin's quota (shared
//   with other apps), the install fails having written nothing it keeps, and the active release keeps its cache and
//   saved lessons. Other files are stored next to a ballast as big as the next release's shell (RESERVE), so they
//   leave it room to install; the rest is fetched and checked by the install without being kept (so the HTTP cache
//   holds it), and on use, the HTTP cache's copy first. An install that fails, for any reason, gives its own cache
//   back, entries first so the space returns at once (never a complete cache of this release that it found: the
//   registration went away, the cache stayed). The one-time upgrade fetches past the HTTP cache, which the old worker
//   serves code from. When the new release takes over, saved lessons are moved into its cache, and the old caches
//   are deleted and emptied, which makes room at once; then changed saved lessons, and files the install left out,
//   are fetched again. Lessons saved from Settings (stale-while-revalidate) are not written next to the ballast.
// - Activation (perf D3, contract C-4): a new release waits until a page asks for it ({type:'lucid:activate'},
//   sent between two screens), the app is loaded again (a reload, a new tab: see handover), or every Lucid tab has
//   closed, so one page never runs modules from two releases. The first install, and the one-time upgrade from the
//   old hand-numbered caches, activate at once. Activation removes the older Lucid caches only when its own cache
//   holds release.json and the shell, and never while a newer release installs or waits (its cache is one of them).
//   The page listens for a takeover from its first module on (js/core/router.js), so one that lands while it boots
//   is seen too.
// RELEASE is set by tools/build-manifest.mjs to a hash of every file listed in release.json and of this file;
// never edit it by hand. Only caches named "lucid-…" are ever deleted, because the origin is shared with other apps.
const LISTING = 'b85100383ef294637c839c8127628e6d84b18ce0f5cdc5f16a0b8d97789e0575';
const RELEASE = 'b64765738ba5';
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
// The origin's storage is full (it is shared with other apps): a best-effort write that does not fit is skipped.
const isFull = (err) => err?.name === 'QuotaExceededError';
const full = (what) => Object.assign(new Error(`no room for ${what}`), { name: 'QuotaExceededError' });
// Room is measured by writing, never by navigator.storage.estimate(): on a nearly full disk Chromium reports a
// gigabyte free while every write fails. ROOM is the key of the entry that does it (another origin's URL: no request
// of the page ever matches it). A probe of the shell's size is written, then deleted, before an install writes
// anything (so an install that cannot fit takes nothing from what the active release, or the hand-numbered caches'
// worker, still writes); a "ballast" of RESERVE times the shell is held while best-effort files are written, then
// deleted, so they leave room for the next release, which copies or fetches a whole shell into a new cache before
// the old one goes.
const ROOM = 'https://lucid.invalid/room';
const RESERVE = 1.25;
// Writes size bytes as ROOM into cache: false when they do not fit.
const claim = (cache, size) => cache.put(ROOM, new Response(new Uint8Array(Math.ceil(size)))).then(() => true, (err) => { if (isFull(err)) return false; throw err; });
const unclaim = (cache) => cache.delete(ROOM).catch(() => null);
// Empties a cache through a Cache object this worker holds: Chromium gives a deleted cache's space back only once no
// Cache object for it is left, so its entries go too, which gives the space back at once.
async function empty(cache) {
  await Promise.all((await cache.keys().catch(() => [])).map((r) => cache.delete(r).catch(() => null)));
}
// The hashes of this release when cache holds what it needs to start, online or offline: its release.json (matching
// LISTING) and every shell file. Otherwise null.
async function holds(cache) {
  const json = await cache.match('release.json').then((r) => r?.json()).catch(() => null);
  if (json?.release !== RELEASE || !(await listed(json.hashes))) return null;
  for (const p of SHELL) if (!(await cache.match(p))) return null;
  return json.hashes;
}

// Fetches p, revalidating against the HTTP cache (a 304 reuses the copy the page just loaded), and checks it
// against its hash. A mismatch (an edge still serving the previous deploy) is retried once past every cache;
// a second mismatch throws, so the install fails and the current release stays.
// With no connection, the copy the HTTP cache holds (a page loaded within its max-age) is used, checked the same way.
// mode 'no-store' never reads or writes the HTTP cache (the one-time upgrade: see install).
async function fetchBody(p, want, mode = 'no-cache') {
  const get = async (u) => {
    const res = await fetch(new Request(u, { cache: mode }))
      .catch((err) => (mode === 'no-store' ? Promise.reject(err) : fetch(new Request(u, { cache: 'force-cache' })).catch(() => { throw err; })));
    if (!res.ok) throw new Error(`${p}: ${res.status}`);
    return res.arrayBuffer();
  };
  let buf = await get(p);
  if ((await digest(buf)) !== want) {
    buf = await get(`${p}${p.includes('?') ? '&' : '?'}r=${want}`);
    if ((await digest(buf)) !== want) throw mismatch(p);
  }
  return buf;
}
const fetchVerified = async (p, want) => entry(p, await fetchBody(p, want));
// The bytes of p in the HTTP cache, whatever their age (or from the network when it holds none), if they match want.
const httpCopy = (p, want) => fetch(new Request(p, { cache: 'force-cache' })).then((res) => (res.ok ? res.arrayBuffer() : null))
  .then(async (buf) => (buf && (await digest(buf)) === want ? buf : null)).catch(() => null);

// The bytes of p in an older Lucid cache, if they match want.
async function oldBody(olds, p, want) {
  if (!want) return null;
  for (const old of olds) {
    const hit = (await old.match(p)) || (p === './' ? await old.match('index.html') : undefined);
    if (!hit || !hit.ok) continue;
    const buf = await hit.arrayBuffer();
    if ((await digest(buf)) === want) return buf;
  }
  return null;
}
const fromOld = async (olds, p, want) => { const buf = await oldBody(olds, p, want); return buf && entry(p, buf); };
// The size of p's entry in cache when it is already what this release stores (its bytes, and entry()'s status and
// header): a second install of the same release (the registration went away, the cache stayed) writes nothing.
async function inPlace(cache, p, want) {
  const hit = cache && want && (await cache.match(p).catch(() => null));
  if (!hit || hit.status !== 200 || [...hit.headers].length !== 1 || hit.headers.get('content-type') !== entry(p, null).headers.get('content-type')) return null;
  const buf = await hit.arrayBuffer();
  return (await digest(buf)) === want ? buf.byteLength : null;
}

async function olderCaches() {
  const names = (await caches.keys()).filter((k) => k.startsWith('lucid-') && k !== CACHE);
  return { names, caches: await Promise.all(names.map((k) => caches.open(k))) };
}

// release.json for this worker: fetched (never copied) and checked against RELEASE and LISTING. When the server's
// cannot be loaded (an error status, no connection, or no answer within RELEASE_WAIT_MS), the install fails: nothing
// is installed that this worker could not check later (it would serve nothing from it), the browser tries again at
// the next visit, and an active release (or the hand-numbered caches) keeps its cache and saved lessons.
async function releaseFile() {
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
  return { buf: got[0], hashes: got[1].hashes };
}

// Writes buf as p into the new cache. A best-effort write that does not fit (next to the ballast) marks the install as
// full instead of failing it; a required one (the shell) fails it.
async function store(ctx, p, buf, required = false) {
  if (!required && ctx.full) return;
  try { await ctx.cache.put(p, entry(p, buf)); } catch (err) {
    if (!isFull(err) || required) throw err;
    ctx.full = true;
  }
}
// The bytes of p for this release: copied when an older cache holds the same bytes, fetched otherwise.
async function bodyOf(ctx, p) {
  const want = ctx.hashes[hashKey(p)];
  if (!want) throw new Error(`${p} is not in release ${RELEASE}`);
  return (await oldBody(ctx.olds, p, want)) || fetchBody(p, want, ctx.mode);
}
// Puts p (best effort) into the new cache. With no room left (ctx.full) it is still fetched and checked, not kept:
// the HTTP cache then holds it, so a first use offline, or after the server has moved on to another release, finds
// this release's bytes there (verifiedMiss), as release 2026-11-03.1's precache left every file in the HTTP cache
// even when its writes failed. Not on the one-time upgrade, which never uses the HTTP cache.
async function ensure(ctx, p) {
  try {
    if (ctx.reuse && (await inPlace(ctx.cache, p, ctx.hashes[hashKey(p)])) !== null) return;
    if (ctx.full) {
      // Nothing is kept, so a copy of another release (an edge on another deploy) fails nothing here.
      const want = ctx.hashes[hashKey(p)];
      if (want && ctx.mode !== 'no-store' && !(await oldBody(ctx.olds, p, want))) await fetchBody(p, want, ctx.mode).catch(() => null);
      return;
    }
    await store(ctx, p, await bodyOf(ctx, p));
  } catch (err) {
    // Nothing may be stale; any other failure leaves the file out, as a screen whose module is missing is fetched and
    // checked on first use, and so is one that did not fit.
    if (err.mismatch) throw err;
  }
}

// Lessons (and centre and pool files) in older caches whose bytes still match this release move to the new cache.
// Run on install and again at activation, for lessons saved while this worker waited, or that did not fit at install.
// Activating, the old caches are no longer served and are deleted next: each copy is moved (its old entry deleted at
// once, which gives its space back), so a lesson needs room for itself only; when even that does not fit, the old
// caches' own files are dropped first. Returns the saved lessons that changed in this release, or that still did not
// fit: fetched again here when refetch is set (install), by the caller otherwise (activation, once the old caches are
// gone).
async function carryOver(cache, hashes, olds, { refetch = false, activating = false, mode } = {}) {
  if (!hashes) return [];
  const have = new Set((await cache.keys()).map((r) => new URL(r.url).pathname));
  const missed = new Set();
  let purged = false;
  const put = async (old, req, rel) => {
    for (;;) {
      const res = await fromOld([old], rel, hashes[rel]).catch(() => null);
      if (!res) return false;
      try {
        await cache.put(rel, res);
        if (activating) await old.delete(req).catch(() => null);
        return true;
      } catch (err) {
        if (!activating) return true; // installing: activation carries it over again
        if (!isFull(err) || purged) return false; // fetched again once the old caches are emptied
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
      if (await put(old, req, rel)) { have.add(url.pathname); missed.delete(rel); } else if (rel.startsWith('content/lessons/')) missed.add(rel);
    }
  }
  if (!refetch) return [...missed];
  for (const rel of missed) await refetchLesson(cache, hashes, rel, mode);
  return [];
}
const refetchLesson = (cache, hashes, rel, mode) => fetchBody(rel, hashes[rel], mode).then((buf) => cache.put(rel, entry(rel, buf))).catch(() => null);
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
    if (ctx.reuse && (await inPlace(ctx.cache, p, ctx.hashes[p])) !== null) return;
    const copy = await oldBody(ctx.olds, p, ctx.hashes[p]).catch(() => null);
    if (copy) await store(ctx, p, copy); else need.add(p);
  }));
  await Promise.all(PACKS.map(async ([dir, pack, field]) => {
    const mine = [...need].filter((p) => p.startsWith(dir));
    const want = ctx.hashes[pack];
    if (!want || mine.length < 4 || ctx.full) return; // a few changed items: fetched one by one
    const buf = (await oldBody(ctx.olds, pack, want).catch(() => null)) || (await fetchBody(pack, want, ctx.mode).catch(() => null));
    let list = null;
    try { list = buf && JSON.parse(new TextDecoder().decode(buf))[field]; } catch { /* fetched one by one below */ }
    for (const item of Array.isArray(list) ? list : []) {
      const p = `${dir}${item?.id}.json`;
      if (!need.has(p)) continue;
      const buf = new TextEncoder().encode(`${JSON.stringify(item)}\n`);
      if ((await digest(buf)) !== ctx.hashes[p]) continue;
      await store(ctx, p, buf);
      need.delete(p);
    }
  }));
  await Promise.all([...need].map((p) => ensure(ctx, p)));
}

async function install(ctx) {
  // A cache of this release that already holds it whole is the learner's (the registration went away and Cache
  // Storage stayed): this install completes it in place and, if it fails, leaves it. Any other is this install's own.
  const had = await caches.has(CACHE);
  ctx.cache = had ? await caches.open(CACHE) : null;
  ctx.reuse = had;
  ctx.own = !(had && (await holds(ctx.cache)));
  const { names, caches: olds } = await olderCaches();
  // The one-time upgrade: the active worker is the hand-numbered caches' (b2b669b's), which serves code network-first
  // through the HTTP cache. This install's requests then bypass that cache entirely: if it fails (no room), a new
  // index.html and app.js fetched here would otherwise reach the page next to the old release's modules, and the old
  // worker would store that mix (offline Lucid then no longer starts). Its files differ from the old ones, so a
  // revalidation would download them anyway.
  const legacy = Boolean(self.registration?.active) && names.length > 0 && names.every((n) => LEGACY.test(n));
  const { buf: listing, hashes } = await releaseFile();
  Object.assign(ctx, { olds, hashes, full: false, mode: legacy ? 'no-store' : 'no-cache' });
  // The shell and release.json are read first, then the room for them is checked, and only then is anything written:
  // an install that cannot fit them takes nothing from the space the active release (or the hand-numbered caches'
  // worker, which still writes) has left.
  const shell = await Promise.all(SHELL.map(async (p) => {
    if (p === 'release.json') {
      const size = await inPlace(ctx.cache, p, await digest(listing));
      return { p, buf: listing, size: size ?? listing.byteLength, write: size === null };
    }
    const size = await inPlace(ctx.cache, p, hashes[hashKey(p)]);
    if (size !== null) return { p, size, write: false };
    const buf = await bodyOf(ctx, p);
    return { p, buf, size: buf.byteLength, write: true };
  }));
  const writes = shell.filter((s) => s.write);
  ctx.cache ||= await caches.open(CACHE);
  await unclaim(ctx.cache); // left by an attempt that stopped half-way
  if (writes.length) {
    if (!(await claim(ctx.cache, writes.reduce((n, s) => n + s.size, 0)))) throw full(`release ${RELEASE}'s shell`);
    await unclaim(ctx.cache);
  }
  // release.json last: a cache holding it holds the shell too.
  await Promise.all(writes.filter((s) => s.p !== 'release.json').map((s) => store(ctx, s.p, s.buf, true)));
  for (const s of writes.filter((w) => w.p === 'release.json')) await store(ctx, s.p, s.buf, true);
  // The best-effort files next to the ballast: none when even that does not fit.
  ctx.full = !(await claim(ctx.cache, RESERVE * shell.reduce((n, s) => n + s.size, 0)));
  // Then the offline list: code first, so the modules a learner's next screen needs are in the HTTP cache early;
  // content second.
  let list = [];
  try { list = JSON.parse(new TextDecoder().decode(shell.find((s) => s.p === 'content/manifest.json').buf || (await (await ctx.cache.match('content/manifest.json')).arrayBuffer()))).offline || []; } catch { /* the shell is enough to start */ }
  const code = (p) => /^(js|vendor)\//.test(p);
  const todo = list.filter((p) => !SHELL.includes(p));
  await Promise.all(todo.filter(code).map((p) => ensure(ctx, p)));
  await Promise.all([...todo.filter((p) => !code(p) && !isItem(p)).map((p) => ensure(ctx, p)), unpack(ctx, todo.filter(isItem))]);
  await unclaim(ctx.cache);
  if (!ctx.full) await carryOver(ctx.cache, hashes, olds, { refetch: true, mode: ctx.mode });
  // The cache is opened again by name: one removed while this install ran (by an older release's activation) fails
  // the install, so the browser tries again, instead of a release waiting with nothing to serve.
  if (!(await caches.has(CACHE)) || !(await holds(await caches.open(CACHE)))) throw new Error(`${CACHE} lost its shell while installing`);
  // No release is active yet (first visit), or the active one predates release hashes: take over at once, as the
  // old worker did. Otherwise wait for the page's message or for every tab to close.
  if (!self.registration?.active || legacy) await self.skipWaiting();
}

self.addEventListener('install', (e) => {
  // An install that fails, for any reason (no room, a stale or missing file, the worker's cache removed), gives its
  // own cache back, entries first so the space is free at once; the next attempt copies again.
  const ctx = {};
  e.waitUntil(install(ctx).catch(async (err) => {
    if (ctx.own && ctx.cache) { await empty(ctx.cache); await caches.delete(CACHE).catch(() => null); }
    throw err;
  }));
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'lucid:activate') e.waitUntil(self.skipWaiting());
});

// After activation has removed the old caches: their entries are deleted (the space they held comes back now, not
// when this worker stops), then the saved lessons that changed in this release are fetched again (best effort), then
// the files of the offline list that the install left out for want of room (fillIn).
// Not part of the activation itself, which holds every fetch until it ends; the next fetch events keep it alive.
let refill = null;
// Fetches, checks and keeps the offline list's files missing from cache (code first), a few at a time, next to the
// ballast (room for the next release's shell). Nothing is fetched when the install stored them all.
async function fillIn(cache, hashes) {
  let list = [];
  try { list = JSON.parse(new TextDecoder().decode(await (await cache.match('content/manifest.json')).arrayBuffer())).offline || []; } catch { return; }
  const have = new Set((await cache.keys()).map((r) => new URL(r.url).pathname.slice(SCOPE.length)));
  const code = (p) => /^(js|vendor)\//.test(p);
  const todo = [...list.filter(code), ...list.filter((p) => !code(p))].filter((p) => !SHELL.includes(p) && !have.has(p) && hashes[p]);
  if (!todo.length) return;
  await (keeping = keeping.then(async () => {
    if (!(await claim(cache, await reserve(cache)))) return;
    try {
      for (let i = 0; i < todo.length; i += 6) {
        const got = await Promise.all(todo.slice(i, i + 6).map((p) => fetchBody(p, hashes[p]).then((buf) => [p, buf], () => null)));
        for (const [p, buf] of got.filter(Boolean)) if (!(await cache.put(p, entry(p, buf)).then(() => true, () => false))) return;
      }
    } finally { await unclaim(cache); }
  }).catch(() => null));
}
const newerRelease = () => Boolean(self.registration?.installing || self.registration?.waiting);
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const { names, caches: olds } = await olderCaches();
    // Older caches go only when this one can start the app without them, and not while a newer release installs or
    // waits: its cache is one of them, and its own activation removes the rest.
    await unclaim(cache); // a ballast left by a worker stopped half-way
    const hashes = await holds(cache);
    const missed = await carryOver(cache, hashes, olds, { activating: !newerRelease() }).catch(() => []);
    const gone = hashes && !newerRelease() ? olds : [];
    if (gone.length) await Promise.all(names.map((k) => caches.delete(k)));
    await self.clients.claim();
    if (gone.length || missed.length) {
      refill = Promise.all(gone.map(empty)).then(() => Promise.all(missed.map((rel) => refetchLesson(cache, hashes, rel))))
        .then(() => (gone.length ? fillIn(cache, hashes) : null)).catch(() => null).finally(() => { refill = null; });
    }
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
// It is kept only next to the ballast (keep), so room for the next release's shell stays free.
// The HTTP cache's copy comes first, whatever its age, when its bytes are this release's: after a deploy the server
// already serves the next release's file, and on a full origin (where the next release cannot install yet) the copy
// the install fetched without keeping it (ensure) is the only one of this release left.
async function verifiedMiss(e, cache, rel, key) {
  const want = (await trustedHashes(cache))[hashKey(keyOf(rel))];
  if (!want) return fetch(e.request); // not part of the release, or nothing to check against: passed on, not kept
  try {
    const p = new URL(key).pathname.slice(SCOPE.length) || './';
    const buf = (await httpCopy(p, want)) || (await fetchBody(p, want));
    e.waitUntil(keep(cache, key, entry(p, buf)));
    return entry(p, buf);
  } catch (err) {
    if (err.mismatch) return e.request.mode === 'navigate' ? fetch(e.request) : Response.error();
    throw err;
  }
}

// The ballast's size: RESERVE times this release's release.json and shell, measured once per worker lifetime.
let reserved = null;
function reserve(cache) {
  reserved ??= (async () => {
    let n = 0;
    for (const p of SHELL) n += (await (await cache.match(p))?.arrayBuffer())?.byteLength || 0;
    return RESERVE * n;
  })().catch(() => { reserved = null; return 0; });
  return reserved;
}
// Best-effort writes after the install, one at a time, each next to the ballast: one that would eat into the room for
// the next release's shell is skipped.
let keeping = Promise.resolve();
function keep(cache, key, res) {
  keeping = keeping.then(async () => {
    if (!(await claim(cache, await reserve(cache)))) return;
    try { await cache.put(key, res); } catch { /* best effort */ } finally { await unclaim(cache); }
  }).catch(() => null);
  return keeping;
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
// no longer waiting (Chromium activates it about 1 s after the ask), or after about 2 s in any case. Only the
// navigations within HANDOVER_MS of the first ask get that page (two tabs loaded together): a later one (that
// page's own reload, when the waiting worker did not take over because this one still has a request in hand, such
// as a lesson fetch that the network never answers) is served the app by this release, so the cost is one page.
const HANDOVER_MS = 1000;
let handover = null; // { worker, at }: the waiting worker asked to take over, and when it was first asked
function handingOver() {
  const waiting = self.registration?.waiting;
  if (!waiting) { handover = null; return false; }
  if (handover?.worker !== waiting) handover = { worker: waiting, at: Date.now() };
  if (Date.now() - handover.at > HANDOVER_MS) return false;
  try { waiting.postMessage({ type: 'lucid:activate' }); } catch { return false; }
  return true;
}
// The page for that moment: the app's ground and ink for each colour scheme (index.html's boot frame), one status
// line for screen readers, and one inline script and one style allowed by its own policy (a nonce); never stored.
// The worker does not know the learner's interface language (it is in the page's database), so the status line is
// in both, each part marked with its own language and direction, so a screen reader speaks each in its voice.
const HANDOVER_STYLE = 'html{background:oklch(0.972 0.004 250);color:oklch(0.185 0.010 250);font:1rem/1.5 system-ui,-apple-system,\'Segoe UI\',Arial,sans-serif}'
  + 'body{margin:0;min-height:100vh;display:grid;place-items:center}p{margin:0;opacity:0.7;text-align:center}p span{display:block}'
  + '@media (prefers-color-scheme:dark){html{background:oklch(0.165 0.010 250);color:oklch(0.95 0.005 250)}}';
// It gives up after 2 s of wall time (not a count of polls, which a hidden tab's throttled timers would stretch).
const HANDOVER_SCRIPT = "const t=Date.now();let done=false;const sw=navigator.serviceWorker,go=()=>{if(!done){done=true;location.reload();}};"
  + "sw.addEventListener('controllerchange',go);(function poll(){sw.getRegistration().then((r)=>(!r||!r.waiting||Date.now()-t>2000?go():setTimeout(poll,50)),go);})();";
function handoverPage() {
  const nonce = hex(crypto.getRandomValues(new Uint8Array(16)));
  return new Response(`<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="color-scheme" content="light dark"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Lucid</title><style nonce="${nonce}">${HANDOVER_STYLE}</style><body><p role="status"><span lang="he" dir="rtl">מעדכנים את Lucid…</span><span lang="en" dir="ltr">Updating Lucid…</span></p><script nonce="${nonce}">${HANDOVER_SCRIPT}</script></body></html>`, {
    status: 200,
    headers: { 'content-type': TYPES.html, 'cache-control': 'no-store', 'content-security-policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'` },
  });
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(SCOPE)) return;
  const rel = url.pathname.slice(SCOPE.length);
  if (refill) e.waitUntil(refill);
  // release.json is this worker's own (read at install, and checked against LISTING): a request for it, a
  // navigation included, goes to the network and never reads, writes or deletes the cached copy.
  if (rel === 'release.json') return;
  if (e.request.mode === 'navigate' && isShell(rel) && handingOver()) { e.respondWith(handoverPage()); return; }
  e.respondWith(caches.open(CACHE).then((cache) => (fromRelease(e.request, rel) ? cacheFirst(e, cache, rel) : staleWhileRevalidate(e, cache))));
});
