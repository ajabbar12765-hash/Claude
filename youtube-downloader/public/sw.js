// Self-destructing service worker.
//
// A previous version cached the app shell here. That cache kept serving an
// outdated app.js after the server had already been fixed, so genuine fixes
// looked like they had never deployed. Devices that still have that old
// worker installed will fetch this file on their next visit, install it, and
// it immediately tears itself down — clearing the stale caches and handing
// control back to the network. Do not reintroduce caching here without a
// cache-busting story for app.js.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll())
      .then((clients) => clients.forEach((c) => c.navigate(c.url)))
      .catch(() => {})
  );
});
