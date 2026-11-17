// Makes Tern installable and lets the shell open offline. API calls always go to the network.
const CACHE = 'tern-v2';
const SHELL = ['/', '/styles.css', '/app.js', '/icons.js', '/vendor/marked.min.js', '/vendor/purify.min.js', '/vendor/katex/katex.min.js', '/vendor/katex/katex.min.css', '/favicon.svg'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  const page = e.request.mode === 'navigate';
  e.respondWith(fetch(e.request).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(page ? '/' : e.request, copy)); }
    return res;
  }).catch(() => caches.match(page ? '/' : e.request)));
});
