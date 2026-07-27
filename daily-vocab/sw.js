/* Daily Vocab service worker: offline cache + daily reminder notifications. */
var CACHE = "daily-vocab-v10";
var ASSETS = [
  "./",
  "index.html",
  "app.css",
  "app.js",
  "words.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Network-first for same-origin GETs so new deploys show up immediately;
   fall back to cache only when offline. */
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () {
      return caches.match(e.request).then(function (cached) {
        return cached || caches.match("index.html");
      });
    })
  );
});

/* Periodic background sync (Chrome/Android, installed PWA) fires the daily word. */
self.addEventListener("periodicsync", function (e) {
  if (e.tag === "daily-word") e.waitUntil(showDailyWord());
});

function showDailyWord() {
  // Word list is cached; compute today's word the same way the app does.
  return fetch("words.js").then(function (r) { return r.text(); }).then(function (txt) {
    var words = extractWords(txt);
    if (!words.length) return;
    var dayNum = Math.floor(Date.now() / 86400000);
    var w = words[dayNum % words.length];
    var hooks = [
      "✨ Today's word to master",
      "📖 A fresh word for you",
      "🧠 Level up your vocabulary",
      "🎯 Your word of the day",
      "💬 Sound smarter today",
      "🔥 Keep your streak going"
    ];
    var challenges = [
      "Challenge: use “" + w.word + "” in a sentence today 🔥",
      "Can you slip “" + w.word + "” into a chat today? 💬",
      "Your mission: say “" + w.word + "” out loud once ✨",
      "Try texting someone the word “" + w.word + "” 📲",
      "Learn it now, use it before bed 🌙"
    ];
    var title = hooks[dayNum % hooks.length] + ": " + w.word;
    var body = (w.simple || w.definition) + "  ·  " + challenges[dayNum % challenges.length];
    return self.registration.showNotification(title, {
      body: body,
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      tag: "daily-vocab",
      vibrate: [80, 40, 80]
    });
  }).catch(function () {});
}

function extractWords(txt) {
  try {
    var start = txt.indexOf("[");
    var end = txt.lastIndexOf("]");
    if (start === -1 || end === -1) return [];
    // eslint-disable-next-line no-new-func
    return (new Function("return " + txt.slice(start, end + 1)))();
  } catch (e) { return []; }
}

self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window" }).then(function (list) {
    for (var i = 0; i < list.length; i++) { if ("focus" in list[i]) return list[i].focus(); }
    if (clients.openWindow) return clients.openWindow("./");
  }));
});
