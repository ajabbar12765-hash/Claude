import { Spatial360Engine } from './engine.js';
import { searchSongs, topSongs } from './api.js';

/* ============================== state ============================== */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const audio = $('#audio-main');       // routed through the 360° engine
const bypass = $('#audio-bypass');    // plain fallback if a CDN blocks CORS
const engine = new Spatial360Engine();

const state = {
  view: 'home',
  queue: [],
  index: -1,
  playing: false,
  usingBypass: false,
  shuffle: false,
  repeat: false,
  liked: load('orbit.liked', []),
  recents: load('orbit.recents', []),
  localTracks: [],   // session-scoped (object URLs can't persist)
  homeSections: null,
  searchResults: null,
  searchTerm: '',
};

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* storage full/blocked */ }
}

const current = () => state.queue[state.index] || null;

/* ============================== toasts ============================== */

function toast(msg, ms = 3200) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  $('#toasts').appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, ms);
}

/* ============================== playback ============================== */

function activeEl() { return state.usingBypass ? bypass : audio; }

function playTrack(track, queue = null, index = 0) {
  if (queue) { state.queue = queue; state.index = index; }
  if (!track) return;

  engine.ensure(audio); // safe: we're inside a user gesture chain

  bypass.pause();
  audio.pause();
  state.usingBypass = false;

  if (track.source === 'local') {
    audio.removeAttribute('crossorigin');
  } else {
    audio.crossOrigin = 'anonymous';
  }
  audio.src = track.previewUrl;
  audio.play().then(() => {
    state.playing = true;
    afterTrackStart(track);
  }).catch(() => {
    // CORS or codec refusal — retry on the bypass element (plain stereo)
    tryBypass(track);
  });
}

function tryBypass(track) {
  if (track.source === 'local') { toast('Could not play this file.'); return; }
  state.usingBypass = true;
  bypass.src = track.previewUrl;
  bypass.play().then(() => {
    state.playing = true;
    afterTrackStart(track);
    toast('This track blocked 360° processing — playing in plain stereo.');
  }).catch(() => {
    state.playing = false;
    toast('Playback failed for this track.');
    renderPlayer();
  });
}

function afterTrackStart(track) {
  addRecent(track);
  renderPlayer();
  updateMediaSession(track);
  renderView(); // refresh now-playing highlights
}

function togglePlay() {
  const el = activeEl();
  if (!current()) {
    // nothing queued — start from whatever the view shows
    const first = state.homeSections?.[0]?.tracks?.[0];
    if (first) playTrack(first, state.homeSections[0].tracks, 0);
    return;
  }
  if (el.paused) { engine.ensure(audio); el.play(); state.playing = true; }
  else { el.pause(); state.playing = false; }
  renderPlayer();
}

function next() {
  if (!state.queue.length) return;
  let i;
  if (state.shuffle && state.queue.length > 1) {
    do { i = Math.floor(Math.random() * state.queue.length); } while (i === state.index);
  } else {
    i = state.index + 1;
    if (i >= state.queue.length) {
      if (!state.repeat) { state.playing = false; renderPlayer(); return; }
      i = 0;
    }
  }
  state.index = i;
  playTrack(current());
}

function prev() {
  const el = activeEl();
  if (el.currentTime > 3 || state.index <= 0) { el.currentTime = 0; return; }
  state.index -= 1;
  playTrack(current());
}

audio.addEventListener('ended', next);
bypass.addEventListener('ended', next);

function addRecent(track) {
  if (track.source === 'local') return;
  state.recents = [track, ...state.recents.filter((t) => t.id !== track.id)].slice(0, 12);
  save('orbit.recents', state.recents);
}

/* ============================== likes ============================== */

function isLiked(track) { return !!track && state.liked.some((t) => t.id === track.id); }

function toggleLike(track) {
  if (!track) return;
  if (track.source === 'local') { toast('Local files live in Local Files — no need to like them.'); return; }
  if (isLiked(track)) {
    state.liked = state.liked.filter((t) => t.id !== track.id);
    toast('Removed from Liked Songs');
  } else {
    state.liked = [track, ...state.liked];
    toast('Added to Liked Songs');
  }
  save('orbit.liked', state.liked);
  renderPlayer();
  if (['liked', 'library'].includes(state.view)) renderView();
}

