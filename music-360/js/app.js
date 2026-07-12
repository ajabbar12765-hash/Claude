/* ============================================================
 * Orbit 360 — app logic
 * Catalog search via the iTunes Search API (full commercial
 * catalog, high-quality track previews), played through the
 * SpatialEngine for 360° rendering.
 * ============================================================ */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  /* ---------- state ---------- */
  let player = $('player');
  let engine = new SpatialEngine(player);
  let spatialUnavailable = false; // set when a source taints the graph (CORS)
  let queue = [];            // current playback queue (array of tracks)
  let qIndex = -1;
  let spatialOn = false;
  let spatialMode = 'sphere';
  let plainFallback = false; // true when the current track can't be processed (CORS)

  const store = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
      catch { return fallback; }
    },
    set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* full/private */ }
    },
  };
  let liked = store.get('orbit.liked', []);
  let recents = store.get('orbit.recents', []);

  /* ---------- catalog (iTunes Search API via JSONP — no CORS issues) ---------- */
  function catalogSearch(term, limit = 25) {
    return new Promise((resolve, reject) => {
      const cb = 'itcb_' + Math.random().toString(36).slice(2);
      const script = document.createElement('script');
      const timer = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, 10000);
      function cleanup() {
        clearTimeout(timer);
        delete window[cb];
        script.remove();
      }
      window[cb] = (data) => { cleanup(); resolve(data.results || []); };
      script.onerror = () => { cleanup(); reject(new Error('network')); };
      script.src = 'https://itunes.apple.com/search?media=music&entity=song&limit=' + limit +
        '&term=' + encodeURIComponent(term) + '&callback=' + cb;
      document.head.appendChild(script);
    });
  }

  function toTrack(r) {
    return {
      id: r.trackId,
      title: r.trackName,
      artist: r.artistName,
      album: r.collectionName || '',
      art: (r.artworkUrl100 || '').replace('100x100', '600x600'),
      artSmall: r.artworkUrl100 || '',
      src: r.previewUrl,
    };
  }

  /* ---------- toast ---------- */
  let toastTimer = 0;
  function toast(msg, ms = 3200) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  /* ---------- rendering ---------- */
  const HEART = '<svg viewBox="0 0 24 24"><path d="M12 20.3 4.9 13a4.6 4.6 0 1 1 6.5-6.5l.6.6.6-.6A4.6 4.6 0 1 1 19.1 13Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  const HEART_FILL = '<svg viewBox="0 0 24 24"><path d="M12 20.3 4.9 13a4.6 4.6 0 1 1 6.5-6.5l.6.6.6-.6A4.6 4.6 0 1 1 19.1 13Z" fill="currentColor"/></svg>';

  function isLiked(t) { return liked.some((x) => x.id === t.id); }

  function renderTracks(container, tracks, emptyMsg) {
    container.innerHTML = '';
    if (!tracks.length) {
      container.innerHTML = '<p class="empty-hint">' + emptyMsg + '</p>';
      return;
    }
    const cur = queue[qIndex];
    tracks.forEach((t, i) => {
      const btn = document.createElement('button');
      btn.className = 'track' + (cur && cur.id === t.id ? ' playing' : '');
      btn.innerHTML =
        '<img loading="lazy" alt="" src="' + t.artSmall + '"/>' +
        '<div class="t-meta"><strong></strong><span></span></div>' +
        '<span class="t-like' + (isLiked(t) ? ' liked' : '') + '">' + (isLiked(t) ? HEART_FILL : HEART) + '</span>';
      btn.querySelector('strong').textContent = t.title;
      btn.querySelector('.t-meta span').textContent = t.artist + (t.album ? ' · ' + t.album : '');
      btn.addEventListener('click', (e) => {
        if (e.target.closest('.t-like')) { toggleLike(t, btn.querySelector('.t-like')); return; }
        playQueue(tracks, i);
      });
      container.appendChild(btn);
    });
  }

  function toggleLike(t, el) {
    if (isLiked(t)) {
      liked = liked.filter((x) => x.id !== t.id);
      toast('Removed from Liked Songs');
    } else {
      liked = [t, ...liked].slice(0, 500);
      toast('Added to Liked Songs');
    }
    store.set('orbit.liked', liked);
    if (el) { el.classList.toggle('liked', isLiked(t)); el.innerHTML = isLiked(t) ? HEART_FILL : HEART; }
    renderLiked();
    syncNowPlayingLike();
  }

  function renderLiked() {
    renderTracks($('liked-list'), liked, 'Tap the heart on any track to save it here.');
  }
  function renderRecents() {
    renderTracks($('recent-list'), recents, 'Search for a song and it will show up here.');
  }

  /* ---------- playback ---------- */
  function playQueue(tracks, index) {
    queue = tracks.slice();
    qIndex = index;
    loadCurrent(true);
    openNowPlaying();
  }

  function loadCurrent(autoplay) {
    const t = queue[qIndex];
    if (!t) return;

    plainFallback = spatialUnavailable;
    engine.corsBroken = false;
    if (!spatialUnavailable) player.crossOrigin = 'anonymous';
    player.src = t.src;
    player.load();
    if (autoplay) {
      if (!spatialUnavailable) ensureEngine();
      player.play().catch(() => { /* needs another tap on some browsers */ });
    }

    // recents
    recents = [t, ...recents.filter((x) => x.id !== t.id)].slice(0, 30);
    store.set('orbit.recents', recents);
    renderRecents();

    updateTrackUI(t);
    updateMediaSession(t);
    if (spatialOn) engine.checkSilence();
  }

  function ensureEngine() {
    if (!engine.ctx) {
      if (!engine.init()) return false;
      engine.onCorsBroken = onCorsBroken;
      engine.setMode(spatialOn ? spatialMode : 'off');
    }
    engine.resume();
    return true;
  }

  /* When a source blocks CORS the whole graph outputs silence, and an
   * element already hooked to a MediaElementSource can never leave the
   * graph. Recover by swapping in a fresh element that bypasses Web Audio
   * entirely; 360° stays off until reload. */
  function onCorsBroken() {
    plainFallback = true;
    spatialUnavailable = true;
    const old = player;
    const pos = old.currentTime;
    const wasPlaying = !old.paused;
    old.pause();

    const fresh = document.createElement('audio');
    fresh.preload = 'auto';
    fresh.src = old.currentSrc || old.src;
    old.replaceWith(fresh);
    player = fresh;
    bindPlayerEvents(player);
    player.currentTime = pos;
    if (wasPlaying) player.play().catch(() => {});
    setSpatial(false);
    toast('This source blocks audio processing — playing in plain stereo.');
  }

  function next() { if (queue.length) { qIndex = (qIndex + 1) % queue.length; loadCurrent(true); } }
  function prev() {
    if (!queue.length) return;
    if (player.currentTime > 4) { player.currentTime = 0; return; }
    qIndex = (qIndex - 1 + queue.length) % queue.length;
    loadCurrent(true);
  }

  function togglePlay() {
    if (!player.src) return;
    if (player.paused) { if (!spatialUnavailable) ensureEngine(); player.play().catch(() => {}); }
    else player.pause();
  }

  /* ---------- media session (lock screen controls) ---------- */
  function updateMediaSession(t) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title, artist: t.artist, album: t.album,
      artwork: [{ src: t.art, sizes: '600x600', type: 'image/jpeg' }],
    });
    navigator.mediaSession.setActionHandler('play', togglePlay);
    navigator.mediaSession.setActionHandler('pause', togglePlay);
    navigator.mediaSession.setActionHandler('previoustrack', prev);
    navigator.mediaSession.setActionHandler('nexttrack', next);
  }

  /* ---------- UI sync ---------- */
  function updateTrackUI(t) {
    $('np-title').textContent = t.title;
    $('np-artist').textContent = t.artist + ' — ' + t.album;
    $('np-art').src = t.art;
    $('mini-title').textContent = t.title;
    $('mini-artist').textContent = t.artist;
    $('mini-art').src = t.artSmall;
    $('mini-player').hidden = false;
    syncNowPlayingLike();
    document.querySelectorAll('.track.playing').forEach((el) => el.classList.remove('playing'));
  }

  function syncNowPlayingLike() {
    const t = queue[qIndex];
    if (!t) return;
    $('np-like').classList.toggle('liked', isLiked(t));
  }

  function syncPlayIcons() {
    const playing = !player.paused && !player.ended;
    $('ic-play').style.display = playing ? 'none' : '';
    $('ic-pause').style.display = playing ? '' : 'none';
    $('mic-play').style.display = playing ? 'none' : '';
    $('mic-pause').style.display = playing ? '' : 'none';
    document.querySelector('.stage').classList.toggle('spinning', playing && spatialOn);
  }

  function fmtTime(s) {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ':' + String(r).padStart(2, '0');
  }

  function bindPlayerEvents(el) {
    el.addEventListener('timeupdate', () => {
      const d = el.duration || 0, c = el.currentTime || 0;
      const pct = d ? (c / d) * 100 : 0;
      const seek = $('seek');
      if (!seek.matches(':active')) {
        seek.value = pct;
        seek.style.setProperty('--fill', pct + '%');
      }
      $('t-cur').textContent = fmtTime(c);
      $('t-dur').textContent = fmtTime(d);
      $('mini-bar').style.width = pct + '%';
    });
    el.addEventListener('ended', next);
    el.addEventListener('play', () => { syncPlayIcons(); if (spatialOn) engine.checkSilence(); });
    el.addEventListener('pause', syncPlayIcons);
    el.addEventListener('error', () => {
      if (el.src) toast('Could not load that track — trying the next one.');
      if (queue.length > 1) next();
    });
  }
  bindPlayerEvents(player);

  $('seek').addEventListener('input', (e) => {
    const d = player.duration || 0;
    const pct = parseFloat(e.target.value);
    e.target.style.setProperty('--fill', pct + '%');
    player.currentTime = (pct / 100) * d;
  });

  $('btn-play').addEventListener('click', togglePlay);
  $('mini-play').addEventListener('click', (e) => { e.stopPropagation(); togglePlay(); });
  $('btn-next').addEventListener('click', next);
  $('btn-prev').addEventListener('click', prev);
  $('np-like').addEventListener('click', () => { const t = queue[qIndex]; if (t) toggleLike(t); });

  /* ---------- 360 controls ---------- */
  function setSpatial(on) {
    spatialOn = on;
    if (on && !ensureEngine()) {
      spatialOn = false;
      toast('This browser does not support Web Audio.');
      return;
    }
    if (engine.ctx) engine.setMode(on ? spatialMode : 'off');
    $('spatial-toggle').setAttribute('aria-checked', String(on));
    $('spatial-body').classList.toggle('open', on);
    $('mini-badge').hidden = !on;
    $('spatial-status').textContent = on
      ? (spatialMode === 'sphere' ? 'On — object sphere around you' : 'On — orbiting your head')
      : 'Off — plain stereo';
    syncPlayIcons();
    if (on && !player.paused) engine.checkSilence();
  }

  $('spatial-toggle').addEventListener('click', () => {
    if (spatialUnavailable || plainFallback) {
      toast('360° is unavailable right now — reload the app to try again.');
      return;
    }
    setSpatial(!spatialOn);
  });

  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      spatialMode = btn.dataset.mode;
      document.querySelectorAll('.mode-btn').forEach((b) => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-checked', String(b === btn));
      });
      if (spatialOn) setSpatial(true);
    });
  });
  $('spatial-speed').addEventListener('input', (e) => engine.setSpeed(e.target.value / 100));
  $('spatial-depth').addEventListener('input', (e) => engine.setDepth(e.target.value / 100));

  /* ---------- now playing sheet ---------- */
  const np = $('now-playing');
  np.classList.add('closed');
  np.hidden = false;
  function openNowPlaying() { np.classList.remove('closed'); resizeCanvas(); }
  function closeNowPlaying() { np.classList.add('closed'); }
  $('np-collapse').addEventListener('click', closeNowPlaying);
  $('mini-player').addEventListener('click', openNowPlaying);

  /* ---------- stage visualizer ---------- */
  const canvas = $('stage-canvas');
  const cx2d = canvas.getContext('2d');
  function resizeCanvas() {
    const r = canvas.parentElement.getBoundingClientRect();
    canvas.width = r.width * devicePixelRatio;
    canvas.height = r.height * devicePixelRatio;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function drawStage() {
    requestAnimationFrame(drawStage);
    if (np.classList.contains('closed')) return;
    const w = canvas.width, h = canvas.height;
    cx2d.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const artR = Math.min(w, h) * 0.31;

    // frequency ring
    const levels = engine.getLevels(36);
    if (levels && !player.paused) {
      cx2d.save();
      cx2d.translate(cx, cy);
      for (let i = 0; i < levels.length; i++) {
        const a = (i / levels.length) * Math.PI * 2 - Math.PI / 2;
        const v = levels[i];
        const r0 = artR + 6 * devicePixelRatio;
        const r1 = r0 + (4 + v * 34) * devicePixelRatio;
        const g = cx2d.createLinearGradient(Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1);
        g.addColorStop(0, 'rgba(30,215,96,.55)');
        g.addColorStop(1, 'rgba(75,215,255,.15)');
        cx2d.strokeStyle = g;
        cx2d.lineWidth = 3 * devicePixelRatio;
        cx2d.lineCap = 'round';
        cx2d.beginPath();
        cx2d.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
        cx2d.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        cx2d.stroke();
      }
      cx2d.restore();
    }

    // spatial objects (top-down: x → x, z → y; front of head = up)
    if (spatialOn && engine.objects.length) {
      const scale = artR * 0.55;
      for (const o of engine.objects) {
        const px = cx + o.x * scale;
        const py = cy + o.z * scale;
        const size = (o.main ? 7 : 4.5) * devicePixelRatio * (1 + (o.y || 0) * 0.15);
        const glow = cx2d.createRadialGradient(px, py, 0, px, py, size * 3);
        glow.addColorStop(0, o.main ? 'rgba(30,215,96,.9)' : 'rgba(75,215,255,.8)');
        glow.addColorStop(1, 'rgba(75,215,255,0)');
        cx2d.fillStyle = glow;
        cx2d.beginPath(); cx2d.arc(px, py, size * 3, 0, Math.PI * 2); cx2d.fill();
        cx2d.fillStyle = '#fff';
        cx2d.beginPath(); cx2d.arc(px, py, size * 0.55, 0, Math.PI * 2); cx2d.fill();
      }
    }
  }
  drawStage();

  /* ---------- search ---------- */
  let searchTimer = 0;
  $('search-input').addEventListener('input', (e) => {
    const q = e.target.value.trim();
    clearTimeout(searchTimer);
    if (q.length < 2) return;
    searchTimer = setTimeout(async () => {
      try {
        const results = (await catalogSearch(q)).map(toTrack).filter((t) => t.src);
        renderTracks($('search-results'), results, 'No matches — try a different spelling.');
      } catch {
        toast('Search failed — check your connection.');
      }
    }, 350);
  });

  /* ---------- home: genre chips + featured mixes ---------- */
  const GENRES = ['Pop', 'Hip-Hop', 'Rock', 'Electronic', 'Jazz', 'Classical', 'R&B', 'Indie', 'Lo-fi', 'Bollywood'];
  const chipRow = $('genre-chips');
  GENRES.forEach((g) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = g;
    b.addEventListener('click', () => runCurated(g + ' hits', g));
    chipRow.appendChild(b);
  });

  const FEATURED = [
    { q: 'ambient space music', name: 'Deep Space', sub: 'Ambient voyage', c: ['#173a5e', '#0b1d33'] },
    { q: 'classical orchestra masterpieces', name: 'Orchestra Hall', sub: 'Sit center stage', c: ['#5e2a17', '#33110b'] },
    { q: 'jazz quartet', name: 'Blue Note', sub: 'Late-night jazz', c: ['#17455e', '#0b2133'] },
    { q: 'binaural chill electronic', name: 'Night Drive', sub: 'Electronic chill', c: ['#3d175e', '#1d0b33'] },
    { q: 'acoustic guitar sessions', name: 'Unplugged', sub: 'Acoustic warmth', c: ['#175e39', '#0b331e'] },
  ];
  const featRow = $('featured-row');
  FEATURED.forEach((f) => {
    const b = document.createElement('button');
    b.className = 'feat-card';
    b.style.background = 'linear-gradient(160deg,' + f.c[0] + ',' + f.c[1] + ')';
    b.innerHTML = '<strong></strong><span></span>';
    b.querySelector('strong').textContent = f.name;
    b.querySelector('span').textContent = f.sub;
    b.addEventListener('click', () => runCurated(f.q, f.name));
    featRow.appendChild(b);
  });

  async function runCurated(query, label) {
    toast('Loading ' + label + '…', 1500);
    try {
      const results = (await catalogSearch(query, 30)).map(toTrack).filter((t) => t.src);
      if (!results.length) { toast('Nothing found for ' + label); return; }
      playQueue(results, 0);
    } catch {
      toast('Could not load ' + label + ' — check your connection.');
    }
  }

  /* ---------- tabs ---------- */
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.view').forEach((v) =>
        v.classList.toggle('active', v.id === 'view-' + tab.dataset.view));
      if (tab.dataset.view === 'search') $('search-input').focus();
    });
  });

  /* ---------- greeting ---------- */
  const hr = new Date().getHours();
  $('greeting').textContent =
    hr < 5 ? 'Up late? Perfect time for 360° sound' :
    hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';

  /* ---------- boot ---------- */
  renderLiked();
  renderRecents();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
