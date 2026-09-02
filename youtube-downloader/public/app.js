const urlsEl = document.getElementById('urls');
const formatEl = document.getElementById('format');
const addBtn = document.getElementById('addBtn');
const statusEl = document.getElementById('status');
const listEl = document.getElementById('list');
const capNoteEl = document.getElementById('capNote');
const keyGateEl = document.getElementById('keyGate');
const keyInputEl = document.getElementById('keyInput');
const keySubmitEl = document.getElementById('keySubmit');
const keyErrorEl = document.getElementById('keyError');

const seen = new Set();
const KEY_STORAGE = 'ytdl_access_key';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

function authHeaders() {
  const key = localStorage.getItem(KEY_STORAGE);
  return key ? { 'x-access-key': key } : {};
}

async function apiFetch(url, opts = {}) {
  return fetch(url, { ...opts, headers: { ...(opts.headers || {}), ...authHeaders() } });
}

boot();

async function boot() {
  try {
    const res = await fetch('/needs-key');
    const { required } = await res.json();

    if (!required) return startApp();

    const stored = localStorage.getItem(KEY_STORAGE);
    if (stored) {
      const check = await apiFetch('/api/capabilities');
      if (check.ok) return startApp();
      localStorage.removeItem(KEY_STORAGE);
    }
    showKeyGate();
  } catch {
    startApp();
  }
}

function showKeyGate() {
  keyGateEl.hidden = false;
  keyInputEl.focus();

  const submit = async () => {
    const key = keyInputEl.value.trim();
    if (!key) return;
    localStorage.setItem(KEY_STORAGE, key);
    const check = await apiFetch('/api/capabilities');
    if (check.ok) {
      keyGateEl.hidden = true;
      startApp();
    } else {
      localStorage.removeItem(KEY_STORAGE);
      keyErrorEl.textContent = 'Wrong key — try again.';
    }
  };

  keySubmitEl.addEventListener('click', submit);
  keyInputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
}

let started = false;
function startApp() {
  if (started) return;
  started = true;
  initCapabilities();
}

async function initCapabilities() {
  try {
    const res = await apiFetch('/api/capabilities');
    const { ffmpeg } = await res.json();
    if (!ffmpeg) {
      formatEl.querySelector('option[value="best"]').disabled = true;
      formatEl.querySelector('option[value="audio"]').disabled = true;
      capNoteEl.textContent = 'ffmpeg not detected on this server — only Standard quality is available.';
    } else {
      formatEl.value = 'best';
      capNoteEl.textContent = 'ffmpeg detected — Best quality available.';
    }
  } catch {
    capNoteEl.textContent = '';
  }
}

addBtn.addEventListener('click', async () => {
  const lines = urlsEl.value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !seen.has(l));

  if (lines.length === 0) {
    statusEl.textContent = 'Paste at least one new YouTube link.';
    return;
  }

  const format = formatEl.value;
  addBtn.disabled = true;

  for (const url of lines) {
    seen.add(url);
    const li = document.createElement('li');
    li.className = 'item';
    li.textContent = `Fetching ${url} ...`;
    listEl.prepend(li);

    try {
      const res = await apiFetch(`/api/info?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch info');

      renderItem(li, url, data, format);
    } catch (err) {
      li.className = 'item error';
      li.textContent = `${url} — ${err.message}`;
    }
  }

  statusEl.textContent = '';
  addBtn.disabled = false;
});

function renderItem(li, url, data, format) {
  li.className = 'item';
  li.innerHTML = `
    <img src="${data.thumbnail || ''}" alt="" />
    <div class="meta">
      <div class="title">${escapeHtml(data.title)}</div>
      <div class="duration">${data.duration || ''}</div>
    </div>
    <button class="download">Download</button>
  `;

  const btn = li.querySelector('button.download');
  btn.addEventListener('click', () => startDownload(btn, url, data.title, format));
}

async function startDownload(btn, url, title, format) {
  btn.disabled = true;
  const started = Date.now();
  const tick = setInterval(() => {
    const secs = Math.round((Date.now() - started) / 1000);
    btn.textContent = secs < 3 ? 'Downloading…' : `Downloading… (${secs}s)`;
  }, 500);

  try {
    const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&format=${format}&title=${encodeURIComponent(title)}`;
    const res = await apiFetch(downloadUrl);
    if (!res.ok) throw new Error(await res.text());

    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="(.+)"/);
    const filename = match ? match[1] : `${title}.mp4`;

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);

    btn.textContent = 'Saved ✓';
  } catch (err) {
    btn.textContent = 'Failed — retry';
    btn.disabled = false;
    console.error(err);
  } finally {
    clearInterval(tick);
    if (btn.textContent === 'Saved ✓') btn.disabled = true;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