/* ============================== local files ============================== */

$('#file-input').addEventListener('change', (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  const added = files.map((f) => ({
    id: `local-${f.name}-${f.size}`,
    title: f.name.replace(/\.[a-z0-9]+$/i, ''),
    artist: 'Local file',
    album: '',
    artwork: '',
    previewUrl: URL.createObjectURL(f),
    durationMs: 0,
    source: 'local',
  }));
  const known = new Set(state.localTracks.map((t) => t.id));
  state.localTracks.push(...added.filter((t) => !known.has(t.id)));
  toast(`Added ${added.length} file${added.length > 1 ? 's' : ''} — full-length 360° playback`);
  setView('local');
  e.target.value = '';
});

/* ============================== rendering ============================== */

const viewRoot = $('#view-root');

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtTime(s) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

function artHtml(track, cls = '') {
  if (track.artwork) return `<img class="${cls}" src="${esc(track.artwork)}" alt="" loading="lazy" />`;
  return `<span class="${cls} art-fallback"><svg viewBox="0 0 24 24"><path d="M9 3v10.6A3.5 3.5 0 1 0 11 17V7h6v6.6A3.5 3.5 0 1 0 19 17V3H9z"/></svg></span>`;
}

function trackRow(track, i) {
  const now = current()?.id === track.id;
  return `
    <div class="row ${now ? 'row--now' : ''}" data-i="${i}" role="button" tabindex="0">
      <span class="row-num">${now && state.playing ? '<span class="eq"><i></i><i></i><i></i></span>' : i + 1}</span>
      ${artHtml(track, 'row-art')}
      <span class="row-main">
        <span class="row-title">${esc(track.title)}</span>
        <span class="row-artist">${esc(track.artist)}</span>
      </span>
      <span class="row-album">${esc(track.album)}</span>
      <button class="icon-btn row-like ${isLiked(track) ? 'on' : ''}" data-like="${i}" title="Like">
        <svg viewBox="0 0 24 24"><path d="M12 21S4 14.6 4 9.3C4 6.4 6.3 4 9.1 4c1.6 0 3 .8 2.9 2 0-1.2 1.3-2 2.9-2C17.7 4 20 6.4 20 9.3 20 14.6 12 21 12 21z"/></svg>
      </button>
      <span class="row-dur">${track.source === 'local' ? '—' : fmtTime((track.durationMs || 30000) / 1000)}</span>
    </div>`;
}

function trackList(tracks, opts = {}) {
  if (!tracks.length) return `<div class="empty">${esc(opts.empty || 'Nothing here yet.')}</div>`;
  return `<div class="rows" data-list>${tracks.map((t, i) => trackRow(t, i)).join('')}</div>`;
}

function cardGrid(tracks) {
  return `<div class="cards" data-list>${tracks.map((t, i) => `
    <div class="card" data-i="${i}" role="button" tabindex="0">
      <div class="card-art">${artHtml(t)}
        <button class="card-play" title="Play">
          <svg viewBox="0 0 24 24"><path d="M8 5.1v13.8L19 12 8 5.1z"/></svg>
        </button>
      </div>
      <div class="card-title">${esc(t.title)}</div>
      <div class="card-sub">${esc(t.artist)}</div>
    </div>`).join('')}</div>`;
}

/* Wire play/like clicks for any container that has [data-list] children. */
function bindLists(scope, tracksBySection) {
  scope.querySelectorAll('[data-list]').forEach((listEl, s) => {
    const tracks = tracksBySection[s];
    listEl.addEventListener('click', (e) => {
      const likeBtn = e.target.closest('[data-like]');
      if (likeBtn) { toggleLike(tracks[+likeBtn.dataset.like]); e.stopPropagation(); return; }
      const item = e.target.closest('[data-i]');
      if (item) playTrack(tracks[+item.dataset.i], tracks, +item.dataset.i);
    });
    listEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const item = e.target.closest('[data-i]');
      if (item) playTrack(tracks[+item.dataset.i], tracks, +item.dataset.i);
    });
  });
}

/* ---------- views ---------- */

