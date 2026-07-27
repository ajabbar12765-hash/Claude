var CACHE='is-this-real-v1';
var ASSETS=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(ASSETS)}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.map(function(x){if(x!==CACHE)return caches.delete(x)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){if(e.request.method!=='GET')return;var u=new URL(e.request.url);if(u.origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(function(res){var c=res.clone();caches.open(CACHE).then(function(ca){ca.put(e.request,c)});return res}).catch(function(){return caches.match(e.request).then(function(x){return x||caches.match('index.html')})}))});
