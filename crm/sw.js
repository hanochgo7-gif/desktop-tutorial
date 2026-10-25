// Offline support: network first (always the latest version when online), cached copy when offline.
// Only same-origin GET requests for the app's own files are handled; data never passes through here.
const CACHE = 'hgos-app-v4';
const CORE = ['./', './index.html', './css/app.css', './manifest.webmanifest', './assets/favicon.svg', '../fonts/heebo-200-700-hebrew.woff2', '../fonts/heebo-200-700-latin.woff2',
  './js/app.js',
  './js/core/api.js',
  './js/core/backup.js',
  './js/core/finance.js',
  './js/core/local-seed.js',
  './js/core/metrics.js',
  './js/core/model.js',
  './js/core/router.js',
  './js/core/rules.js',
  './js/core/store.js',
  './js/core/util.js',
  './js/ui/components.js',
  './js/ui/drill.js',
  './js/ui/finance-forms.js',
  './js/ui/forms.js',
  './js/ui/icons.js',
  './js/ui/importer.js',
  './js/views/contact.js',
  './js/views/deal.js',
  './js/views/deals.js',
  './js/views/doc-print.js',
  './js/views/finance.js',
  './js/views/leads.js',
  './js/views/settings.js',
  './js/views/sources.js',
  './js/views/tasks.js',
  './js/views/today.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