async function renderHome() {
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  if (!state.homeSections) {
    viewRoot.innerHTML = `<h1 class="h1">${hello}</h1><div class="loading"><span class="spinner"></span> Tuning the sphere…</div>`;
    try {
      const [charts, chill, electronic, classics] = await Promise.all([
        topSongs(18),
        searchSongs('lofi chill', 12),
        searchSongs('electronic dance hits', 12),
        searchSongs('classic rock anthems', 12),
      ]);
      state.homeSections = [
        { title: 'Top songs right now', tracks: charts, grid: true },
        ...(state.recents.length ? [{ title: 'Recently played', tracks: state.recents, grid: true }] : []),
        { title: 'Chill in 360°', tracks: chill },
        { title: 'Electronic energy', tracks: electronic },
        { title: 'Timeless anthems', tracks: classics },
      ].filter((s) => s.tracks.length);
    } catch {
      state.homeSections = [];
    }
    if (state.view !== 'home') return; // user navigated away while loading
  }

  if (!state.homeSections.length) {
    viewRoot.innerHTML = `<h1 class="h1">${hello}</h1>
      <div class="empty">Couldn't reach the music catalog. Check your connection, or add your own files from the sidebar — they get the full 360° treatment.</div>`;
    return;
  }

  viewRoot.innerHTML = `<h1 class="h1">${hello}</h1>` + state.homeSections.map((s) => `
    <section class="section">
      <h2 class="h2">${esc(s.title)}</h2>
      ${s.grid ? cardGrid(s.tracks) : trackList(s.tracks)}
    </section>`).join('');
  bindLists(viewRoot, state.homeSections.map((s) => s.tracks));
}

const GENRES = ['Pop', 'Hip-Hop', 'Rock', 'R&B', 'Jazz', 'Classical', 'Electronic', 'Bollywood', 'K-Pop', 'Acoustic'];

function renderSearch() {
  const chips = GENRES.map((g) => `<button class="chip" data-genre="${esc(g)}">${esc(g)}</button>`).join('');
  let body;
  if (state.searchResults === 'loading') {
    body = `<div class="loading"><span class="spinner"></span> Searching…</div>`;
  } else if (state.searchResults) {
    body = `<h2 class="h2">Results for “${esc(state.searchTerm)}”</h2>` +
      trackList(state.searchResults, { empty: 'No songs found. Try a different search.' });
  } else {
    body = `<div class="empty">Search the catalog — nearly every song on Spotify is here, spatialized for your Sony WH-CH520.</div>`;
  }
  viewRoot.innerHTML = `<h1 class="h1">Search</h1><div class="chips">${chips}</div>${body}`;
  if (Array.isArray(state.searchResults)) bindLists(viewRoot, [state.searchResults]);
  viewRoot.querySelectorAll('[data-genre]').forEach((b) =>
    b.addEventListener('click', () => { $('#search-input').value = b.dataset.genre; doSearch(b.dataset.genre + ' hits'); }));
}

function renderLibrary() {
  viewRoot.innerHTML = `
    <h1 class="h1">Your Library</h1>
    <div class="shelf">
      <button class="shelf-card shelf-card--liked" data-goto="liked">
        <svg viewBox="0 0 24 24"><path d="M12 21S4 14.6 4 9.3C4 6.4 6.3 4 9.1 4c1.6 0 3 .8 2.9 2 0-1.2 1.3-2 2.9-2C17.7 4 20 6.4 20 9.3 20 14.6 12 21 12 21z"/></svg>
        <strong>Liked Songs</strong><span>${state.liked.length} songs</span>
      </button>
      <button class="shelf-card shelf-card--local" data-goto="local">
        <svg viewBox="0 0 24 24"><path d="M9 3v10.6A3.5 3.5 0 1 0 11 17V7h6v6.6A3.5 3.5 0 1 0 19 17V3H9z"/></svg>
        <strong>Local Files</strong><span>${state.localTracks.length} files · full-length 360°</span>
      </button>
    </div>
    ${state.recents.length ? `<section class="section"><h2 class="h2">Recently played</h2>${trackList(state.recents)}</section>` : ''}`;
  bindLists(viewRoot, [state.recents]);
  viewRoot.querySelectorAll('[data-goto]').forEach((b) =>
    b.addEventListener('click', () => setView(b.dataset.goto)));
}

function renderLiked() {
  viewRoot.innerHTML = `<h1 class="h1">Liked Songs</h1>` +
    trackList(state.liked, { empty: 'Tap the heart on any song to save it here.' });
  bindLists(viewRoot, [state.liked]);
}

