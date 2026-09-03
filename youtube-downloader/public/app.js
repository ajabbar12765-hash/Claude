const urlsEl = document.getElementById('urls');
const formatEl = document.getElementById('format');
const addBtn = document.getElementById('addBtn');
const statusEl = document.getElementById('status');
const listEl = document.getElementById('list');
const capNoteEl = document.getElementById('capNote');

const seen = new Set();

// An earlier version registered a service worker to cache the app shell. It
// is unregistered here instead: it kept serving a stale copy of this file
// long after the server was fixed, which made every fix look like it hadn't
// deployed. Losing offline shell caching is worth always running live code.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {});
  if (window.caches) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
  }
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

async function apiFetch(url, opts = {}, timeoutMs) {
  return fetchWithTimeout(url, opts, timeoutMs);
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
      <div class="dl-error"></div>
    </div>
    <button class="download">Download</button>
  `;

  const btn = li.querySelector('button.download');
  const errEl = li.querySelector('.dl-error');
  btn.addEventListener('click', () => startDownload(btn, errEl, url, data.title, format));
}

async function startDownload(btn, errEl, url, title, format) {
  btn.disabled = true;
  errEl.textContent = '';
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
    if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);

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
    // Shown directly instead of only console.error'd — on a phone there's
    // no way to open devtools to see what actually went wrong.
    errEl.textContent = err.name === 'AbortError' ? 'Timed out.' : err.message;
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
