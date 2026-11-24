// Service worker (security review S-15, perf D2-D6). sw.js runs in a vm with faked worker globals: Cache Storage,
// fetch (serving the real files of this app, so the release hashes match unless a test changes a file) and the
// registration. Covers: the cache named after the release, controlled activation, the precache (revalidating,
// lean, code before content), the incremental install with hash checks and lesson carry-over, and routing
// (release cache first for code, fonts, vendor and content; lessons stale-while-revalidate).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import vm from 'node:vm';

const BASE = 'https://example.org/lucid/';
const APP = new URL('../../', import.meta.url);
const source = readFileSync(new URL('sw.js', APP), 'utf8');
const realRelease = JSON.parse(readFileSync(new URL('release.json', APP), 'utf8'));
const manifest = JSON.parse(readFileSync(new URL('content/manifest.json', APP), 'utf8'));
// The hand-numbered caches of the releases before release hashes: 2026-11-07.1 (d83a500, in production) and
// 2026-11-03.1 (b2b669b, the one before it); the same worker apart from RELEASE, so the one-time upgrade treats both alike.
const LEGACY_RELEASES = ['2026-11-07.1', '2026-11-03.1'];
// The per-file hash release.json carries (a 128-bit SHA-256 prefix, as tools/build-manifest.mjs writes it).
const hh = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 32);
const abs = (p) => new URL(p, BASE).href;
const key = (r) => new URL(typeof r === 'string' ? r : r.url, BASE).href;

// A network response like a same-origin fetch's (type 'basic').
function netRes(body, status = 200) {
  const r = new Response(status === 304 || status === 204 ? null : body, { status, headers: { 'content-type': 'text/plain', 'content-encoding': 'gzip', vary: 'Accept-Encoding' } });
  Object.defineProperty(r, 'type', { value: 'basic' });
  const clone = r.clone.bind(r);
  r.clone = () => { const c = clone(); Object.defineProperty(c, 'type', { value: 'basic' }); return c; };
  return r;
}

// Shared by every worker made from it: the server, Cache Storage and a log of requests.
function makeEnv() {
  // fail(url): 'network', 'hang' (no answer), a status for a request that should fail, or a promise the answer waits
  // for; digests counts SHA-256 runs in the workers.
  // quota: the bytes Cache Storage may hold in all (a write past it fails with QuotaExceededError, as in a browser).
  // As in Chromium, a put that replaces an entry needs room for the new body before the old one is freed, and a
  // deleted cache's bytes stay counted while a worker that opened it runs (worker.stop() ends that), unless its
  // entries are deleted through the Cache object. http: what the HTTP cache holds (url -> body), which a
  // 'force-cache' request gets offline.
  // written: the URLs of the app's files written (not the worker's room probes); afterPut(url): called after a write.
  const env = { online: true, fetches: [], overrides: new Map(), stores: new Map(), fail: () => null, digests: 0, quota: Infinity, http: new Map(), written: [], afterPut: () => {} };
  const sizes = new Map(); // `${store id} ${url}` -> bytes
  let ids = 0;
  env.used = () => [...sizes.values()].reduce((a, n) => a + n, 0);
  env.serve = (url) => {
    const u = new URL(url);
    if (env.overrides.has(u.pathname + u.search)) return env.overrides.get(u.pathname + u.search);
    if (env.overrides.has(u.pathname) && !u.search) return env.overrides.get(u.pathname);
    let rel = u.pathname.slice('/lucid/'.length);
    if (rel === '' || rel === 'index.html') rel = 'index.html';
    const f = new URL(rel, APP);
    return u.pathname.startsWith('/lucid/') && existsSync(f) ? readFileSync(f) : null;
  };
  env.open = (name) => {
    if (!env.stores.has(name)) {
      const m = new Map();
      const id = ++ids;
      env.stores.set(name, {
        m, id, name,
        match: async (r) => { const v = m.get(key(r)); return v ? v.clone() : undefined; },
        put: async (r, v) => {
          const size = (await v.clone().arrayBuffer()).byteLength;
          if (env.used() + size > env.quota) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
          sizes.set(`${id} ${key(r)}`, size);
          m.set(key(r), v);
          if (key(r).startsWith(BASE)) env.written.push(key(r));
          env.afterPut(key(r));
        },
        delete: async (r) => { sizes.delete(`${id} ${key(r)}`); return m.delete(key(r)); },
        keys: async () => [...m.keys()].map((url) => ({ url })),
      });
    }
    return env.stores.get(name);
  };
  env.free = (id) => { for (const k of [...sizes.keys()]) if (k.startsWith(`${id} `)) sizes.delete(k); };
  // held: the store ids a running worker opened (their bytes stay counted after the delete until it stops).
  env.deleteStore = (name, held = null) => {
    const store = env.stores.get(name);
    if (!store) return false;
    if (held?.has(store.id)) held.ghosts.add(store.id); else env.free(store.id);
    return env.stores.delete(name);
  };
  env.cached = async (name, path) => { const r = await env.open(name).match(path); return r ? Buffer.from(await r.arrayBuffer()).toString() : undefined; };
  return env;
}

// The LISTING line tools/build-manifest.mjs writes for a hash list.
const listingOf = (hashes) => createHash('sha256').update(Object.entries(hashes).map(([p, h]) => `${p} ${h}\n`).join('')).digest('hex');
// One worker. release: the RELEASE it is built with (the committed one by default); release.json is served to match,
// and the worker's LISTING matches its hashes.
// wait: how long the install waits for release.json (RELEASE_WAIT_MS), shortened for the tests that need it.
// waiting: a fake waiting worker (its postMessage calls are logged in calls.posted); handover: HANDOVER_MS;
// installing: a fake installing worker (a newer release).
function worker(env, { release = realRelease.release, hashes = realRelease.hashes, active = false, wait, waiting = null, handover, installing = null } = {}) {
  let src = source.replace(/^const RELEASE = '[^']*';$/m, `const RELEASE = '${release}';`).replace(/^const LISTING = '[^']*';$/m, `const LISTING = '${listingOf(hashes)}';`);
  if (wait !== undefined) {
    assert.match(src, /^const RELEASE_WAIT_MS = \d+;$/m);
    src = src.replace(/^const RELEASE_WAIT_MS = \d+;$/m, `const RELEASE_WAIT_MS = ${wait};`);
  }
  if (handover !== undefined) {
    assert.match(src, /^const HANDOVER_MS = \d+;$/m);
    src = src.replace(/^const HANDOVER_MS = \d+;$/m, `const HANDOVER_MS = ${handover};`);
  }
  if (release !== realRelease.release || hashes !== realRelease.hashes) env.overrides.set('/lucid/release.json', JSON.stringify({ release, hashes }));
  const listeners = {};
  const calls = { skipWaiting: 0, claim: 0, posted: [] };
  const held = Object.assign(new Set(), { ghosts: new Set() });
  const self = {
    location: new URL('sw.js', BASE),
    registration: { active: active ? {} : null, waiting, installing },
    addEventListener: (t, fn) => { listeners[t] = fn; },
    skipWaiting: async () => { calls.skipWaiting++; },
    clients: { claim: async () => { calls.claim++; } },
  };
  const context = vm.createContext({
    self, location: self.location, URL, setTimeout, clearTimeout, Promise, Response, Headers, TextDecoder, TextEncoder, AbortController,
    crypto: { subtle: { digest: (algo, buf) => { env.digests += 1; return webcrypto.subtle.digest(algo, buf); } }, getRandomValues: (a) => webcrypto.getRandomValues(a) },
    Request: class { constructor(u, init = {}) { this.url = new URL(typeof u === 'string' ? u : u.url, BASE).href; this.cache = init.cache; this.method = 'GET'; this.mode = 'cors'; } },
    caches: {
      open: async (n) => { const c = env.open(n); held.add(c.id); return c; },
      has: async (n) => env.stores.has(n),
      keys: async () => [...env.stores.keys()],
      delete: async (n) => env.deleteStore(n, held),
    },
    fetch: async (r) => {
      const url = key(r);
      env.fetches.push({ url, cache: r.cache });
      if (r.cache === 'force-cache' && env.http.has(url)) return netRes(env.http.get(url));
      if (!env.online) throw new TypeError('offline');
      const failure = env.fail(url);
      if (failure === 'network') throw new TypeError('Failed to fetch');
      if (failure === 'hang') return new Promise(() => {});
      if (typeof failure?.then === 'function') await failure;
      else if (failure) return netRes('busy', failure);
      const body = env.serve(url);
      return body == null ? netRes('not found', 404) : netRes(body);
    },
  });
  vm.runInContext(src, context);
  const fire = async (type, request, data) => {
    const waits = [];
    let response;
    const e = { request, data, waitUntil: (p) => waits.push(p), respondWith: (p) => { response = p; } };
    listeners[type](e);
    const out = response ? await response : undefined;
    await Promise.all(waits);
    return { response: out, handled: Boolean(response) };
  };
  // stop(): the worker ends, and with it its Cache objects: deleted caches it held give their space back.
  const stop = () => { for (const id of held.ghosts) env.free(id); held.ghosts.clear(); held.clear(); };
  return { calls, fire, stop, name: `lucid-${release}`, cache: () => env.open(`lucid-${release}`) };
}
const req = (path, mode = 'cors', method = 'GET') => ({ url: abs(path), mode, method });
const body = async (r) => Buffer.from(await r.arrayBuffer()).toString();
const file = (p) => readFileSync(new URL(p, APP)).toString();

test('the cache is named after the release; a first install activates at once and activation removes only older Lucid caches', async () => {
  const env = makeEnv();
  await env.open('lucid-v1').put(abs('index.html'), netRes('old'));
  await env.open('hgos-v3').put('https://example.org/crm/index.html', netRes('crm'));
  const w = worker(env);
  await w.fire('install');
  assert.match(w.name, /^lucid-[0-9a-f]{12}$/);
  assert.equal(await env.cached(w.name, 'js/app.js'), file('js/app.js'));
  assert.equal(w.calls.skipWaiting, 1, 'no worker was active: the first install takes over');
  await w.fire('activate');
  assert.equal(w.calls.claim, 1, 'the first page becomes controlled');
  assert.deepEqual([...env.stores.keys()].sort(), ['hgos-v3', w.name].sort());
});