function renderLocal() {
  viewRoot.innerHTML = `
    <h1 class="h1">Local Files</h1>
    <p class="lead">Your own MP3 / FLAC / M4A files play <strong>full length</strong> with the complete 360° treatment. Files stay on your device — nothing is uploaded.</p>
    <label class="upload-tile" for="file-input">
      <svg viewBox="0 0 24 24"><path d="M11 5.8 7.4 9.4 6 8l6-6 6 6-1.4 1.4L13 5.8V16h-2V5.8zM5 20v-2h14v2H5z"/></svg>
      Drop audio files here or click to browse
    </label>` +
    trackList(state.localTracks, { empty: '' });
  bindLists(viewRoot, [state.localTracks]);
}

function renderView() {
  ({ home: renderHome, search: renderSearch, library: renderLibrary, liked: renderLiked, local: renderLocal }[state.view] || renderHome)();
}

function setView(view) {
  state.view = view;
  $$('.nav-item[data-view], .mobilenav [data-view]').forEach((b) =>
    b.classList.toggle('active', b.dataset.view === view));
  renderView();
  $('#main').scrollTop = 0;
}

$$('.nav-item[data-view], .mobilenav [data-view]').forEach((b) =>
  b.addEventListener('click', () => setView(b.dataset.view)));

/* ---------- search input ---------- */

let searchTimer = 0;
async function doSearch(term) {
  term = term.trim();
  state.searchTerm = term;
  if (!term) { state.searchResults = null; if (state.view === 'search') renderSearch(); return; }
  state.searchResults = 'loading';
  if (state.view !== 'search') setView('search'); else renderSearch();
  try {
    const results = await searchSongs(term, 40);
    if (state.searchTerm !== term) return; // stale response
    state.searchResults = results;
  } catch {
    state.searchResults = [];
    toast('Search failed — check your connection.');
  }
  if (state.view === 'search') renderSearch();
}

$('#search-input').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  const v = e.target.value;
  searchTimer = setTimeout(() => doSearch(v), 350);
});
$('#search-input').addEventListener('focus', () => { if (state.view !== 'search') setView('search'); });

/* ============================== player bar ============================== */

function renderPlayer() {
  const t = current();
  $('#p-title').textContent = t ? t.title : 'Nothing playing';
  $('#p-artist').textContent = t ? t.artist : 'Pick a song to start your 360° session';
  const art = $('#p-art');
  art.innerHTML = t && t.artwork
    ? `<img src="${esc(t.artwork)}" alt="" />`
    : `<svg viewBox="0 0 24 24" class="art-placeholder"><path d="M9 3v10.6A3.5 3.5 0 1 0 11 17V7h6v6.6A3.5 3.5 0 1 0 19 17V3H9z"/></svg>`;
  art.classList.toggle('spin', state.playing);
  $('#p-like').classList.toggle('on', isLiked(t));
  $('.ic-play').hidden = state.playing;
  $('.ic-pause').hidden = !state.playing;
  $('#btn-shuffle').classList.toggle('on', state.shuffle);
  $('#btn-repeat').classList.toggle('on', state.repeat);
  document.title = t ? `${t.title} · ${t.artist} — Orbit 360` : 'Orbit 360 — Spatial Music';
}

$('#btn-play').addEventListener('click', togglePlay);
$('#btn-next').addEventListener('click', next);
$('#btn-prev').addEventListener('click', prev);
$('#btn-shuffle').addEventListener('click', () => { state.shuffle = !state.shuffle; renderPlayer(); });
$('#btn-repeat').addEventListener('click', () => { state.repeat = !state.repeat; renderPlayer(); });
$('#p-like').addEventListener('click', () => toggleLike(current()));

/* seek bar */
const seekbar = $('#seekbar');
let seeking = false;

function updateSeekUI() {
  const el = activeEl();
  const dur = el.duration || 0;
  const cur = el.currentTime || 0;
  if (!seeking) {
    const pct = dur ? (cur / dur) * 100 : 0;
    $('#seek-fill').style.width = pct + '%';
    $('#seek-knob').style.left = pct + '%';
  }
  $('#t-cur').textContent = fmtTime(cur);
  $('#t-dur').textContent = fmtTime(dur);
  if ('mediaSession' in navigator && dur && isFinite(dur)) {
    try { navigator.mediaSession.setPositionState({ duration: dur, position: Math.min(cur, dur), playbackRate: 1 }); } catch { /* ignore */ }
  }
}

