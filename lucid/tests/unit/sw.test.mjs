// Service worker (security review S-15, perf D2-D6). sw.js runs in a vm with faked worker globals: Cache Storage,
// fetch (serving the real files of this app, so the release hashes match unless a test changes a file) and the
// registration. Covers: the cache named after the release, controlled activation, the precache (revalidating,
// lean, code before content), the incremental install with hash checks and lesson carry-over, and routing
// (release cache first for code, fonts, vendor and content; lessons stale-while-revalidate).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import vm from 'node:vm';

const BASE = 'https://example.org/lucid/';
const APP = new URL('../../', import.meta.url);
const source = readFileSync(new URL('sw.js', APP), 'utf8');
const realRelease = JSON.parse(readFileSync(new URL('release.json', APP), 'utf8'));
const manifest = JSON.parse(readFileSync(new URL('content/manifest.json', APP), 'utf8'));
const h12 = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 12);
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
  const env = { online: true, fetches: [], overrides: new Map(), stores: new Map() };
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
      env.stores.set(name, {
        m,
        match: async (r) => { const v = m.get(key(r)); return v ? v.clone() : undefined; },
        put: async (r, v) => { m.set(key(r), v); },
        keys: async () => [...m.keys()].map((url) => ({ url })),
      });
    }
    return env.stores.get(name);
  };
  env.cached = async (name, path) => { const r = await env.open(name).match(path); return r ? Buffer.from(await r.arrayBuffer()).toString() : undefined; };
  return env;
}

