// Offline support for the standalone web build (node build.mjs web). The cache name changes with every build.
const CACHE = "melachot-1794860077296";
const CORE = ["./", "manifest.webmanifest", "favicon-48.png", "icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("melachot-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const font = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== self.location.origin && !font) return;
  // printable PDFs (media/*.pdf) open in a new tab, which is also a navigation: treat them like images (cache on use),
  // never as the app page, so they do not overwrite the cached page and an offline miss gets a worded page, not an error
  const file = /\/media\/[^/]+\.pdf$/i.test(url.pathname);
  if (file) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((r) => {
        if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return r;
      }).catch(() => new Response(
        '<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>מלאכות הבנייה</title>' +
        '<body style="font:20px/1.6 system-ui,sans-serif;background:#EBECE7;color:#1A1E21;padding:24px;max-width:32em;margin:auto">' +
        "<h1>הקובץ להדפסה לא זמין בלי אינטרנט</h1><p>התחברו לאינטרנט ונסו שוב. אחרי שפותחים קובץ פעם אחת, הוא נשמר גם לשימוש בלי אינטרנט.</p>" +
        '<p><a href="../" style="color:inherit">לחזור לאפליקציה</a></p></body></html>',
        { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
      )))
    );
    return;
  }
  // only the app page itself is stored as "./" (a media file opened in its own tab must never replace it)
  if (req.mode === "navigate" && !/\/(media|src-img)\//.test(url.pathname)) {
    // the page: network first, so a new version appears as soon as the student is online; cached copy when offline
    e.respondWith(
      fetch(req)
        .then((r) => {
          // keep only a good copy of the app page itself: a 404 or error page (a mistyped address) must never replace it
          const scope = new URL(self.registration.scope).pathname;
          const page = url.pathname === scope || url.pathname === scope + "index.html";
          if (r.ok && page) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put("./", copy)); }
          return r;
        })
        .catch(() => caches.match("./"))
    );
    return;
  }
  // images, fonts and icons: cache first, filled as the student opens them
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((r) => {
      if (r.ok || r.type === "opaque") { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return r;
    }))
  );
});
