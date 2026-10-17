// The app shell for offline use. Tracks never pass through here: they live in IndexedDB.
// release.sh writes the commit here (and in index.html); "dev" is the Mac and Tailscale.
// A release opens from the cache, offline or not; a new release waits until «Обновить» is tapped.
// "dev" goes to the network first, so an edit shows up on the next open.
const VERSION = "0ee3a4e";
const CACHE = "verstak-" + VERSION;
const SHELL = ["./", "index.html", "manifest.json", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", e => {
  // past the HTTP cache: GitHub Pages lets the browser keep a file 10 minutes, long enough to mix two releases
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: "reload"}))))
    .then(() => VERSION === "dev" && self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("verstak-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("message", e => {
  if (e.data === "update") self.skipWaiting();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  const cached = () => caches.open(CACHE).then(c => c.match(e.request, {ignoreSearch: true}));
  if (VERSION !== "dev") {
    e.respondWith(cached().then(r => r || fetch(e.request)));
    return;
  }
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
    }
    return r;
  }).catch(() => cached().then(r => r || Response.error())));
});
