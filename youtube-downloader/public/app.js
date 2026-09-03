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

// A ?key=... in the URL pre-seeds storage so the very first request succeeds
// without ever hitting a 401.
const urlKey = new URLSearchParams(location.search).get('key');
if (urlKey) localStorage.setItem(KEY_STORAGE, urlKey);

function authHeaders() {
  const key = localStorage.getItem(KEY_STORAGE);
  return key ? { 'x-access-key': key } : {};
}

// A hung request otherwise leaves the caller waiting forever with no way to
// recover — every network call in this file goes through this.
async function fetchWithTimeout(url, opts = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// No separate "is a key required?" pre-check — that round trip was the
// actual source of trouble (some layer between client and server returning
// a stale/wrong answer for it). Instead: just try the real request, and if
// the server itself says 401, ask for a key right then and retry. This is
// self-correcting by construction — it can't get out of sync with the
// server's actual state, because it always asks the server directly.
async function apiFetch(url, opts = {}, timeoutMs) {
  let showError = false;
  for (;;) {
    const res = await fetchWithTimeout(
      url,
      { ...opts, headers: { ...(opts.headers || {}), ...authHeaders() } },
      timeoutMs
    );
    if (res.status !== 401) return res;

    const key = await promptForKey(showError);
    if (!key) return res; // user gave up; caller sees the 401
    localStorage.setItem(KEY_STORAGE, key);
    showError = true; // if we loop again, this attempt also failed
  }
}

function promptForKey(showError) {
  return new Promise((resolve) => {
    keyGateEl.hidden = false;
    keyInputEl.value = '';
    keyErrorEl.textContent = showError ? 'Wrong key — try again.' : '';
    keySubmitEl.disabled = false;
    keySubmitEl.textContent = 'Unlock';
    keyInputEl.focus();

    const submit = () => {
      const key = keyInputEl.value.trim();
      if (!key) return;
      cleanup();
      resolve(key);
    };
    const onKeydown = (e) => { if (e.key === 'Enter') submit(); };

    function cleanup() {
      keyGateEl.hidden = true;
      keySubmitEl.removeEventListener('click', submit);
      keyInputEl.removeEventListener('keydown', onKeydown);
    }

    keySubmitEl.addEventListener('click', submit);
    keyInputEl.addEventListener('keydown', onKeydown);
  });
}

initCapabilities();

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
    // Actual video downloads can legitimately take minutes, unlike every
    // other call in this file — give this one a much longer leash.
    const res = await apiFetch(downloadUrl, {}, 10 * 60 * 1000);
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
