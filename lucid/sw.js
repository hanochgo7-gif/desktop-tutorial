// Offline support: the app shell is precached; other same-origin files (views, content, fonts) are served
// from cache and refreshed in the background (stale-while-revalidate). Server API calls are never cached.
const CACHE = 'lucid-v1';
const SHELL = ['./', 'index.html', 'config.js', 'css/app.css', 'js/app.js', 'manifest.webmanifest', 'assets/favicon.svg',
  'fonts/rubik-latin.woff2', 'fonts/rubik-hebrew.woff2', 'fonts/rubik-latin-ext.woff2',
  'content/taxonomy.json', 'content/curriculum.json', 'content/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(e.request);
    const fresh = fetch(e.request).then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; }).catch(() => cached);
    return cached || fresh;
  }));
});