test('with a release active, a new one waits until a page asks for it (contract C-4)', async () => {
  const env = makeEnv();
  const a = worker(env, { release: 'aaaaaaaaaaaa' });
  await a.fire('install');
  await a.fire('activate');
  const b = worker(env, { release: 'bbbbbbbbbbbb', active: true });
  await b.fire('install');
  assert.equal(b.calls.skipWaiting, 0, 'activated in the middle of a session');
  await b.fire('message', undefined, { type: 'something-else' });
  await b.fire('message', undefined, null);
  assert.equal(b.calls.skipWaiting, 0);
  await b.fire('message', undefined, { type: 'lucid:activate' });
  assert.equal(b.calls.skipWaiting, 1);
});

for (const legacyRel of LEGACY_RELEASES) test(`the one-time upgrade from the hand-numbered caches activates at once, as the old worker did (lucid-${legacyRel})`, async () => {
  const env = makeEnv();
  await env.open(`lucid-${legacyRel}`).put(abs('js/app.js'), netRes('old app'));
  const w = worker(env, { active: true });
  await w.fire('install');
  assert.equal(w.calls.skipWaiting, 1);
});

test('the precache revalidates (no-cache), stores the shell once with all three fonts, leaves out lessons, and fetches code before content', async () => {
  const env = makeEnv();
  const w = worker(env);
  await w.fire('install');
  const cache = w.cache();
  assert.ok(env.fetches.length > 50 && env.fetches.every((f) => f.cache === 'no-cache'), 'every precache request revalidates');
  for (const f of ['js/views/review.js', 'js/views/simulations.js', 'js/views/settings.js', 'content/real-life/index.json', 'content/real-life/scenario/rl-airport-checkin-overweight.json', 'content/writing/index.json', 'content/writing/task/we-01.json', 'vendor/ts-fsrs.mjs', 'privacy.html', 'accessibility.html', 'release.json', 'content/manifest.json']) {
    assert.ok(await cache.match(f), `${f} not precached`);
  }
  // Contract C-2: the sources the index files replace, and the centre and pool files, are not precached.
  for (const f of ['content/real-life/scenarios.json', 'content/writing/exercises.json', 'content/centers/read.json', 'content/pool/A1.json']) {
    assert.equal(await cache.match(f), undefined, `${f} precached`);
  }
  assert.equal(await env.cached(w.name, './'), file('index.html'));
  assert.equal(cache.m.has(abs('index.html')), false, 'index.html is stored once, as ./');
  // The accented Latin font draws every lesson's IPA transcriptions (U+0100-02FF): precached for offline lessons, as
  // release 2026-11-03.1 did.
  assert.equal(await env.cached(w.name, 'fonts/rubik-latin-ext.woff2'), file('fonts/rubik-latin-ext.woff2'));
  assert.equal(await cache.match('content/lessons/pa1-01.json'), undefined, 'lessons are saved on request, not on install');
  const order = env.fetches.map((f) => new URL(f.url).pathname.slice('/lucid/'.length));
  const lastCode = Math.max(...order.map((p, i) => (/^(js|vendor)\//.test(p) && p !== 'js/app.js' ? i : -1)));
  const firstContent = order.findIndex((p) => p.startsWith('content/') && !['content/taxonomy.json', 'content/curriculum.json', 'content/manifest.json'].includes(p));
  assert.ok(lastCode < firstContent, 'code is fetched before content');
  const expected = new Set([...manifest.offline, 'index.html', 'release.json', 'config.js', 'css/app.css', 'js/app.js', 'manifest.webmanifest', 'assets/favicon.svg', 'fonts/rubik-latin.woff2', 'fonts/rubik-hebrew.woff2', 'fonts/rubik-latin-ext.woff2', 'content/taxonomy.json', 'content/curriculum.json', 'content/manifest.json'].map((p) => (p === 'index.html' ? '' : p)));
  // One request per file, except the per-item scenario and task files: their three source files are fetched once
  // each and the items written from them, byte for byte (each checked against its hash).
  const items = [...expected].filter((p) => /^content\/(real-life\/scenario|writing\/task)\//.test(p));
  const packs = ['content/real-life/scenarios.json', 'content/writing/exercises.json', 'content/writing/assignments.json'];
  assert.ok(items.length > 60);
  assert.deepEqual([...order].sort(), [...[...expected].filter((p) => !items.includes(p)), ...packs].sort(), 'one request per file');
  for (const p of items) assert.equal(await env.cached(w.name, p), file(p), p);
  for (const p of packs) assert.equal(await cache.match(p), undefined, `${p} is a transport, not kept`);
});

test('an update with a few changed scenarios fetches only those; one that cannot be written from its source file is fetched', async () => {
  const env = makeEnv();
  const a = worker(env, { release: 'aaaaaaaaaaaa' });
  await a.fire('install');
  await a.fire('activate');
  const changed = 'content/real-life/scenario/rl-airport-checkin-overweight.json';
  env.overrides.set(`/lucid/${changed}`, '{"id":"rl-airport-checkin-overweight","changed":true}\n');
  env.fetches = [];
  const b = worker(env, { release: 'bbbbbbbbbbbb', hashes: { ...realRelease.hashes, [changed]: hh('{"id":"rl-airport-checkin-overweight","changed":true}\n') }, active: true });
  await b.fire('install');
  assert.deepEqual(env.fetches.map((f) => new URL(f.url).pathname.slice('/lucid/'.length)).sort(), [changed, 'release.json'].sort());
  assert.equal(await env.cached(b.name, changed), '{"id":"rl-airport-checkin-overweight","changed":true}\n');
  // A first install whose source file does not give an item's bytes (an edge still serving the old source file):
  // that item is fetched by itself and checked like any file.
  const env2 = makeEnv();
  const scen = JSON.parse(file('content/real-life/scenarios.json'));
  scen.scenarios[0] = { ...scen.scenarios[0], title_en: 'stale title' };
  env2.overrides.set('/lucid/content/real-life/scenarios.json', JSON.stringify(scen));
  env2.overrides.set(`/lucid/content/real-life/scenarios.json?r=${realRelease.hashes['content/real-life/scenarios.json']}`, JSON.stringify(scen));
  const w = worker(env2);
  await w.fire('install');
  const first = `content/real-life/scenario/${scen.scenarios[0].id}.json`;
  assert.equal(await env2.cached(w.name, first), file(first));
  // The source file matches its hash, but an item's hash is not that of its cut (JSON.stringify(item) + "\n"), as when
  // the generator's item format and the worker's cut disagree: that item is fetched by itself, and the cut bytes are
  // never stored.
  const env3 = makeEnv();
  const item = `content/real-life/scenario/${JSON.parse(file('content/real-life/scenarios.json')).scenarios[1].id}.json`;
  const served = `${file(item).trimEnd()}\n\n`; // the same item, written differently
  env3.overrides.set(`/lucid/${item}`, served);
  const w3 = worker(env3, { release: 'cccccccccccc', hashes: { ...realRelease.hashes, [item]: hh(served) } });
  await w3.fire('install');
  assert.equal(await env3.cached(w3.name, item), served, 'the cut bytes were stored for an item they do not match');
  assert.ok(env3.fetches.some((f) => f.url === abs(item)), 'the item was not fetched by itself');
  assert.equal(env3.fetches.filter((f) => new URL(f.url).pathname.startsWith('/lucid/content/real-life/scenario/')).length, 1, 'only that item');
});

test('code, fonts, vendor and content are served from the release cache; a miss goes to the network and is kept', async () => {
  const env = makeEnv();
  const w = worker(env);
  await w.fire('install');
  const cache = w.cache();
  env.overrides.set('/lucid/js/core/api.js', 'changed on the server');
  const n = env.fetches.length;
  assert.equal(await body((await w.fire('fetch', req('js/core/api.js'))).response), file('js/core/api.js'), 'the release\'s copy, not the server\'s');
  for (const p of ['config.js', 'css/app.css', 'vendor/ts-fsrs.mjs', 'fonts/rubik-hebrew.woff2', 'content/taxonomy.json', 'content/manifest.json', 'content/real-life/index.json', 'content/real-life/scenario/rl-airport-checkin-overweight.json', 'content/writing/task/we-01.json']) {
    assert.equal(await body((await w.fire('fetch', req(p))).response), file(p), p);
  }
  for (const [path, mode] of [['./?utm=1', 'navigate'], ['index.html', 'navigate'], ['./', 'navigate'], ['index.html', 'cors']]) {
    assert.equal(await body((await w.fire('fetch', req(path, mode))).response), file('index.html'), path);
  }
  assert.equal(env.fetches.length, n, 'a repeat visit makes no request');
  // A miss: the full scenarios file (not precached; content.js reads it when the index cannot be loaded), fetched,
  // checked against release.json and kept for next time.
  assert.equal(await body((await w.fire('fetch', req('content/real-life/scenarios.json'))).response), file('content/real-life/scenarios.json'));
  assert.ok(await cache.match('content/real-life/scenarios.json'));
  assert.equal(env.fetches.length, n + 1);
  // Offline: the cached copies, and the shell for any navigation of the app.
  env.online = false;
  assert.equal(await body((await w.fire('fetch', req('js/core/api.js'))).response), file('js/core/api.js'));
  assert.equal(await body((await w.fire('fetch', req('./?utm=2', 'navigate'))).response), file('index.html'), 'an offline navigation falls back to the shell');
  assert.equal(await body((await w.fire('fetch', req('privacy.html', 'navigate'))).response), file('privacy.html'));
  assert.equal(await body((await w.fire('fetch', req('accessibility.html', 'navigate'))).response), file('accessibility.html'), 'the accessibility statement opens offline (launch BLK-07)');
  assert.equal(await body((await w.fire('fetch', req('docs/unknown.html', 'navigate'))).response), file('index.html'));
  env.online = true;
  // A page in the scope that is not part of the app is passed through and not kept.
  env.overrides.set('/lucid/docs/notes.html', 'notes');
  assert.equal(await body((await w.fire('fetch', req('docs/notes.html', 'navigate'))).response), 'notes');
  assert.equal(await cache.match('docs/notes.html'), undefined);
});

test('lessons are stale-while-revalidate', async () => {
  const env = makeEnv();
  const w = worker(env);
  await w.fire('install');
  const cache = w.cache();
  await cache.put('content/lessons/a1-01.json', netRes('cached lesson'));
  const first = await w.fire('fetch', req('content/lessons/a1-01.json'));
  assert.equal(await body(first.response), 'cached lesson', 'served from cache at once');
  assert.equal(await env.cached(w.name, 'content/lessons/a1-01.json'), file('content/lessons/a1-01.json'), 'and refreshed for next time');
  const fresh = await w.fire('fetch', req('content/lessons/a1-02.json'));
  assert.equal(await body(fresh.response), file('content/lessons/a1-02.json'));
  assert.ok(await cache.match('content/lessons/a1-02.json'), 'a lesson opened once is kept');
});

test('other origins, other apps on the origin and non-GET requests are not touched', async () => {
  const w = worker(makeEnv());
  await w.fire('install');
  assert.equal((await w.fire('fetch', { url: 'https://abc.supabase.co/rest/v1/lucid_records', mode: 'cors', method: 'GET' })).handled, false);
  assert.equal((await w.fire('fetch', { url: 'https://example.org/crm/js/app.js', mode: 'cors', method: 'GET' })).handled, false);
  assert.equal((await w.fire('fetch', req('js/app.js', 'cors', 'POST'))).handled, false);
});

// A release that changes one module and one saved lesson: everything else is copied from the previous cache.
test('an update fetches only release.json and the changed files, and carries unchanged saved lessons over (D5)', async () => {
  const env = makeEnv();
  const a = worker(env, { release: 'aaaaaaaaaaaa' });
  await a.fire('install');
  await a.fire('activate');
  for (const l of ['a1-01', 'a1-02', 'a1-03', 'a1-04']) await a.fire('fetch', req(`content/lessons/${l}.json`));
  env.overrides.set('/lucid/js/views/today.js', 'export default 1; // new');
  env.overrides.set('/lucid/content/lessons/a1-04.json', '{"changed":true}');
  const hashes = { ...realRelease.hashes, 'js/views/today.js': hh('export default 1; // new'), 'content/lessons/a1-04.json': hh('{"changed":true}') };
  env.fetches = [];
  const b = worker(env, { release: 'bbbbbbbbbbbb', hashes, active: true });
  await b.fire('install');
  const got = env.fetches.map((f) => new URL(f.url).pathname.slice('/lucid/'.length)).sort();
  assert.deepEqual(got, ['content/lessons/a1-04.json', 'js/views/today.js', 'release.json']);
  assert.equal(await env.cached(b.name, 'js/views/today.js'), 'export default 1; // new');
  assert.equal(await env.cached(b.name, 'js/app.js'), file('js/app.js'), 'unchanged files are copied');
  assert.equal(await env.cached(b.name, './'), file('index.html'));
  for (const l of ['a1-01', 'a1-02', 'a1-03']) assert.equal(await env.cached(b.name, `content/lessons/${l}.json`), file(`content/lessons/${l}.json`), l);
  assert.equal(await env.cached(b.name, 'content/lessons/a1-04.json'), '{"changed":true}', 'a changed saved lesson is fetched again');
  // A lesson saved while the new release waited is carried over at activation.
  await a.fire('fetch', req('content/lessons/a1-05.json'));
  await b.fire('message', undefined, { type: 'lucid:activate' });
  await b.fire('activate');
  assert.equal(await env.cached(b.name, 'content/lessons/a1-05.json'), file('content/lessons/a1-05.json'));
  assert.deepEqual([...env.stores.keys()], [b.name]);
});

test('copies are checked byte for byte: a stale saved lesson or a tampered copy in the old cache is not carried over', async () => {
  const env = makeEnv();
  const a = worker(env, { release: 'aaaaaaaaaaaa' });
  await a.fire('install');
  await a.cache().put('js/app.js', netRes('tampered'));
  await a.cache().put('content/lessons/a1-01.json', netRes('{"old":true}'));
  env.fetches = [];
  const b = worker(env, { release: 'bbbbbbbbbbbb', active: true });
  await b.fire('install');
  assert.equal(await env.cached(b.name, 'js/app.js'), file('js/app.js'));
  assert.equal(await env.cached(b.name, 'content/lessons/a1-01.json'), file('content/lessons/a1-01.json'));
  assert.ok(env.fetches.some((f) => f.url.endsWith('/js/app.js')));
});

for (const legacyRel of LEGACY_RELEASES) test(`the upgrade from a hand-numbered cache keeps saved lessons whose bytes match (lucid-${legacyRel})`, async () => {
  const env = makeEnv();
  const legacy = env.open(`lucid-${legacyRel}`);
  await legacy.put(abs('content/lessons/b1-03.json'), netRes(file('content/lessons/b1-03.json')));
  await legacy.put(abs('content/lessons/b1-04.json'), netRes('{"outdated":true}'));
  await legacy.put(abs('js/app.js'), netRes(file('js/app.js')));
  env.fetches = [];
  const w = worker(env, { active: true });
  await w.fire('install');
  await w.fire('activate');
  assert.equal(await env.cached(w.name, 'content/lessons/b1-03.json'), file('content/lessons/b1-03.json'));
  assert.equal(await env.cached(w.name, 'content/lessons/b1-04.json'), file('content/lessons/b1-04.json'), 'an outdated saved lesson is fetched again');
  assert.ok(!env.fetches.some((f) => f.url.endsWith('/js/app.js')), 'a matching copy is not downloaded again');
});

test('a fetched file that does not match its hash is fetched once more past the caches, then fails the install', async () => {
  const env = makeEnv();
  // An edge still serving the previous deploy for the plain URL; the cache-busting URL is current.
  env.overrides.set('/lucid/js/views/today.js', 'stale today');
  const w = worker(env);
  await w.fire('install');
  assert.equal(await env.cached(w.name, 'js/views/today.js'), file('js/views/today.js'), 'stored under the plain URL');
  assert.ok(env.fetches.some((f) => f.url === abs(`js/views/today.js?r=${realRelease.hashes['js/views/today.js']}`)));
  assert.equal(w.calls.skipWaiting, 1);
  // Both stale: the install fails, so the active release stays.
  const env2 = makeEnv();
  const a = worker(env2, { release: 'aaaaaaaaaaaa' });
  await a.fire('install');
  await a.fire('activate');
  const want = hh('new today');
  env2.overrides.set('/lucid/js/views/today.js', 'stale today');
  env2.overrides.set(`/lucid/js/views/today.js?r=${want}`, 'stale today');
  const b = worker(env2, { release: 'bbbbbbbbbbbb', active: true, hashes: { ...realRelease.hashes, 'js/views/today.js': want } });
  await assert.rejects(b.fire('install'), /does not match/);
  assert.equal(await env2.cached(a.name, 'js/app.js'), file('js/app.js'), 'the active release keeps its cache');
});

test('a release.json from another release is retried, then fails the install', async () => {
  const env = makeEnv();
  env.overrides.set('/lucid/release.json', JSON.stringify({ release: '000000000000', hashes: {} }));
  env.overrides.set(`/lucid/release.json?r=${realRelease.release}`, readFileSync(new URL('release.json', APP)));
  const w = worker(env);
  await w.fire('install');
  assert.ok(await w.cache().match('release.json'));
  const env2 = makeEnv();
  env2.overrides.set('/lucid/release.json', JSON.stringify({ release: '000000000000', hashes: {} }));
  env2.overrides.set(`/lucid/release.json?r=${realRelease.release}`, JSON.stringify({ release: '000000000000', hashes: {} }));
  await assert.rejects(worker(env2).fire('install'), /release\.json/);
});

test('a missing offline file does not fail the install; a missing shell file does', async () => {
  const env = makeEnv();
  const { hashes } = realRelease;
  env.overrides.set('/lucid/js/views/tutor.js', null);
  const w = worker(env, { release: 'cccccccccccc', hashes: Object.fromEntries(Object.entries(hashes).filter(([p]) => p !== 'js/views/tutor.js')) });
  env.serve = ((serve) => (url) => (url.endsWith('/js/views/tutor.js') ? null : serve(url)))(env.serve);
  await w.fire('install');
  assert.ok(await w.cache().match('js/views/today.js'));
  const env2 = makeEnv();
  env2.serve = ((serve) => (url) => (url.endsWith('/css/app.css') ? null : serve(url)))(env2.serve);
  await assert.rejects(worker(env2).fire('install'));
});

// ---------- integrity (docs/qa/security-review.md 5a) ----------
test('release.json that cannot be loaded (an error, no connection, no answer) fails every install: a first one is tried again at the next visit; over an older Lucid cache its saved lessons stay', async () => {
  for (const failure of [503, 404, 'network', 'hang']) {
    const onlyRelease = (url) => (url === abs('release.json') ? failure : null);
    const env = makeEnv();
    env.fail = onlyRelease;
    // A first visit: no worker is installed that would then serve nothing (it could check nothing against release.json);
    // the browser runs the install again at the next visit.
    const first = worker(env, { wait: 50 });
    await assert.rejects(first.fire('install'), /release\.json/, `${failure}: a first install went ahead without release.json`);
    assert.equal(first.calls.skipWaiting, 0);
    assert.equal(await first.cache().match('js/app.js'), undefined, `${failure}: files were installed`);
    env.fail = () => null;
    const retry = worker(env);
    await retry.fire('install');
    assert.equal(await env.cached(retry.name, 'js/app.js'), file('js/app.js'), `${failure}: the next visit installs`);
    env.online = false;
    assert.equal(await body((await worker(env).fire('fetch', req('./', 'navigate'))).response), file('index.html'), `${failure}: offline after that visit`);
    // Over a release with hashes.
    const env2 = makeEnv();
    const a = worker(env2, { release: 'aaaaaaaaaaaa' });
    await a.fire('install');
    await a.fire('activate');
    await a.fire('fetch', req('content/lessons/a1-01.json'));
    env2.fail = onlyRelease;
    const b = worker(env2, { release: 'bbbbbbbbbbbb', active: true, wait: 50 });
    await assert.rejects(b.fire('install'), /release\.json/, `${failure}: installed over a hashed release without hashes`);
    assert.equal(await env2.cached(a.name, 'content/lessons/a1-01.json'), file('content/lessons/a1-01.json'), 'the saved lesson stays');
    // Over the hand-numbered cache of release 2026-11-07.1 (production) and 2026-11-03.1 (the release before it).
    for (const legacyRel of LEGACY_RELEASES) {
      const env3 = makeEnv();
      await env3.open(`lucid-${legacyRel}`).put(abs('content/lessons/b1-03.json'), netRes(file('content/lessons/b1-03.json')));
      env3.fail = onlyRelease;
      const c = worker(env3, { active: true, wait: 50 });
      await assert.rejects(c.fire('install'), /release\.json/);
      assert.equal(c.calls.skipWaiting, 0);
      assert.equal(await env3.cached(`lucid-${legacyRel}`, 'content/lessons/b1-03.json'), file('content/lessons/b1-03.json'));
    }
  }
});

test('a file the install could not get is checked when it is fetched later: a stale edge copy is never kept, and never handed to the page (C-4)', async () => {
  const env = makeEnv();
  const a = worker(env, { release: 'aaaaaaaaaaaa' });
  await a.fire('install');
  await a.fire('activate');
  const want = hh('export default 1; // new today');
  const hashes = { ...realRelease.hashes, 'js/views/today.js': want };
  env.fail = (url) => (url === abs('js/views/today.js') ? 503 : null); // once, during the install
  const b = worker(env, { release: 'bbbbbbbbbbbb', hashes, active: true });
  await b.fire('install');
  assert.equal(await b.cache().match('js/views/today.js'), undefined, 'best effort: skipped');
  env.fail = () => null;
  // The edge still serves the previous deploy's copy, also past the caches.
  env.overrides.set('/lucid/js/views/today.js', file('js/views/today.js'));
  env.overrides.set(`/lucid/js/views/today.js?r=${want}`, file('js/views/today.js'));
  // The page's import fails (the router shows its "did not load" screen) instead of running another release's module.
  assert.equal((await b.fire('fetch', req('js/views/today.js'))).response.type, 'error', 'another release\'s module was handed to the page');
  assert.ok(env.fetches.some((f) => f.url === abs(`js/views/today.js?r=${want}`)), 'retried past the caches first');
  assert.equal(await b.cache().match('js/views/today.js'), undefined, 'and not kept for the release');
  // A navigation still gets the page as the network gave it (the shell's own entry was lost, say).
  await b.cache().delete('./');
  env.overrides.set('/lucid/', 'the previous deploy\'s page');
  env.overrides.set(`/lucid/?r=${realRelease.hashes['index.html']}`, 'the previous deploy\'s page');
  assert.equal(await body((await b.fire('fetch', req('./', 'navigate'))).response), 'the previous deploy\'s page');
  assert.equal(await b.cache().match('./'), undefined);
  // The edge catches up: the release's copy is kept.
  env.overrides.set(`/lucid/js/views/today.js?r=${want}`, 'export default 1; // new today');
  assert.equal(await body((await b.fire('fetch', req('js/views/today.js'))).response), 'export default 1; // new today');
  assert.equal(await env.cached(b.name, 'js/views/today.js'), 'export default 1; // new today');
});

test('an entry changed in the release cache is never served: it is fetched again, and a changed release.json cannot vouch for it', async () => {
  const env = makeEnv();
  const w = worker(env);
  await w.fire('install');
  await w.fire('activate');
  const cache = w.cache();
  // Other script on the origin writes into the release cache; the next worker lifetime serves the release's copy.
  await cache.put('js/views/today.js', netRes('poisoned today'));
  await cache.put('./', netRes('<script src="/other/evil.js"></script>'));
  const later = worker(env);
  assert.equal(await body((await later.fire('fetch', req('js/views/today.js'))).response), file('js/views/today.js'));
  assert.equal(await env.cached(w.name, 'js/views/today.js'), file('js/views/today.js'), 'replaced in the cache');
  assert.equal(await body((await later.fire('fetch', req('./', 'navigate'))).response), file('index.html'));
  // With release.json changed to vouch for the bytes (same release name, matching hash): LISTING, which only sw.js
  // carries, rejects it, and a fresh release.json is fetched.
  await cache.put('js/views/today.js', netRes('poisoned today'));
  await cache.put('release.json', netRes(JSON.stringify({ release: realRelease.release, hashes: { ...realRelease.hashes, 'js/views/today.js': hh('poisoned today') } })));
  const third = worker(env);
  assert.equal(await body((await third.fire('fetch', req('js/views/today.js'))).response), file('js/views/today.js'));
  assert.deepEqual(JSON.parse(await env.cached(w.name, 'release.json')), realRelease, 'release.json restored from the server');
  // Offline, a changed entry is not served at all, and the rest still is.
  await cache.put('js/views/today.js', netRes('poisoned today'));
  env.online = false;
  const offline = worker(env);
  await assert.rejects(offline.fire('fetch', req('js/views/today.js')));
  assert.equal(await body((await offline.fire('fetch', req('js/app.js'))).response), file('js/app.js'));
  // Offline with release.json removed: nothing can be checked, so nothing is served from the cache, and nothing is
  // deleted (back online, everything is served again).
  await cache.delete('release.json');
  const blind = worker(env);
  await assert.rejects(blind.fire('fetch', req('js/app.js')));
  assert.ok(await cache.match('js/app.js'), 'kept');
  env.online = true;
  assert.equal(await body((await blind.fire('fetch', req('js/app.js'))).response), file('js/app.js'));
});

test('every response from the release cache is hashed as it is served: bytes changed after a check are never served, in the same worker lifetime too', async () => {
  const env = makeEnv();
  const w = worker(env);
  await w.fire('install');
  await w.fire('activate');
  let n = env.digests;
  assert.equal(await body((await w.fire('fetch', req('js/app.js'))).response), file('js/app.js'));
  await w.fire('fetch', req('js/core/store.js'));
  assert.equal(env.digests - n, 3, 'release.json\'s list once per lifetime, then the bytes of each response');
  n = env.digests;
  await w.fire('fetch', req('js/app.js'));
  assert.equal(env.digests - n, 1);
  // Other script on the origin rewrites an entry the live worker has already served: the next response is checked
  // again (no window until the worker stops), so the forged bytes never run.
  await w.cache().put('js/app.js', netRes('window.__pwn = 1;'));
  assert.equal(await body((await w.fire('fetch', req('js/app.js'))).response), file('js/app.js'));
  assert.equal(await env.cached(w.name, 'js/app.js'), file('js/app.js'), 'replaced in the cache');
});

// A stored response is only a body to this worker: status and headers come from the worker, never from the cache.
test('stored headers never reach a page or a later release: a genuine shell with a forged Refresh header is served with the worker\'s headers, and carried over without it', async () => {
  const env = makeEnv();
  const a = worker(env, { release: 'aaaaaaaaaaaa' });
  await a.fire('install');
  await a.fire('activate');
  const forged = (text, type = 'text/html') => {
    const r = new Response(text, { status: 200, headers: { 'content-type': type, refresh: '0; url=/other/phish.html', 'x-forged': '1', 'content-security-policy': "script-src 'none'" } });
    Object.defineProperty(r, 'type', { value: 'basic' });
    return r;
  };
  await a.cache().put('./', forged(file('index.html')));
  await a.cache().put('js/app.js', forged(file('js/app.js'), 'text/html'));
  const later = worker(env, { release: 'aaaaaaaaaaaa' }); // a new worker lifetime
  for (const [path, mode, type] of [['./', 'navigate', 'text/html; charset=utf-8'], ['index.html', 'navigate', 'text/html; charset=utf-8'], ['js/app.js', 'cors', 'text/javascript; charset=utf-8']]) {
    const res = (await later.fire('fetch', req(path, mode))).response;
    assert.equal(res.status, 200);
    assert.deepEqual([...res.headers], [['content-type', type]], `${path}: only the worker's own header`);
  }
  env.online = false; // offline too
  assert.equal((await later.fire('fetch', req('./?x=1', 'navigate'))).response.headers.get('refresh'), null);
  env.online = true;
  // The next release leaves index.html and app.js unchanged, so it copies them from this cache: bytes only.
  env.fetches = [];
  const b = worker(env, { release: 'bbbbbbbbbbbb', active: true });
  await b.fire('install');
  for (const p of ['./', 'js/app.js']) {
    const stored = await b.cache().match(p);
    assert.equal(stored.headers.get('refresh'), null, `${p}: the forged header was carried into the next release`);
    assert.equal(stored.headers.get('x-forged'), null);
    assert.equal(await body(stored), file(p === './' ? 'index.html' : p));
  }
  assert.ok(!env.fetches.some((f) => /\/lucid\/(\?|$)|js\/app\.js/.test(f.url)), 'the genuine bytes were copied, not fetched');
  // Every kind of file gets its own content type.
  const types = { 'css/app.css': 'text/css; charset=utf-8', 'content/taxonomy.json': 'application/json; charset=utf-8', 'fonts/rubik-hebrew.woff2': 'font/woff2', 'assets/favicon.svg': 'image/svg+xml', 'manifest.webmanifest': 'application/manifest+json', 'vendor/ts-fsrs.mjs': 'text/javascript; charset=utf-8', 'privacy.html': 'text/html; charset=utf-8' };
  for (const [p, type] of Object.entries(types)) {
    const res = (await b.fire('fetch', req(p, p.endsWith('.html') ? 'navigate' : 'cors'))).response;
    assert.equal(res.headers.get('content-type'), type, p);
  }
});

test('a request for release.json, a navigation included, goes to the network and leaves the cached copy: offline still works after the next worker restart', async () => {
  const env = makeEnv();
  const w = worker(env);
  await w.fire('install');
  await w.fire('activate');
  for (const mode of ['navigate', 'cors', 'no-cors']) {
    assert.equal((await w.fire('fetch', req('release.json', mode))).handled, false, `${mode}: handled by the worker`);
  }
  assert.equal((await w.fire('fetch', req('release.json?x=1', 'navigate'))).handled, false);
  assert.deepEqual(JSON.parse(await env.cached(w.name, 'release.json')), realRelease, 'the cached release.json is kept');
  // A navigation to any other path the release has no hash for is passed through, and the cached entry stays.
  await w.cache().put('docs/notes.html', netRes('notes'));
  env.overrides.set('/lucid/docs/notes.html', 'notes online');
  assert.equal(await body((await w.fire('fetch', req('docs/notes.html', 'navigate'))).response), 'notes online');
  assert.ok(await w.cache().match('docs/notes.html'), 'an entry with no hash was deleted');
  env.online = false;
  const restarted = worker(env);
  assert.equal(await body((await restarted.fire('fetch', req('./', 'navigate'))).response), file('index.html'));
  assert.equal(await body((await restarted.fire('fetch', req('js/app.js'))).response), file('js/app.js'));
});

// Round-3 review K1: a release whose page cannot start never changes screen, so it never asks for the next one.
test('a load of the app while a release waits hands over to it: the waiting worker is asked, and the page reloads into it; other pages and requests are served as before (C-4)', async () => {
  const env = makeEnv();
  const posted = [];
  const waiting = { postMessage: (m) => posted.push(m) };
  const w = worker(env, { active: true, waiting, handover: 200 });
  await w.fire('install');
  await w.fire('activate');
  env.fetches = [];
  for (const path of ['./', 'index.html', './?utm=1']) {
    const res = (await w.fire('fetch', req(path, 'navigate'))).response;
    const html = await body(res);
    assert.equal(JSON.stringify(posted.pop()), '{"type":"lucid:activate"}', `${path}: the waiting worker was not asked to take over`);
    assert.doesNotMatch(html, /<link|<img|src=/, `${path}: the handover page loads nothing`);
    assert.match(html, /location\.reload\(\)/);
    const nonce = html.match(/<script nonce="([0-9a-f]{32})">/)?.[1];
    assert.ok(nonce, `${path}: no nonce on the handover script`);
    assert.equal(res.headers.get('content-security-policy'), `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'`);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    // Round-4 review: not a blank white page, and not a silent one. The app's ground and ink for each scheme (the boot
    // frame's, which tests/unit/boot-preload.test.mjs keeps equal to css/app.css), and a status line.
    assert.equal(html.match(/<style nonce="([0-9a-f]{32})">/)?.[1], nonce, `${path}: no nonce on the handover style`);
    const boot = file('index.html').match(/\.bootframe\{[^}]*background:(oklch\([^)]*\));color:(oklch\([^)]*\))/);
    const bootDark = file('index.html').match(/prefers-color-scheme:dark\)\{\.booting,\.bootframe\{background:(oklch\([^)]*\)).*?\.bootframe\{color:(oklch\([^)]*\))/);
    assert.ok(boot && bootDark, 'the boot frame\'s colours were not found in index.html');
    const style = html.match(/<style[^>]*>([^<]*)<\/style>/)[1];
    assert.ok(style.startsWith(`html{background:${boot[1]};color:${boot[2]};`), `${path}: light colours: ${style}`);
    assert.ok(style.includes(`@media (prefers-color-scheme:dark){html{background:${bootDark[1]};color:${bootDark[2]}}}`), `${path}: dark colours: ${style}`);
    assert.match(html, /<html lang="he" dir="rtl">/);
    // Round-6 review: Hebrew only, also for a learner whose interface is in English. Both, each in its language.
    assert.match(html, /<p role="status"><span lang="he" dir="rtl">[^<]*[\u0590-\u05ff][^<]*Lucid[^<]*<\/span><span lang="en" dir="ltr">[^<\u0590-\u05ff]*Lucid[^<]*<\/span><\/p>/, `${path}: no status line for screen readers in each language`);
    assert.equal((html.match(/<script|<style/g) || []).length, 2, `${path}: one script and one style only`);
  }
  assert.deepEqual(env.fetches, [], 'the handover page is the worker\'s own');
  assert.equal(await env.cached(w.name, './'), file('index.html'), 'the cached shell is left as it is');
  // Only a load of the app: a module, a script fetch of the shell, and another page are served as before.
  assert.equal(await body((await w.fire('fetch', req('js/app.js'))).response), file('js/app.js'));
  assert.equal(await body((await w.fire('fetch', req('./'))).response), file('index.html'));
  assert.equal(await body((await w.fire('fetch', req('privacy.html', 'navigate'))).response), file('privacy.html'));
  assert.equal(posted.length, 0);
  // A waiting worker that does not take over: after HANDOVER_MS the app is served by this release again.
  await new Promise((r) => setTimeout(r, 250));
  assert.equal(await body((await w.fire('fetch', req('./', 'navigate'))).response), file('index.html'));
  // With nothing waiting, a load is served from the release cache.
  const plain = worker(env, { active: true });
  assert.equal(await body((await plain.fire('fetch', req('./', 'navigate'))).response), file('index.html'));
});

// Round-4 review: with another tab's request still in this worker (a lesson the network never answers), the browser
// cannot activate the waiting worker, and at fde78c2 the reload was answered with hand-over pages for 5 s (6.4 s blank,
// then the old release). Now one page: its own reload (after at most about 2 s) is served the app.
test('a hand-over that does not happen costs one page: the reload of that page gets the app, with the shipped timings', async () => {
  const env = makeEnv();
  const posted = [];
  const w = worker(env, { active: true, waiting: { postMessage: (m) => posted.push(m) } });
  await w.fire('install');
  await w.fire('activate');
  const first = await body((await w.fire('fetch', req('./', 'navigate'))).response);
  assert.match(first, /role="status"/, 'the first load hands over');
  const polls = Number(first.match(/Date\.now\(\)-t>(\d+)/)?.[1]);
  assert.ok(polls >= 1500 && polls <= 2500, `the page waits ${polls} ms of wall time for the hand-over (Chromium takes about 1 s)`);
  await new Promise((r) => setTimeout(r, 1100)); // less than that page's own wait
  assert.equal(await body((await w.fire('fetch', req('./', 'navigate'))).response), file('index.html'), 'a second hand-over page was served');
  assert.equal(posted.length, 1);
});

// Round-3 review K2: an update needs room for a second copy of the release; a full origin must not pin the learner.
// Round-4 review: nor may an install that left out its shell or release.json take over and remove the release that
// can start offline; and a saved lesson the release changed is fetched again once activation has made room.
test('a nearly full origin never fails an install over best-effort files: the shell is stored, the rest is fetched and checked on use, and saved lessons are kept', async () => {
  const env = makeEnv();
  const a = worker(env, { release: 'aaaaaaaaaaaa' });
  await a.fire('install');
  await a.fire('activate');
  const saved = ['a1-01', 'a1-02', 'a1-03'];
  for (const l of saved) await a.fire('fetch', req(`content/lessons/${l}.json`));
  env.overrides.set('/lucid/js/views/today.js', 'export default 1; // the fix');
  env.overrides.set('/lucid/content/lessons/a1-02.json', '{"changed":true}');
  const hashes = { ...realRelease.hashes, 'js/views/today.js': hh('export default 1; // the fix'), 'content/lessons/a1-02.json': hh('{"changed":true}') };
  env.quota = Math.round(env.used() * 1.3);
  const b = worker(env, { release: 'bbbbbbbbbbbb', hashes, active: true });
  await b.fire('install'); // resolves: the install did not fail
  assert.ok(env.used() <= env.quota);
  assert.ok((await b.cache().keys()).length < (await a.cache().keys()).length, 'everything fitted, nothing was tested');
  assert.ok(await b.cache().match('release.json'), 'release.json is stored');
  for (const p of ['./', 'js/app.js', 'css/app.css', 'content/manifest.json']) assert.ok(await b.cache().match(p), `shell file ${p} is stored`);
  await b.fire('message', undefined, { type: 'lucid:activate' });
  assert.equal(b.calls.skipWaiting, 1);
  await b.fire('activate');
  assert.deepEqual([...env.stores.keys()], [b.name], 'the old release\'s cache is removed');
  await b.fire('fetch', req('assets/favicon.svg')); // the next request: the changed saved lesson is fetched again by now
  for (const l of saved) assert.equal(await env.cached(b.name, `content/lessons/${l}.json`), l === 'a1-02' ? '{"changed":true}' : file(`content/lessons/${l}.json`), `saved lesson ${l} lost`);
  // The fix runs, and what the install could not store is fetched, checked and kept now that there is room.
  env.quota = Infinity;
  const later = worker(env, { release: 'bbbbbbbbbbbb', hashes });
  assert.equal(await body((await later.fire('fetch', req('js/views/today.js'))).response), 'export default 1; // the fix');
  assert.equal(await body((await later.fire('fetch', req('./', 'navigate'))).response), file('index.html'));
  assert.equal(await body((await later.fire('fetch', req('js/app.js'))).response), file('js/app.js'));
});

test('with no room for the next release\'s release.json or shell, its install fails: the active release keeps its cache and saved lessons, and starts offline after a restart; with room the next visit installs', async () => {
  for (const room of [0, 0.004, 0.02]) { // nothing fits; a few shell files; not the whole shell
    const env = makeEnv();
    const a = worker(env, { release: 'aaaaaaaaaaaa' });
    await a.fire('install');
    await a.fire('activate');
    const saved = ['a1-01', 'a1-02', 'a1-03'];
    for (const l of saved) await a.fire('fetch', req(`content/lessons/${l}.json`));
    const before = (await a.cache().keys()).length;
    const used = env.used();
    env.overrides.set('/lucid/js/views/today.js', 'export default 1; // the fix');
    const hashes = { ...realRelease.hashes, 'js/views/today.js': hh('export default 1; // the fix') };
    env.quota = Math.round(used * (1 + room));
    const b = worker(env, { release: 'bbbbbbbbbbbb', hashes, active: true });
    await assert.rejects(b.fire('install'), (err) => err.name === 'QuotaExceededError', `${room}: an install without its shell went ahead`);
    assert.equal(b.calls.skipWaiting, 0);
    assert.deepEqual([...env.stores.keys()], [a.name], `${room}: the failed install's cache was not given back`);
    assert.equal(env.used(), used, `${room}: the active release's cache changed`);
    assert.equal((await a.cache().keys()).length, before);
    // A later page asking for the release, and the worker restarting offline: still the active release.
    env.online = false;
    const restarted = worker(env, { release: 'aaaaaaaaaaaa', active: true });
    assert.equal(await body((await restarted.fire('fetch', req('./', 'navigate'))).response), file('index.html'), `${room}: offline start`);
    assert.equal(await body((await restarted.fire('fetch', req('js/app.js'))).response), file('js/app.js'));
    for (const l of saved) assert.equal(await body((await restarted.fire('fetch', req(`content/lessons/${l}.json`))).response), file(`content/lessons/${l}.json`), `${room}: saved lesson ${l} offline`);
    // Room again (another app gave space back): the browser's next attempt installs, and the update takes over.
    env.online = true;
    env.quota = Infinity;
    const retry = worker(env, { release: 'bbbbbbbbbbbb', hashes, active: true });
    await retry.fire('install');
    await retry.fire('message', undefined, { type: 'lucid:activate' });
    await retry.fire('activate');
    assert.deepEqual([...env.stores.keys()], [retry.name]);
    for (const l of saved) assert.equal(await env.cached(retry.name, `content/lessons/${l}.json`), file(`content/lessons/${l}.json`), `${room}: saved lesson ${l} lost`);
  }
});

test('activation removes the older caches only when its own holds release.json and the shell (an entry removed by other script on the origin)', async () => {
  for (const gone of ['release.json', 'js/app.js', './']) {
    const env = makeEnv();
    const a = worker(env, { release: 'aaaaaaaaaaaa' });
    await a.fire('install');
    await a.fire('activate');
    await a.fire('fetch', req('content/lessons/a1-01.json'));
    const b = worker(env, { release: 'bbbbbbbbbbbb', active: true });
    await b.fire('install');
    await b.cache().delete(gone);
    await b.fire('message', undefined, { type: 'lucid:activate' });
    await b.fire('activate');
    assert.deepEqual([...env.stores.keys()].sort(), [a.name, b.name].sort(), `${gone}: the complete older cache was removed`);
    assert.equal(await env.cached(a.name, 'content/lessons/a1-01.json'), file('content/lessons/a1-01.json'));
    assert.equal(b.calls.claim, 1);
  }
});

// Round-4 review: B's activation removed the cache of C, a newer release still installing; C then finished into the
// removed cache, waited with nothing, took over and removed B's cache with the saved lessons.
test('activation leaves the cache of a newer release that is installing; an install whose cache was removed while it ran fails', async () => {
  const env = makeEnv();
  const a = worker(env, { release: 'aaaaaaaaaaaa' });
  await a.fire('install');
  await a.fire('activate');
  const saved = ['a1-01', 'a1-02', 'a1-03'];
  for (const l of saved) await a.fire('fetch', req(`content/lessons/${l}.json`));
  const b = worker(env, { release: 'bbbbbbbbbbbb', active: true });
  await b.fire('install'); // B waits
  // C is deployed and installs; one changed file is slow at the server.
  env.overrides.set('/lucid/js/views/today.js', 'export default 1; // C');
  const hashes = { ...realRelease.hashes, 'js/views/today.js': hh('export default 1; // C') };
  let answer;
  const slow = new Promise((r) => { answer = r; });
  env.fail = (url) => (url === abs('js/views/today.js') ? slow : null);
  const c = worker(env, { release: 'cccccccccccc', hashes, active: true });
  const installingC = c.fire('install');
  for (let i = 0; i < 200 && !(await c.cache().match('js/app.js')); i++) await new Promise((r) => setTimeout(r, 5));
  assert.ok(await c.cache().match('js/app.js'), 'C did not start installing');
  // B takes over (a reload hands over, or a page asks) while C installs.
  const b2 = worker(env, { release: 'bbbbbbbbbbbb', active: true, installing: {} });
  await b2.fire('activate');
  assert.ok(env.stores.has(c.name), 'the installing release\'s cache was removed');
  answer();
  await installingC; // C completes into its own cache
  env.fail = () => null;
  const full = (await a.cache().keys()).length;
  assert.ok((await c.cache().keys()).length >= full - saved.length, 'C\'s cache is not complete');
  // C takes over: the saved lessons move to it, and the older caches go.
  const c2 = worker(env, { release: 'cccccccccccc', hashes, active: true });
  await c2.fire('activate');
  assert.deepEqual([...env.stores.keys()], [c.name]);
  for (const l of saved) assert.equal(await env.cached(c.name, `content/lessons/${l}.json`), file(`content/lessons/${l}.json`), `saved lesson ${l} lost`);
  // An install whose cache is removed while it runs (by an activation that did not see it) fails, and the next
  // attempt installs.
  let answerD;
  const slowD = new Promise((r) => { answerD = r; });
  env.overrides.set('/lucid/js/views/today.js', 'export default 2; // D');
  const hashesD = { ...hashes, 'js/views/today.js': hh('export default 2; // D') };
  env.fail = (url) => (url === abs('js/views/today.js') ? slowD : null);
  const d1 = worker(env, { release: 'dddddddddddd', hashes: hashesD, active: true });
  const installingD = d1.fire('install');
  for (let i = 0; i < 200 && !(await d1.cache().match('js/app.js')); i++) await new Promise((r) => setTimeout(r, 5));
  env.deleteStore(d1.name);
  answerD();
  await assert.rejects(installingD, /lost its shell/);
  env.fail = () => null;
  const d2 = worker(env, { release: 'dddddddddddd', hashes: hashesD, active: true });
  await d2.fire('install');
  assert.ok(await d2.cache().match('release.json'));
});

// ---------- round-5 review: storage edges ----------
const SHELL_FILES = ['./', 'release.json', 'config.js', 'css/app.css', 'js/app.js', 'manifest.webmanifest', 'assets/favicon.svg', 'fonts/rubik-latin.woff2', 'fonts/rubik-hebrew.woff2', 'fonts/rubik-latin-ext.woff2', 'content/taxonomy.json', 'content/curriculum.json', 'content/manifest.json'];
const shellBytes = async (cache) => {
  let n = 0;
  for (const p of SHELL_FILES) n += (await (await cache.match(p)).arrayBuffer()).byteLength;
  return n;
};
const SAVED_LESSONS = ['a1-01', 'a1-02', 'a1-03'];
async function activeRelease(env, release = 'aaaaaaaaaaaa') {
  const a = worker(env, { release });
  await a.fire('install');
  await a.fire('activate');
  for (const l of SAVED_LESSONS) await a.fire('fetch', req(`content/lessons/${l}.json`));
  return a;
}
const fixed = () => {
  const hashes = { ...realRelease.hashes, 'js/views/today.js': hh('export default 1; // the fix') };
  return { hashes, serve: (env) => env.overrides.set('/lucid/js/views/today.js', 'export default 1; // the fix') };
};

// The b2b669b -> this release upgrade at 1.05x usage: the failed install's partial cache used up the headroom the old
// worker's own writes needed, and its cache ended up holding two releases' files.
test('an install checks for room before its first write: with less free space than its shell and release.json it writes nothing, over this release and over the hand-numbered caches', async () => {
  for (const from of ['aaaaaaaaaaaa', ...LEGACY_RELEASES]) {
    for (const f of [0.3, 0.9]) {
      const env = makeEnv();
      const a = await activeRelease(env, from);
      const used = env.used();
      env.quota = used + Math.round((await shellBytes(a.cache())) * f);
      const { hashes, serve } = fixed();
      serve(env);
      const written = env.written.length;
      const b = worker(env, { release: 'bbbbbbbbbbbb', hashes, active: true });
      await assert.rejects(b.fire('install'), (err) => err.name === 'QuotaExceededError', `${from} x${f}`);
      assert.equal(env.written.length, written, `${from} x${f}: the install wrote before it knew it had room`);
      assert.equal(env.used(), used, `${from} x${f}: space taken`);
      assert.deepEqual([...env.stores.keys()], [a.name], `${from} x${f}`);
      assert.equal(b.calls.skipWaiting, 0);
    }
  }
});

test('a second install of the same release (the registration went away, Cache Storage stayed) on a full origin writes nothing and keeps the cache and saved lessons; one that fails leaves that cache alone', async () => {
  for (const f of [1, 1.05]) {
    const env = makeEnv();
    const a = await activeRelease(env, realRelease.release);
    const used = env.used();
    const entries = (await a.cache().keys()).length;
    env.quota = Math.round(used * f);
    const written = env.written.length;
    const again = worker(env); // no active worker: the browser installs this release afresh
    await again.fire('install');
    assert.equal(env.written.length, written, `x${f}: the complete cache was written again`);
    assert.equal(again.calls.skipWaiting, 1);
    await again.fire('activate');
    assert.deepEqual([...env.stores.keys()], [a.name]);
    assert.equal((await a.cache().keys()).length, entries);
    env.online = false;
    const offline = worker(env, { active: true });
    assert.equal(await body((await offline.fire('fetch', req('./', 'navigate'))).response), file('index.html'), `x${f}: offline start`);
    for (const l of SAVED_LESSONS) assert.equal(await env.cached(a.name, `content/lessons/${l}.json`), file(`content/lessons/${l}.json`), `x${f}: saved lesson ${l}`);
    // A second install that fails (no release.json, a stale file): the complete cache is not this install's to give back.
    env.online = true;
    for (const fail of [(u) => (u.includes('release.json') ? 503 : null), (u) => (u.includes('release.json') ? 'network' : null)]) {
      env.fail = fail;
      await assert.rejects(worker(env).fire('install'));
      assert.equal((await a.cache().keys()).length, entries, `x${f}: the failed install removed the complete cache`);
    }
  }
});

test('an install that fails for any reason, after writing, gives its own cache back and its space at once: the next release then installs at a quota that fits it', async () => {
  for (const how of ['a stale file (two deploys in quick succession)', 'no room for the shell after all (another app wrote meanwhile)']) {
    const env = makeEnv();
    const a = await activeRelease(env);
    const used = env.used();
    const shell = await shellBytes(a.cache());
    const { hashes, serve } = fixed();
    serve(env);
    if (how.startsWith('a stale')) {
      // The edge already serves the next deploy's today.js: B fails half-way, its shell written.
      env.overrides.set('/lucid/js/views/today.js', 'export default 3; // C');
      const b = worker(env, { release: 'bbbbbbbbbbbb', hashes, active: true });
      await assert.rejects(b.fire('install'), /does not match/);
      assert.ok(env.written.length > 0);
      serve(env);
    } else {
      // The room probe fits; right after it, another app on the origin takes most of that room.
      env.afterPut = (u) => { if (!u.startsWith(BASE)) { env.afterPut = () => {}; env.quota = used + Math.round(shell / 2); } };
      const written = env.written.length;
      const b = worker(env, { release: 'bbbbbbbbbbbb', hashes, active: true });
      await assert.rejects(b.fire('install'), (err) => err.name === 'QuotaExceededError');
      assert.ok(env.written.length > written, 'nothing was written: the case is not tested');
    }
    assert.deepEqual([...env.stores.keys()], [a.name], `${how}: the failed install's cache stayed`);
    assert.equal(env.used(), used, `${how}: its space did not come back while its worker runs`);
    // C fits next to A, not next to A and B's leftovers.
    env.quota = used + shell + SHELL_FILES.length * 1024 + 4096;
    const c = worker(env, { release: 'cccccccccccc', hashes, active: true });
    await c.fire('install');
    assert.ok(await c.cache().match('release.json'), `${how}: C did not install`);
  }
});

test('on a tight origin the first install, and later misses, leave room for the next release\'s shell: the next release installs', async () => {
  const env0 = makeEnv();
  const w0 = worker(env0);
  await w0.fire('install');
  const shell = await shellBytes(w0.cache());
  const env = makeEnv();
  env.quota = Math.round(shell * 3.5); // less than the whole install
  assert.ok(env.quota < env0.used());
  const a = worker(env, { release: 'aaaaaaaaaaaa' });
  await a.fire('install');
  await a.fire('activate');
  const reserve = 1.25 * shell;
  assert.ok(env.quota - env.used() >= reserve, `the install left ${env.quota - env.used()} bytes, not the room for a shell`);
  // The learner opens screens whose modules were left out: each is fetched, checked, and kept while room stays.
  const left = manifest.offline.filter((p) => /^js\/views\//.test(p));
  for (const p of left) assert.equal(await body((await a.fire('fetch', req(p))).response), file(p));
  assert.ok(env.quota - env.used() >= reserve, 'kept misses took the room');
  const { hashes, serve } = fixed();
  serve(env);
  const b = worker(env, { release: 'bbbbbbbbbbbb', hashes, active: true });
  await b.fire('install');
  await b.fire('message', undefined, { type: 'lucid:activate' });
  await b.fire('activate');
  assert.deepEqual([...env.stores.keys()], [b.name], 'the next release did not take over');
  assert.equal(await body((await b.fire('fetch', req('js/views/today.js'))).response), 'export default 1; // the fix');
});

// The b2b669b -> this release upgrade at 1.2x usage: activation deleted the old caches, but its Cache objects for them
// kept their space counted for that worker's lifetime, so the saved lessons fetched again did not fit, and were lost.
for (const legacyRel of LEGACY_RELEASES) test(`activation gives the old caches' space back at once (not when its worker stops): the saved lessons the release changed are fetched again in that lifetime (lucid-${legacyRel})`, async () => {
  const env = makeEnv();
  const legacy = await activeRelease(env, legacyRel);
  // Production's raw bytes differ from this release's (minified) ones: every saved lesson "changed".
  for (const l of SAVED_LESSONS) await legacy.cache().put(abs(`content/lessons/${l}.json`), netRes(`${file(`content/lessons/${l}.json`)}\n`));
  env.quota = env.used() + Math.round((await shellBytes(legacy.cache())) * 1.6);
  const w = worker(env, { active: true });
  await w.fire('install');
  assert.equal(w.calls.skipWaiting, 1, 'the upgrade from the hand-numbered caches takes over at once');
  await w.fire('activate');
  await w.fire('fetch', req('assets/favicon.svg')); // the next request waits for the refill
  assert.deepEqual([...env.stores.keys()], [w.name]);
  let own = 0;
  for (const r of await w.cache().keys()) own += (await (await w.cache().match(r.url)).arrayBuffer()).byteLength;
  assert.equal(env.used(), own, 'the old cache\'s space is still counted');
  for (const l of SAVED_LESSONS) assert.equal(await env.cached(w.name, `content/lessons/${l}.json`), file(`content/lessons/${l}.json`), `saved lesson ${l} lost`);
  // With the room back, what the install left out (it kept the room for the next release) is fetched, checked and
  // kept, so every screen of the offline list starts offline, while that room stays free.
  const missing = [];
  for (const p of manifest.offline) if (!(await w.cache().match(p))) missing.push(p);
  assert.ok(missing.length < manifest.offline.length / 4, `left out after the room came back: ${missing.length}: ${missing.slice(0, 3)}`);
  for (const p of manifest.offline.filter((f) => /^js\/core\//.test(f))) assert.ok(await w.cache().match(p), `${p} (the app's boot) left out`);
  assert.ok(env.quota - env.used() >= 1.25 * (await shellBytes(w.cache())), 'the fill-in took the next release\'s room');
});

test('offline, a file the install left out is served from the HTTP cache when its bytes are the release\'s, and kept; a copy that is not is never served', async () => {
  const env = makeEnv();
  const a = await activeRelease(env);
  for (const p of ['js/views/review.js', 'js/views/grammar.js']) await a.cache().delete(p);
  env.online = false;
  env.http.set(abs('js/views/review.js'), file('js/views/review.js')); // loaded within max-age
  env.http.set(abs('js/views/grammar.js'), 'export default 666; // another release');
  const w = worker(env, { release: 'aaaaaaaaaaaa', active: true });
  assert.equal(await body((await w.fire('fetch', req('js/views/review.js'))).response), file('js/views/review.js'));
  assert.equal(await env.cached(a.name, 'js/views/review.js'), file('js/views/review.js'));
  const other = await w.fire('fetch', req('js/views/grammar.js')).then((r) => r.response, () => null);
  assert.ok(!other || other.type === 'error', 'a copy of another release was handed to the page');
  assert.equal(await a.cache().match('js/views/grammar.js'), undefined);
});

// The b2b669b -> this release upgrade at 1.02x-1.1x usage: the install that did not fit had fetched the new shell with
// cache 'no-cache', which put the new index.html and app.js in the HTTP cache; b2b669b's network-first worker then
// served them next to the old modules (still fresh there) and stored that mix: offline Lucid no longer started.
for (const legacyRel of LEGACY_RELEASES) test(`the one-time upgrade from the hand-numbered caches leaves the HTTP cache as it is (no-store), so a failed attempt changes nothing the old worker serves; other installs revalidate (lucid-${legacyRel})`, async () => {
  const env = makeEnv();
  const legacy = await activeRelease(env, legacyRel);
  for (const l of SAVED_LESSONS) await legacy.cache().put(abs(`content/lessons/${l}.json`), netRes(`${file(`content/lessons/${l}.json`)}\n`));
  for (const p of ['js/app.js', 'index.html']) await legacy.cache().delete(p); // changed in the new release: fetched
  await legacy.cache().delete('./');
  for (const quota of [env.used() + 1000, Infinity]) {
    env.quota = quota;
    env.fetches.length = 0;
    const w = worker(env, { active: true });
    const done = await w.fire('install').then(() => true, () => false);
    assert.equal(done, quota === Infinity);
    const own = env.fetches.filter((f) => !f.url.includes('release.json'));
    assert.ok(own.some((f) => f.url === abs('js/app.js')) && own.some((f) => f.url === abs('content/lessons/a1-01.json') || quota !== Infinity), `${quota}: the case is not tested`);
    assert.deepEqual([...new Set(own.map((f) => f.cache))], ['no-store'], `${quota}: the upgrade's requests went through the HTTP cache`);
  }
  // An update over this release's own cache revalidates, as before (a 304 reuses the copy the page just loaded).
  const env2 = makeEnv();
  await activeRelease(env2);
  const { hashes, serve } = fixed();
  serve(env2);
  env2.fetches.length = 0;
  await worker(env2, { release: 'bbbbbbbbbbbb', hashes, active: true }).fire('install');
  assert.deepEqual([...new Set(env2.fetches.map((f) => f.cache))], ['no-cache']);
});

// ---------- round-6 review ----------
const ALL_LESSONS = readdirSync(new URL('content/lessons/', APP)).filter((f) => f.endsWith('.json')).map((f) => `content/lessons/${f}`);

// At 1.08x-1.1x of usage with every lesson saved (more bytes than the code), activation copied the lessons into the new
// cache next to the old copies; a copy that still did not fit after the purge counted as carried, and the old caches
// were then deleted: 67 of 75 saved lessons were gone, though there was room once the old cache was emptied.
test('activation moves the saved lessons on a nearly full origin: each copy needs room for itself only, and none is lost', async () => {
  for (const legacy of [false, true]) {
    const env = makeEnv();
    let old;
    if (legacy) {
      old = env.open(`lucid-${LEGACY_RELEASES[0]}`);
      for (const p of [...SHELL_FILES.filter((p) => p !== 'release.json'), 'index.html', ...manifest.offline]) { const b = env.serve(abs(p)); if (b) await old.put(abs(p), netRes(b)); }
      for (const l of ALL_LESSONS) await old.put(abs(l), netRes(env.serve(abs(l))));
    } else {
      const a = worker(env, { release: 'aaaaaaaaaaaa' });
      await a.fire('install');
      await a.fire('activate');
      for (const l of ALL_LESSONS) await a.fire('fetch', req(l));
      old = a.cache();
    }
    let saved = 0;
    for (const l of ALL_LESSONS) saved += (await old.match(abs(l))) ? 1 : 0;
    assert.equal(saved, ALL_LESSONS.length);
    const { hashes, serve } = fixed();
    serve(env);
    env.quota = Math.round(env.used() * 1.08);
    const b = worker(env, { release: 'bbbbbbbbbbbb', hashes, active: true });
    await b.fire('install');
    if (!legacy) await b.fire('message', undefined, { type: 'lucid:activate' });
    env.online = false; // the moves need no network
    await b.fire('activate');
    await b.fire('fetch', req('assets/favicon.svg')).catch(() => null);
    assert.deepEqual([...env.stores.keys()], [b.name], `${legacy ? 'legacy' : 'release'}: the old cache stayed`);
    const lost = [];
    for (const l of ALL_LESSONS) if (!(await b.cache().match(l))) lost.push(l);
    assert.deepEqual(lost, [], `${legacy ? 'legacy' : 'release'}: ${lost.length} saved lessons lost`);
  }
});

// The same with the network for the lessons a move cannot place: a copy that does not fit even after the purge is
// fetched again once the old caches are emptied, never counted as carried.
test('a saved lesson activation cannot place is fetched again once the old caches are emptied', async () => {
  const env = makeEnv();
  const a = worker(env, { release: 'aaaaaaaaaaaa' });
  await a.fire('install');
  await a.fire('activate');
  const { hashes, serve } = fixed();
  serve(env);
  const b = worker(env, { release: 'bbbbbbbbbbbb', hashes, active: true });
  await b.fire('install');
  for (const l of SAVED_LESSONS) await a.fire('fetch', req(`content/lessons/${l}.json`)); // saved while b waits
  for (const l of SAVED_LESSONS) assert.equal(await b.cache().match(`content/lessons/${l}.json`), undefined, 'the case is not tested');
  await b.fire('message', undefined, { type: 'lucid:activate' });
  // Room for nothing more at activation: every put of a lesson fails until the old cache is emptied.
  const realPut = b.cache().put;
  let emptied = false;
  const oldStore = a.cache();
  const realDelete = oldStore.delete;
  oldStore.delete = async (r) => { const out = await realDelete(r); if (!(await oldStore.keys()).length) emptied = true; return out; };
  b.cache().put = async (r, v) => { if (!emptied && /content\/lessons\//.test(key(r))) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); return realPut(r, v); };
  await b.fire('activate');
  await b.fire('fetch', req('assets/favicon.svg'));
  for (const l of SAVED_LESSONS) assert.equal(await env.cached(b.name, `content/lessons/${l}.json`), file(`content/lessons/${l}.json`), `saved lesson ${l} lost`);
});

// Round 7, P-A: the one-time upgrade from production (d83a500) on a nearly full origin. Production's saved lessons
// never match this release's (minified) bytes, the install had no room to carry anything over, and activation
// deleted the old caches; the saved lessons and the screens the install left out were fetched again once, in that
// worker lifetime. A connection lost (or the worker stopped) right after the takeover lost the lessons for good and
// left most screens without an offline copy until the next release (c9-refill: 2 of 21 screens, 21-69 of 75 lessons).
for (const room of [1.2, 2]) test(`the upgrade on a nearly full origin keeps every saved lesson when the network goes right after the takeover, and the screens the install left out are fetched at the next load of the app (x${room})`, async () => {
  const env = makeEnv();
  const old = env.open(`lucid-${LEGACY_RELEASES[0]}`);
  for (const p of [...SHELL_FILES.filter((p) => p !== 'release.json'), 'index.html', ...manifest.offline]) { const b = env.serve(abs(p)); if (b) await old.put(abs(p), netRes(b)); }
  // Every lesson saved, in production's bytes (not this release's).
  for (const l of ALL_LESSONS) await old.put(abs(l), netRes(`${env.serve(abs(l))}\n`));
  const env0 = makeEnv();
  const w0 = worker(env0);
  await w0.fire('install');
  // Free space for the shell and some more, less than the shell and the room for the next release's (2.25 shells).
  env.quota = env.used() + Math.round((await shellBytes(w0.cache())) * room);
  const w = worker(env, { active: true });
  await w.fire('install');
  assert.equal(w.calls.skipWaiting, 1);
  const views = manifest.offline.filter((p) => /^js\/views\//.test(p));
  const leftOut = async (cache) => { const out = []; for (const p of manifest.offline) if (!(await cache.match(p))) out.push(p); return out; };
  assert.ok((await leftOut(w.cache())).length > views.length / 2, `x${room}: the install kept most files: the case is not tested`);
  env.online = false; // the server goes down at the takeover
  await w.fire('activate');
  await w.fire('fetch', req('assets/favicon.svg')).catch(() => null);
  w.stop();
  assert.deepEqual([...env.stores.keys()], [w.name]);
  const lost = [];
  for (const l of ALL_LESSONS) if (!(await w.cache().match(l))) lost.push(l);
  assert.deepEqual(lost, [], `x${room}: ${lost.length} saved lessons lost`);
  // Production's copy of a lesson is served as stored (stale-while-revalidate), offline too.
  const offline = await w.fire('fetch', req(ALL_LESSONS[0]));
  assert.equal(await body(offline.response), `${file(ALL_LESSONS[0])}\n`);
  // Back online, a later worker (the browser stopped this one): the next load of the app takes the fill-in up.
  env.online = true;
  const later = worker(env, { active: true });
  assert.equal(await body((await later.fire('fetch', req('./', 'navigate'))).response), file('index.html'));
  const missing = await leftOut(later.cache());
  assert.deepEqual(missing.filter((p) => views.includes(p)), [], `x${room}: screens still without an offline copy`);
  assert.ok(missing.length < manifest.offline.length / 4, `x${room}: ${missing.length} offline files still left out`);
  assert.ok(env.quota - env.used() >= 1.25 * (await shellBytes(later.cache())), `x${room}: the fill-in took the next release's room`);
  // Offline from here on, every screen's module is served (no request leaves the device).
  env.online = false;
  const offlineWorker = worker(env, { active: true });
  for (const p of views) assert.equal(await body((await offlineWorker.fire('fetch', req(p))).response), file(p), p);
  // A lesson fetched online is refreshed (stale-while-revalidate brings this release's bytes).
  env.online = true;
  await offlineWorker.fire('fetch', req(ALL_LESSONS[0]));
  assert.equal(await env.cached(w.name, ALL_LESSONS[0]), file(ALL_LESSONS[0]));
});

// The fill-in is taken up only while it has work: once it has nothing left, a load of the app fetches nothing more.
test('a load of the app with nothing left to fill in makes no request beyond the page\'s own', async () => {
  const env = makeEnv();
  const a = worker(env, { release: 'aaaaaaaaaaaa' });
  await a.fire('install');
  await a.fire('activate');
  env.fetches = [];
  const later = worker(env, { release: 'aaaaaaaaaaaa', active: true });
  await later.fire('fetch', req('./', 'navigate'));
  await later.fire('fetch', req('./', 'navigate'));
  assert.deepEqual(env.fetches.map((f) => f.url), [], 'a load of the app fetched files');
});

// Replay round, T1: once an install had no room left, it never requested the files it left out, so they never reached
// the HTTP cache; offline within its max-age they were missing, where b2b669b's precache had requested every one.
test('an install with no room left still fetches and checks the offline files it does not keep (not on the one-time upgrade)', async () => {
  const env0 = makeEnv();
  const w0 = worker(env0);
  await w0.fire('install');
  const shell = await shellBytes(w0.cache());
  const env = makeEnv();
  env.quota = Math.round(shell * 2.6);
  const a = worker(env, { release: 'aaaaaaaaaaaa' });
  await a.fire('install');
  const kept = new Set((await a.cache().keys()).map((r) => r.url));
  const asked = new Set(env.fetches.filter((f) => f.cache === 'no-cache').map((f) => f.url.replace(/\?r=.*$/, '')));
  const leftOut = manifest.offline.filter((p) => !kept.has(abs(p)));
  assert.ok(leftOut.length > manifest.offline.length / 2, `the case is not tested: ${leftOut.length} left out`);
  const never = leftOut.filter((p) => !asked.has(abs(p)));
  assert.deepEqual(never, [], `${never.length} offline files were never requested`);
  assert.ok(env.quota - env.used() >= 1.25 * shell, 'the room for the next release is kept');
  // The one-time upgrade fetches nothing it does not keep (no-store: nothing would reach the HTTP cache).
  const env2 = makeEnv();
  const legacy = env2.open(`lucid-${LEGACY_RELEASES[0]}`);
  for (const p of SHELL_FILES.filter((p) => p !== 'release.json')) await legacy.put(abs(p), netRes(`${env2.serve(abs(p))}\n`));
  env2.quota = env2.used() + Math.round(shell * 2.6);
  const u = worker(env2, { active: true });
  await u.fire('install');
  const kept2 = new Set((await u.cache().keys()).map((r) => r.url));
  const asked2 = new Set(env2.fetches.map((f) => f.url.replace(/\?r=.*$/, '')));
  const leftOut2 = manifest.offline.filter((p) => !kept2.has(abs(p)));
  assert.ok(leftOut2.length > manifest.offline.length / 2, `upgrade: the case is not tested: ${leftOut2.length} left out`);
  assert.ok(leftOut2.filter((p) => !asked2.has(abs(p))).length > leftOut2.length / 2, 'the upgrade went on fetching files it could not keep');
  assert.deepEqual([...new Set(env2.fetches.filter((f) => !f.url.includes('release.json')).map((f) => f.cache))], ['no-store']);
});

// Fresh-eyes round, P3: on an origin with room for only one release, the first install keeps only its shell, and the
// next release cannot install next to it. After a deploy the server has only the next release's copy of a changed
// screen: the active release refused it (another release's module, C-4) and the screen failed online. The install's
// fetch of that screen (above) left this release's copy in the HTTP cache, which a miss now uses first, hashed.
test('on an origin with room for one release, a screen the next release changed still loads after the deploy from the HTTP cache\'s copy of this release', async () => {
  const env0 = makeEnv();
  const w0 = worker(env0);
  await w0.fire('install');
  const shell = await shellBytes(w0.cache());
  const changed = 'js/views/progress.js';
  for (const extra of [0.2, 0.6, 0.95]) {
    const env = makeEnv();
    env.quota = Math.round(shell * (1 + extra));
    const a = worker(env, { release: 'aaaaaaaaaaaa' });
    await a.fire('install');
    await a.fire('activate');
    assert.equal(await a.cache().match(changed), undefined, `x${extra}: the case is not tested`);
    // What the browser's HTTP cache holds after that install: every file it requested through it.
    for (const f of env.fetches) if (f.cache !== 'no-store' && !f.url.includes('?')) env.http.set(f.url, env.serve(f.url));
    const next = `${file(changed)}\n// the next release\n`;
    env.overrides.set(`/lucid/${changed}`, next);
    env.overrides.set(`/lucid/${changed}?r=${realRelease.hashes[changed]}`, next); // a static server ignores the query
    const c = worker(env, { release: 'cccccccccccc', hashes: { ...realRelease.hashes, [changed]: hh(next) }, active: true });
    assert.equal(await c.fire('install').then(() => true, () => false), false, `x${extra}: the next release fits: the case is not tested`);
    const a2 = worker(env, { release: 'aaaaaaaaaaaa', active: true }); // restarted
    const r = await a2.fire('fetch', req(changed));
    assert.equal(r.response.status, 200, `x${extra}: the changed screen failed online`);
    assert.equal(await body(r.response), file(changed), `x${extra}: not this release's module`);
    // A copy of the other release is still never handed to the page (C-4).
    env.http.delete(abs(changed));
    await a2.cache().delete(changed);
    const other = await a2.fire('fetch', req(changed)).then((x) => x.response, () => null);
    assert.ok(!other || other.type === 'error', 'a module of the next release was handed to the page');
  }
});