// One worker. release: the RELEASE it is built with (the committed one by default); release.json is served to match.
function worker(env, { release = realRelease.release, hashes = realRelease.hashes, active = false } = {}) {
  const src = source.replace(/^const RELEASE = '[^']*';$/m, `const RELEASE = '${release}';`);
  if (release !== realRelease.release || hashes !== realRelease.hashes) env.overrides.set('/lucid/release.json', JSON.stringify({ release, hashes }));
  const listeners = {};
  const calls = { skipWaiting: 0, claim: 0 };
  const self = {
    location: new URL('sw.js', BASE),
    registration: { active: active ? {} : null },
    addEventListener: (t, fn) => { listeners[t] = fn; },
    skipWaiting: async () => { calls.skipWaiting++; },
    clients: { claim: async () => { calls.claim++; } },
  };
  const context = vm.createContext({
    self, location: self.location, URL, setTimeout, Promise, Response, Headers, TextDecoder, crypto: webcrypto,
    Request: class { constructor(u, init = {}) { this.url = new URL(typeof u === 'string' ? u : u.url, BASE).href; this.cache = init.cache; this.method = 'GET'; this.mode = 'cors'; } },
    caches: {
      open: async (n) => env.open(n),
      keys: async () => [...env.stores.keys()],
      delete: async (n) => env.stores.delete(n),
    },
    fetch: async (r) => {
      const url = key(r);
      env.fetches.push({ url, cache: r.cache });
      if (!env.online) throw new TypeError('offline');
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
  return { calls, fire, name: `lucid-${release}`, cache: () => env.open(`lucid-${release}`) };
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

test('the one-time upgrade from the hand-numbered caches activates at once, as the old worker did', async () => {
  const env = makeEnv();
  await env.open('lucid-2026-11-03.1').put(abs('js/app.js'), netRes('old app'));
  const w = worker(env, { active: true });
  await w.fire('install');
  assert.equal(w.calls.skipWaiting, 1);
});

test('the precache revalidates (no-cache), stores the shell once, leaves out lessons and the accented font, and fetches code before content', async () => {
  const env = makeEnv();
  const w = worker(env);
  await w.fire('install');
  const cache = w.cache();
  assert.ok(env.fetches.length > 50 && env.fetches.every((f) => f.cache === 'no-cache'), 'every precache request revalidates');
  for (const f of ['js/views/review.js', 'js/views/simulations.js', 'js/views/settings.js', 'content/real-life/scenarios.json', 'vendor/ts-fsrs.mjs', 'privacy.html', 'release.json', 'content/manifest.json']) {
    assert.ok(await cache.match(f), `${f} not precached`);
  }
  assert.equal(await env.cached(w.name, './'), file('index.html'));
  assert.equal(cache.m.has(abs('index.html')), false, 'index.html is stored once, as ./');
  assert.equal(await cache.match('fonts/rubik-latin-ext.woff2'), undefined, 'loaded on demand (unicode-range)');
  assert.equal(await cache.match('content/lessons/pa1-01.json'), undefined, 'lessons are saved on request, not on install');
  const order = env.fetches.map((f) => new URL(f.url).pathname.slice('/lucid/'.length));
  const lastCode = Math.max(...order.map((p, i) => (/^(js|vendor)\//.test(p) && p !== 'js/app.js' ? i : -1)));
  const firstContent = order.findIndex((p) => p.startsWith('content/') && !['content/taxonomy.json', 'content/curriculum.json', 'content/manifest.json'].includes(p));
  assert.ok(lastCode < firstContent, 'code is fetched before content');
  const expected = new Set([...manifest.offline, 'index.html', 'release.json', 'config.js', 'css/app.css', 'js/app.js', 'manifest.webmanifest', 'assets/favicon.svg', 'fonts/rubik-latin.woff2', 'fonts/rubik-hebrew.woff2', 'content/taxonomy.json', 'content/curriculum.json', 'content/manifest.json'].map((p) => (p === 'index.html' ? '' : p)));
  assert.equal(order.length, expected.size, 'one request per file');
});

test('code, fonts, vendor and content are served from the release cache; a miss goes to the network and is kept', async () => {
  const env = makeEnv();
  const w = worker(env);
  await w.fire('install');
  const cache = w.cache();
  await cache.put('js/core/api.js', netRes('cached api'));
  env.overrides.set('/lucid/js/core/api.js', 'changed on the server');
  const n = env.fetches.length;
  assert.equal(await body((await w.fire('fetch', req('js/core/api.js'))).response), 'cached api');
  for (const p of ['config.js', 'css/app.css', 'vendor/ts-fsrs.mjs', 'fonts/rubik-hebrew.woff2', 'content/taxonomy.json', 'content/manifest.json', 'content/real-life/scenarios.json']) {
    assert.equal(await body((await w.fire('fetch', req(p))).response), file(p), p);
  }
  for (const [path, mode] of [['./?utm=1', 'navigate'], ['index.html', 'navigate'], ['./', 'navigate'], ['index.html', 'cors']]) {
    assert.equal(await body((await w.fire('fetch', req(path, mode))).response), file('index.html'), path);
  }
  assert.equal(env.fetches.length, n, 'a repeat visit makes no request');
  // A miss: the accented font, fetched on demand and kept for next time.
  assert.equal(await body((await w.fire('fetch', req('fonts/rubik-latin-ext.woff2'))).response), file('fonts/rubik-latin-ext.woff2'));
  assert.ok(await cache.match('fonts/rubik-latin-ext.woff2'));
  assert.equal(env.fetches.length, n + 1);
  // Offline: the cached copies, and the shell for any navigation of the app.
  env.online = false;
  assert.equal(await body((await w.fire('fetch', req('js/core/api.js'))).response), 'cached api');
  assert.equal(await body((await w.fire('fetch', req('./?utm=2', 'navigate'))).response), file('index.html'), 'an offline navigation falls back to the shell');
  assert.equal(await body((await w.fire('fetch', req('privacy.html', 'navigate'))).response), file('privacy.html'));
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
  const hashes = { ...realRelease.hashes, 'js/views/today.js': h12('export default 1; // new'), 'content/lessons/a1-04.json': h12('{"changed":true}') };
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

test('the upgrade from a hand-numbered cache keeps saved lessons whose bytes match', async () => {
  const env = makeEnv();
  const legacy = env.open('lucid-2026-11-03.1');
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
  const want = h12('new today');
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
