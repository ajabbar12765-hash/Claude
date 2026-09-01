/* Core registry + router + shared helpers for Play Zone. */
(function () {
  'use strict';

  var registry = [];

  var Games = {
    register: function (id, def) {
      registry.push(Object.assign({ id: id }, def));
    },
    list: function () {
      return registry.slice();
    },
    get: function (id) {
      for (var i = 0; i < registry.length; i++) {
        if (registry[i].id === id) return registry[i];
      }
      return null;
    }
  };
  window.Games = Games;

  /* ---------- Shared helpers used by game modules ---------- */
  var Util = {
    $: function (sel, root) { return (root || document).querySelector(sel); },
    el: function (tag, attrs, children) {
      var node = document.createElement(tag);
      if (attrs) {
        Object.keys(attrs).forEach(function (k) {
          if (k === 'class') node.className = attrs[k];
          else if (k === 'text') node.textContent = attrs[k];
          else if (k === 'html') node.innerHTML = attrs[k];
          else if (k.indexOf('on') === 0 && typeof attrs[k] === 'function') {
            node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
          } else node.setAttribute(k, attrs[k]);
        });
      }
      (children || []).forEach(function (c) {
        if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
      return node;
    },
    fmtTime: function (ms) {
      var totalCs = Math.max(0, Math.floor(ms / 10));
      var m = Math.floor(totalCs / 6000);
      var s = Math.floor((totalCs % 6000) / 100);
      var cs = totalCs % 100;
      var pad = function (n, len) { return String(n).padStart(len || 2, '0'); };
      return (m > 0 ? pad(m) + ':' : '') + pad(s) + '.' + pad(cs);
    },
    fmtSeconds: function (totalSeconds) {
      var m = Math.floor(totalSeconds / 60);
      var s = Math.floor(totalSeconds % 60);
      return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    },
    getBest: function (key, fallback) {
      try {
        var v = localStorage.getItem('tg_' + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    setBest: function (key, value) {
      try { localStorage.setItem('tg_' + key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
    },
    vibrate: function (ms) {
      if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
    },
    randInt: function (min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
    shuffle: function (arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }
  };
  window.GameUtil = Util;

  /* ---------- Router ---------- */
  var homeEl, gameViewEl, gameRootEl, backBtn, pageTitle, gridEl;
  var activeCleanup = null;

  function renderHome() {
    gridEl.innerHTML = '';
    Games.list().forEach(function (g) {
      var bestLabel = g.bestLabel ? g.bestLabel() : '';
      var card = Util.el('a', { class: 'card', href: '#/game/' + g.id }, [
        Util.el('div', { class: 'card-icon', text: g.icon || '🎮' }),
        Util.el('div', { class: 'card-body' }, [
          Util.el('div', { class: 'card-title', text: g.title }),
          Util.el('div', { class: 'card-desc', text: g.description || '' }),
          bestLabel ? Util.el('div', { class: 'card-best', text: bestLabel }) : null
        ])
      ]);
      gridEl.appendChild(card);
    });
  }

  function stopActiveGame() {
    if (typeof activeCleanup === 'function') {
      try { activeCleanup(); } catch (e) { /* ignore cleanup errors */ }
    }
    activeCleanup = null;
    gameRootEl.innerHTML = '';
  }

  function showHome() {
    stopActiveGame();
    homeEl.hidden = false;
    gameViewEl.hidden = true;
    backBtn.hidden = true;
    pageTitle.textContent = '🎮 Play Zone';
    renderHome(); // refresh best-score labels
  }

  function showGame(id) {
    var game = Games.get(id);
    if (!game) { location.hash = '#/'; return; }
    stopActiveGame();
    homeEl.hidden = true;
    gameViewEl.hidden = false;
    backBtn.hidden = false;
    pageTitle.textContent = (game.icon || '') + ' ' + game.title;
    try {
      activeCleanup = game.init(gameRootEl, Util) || null;
    } catch (err) {
      gameRootEl.innerHTML = '';
      gameRootEl.appendChild(Util.el('div', { class: 'error-box' }, [
        'This game hit a snag and could not start. Try going back and reopening it.'
      ]));
      // eslint-disable-next-line no-console
      console.error('Game init failed for', id, err);
    }
  }

  function route() {
    var hash = location.hash || '#/';
    var m = hash.match(/^#\/game\/([a-zA-Z0-9_-]+)/);
    if (m) showGame(m[1]);
    else showHome();
  }

  function boot() {
    homeEl = document.getElementById('home');
    gameViewEl = document.getElementById('gameView');
    gameRootEl = document.getElementById('gameRoot');
    backBtn = document.getElementById('backBtn');
    pageTitle = document.getElementById('pageTitle');
    gridEl = document.getElementById('gameGrid');

    backBtn.addEventListener('click', function () { location.hash = '#/'; });
    window.addEventListener('hashchange', route);

    var offlineBadge = document.getElementById('offlineBadge');
    function syncOnline() { offlineBadge.hidden = navigator.onLine; }
    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);
    syncOnline();

    route();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline install not critical */ });
    }
  }

  // All game scripts load with `defer`, so DOMContentLoaded is guaranteed to
  // fire only after every game module has registered itself — even though
  // document.readyState is already 'interactive' by the time this script
  // (itself deferred) runs. Always wait for the event rather than branching
  // on readyState, or games registered after this file would be missed.
  document.addEventListener('DOMContentLoaded', boot);
})();