function seekTo(clientX) {
  const r = seekbar.getBoundingClientRect();
  const pct = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  const el = activeEl();
  if (el.duration) el.currentTime = pct * el.duration;
  $('#seek-fill').style.width = pct * 100 + '%';
  $('#seek-knob').style.left = pct * 100 + '%';
}

seekbar.addEventListener('pointerdown', (e) => {
  seeking = true;
  seekbar.setPointerCapture(e.pointerId);
  seekTo(e.clientX);
});
seekbar.addEventListener('pointermove', (e) => { if (seeking) seekTo(e.clientX); });
seekbar.addEventListener('pointerup', () => { seeking = false; });

[audio, bypass].forEach((el) => {
  el.addEventListener('timeupdate', updateSeekUI);
  el.addEventListener('durationchange', updateSeekUI);
  el.addEventListener('play', () => { state.playing = true; renderPlayer(); });
  el.addEventListener('pause', () => { state.playing = false; renderPlayer(); });
});

/* volume */
$('#volume').addEventListener('input', (e) => {
  const v = +e.target.value;
  if (engine.ctx) engine.setVolume(v);
  audio.volume = engine.ctx ? 1 : v; // pre-engine, control the element directly
  bypass.volume = v;
});
bypass.volume = 0.9;

/* ============================== 360 studio ============================== */

const studio = $('#studio');
const MODES = ['stereo', 'orbit', 'reality'];
const MODE_LABEL = { stereo: 'Stereo', orbit: 'Orbit 360°', reality: '360 Reality' };
const MODE_HINT = {
  stereo: 'Plain stereo passthrough — exactly what the artist mixed.',
  orbit: 'The whole mix glides in a slow circle around your head. Adjust Motion for speed.',
  reality: 'Instruments are placed on a sphere around your head — the Sony 360 Reality Audio experience, recreated with binaural HRTF.',
};

function setMode(mode) {
  engine.setMode(mode);
  $$('#mode-seg button').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
  $('#mode-hint').textContent = MODE_HINT[mode];
  $('#p-mode').textContent = MODE_LABEL[mode];
  $('#p-mode').classList.toggle('pill--active', mode !== 'stereo');
  save('orbit.mode', mode);
}

