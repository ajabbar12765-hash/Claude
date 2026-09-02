const urlsEl = document.getElementById('urls');
const formatEl = document.getElementById('format');
const addBtn = document.getElementById('addBtn');
const statusEl = document.getElementById('status');
const listEl = document.getElementById('list');

const seen = new Set();

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
      const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch info');

      const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&format=${format}&title=${encodeURIComponent(data.title)}`;

      li.className = 'item';
      li.innerHTML = `
        <img src="${data.thumbnail || ''}" alt="" />
        <div class="meta">
          <div class="title">${escapeHtml(data.title)}</div>
          <div class="duration">${data.duration || ''}</div>
        </div>
        <a class="download" href="${downloadUrl}">Download</a>
      `;
    } catch (err) {
      li.className = 'item error';
      li.textContent = `${url} — ${err.message}`;
    }
  }

  statusEl.textContent = '';
  addBtn.disabled = false;
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
