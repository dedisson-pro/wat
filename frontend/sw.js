const CACHE = "whataPlant-v3";
const ASSETS = ["/index.html", "/css/style.css", "/js/app.js", "/js/scanner.js", "/js/history.js", "/js/dashboard.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
// Ne jamais mettre en cache en développement — toujours réseau d'abord
self.addEventListener("fetch", e => {
  if (e.request.url.includes("/api/")) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