$$('#mode-seg button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
$('#p-mode').addEventListener('click', () => {
  const i = (MODES.indexOf(engine.mode) + 1) % MODES.length;
  setMode(MODES[i]);
  toast(`Audio mode: ${MODE_LABEL[MODES[i]]}`);
});

$('#s-intensity').addEventListener('input', (e) => engine.setIntensity(+e.target.value));
$('#s-motion').addEventListener('input', (e) => engine.setMotion(+e.target.value));
$('#s-room').addEventListener('input', (e) => engine.setRoom(+e.target.value));
$('#hp-profile').addEventListener('change', (e) => engine.setHeadphoneProfile(e.target.checked));

function openStudio(open) {
  studio.classList.toggle('open', open);
  document.body.classList.toggle('studio-open', open);
}
$('#open-studio').addEventListener('click', () => openStudio(!studio.classList.contains('open')));
$('#close-studio').addEventListener('click', () => openStudio(false));
$('#m-studio').addEventListener('click', () => openStudio(!studio.classList.contains('open')));

/* restore saved mode + sliders */
setMode(load('orbit.mode', 'reality'));
engine.setMotion(+$('#s-motion').value);
engine.setRoom(+$('#s-room').value);

/* ============================== visualizer ============================== */

const viz = $('#viz');
const vctx = viz.getContext('2d');

function drawViz() {
  requestAnimationFrame(drawViz);
  if (!studio.classList.contains('open')) return;
  const W = viz.width, H = viz.height;
  const cx = W / 2, cy = H / 2;
  vctx.clearRect(0, 0, W, H);

  const fft = engine.fft();
  const ringR = W * 0.36;

  // radial spectrum ring
  if (fft) {
    const n = 96;
    for (let i = 0; i < n; i++) {
      const v = fft[Math.floor((i / n) * fft.length * 0.7)] / 255;
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const r0 = ringR + 8;
      const r1 = r0 + 4 + v * W * 0.09;
      const hue = 145 + (i / n) * 120;
      vctx.strokeStyle = `hsla(${hue}, 80%, ${45 + v * 25}%, ${0.25 + v * 0.6})`;
      vctx.lineWidth = 3;
      vctx.beginPath();
      vctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      vctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      vctx.stroke();
    }
  }

  // sphere guide
  vctx.strokeStyle = 'rgba(255,255,255,0.10)';
  vctx.lineWidth = 1.5;
  vctx.beginPath(); vctx.arc(cx, cy, ringR, 0, Math.PI * 2); vctx.stroke();
  vctx.beginPath(); vctx.ellipse(cx, cy, ringR, ringR * 0.36, 0, 0, Math.PI * 2); vctx.stroke();

  // listener head (top-down, nose pointing up = forward)
  vctx.fillStyle = 'rgba(255,255,255,0.85)';
  vctx.beginPath(); vctx.arc(cx, cy, W * 0.045, 0, Math.PI * 2); vctx.fill();
  vctx.beginPath();
  vctx.moveTo(cx, cy - W * 0.075);
  vctx.lineTo(cx - W * 0.018, cy - W * 0.04);
  vctx.lineTo(cx + W * 0.018, cy - W * 0.04);
  vctx.closePath(); vctx.fill();
  // ear cups
  vctx.fillStyle = 'rgba(255,255,255,0.5)';
  vctx.fillRect(cx - W * 0.062, cy - W * 0.02, W * 0.014, W * 0.04);
  vctx.fillRect(cx + W * 0.048, cy - W * 0.02, W * 0.014, W * 0.04);

  // sound objects (x → right, -z → up/forward, y → size + glow)
  const scale = ringR / 2.1;
  for (const s of engine.sources) {
    const px = cx + s.x * scale;
    const py = cy + s.z * scale;
    const size = 7 + (s.y + 1.6) * 3;
    const g = vctx.createRadialGradient(px, py, 0, px, py, size * 2.4);
    g.addColorStop(0, 'rgba(30,215,96,0.9)');
    g.addColorStop(0.5, 'rgba(124,92,255,0.45)');
    g.addColorStop(1, 'rgba(124,92,255,0)');
    vctx.fillStyle = g;
    vctx.beginPath(); vctx.arc(px, py, size * 2.4, 0, Math.PI * 2); vctx.fill();
    vctx.fillStyle = '#eafff2';
    vctx.beginPath(); vctx.arc(px, py, size * 0.45, 0, Math.PI * 2); vctx.fill();
  }

  if (!engine.sources.length && engine.mode === 'stereo') {
    vctx.fillStyle = 'rgba(255,255,255,0.45)';
    vctx.font = `500 ${W * 0.032}px Inter, sans-serif`;
    vctx.textAlign = 'center';
    vctx.fillText('Stereo passthrough — pick Orbit or 360 Reality', cx, H - 26);
  }
}
drawViz();

/* ============================== media session ============================== */

function updateMediaSession(track) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist,
    album: track.album || 'Orbit 360',
    artwork: track.artwork ? [{ src: track.artwork, sizes: '600x600', type: 'image/jpeg' }] : [],
  });
  navigator.mediaSession.setActionHandler('play', togglePlay);
  navigator.mediaSession.setActionHandler('pause', togglePlay);
  navigator.mediaSession.setActionHandler('previoustrack', prev);
  navigator.mediaSession.setActionHandler('nexttrack', next);
  navigator.mediaSession.setActionHandler('seekto', (d) => { if (d.seekTime != null) activeEl().currentTime = d.seekTime; });
}

/* ============================== keyboard ============================== */

document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea')) return;
  const el = activeEl();
  switch (e.key) {
    case ' ': e.preventDefault(); togglePlay(); break;
    case 'ArrowRight': el.currentTime = Math.min((el.currentTime || 0) + 5, el.duration || 0); break;
    case 'ArrowLeft': el.currentTime = Math.max((el.currentTime || 0) - 5, 0); break;
    case 'n': next(); break;
    case 'p': prev(); break;
    case 'm': $('#p-mode').click(); break;
  }
});

/* ============================== boot ============================== */

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline shell is optional */ });
}

renderPlayer();
setView('home');
