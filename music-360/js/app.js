/* ============================================================
 * Orbit 360 — app logic, v2
 *
 * Catalog sources:
 *  - Audius network  → full-length songs, free streaming API
 *  - iTunes Search   → every mainstream artist, preview length
 *  - Your uploads    → full-quality local files (IndexedDB)
 *
 * Playback uses two <audio> elements: one wired into the Web
 * Audio spatial graph (CORS-enabled), one plain. Sources that
 * block CORS play on the plain element so music never breaks —
 * and 360° comes right back on the next track.
 * ============================================================ */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  /* ---------- state ---------- */
  const elSpatial = $('player');        // wired into the engine
  const elPlain = $('player-plain');    // untouched fallback path
  let activeEl = elSpatial;
  const engine = new SpatialEngine(elSpatial);

  let queue = [];
  let qIndex = -1;
  let spatialOn = false;
  let spatialMode = 'studio';
  let plainFallback = false;            // current track can't be processed

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
  let searchSource = store.get('orbit.source', 'full');
  const corsBlockedHosts = new Set(store.get('orbit.corsHosts', []));

  /* ---------- toast ---------- */
  let toastTimer = 0;
  function toast(msg, ms = 3200) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  /* ============================================================
   * Catalogs
   * ============================================================ */

  /* ----- Audius (full songs) ----- */
  const AUDIUS_APP = 'Orbit360';
  let audiusHostP = null;
  function audiusHost() {
    if (!audiusHostP) {
      audiusHostP = fetch('https://api.audius.co')
        .then((r) => r.json())
        .then((j) => {
          if (!j.data || !j.data.length) throw new Error('no hosts');
          return j.data[Math.floor(Math.random() * Math.min(3, j.data.length))];
        })
        .catch((e) => { audiusHostP = null; throw e; });
    }
    return audiusHostP;
  }
  function mapAudius(t, host) {
    const art = t.artwork || {};
    return {
      id: 'au_' + t.id,
      title: t.title,
      artist: (t.user && t.user.name) || 'Unknown artist',
      album: t.genre || 'Audius',
      art: art['480x480'] || art['150x150'] || 'icons/icon-192.png',
      artSmall: art['150x150'] || art['480x480'] || 'icons/icon-192.png',
      src: host + '/v1/tracks/' + t.id + '/stream?app_name=' + AUDIUS_APP,
      duration: t.duration || 0,
      full: true,
    };
  }
  async function audiusSearch(term, limit = 25) {
    const h = await audiusHost();
    const r = await fetch(h + '/v1/tracks/search?query=' + encodeURIComponent(term) +
      '&limit=' + limit + '&app_name=' + AUDIUS_APP);
    const j = await r.json();
    return (j.data || []).map((t) => mapAudius(t, h));
  }
  async function audiusTrending(genre, limit = 30) {
    const h = await audiusHost();
    const r = await fetch(h + '/v1/tracks/trending?time=week&app_name=' + AUDIUS_APP +
      (genre ? '&genre=' + encodeURIComponent(genre) : ''));
    const j = await r.json();
    return (j.data || []).slice(0, limit).map((t) => mapAudius(t, h));
  }

  /* ----- iTunes (previews of every mainstream artist; JSONP) ----- */
  function itunesSearch(term, limit = 25) {
    return new Promise((resolve, reject) => {
      const cb = 'itcb_' + Math.random().toString(36).slice(2);
      const script = document.createElement('script');
      const timer = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, 10000);
      function cleanup() { clearTimeout(timer); delete window[cb]; script.remove(); }
      window[cb] = (data) => {
        cleanup();
        resolve((data.results || []).filter((r) => r.previewUrl).map((r) => ({
          id: 'it_' + r.trackId,
          title: r.trackName,
          artist: r.artistName,
          album: r.collectionName || '',
          art: (r.artworkUrl100 || '').replace('100x100', '600x600'),
          artSmall: r.artworkUrl100 || '',
          src: r.previewUrl,
          duration: 30,
          full: false,
        })));
      };
      script.onerror = () => { cleanup(); reject(new Error('network')); };
      script.src = 'https://itunes.apple.com/search?media=music&entity=song&limit=' + limit +
        '&term=' + encodeURIComponent(term) + '&callback=' + cb;
      document.head.appendChild(script);
    });
  }

  async function catalogSearch(term) {
    if (searchSource === 'previews') return itunesSearch(term);
    try {
      const full = await audiusSearch(term);
      if (full.length) return full;
      return await itunesSearch(term);          // nothing on Audius → previews
    } catch {
      toast('Full-song catalog unreachable — showing chart previews.');
      return itunesSearch(term);
    }
  }

  /* ----- Uploads (IndexedDB, full quality, always 360-capable) ----- */
  let dbP = null;
  function idb() {
    if (!dbP) {
      dbP = new Promise((res, rej) => {
        const q = indexedDB.open('orbit360', 1);
        q.onupgradeneeded = () => q.result.createObjectStore('tracks', { keyPath: 'id' });
        q.onsuccess = () => res(q.result);
        q.onerror = () => rej(q.error);
      });
    }
    return dbP;
  }
  function idbReq(r) {
    return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  }
  function parseName(filename) {
    const base = filename.replace(/\.[^.]+$/, '');
    const m = base.match(/^(.+?)\s*[-–]\s*(.+)$/);
    return m ? { artist: m[1], title: m[2] } : { artist: 'Your library', title: base };
  }
  async function saveUploads(files) {
    const db = await idb();
    const added = [];
    for (const f of files) {
      const id = 'up_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      const meta = parseName(f.name);
      await idbReq(db.transaction('tracks', 'readwrite').objectStore('tracks')
        .put({ id, name: f.name, type: f.type, blob: f }));
      added.push({ id, title: meta.title, artist: meta.artist, album: 'Your uploads',
        art: 'icons/icon-192.png', artSmall: 'icons/icon-192.png', src: null, upload: true, full: true });
    }
    return added;
  }
  const urlCache = new Map();
  async function uploadUrl(id) {
    if (urlCache.has(id)) return urlCache.get(id);
    const db = await idb();
    const rec = await idbReq(db.transaction('tracks').objectStore('tracks').get(id));
    if (!rec) return null;
    const url = URL.createObjectURL(rec.blob);
    urlCache.set(id, url);
    return url;
  }
  async function listUploads() {
    try {
      const db = await idb();
      const recs = await idbReq(db.transaction('tracks').objectStore('tracks').getAll());
      return recs.map((r) => {
        const meta = parseName(r.name);
        return { id: r.id, title: meta.title, artist: meta.artist, album: 'Your uploads',
          art: 'icons/icon-192.png', artSmall: 'icons/icon-192.png', src: null, upload: true, full: true };
      });
    } catch { return []; }
  }
  let uploads = [];

  /* ============================================================
   * Rendering
   * ============================================================ */
  const HEART = '<svg viewBox="0 0 24 24"><path d="M12 20.3 4.9 13a4.6 4.6 0 1 1 6.5-6.5l.6.6.6-.6A4.6 4.6 0 1 1 19.1 13Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  const HEART_FILL = '<svg viewBox="0 0 24 24"><path d="M12 20.3 4.9 13a4.6 4.6 0 1 1 6.5-6.5l.6.6.6-.6A4.6 4.6 0 1 1 19.1 13Z" fill="currentColor"/></svg>';

  function isLiked(t) { return liked.some((x) => x.id === t.id); }

  function fmtTime(s) {
    if (!isFinite(s) || s <= 0) return '';
    const m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ':' + String(r).padStart(2, '0');
  }

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
      const dur = fmtTime(t.duration);
      btn.querySelector('.t-meta span').textContent =
        t.artist + (t.album ? ' · ' + t.album : '') + (dur ? ' · ' + dur : '') + (t.full ? '' : ' · preview');
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

  function renderLiked() { renderTracks($('liked-list'), liked, 'Tap the heart on any track to save it here.'); }
  function renderRecents() { renderTracks($('recent-list'), recents, 'Search for a song and it will show up here.'); }
  function renderUploads() { renderTracks($('upload-list'), uploads, 'Your own files play at full quality and always support 360°.'); }

  /* ============================================================
   * Playback
   * ============================================================ */
  function playQueue(tracks, index) {
    queue = tracks.slice();
    qIndex = index;
    loadCurrent(true);
    openNowPlaying();
  }

  function hostOf(src) {
    try { return new URL(src).host; } catch { return ''; }
  }

  async function loadCurrent(autoplay) {
    const t = queue[qIndex];
    if (!t) return;
    const myIndex = qIndex;

    let src = t.src;
    if (t.upload && !src) {
      src = await uploadUrl(t.id);
      if (qIndex !== myIndex) return;           // user skipped while we loaded
      if (!src) { toast('That upload is missing on this device.'); return; }
    }

    // Sources known to block CORS play on the plain element; everything
    // else (including blob: uploads) goes through the spatial graph.
    const blocked = src.startsWith('blob:') ? false : corsBlockedHosts.has(hostOf(src));
    plainFallback = blocked;
    engine.corsBroken = false;

    const nextEl = blocked ? elPlain : elSpatial;
    const otherEl = blocked ? elSpatial : elPlain;
    otherEl.pause();
    otherEl.removeAttribute('src');
    activeEl = nextEl;

    activeEl.src = src;
    activeEl.load();
    if (autoplay) {
      if (!blocked) ensureEngine();
      activeEl.play().catch(() => { /* some browsers want another tap */ });
    }

    recents = [t, ...recents.filter((x) => x.id !== t.id)].slice(0, 30);
    store.set('orbit.recents', recents);
    renderRecents();

    updateTrackUI(t);
    updateMediaSession(t);
    syncSpatialUI();
    if (spatialOn && !blocked) engine.checkSilence();
    if (spatialOn && blocked) toast('This track’s source blocks processing — playing untouched stereo.');
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

  /* A source lied about CORS → the graph is silent. Move THIS track to the
   * plain element, remember the host, and keep 360° armed for other sources. */
  function onCorsBroken() {
    const src = elSpatial.currentSrc || elSpatial.src;
    const host = hostOf(src);
    if (host) {
      corsBlockedHosts.add(host);
      store.set('orbit.corsHosts', [...corsBlockedHosts]);
    }
    const pos = elSpatial.currentTime;
    const wasPlaying = !elSpatial.paused;
    elSpatial.pause();
    elSpatial.removeAttribute('src');

    plainFallback = true;
    activeEl = elPlain;
    elPlain.src = src;
    elPlain.load();
    elPlain.currentTime = pos;
    if (wasPlaying) elPlain.play().catch(() => {});
    syncSpatialUI();
    toast('This track’s source blocks processing — playing untouched stereo. 360° returns on the next track.');
  }

  function next() { if (queue.length) { qIndex = (qIndex + 1) % queue.length; loadCurrent(true); } }
  function prev() {
    if (!queue.length) return;
    if (activeEl.currentTime > 4) { activeEl.currentTime = 0; return; }
    qIndex = (qIndex - 1 + queue.length) % queue.length;
    loadCurrent(true);
  }

  function togglePlay() {
    if (!activeEl.src) return;
    if (activeEl.paused) {
      if (activeEl === elSpatial) ensureEngine();
      activeEl.play().catch(() => {});
    } else activeEl.pause();
  }

  /* ---------- media session (lock screen) ---------- */
  function updateMediaSession(t) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title, artist: t.artist, album: t.album,
      artwork: t.art ? [{ src: t.art, sizes: '480x480' }] : [],
    });
    navigator.mediaSession.setActionHandler('play', togglePlay);
    navigator.mediaSession.setActionHandler('pause', togglePlay);
    navigator.mediaSession.setActionHandler('previoustrack', prev);
    navigator.mediaSession.setActionHandler('nexttrack', next);
  }

  /* ---------- UI sync ---------- */
  function updateTrackUI(t) {
    $('np-title').textContent = t.title;
    $('np-artist').textContent = t.artist + (t.album ? ' — ' + t.album : '');
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
    const playing = !activeEl.paused && !activeEl.ended;
    $('ic-play').style.display = playing ? 'none' : '';
    $('ic-pause').style.display = playing ? '' : 'none';
    $('mic-play').style.display = playing ? 'none' : '';
    $('mic-pause').style.display = playing ? '' : 'none';
    document.querySelector('.stage').classList.toggle('spinning', playing && spatialOn && !plainFallback);
  }

  function clockTime(s) {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ':' + String(r).padStart(2, '0');
  }

  function bindPlayerEvents(el) {
    el.addEventListener('timeupdate', () => {
      if (el !== activeEl) return;
      const d = el.duration || 0, c = el.currentTime || 0;
      const pct = d ? (c / d) * 100 : 0;
      const seek = $('seek');
      if (!seek.matches(':active')) {
        seek.value = pct;
        seek.style.setProperty('--fill', pct + '%');
      }
      $('t-cur').textContent = clockTime(c);
      $('t-dur').textContent = clockTime(d);
      $('mini-bar').style.width = pct + '%';
    });
    el.addEventListener('ended', () => { if (el === activeEl) next(); });
    el.addEventListener('play', () => {
      if (el !== activeEl) return;
      syncPlayIcons();
      if (spatialOn && el === elSpatial) engine.checkSilence();
    });
    el.addEventListener('pause', () => { if (el === activeEl) syncPlayIcons(); });
    el.addEventListener('error', () => {
      if (el !== activeEl || !el.getAttribute('src')) return;
      toast('Could not load that track — trying the next one.');
      if (queue.length > 1) next();
    });
  }
  bindPlayerEvents(elSpatial);
  bindPlayerEvents(elPlain);

  $('seek').addEventListener('input', (e) => {
    const d = activeEl.duration || 0;
    const pct = parseFloat(e.target.value);
    e.target.style.setProperty('--fill', pct + '%');
    activeEl.currentTime = (pct / 100) * d;
  });

  $('btn-play').addEventListener('click', togglePlay);
  $('mini-play').addEventListener('click', (e) => { e.stopPropagation(); togglePlay(); });
  $('btn-next').addEventListener('click', next);
  $('btn-prev').addEventListener('click', prev);
  $('np-like').addEventListener('click', () => { const t = queue[qIndex]; if (t) toggleLike(t); });

  /* ============================================================
   * 360 controls
   * ============================================================ */
  const MODE_LABEL = {
    studio: 'On — Studio: hi-fi virtual speakers',
    concert: 'On — Concert: wide stage around you',
    orbit: 'On — Orbit: the stage revolves around you',
  };

  function syncSpatialUI() {
    const effective = spatialOn && !plainFallback;
    $('spatial-toggle').setAttribute('aria-checked', String(spatialOn));
    $('spatial-body').classList.toggle('open', spatialOn);
    $('mini-badge').hidden = !effective;
    $('spatial-status').textContent = !spatialOn
      ? 'Off — plain stereo'
      : (plainFallback ? 'Standby — this track’s source blocks processing' : MODE_LABEL[spatialMode]);
    syncPlayIcons();
  }

  function setSpatial(on) {
    spatialOn = on;
    if (on && !plainFallback && !ensureEngine()) {
      spatialOn = false;
      toast('This browser does not support Web Audio.');
      return;
    }
    if (engine.ctx) engine.setMode(on && !plainFallback ? spatialMode : 'off');
    syncSpatialUI();
    if (on && !plainFallback && !activeEl.paused) engine.checkSilence();
  }

  $('spatial-toggle').addEventListener('click', () => setSpatial(!spatialOn));

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

  /* ============================================================
   * Now playing sheet + visualizer
   * ============================================================ */
  const np = $('now-playing');
  np.classList.add('closed');
  np.hidden = false;
  function openNowPlaying() { np.classList.remove('closed'); resizeCanvas(); }
  function closeNowPlaying() { np.classList.add('closed'); }
  $('np-collapse').addEventListener('click', closeNowPlaying);
  $('mini-player').addEventListener('click', openNowPlaying);

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

    const levels = engine.getLevels(36);
    if (levels && !activeEl.paused) {
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

    if (spatialOn && !plainFallback && engine.objects.length) {
      const scale = artR * 0.62;
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

  /* ============================================================
   * Search + home
   * ============================================================ */
  let searchTimer = 0;
  let searchSeq = 0;
  function runSearch() {
    const q = $('search-input').value.trim();
    if (q.length < 2) return;
    const seq = ++searchSeq;
    catalogSearch(q)
      .then((results) => {
        if (seq !== searchSeq) return;
        renderTracks($('search-results'), results, 'No matches — try a different spelling.');
      })
      .catch(() => { if (seq === searchSeq) toast('Search failed — check your connection.'); });
  }
  $('search-input').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(runSearch, 350);
  });

  document.querySelectorAll('#source-seg button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.src === searchSource);
    btn.setAttribute('aria-checked', String(btn.dataset.src === searchSource));
    btn.addEventListener('click', () => {
      searchSource = btn.dataset.src;
      store.set('orbit.source', searchSource);
      document.querySelectorAll('#source-seg button').forEach((b) => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-checked', String(b === btn));
      });
      runSearch();
    });
  });

  /* Genre chips + featured mixes: full songs first, previews as fallback. */
  async function curated(label, loader) {
    toast('Loading ' + label + '…', 1500);
    try {
      let results = [];
      try { results = await loader(); } catch { /* fall through */ }
      if (!results.length) results = await itunesSearch(label + ' hits', 30);
      if (!results.length) { toast('Nothing found for ' + label); return; }
      playQueue(results, 0);
    } catch {
      toast('Could not load ' + label + ' — check your connection.');
    }
  }

  const GENRES = [
    { label: 'Trending', load: () => audiusTrending(null) },
    { label: 'Electronic', load: () => audiusTrending('Electronic') },
    { label: 'Hip-Hop', load: () => audiusTrending('Hip-Hop/Rap') },
    { label: 'Pop', load: () => audiusTrending('Pop') },
    { label: 'Rock', load: () => audiusTrending('Rock') },
    { label: 'Lo-fi', load: () => audiusSearch('lofi chill', 30) },
    { label: 'Jazz', load: () => audiusSearch('jazz', 30) },
    { label: 'Ambient', load: () => audiusSearch('ambient', 30) },
    { label: 'House', load: () => audiusSearch('deep house', 30) },
  ];
  const chipRow = $('genre-chips');
  GENRES.forEach((g) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = g.label;
    b.addEventListener('click', () => curated(g.label, g.load));
    chipRow.appendChild(b);
  });

  const FEATURED = [
    { name: 'Trending Now', sub: 'Full songs · this week', c: ['#175e39', '#0b331e'], load: () => audiusTrending(null) },
    { name: 'Night Drive', sub: 'Synthwave · electronic', c: ['#3d175e', '#1d0b33'], load: () => audiusSearch('synthwave', 30) },
    { name: 'Deep Space', sub: 'Ambient voyage', c: ['#173a5e', '#0b1d33'], load: () => audiusSearch('ambient space', 30) },
    { name: 'Beat Tape', sub: 'Lo-fi & chillhop', c: ['#5e2a17', '#33110b'], load: () => audiusSearch('chillhop beats', 30) },
    { name: 'Club Heat', sub: 'House & techno', c: ['#17455e', '#0b2133'], load: () => audiusTrending('Electronic') },
  ];
  const featRow = $('featured-row');
  FEATURED.forEach((f) => {
    const b = document.createElement('button');
    b.className = 'feat-card';
    b.style.background = 'linear-gradient(160deg,' + f.c[0] + ',' + f.c[1] + ')';
    b.innerHTML = '<strong></strong><span></span>';
    b.querySelector('strong').textContent = f.name;
    b.querySelector('span').textContent = f.sub;
    b.addEventListener('click', () => curated(f.name, f.load));
    featRow.appendChild(b);
  });

  /* ============================================================
   * Uploads UI
   * ============================================================ */
  $('btn-upload').addEventListener('click', () => $('file-input').click());
  $('file-input').addEventListener('change', async (e) => {
    const files = [...e.target.files].filter((f) => f.type.startsWith('audio/') || /\.(mp3|flac|m4a|wav|ogg|aac)$/i.test(f.name));
    e.target.value = '';
    if (!files.length) return;
    try {
      const added = await saveUploads(files);
      uploads = [...added, ...uploads];
      renderUploads();
      toast(added.length + (added.length === 1 ? ' track added' : ' tracks added') + ' — full quality, 360°-ready.');
    } catch {
      toast('Could not store those files on this device.');
    }
  });

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
  listUploads().then((u) => { uploads = u; renderUploads(); });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
