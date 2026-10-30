// Service worker caching (security review S-15): code is network-first with a cached fallback, fonts and
// content are stale-while-revalidate, the cache is named per release, and activation deletes only older
// Lucid caches (the origin is shared with other apps). sw.js runs in a vm with faked worker globals.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const BASE = 'https://example.org/lucid/';
const source = readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');

function worker({ network = new Map(), online = true } = {}) {
  const res = (body, { status = 200, type = 'basic' } = {}) => ({ ok: status < 400, status, type, body, clone() { return res(body, { status, type }); } });
  const key = (r) => new URL(typeof r === 'string' ? r : r.url, BASE).href;
  const stores = new Map();
  const openCache = (name) => {
    if (!stores.has(name)) {
      const m = new Map();
      stores.set(name, {
        m,
        match: async (r) => m.get(key(r)),
        put: async (r, v) => { m.set(key(r), v); },
        addAll: async (reqs) => { for (const r of reqs) m.set(key(r), res(`precached ${key(r)}`)); },
      });
    }
    return stores.get(name);
  };
  const env = { online, fetches: [] };
  const listeners = {};
  const self = {
    location: new URL('sw.js', BASE),
    addEventListener: (t, fn) => { listeners[t] = fn; },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };
  const context = vm.createContext({
    self, location: self.location, URL, setTimeout, Promise,
    Request: class { constructor(u, init = {}) { this.url = new URL(u, BASE).href; this.cache = init.cache; this.method = 'GET'; this.mode = 'cors'; } },
    caches: {
      open: async (n) => openCache(n),
      keys: async () => [...stores.keys()],
      delete: async (n) => stores.delete(n),
    },
    fetch: async (r) => {
      env.fetches.push(key(r));
      if (!env.online) throw new TypeError('offline');
      return res(network.get(key(r)) ?? `fresh ${key(r)}`);
    },
  });
  vm.runInContext(source, context);
  const fire = async (type, request) => {
    const waits = [];
    let response;
    const e = { request, waitUntil: (p) => waits.push(p), respondWith: (p) => { response = p; } };
    listeners[type](e);
    const out = response ? await response : undefined;
    await Promise.all(waits);
    return { response: out, handled: Boolean(response) };
  };
  const req = (path, mode = 'cors', method = 'GET') => ({ url: new URL(path, BASE).href, mode, method });
  return { env, stores, openCache, fire, req, cacheName: () => [...stores.keys()].find((n) => n.startsWith('lucid-') && n !== 'lucid-v1') };
}

test('the cache is named after the release and activation removes only older Lucid caches', async () => {
  const w = worker();
  await w.openCache('lucid-v1').put('index.html', 'old');
  await w.openCache('hgos-v3').put('https://example.org/crm/index.html', 'crm');
  await w.fire('install');
  const name = w.cacheName();
  assert.match(name, /^lucid-\d{4}-\d{2}-\d{2}\.\d+$/);
  assert.ok((await w.openCache(name).match('js/app.js')).body.startsWith('precached'));
  await w.fire('activate');
  assert.deepEqual([...w.stores.keys()].sort(), ['hgos-v3', name].sort());
});

test('code is network-first: a fix arrives on the next load, and the cached copy is used offline', async () => {
  const w = worker();
  await w.fire('install');
  const cache = w.openCache(w.cacheName());
  await cache.put('js/core/api.js', { ok: true, type: 'basic', body: 'stale api', clone() { return this; } });
  for (const path of ['js/core/api.js', 'config.js', 'css/app.css']) {
    const { response } = await w.fire('fetch', w.req(path));
    assert.equal(response.body, `fresh ${BASE}${path}`, path);
  }
  assert.equal((await cache.match('js/core/api.js')).body, `fresh ${BASE}js/core/api.js`, 'the cache is refreshed');
  const nav = await w.fire('fetch', w.req('./?utm=1', 'navigate'));
  assert.equal(nav.response.body, `fresh ${BASE}?utm=1`);
  w.env.online = false;
  assert.equal((await w.fire('fetch', w.req('js/core/api.js'))).response.body, `fresh ${BASE}js/core/api.js`);
  const offlineNav = await w.fire('fetch', w.req('./?utm=2', 'navigate'));
  assert.match(offlineNav.response.body, /lucid\/$/, 'an offline navigation falls back to the cached shell');
});

test('fonts and content are stale-while-revalidate', async () => {
  const w = worker();
  await w.fire('install');
  const cache = w.openCache(w.cacheName());
  await cache.put('content/lessons/a1-01.json', { ok: true, type: 'basic', body: 'cached lesson', clone() { return this; } });
  const first = await w.fire('fetch', w.req('content/lessons/a1-01.json'));
  assert.equal(first.response.body, 'cached lesson', 'served from cache at once');
  assert.equal((await cache.match('content/lessons/a1-01.json')).body, `fresh ${BASE}content/lessons/a1-01.json`, 'and refreshed for next time');
  const font = await w.fire('fetch', w.req('fonts/rubik-hebrew.woff2'));
  assert.match(font.response.body, /^precached/);
});

test('other origins, other apps on the origin and non-GET requests are not touched', async () => {
  const w = worker();
  await w.fire('install');
  assert.equal((await w.fire('fetch', { url: 'https://abc.supabase.co/rest/v1/lucid_records', mode: 'cors', method: 'GET' })).handled, false);
  assert.equal((await w.fire('fetch', { url: 'https://example.org/crm/js/app.js', mode: 'cors', method: 'GET' })).handled, false);
  assert.equal((await w.fire('fetch', w.req('js/app.js', 'cors', 'POST'))).handled, false);
});
