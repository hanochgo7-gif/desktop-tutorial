// Offline support. On install the shell, every module and the non-lesson content are cached (lessons are
// saved on request from Settings). Code (pages, config.js, js/, css/) is network-first, so a fix reaches learners on the next
// load; when the network is slow or gone, the cached copy is used. Fonts, content and other files are
// stale-while-revalidate. Server API calls (another origin) are never cached.
// RELEASE names the cache: bump it with every deploy. A new value makes the browser install a fresh worker,
// precache the shell again and delete older Lucid caches. Only caches named "lucid-…" are ever deleted,
// because the origin is shared with other apps.
const RELEASE = '2026-10-31.2';
const CACHE = `lucid-${RELEASE}`;
const SHELL = ['./', 'index.html', 'config.js', 'css/app.css', 'js/app.js', 'manifest.webmanifest', 'assets/favicon.svg',
  'fonts/rubik-latin.woff2', 'fonts/rubik-hebrew.woff2', 'fonts/rubik-latin-ext.woff2',
  'content/taxonomy.json', 'content/curriculum.json', 'content/manifest.json'];
const SCOPE = new URL('./', self.location).pathname;
const NETWORK_TIMEOUT_MS = 4000;

const isCode = (req, rel) => req.mode === 'navigate' || rel === '' || rel === 'index.html' || rel === 'config.js'
  || rel.startsWith('js/') || rel.startsWith('css/');

// After the shell, every module and the non-lesson content listed in content/manifest.json is cached, so
// screens never opened before still work offline. Best effort: one missing file does not fail the install.
async function precacheOffline(cache) {
  try {
    const res = await fetch(new Request('content/manifest.json', { cache: 'reload' }));
    const list = (await res.json()).offline || [];
    await Promise.all(list.map((u) => cache.add(new Request(u, { cache: 'reload' })).catch(() => null)));
  } catch { /* offline during install: the shell is enough to start */ }
}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))).then(() => precacheOffline(c)))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('lucid-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Fetches and stores a fresh copy; the returned promises are the response and the cache write.
function fetchAndStore(cache, req) {
  const response = fetch(req);
  const stored = response.then((res) => (res.ok && res.type === 'basic' ? cache.put(req, res.clone()) : null)).catch(() => null);
  return { response, stored };
}

async function networkFirst(e, cache) {
  const req = e.request;
  const { response, stored } = fetchAndStore(cache, req);
  e.waitUntil(stored);
  const cached = (await cache.match(req)) || (req.mode === 'navigate' ? await cache.match('./') : undefined);
  if (!cached) return response;
  const timeout = new Promise((resolve) => { setTimeout(() => resolve(cached), NETWORK_TIMEOUT_MS); });
  return Promise.race([response.catch(() => cached), timeout]);
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
  e.respondWith(caches.open(CACHE).then((cache) => (isCode(e.request, rel) ? networkFirst(e, cache) : staleWhileRevalidate(e, cache))));
});
