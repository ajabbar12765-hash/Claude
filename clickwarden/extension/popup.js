const DOT = { malicious: '#dc2626', suspicious: '#d97706', safe: '#16a34a', unknown: '#6b7280' }

async function load() {
  const { enabled, backendUrl } = await chrome.storage.sync.get({ enabled: true, backendUrl: '' })
  document.getElementById('enabled').checked = enabled
  document.getElementById('status').textContent = backendUrl
    ? `Connected to ${backendUrl}`
    : 'Not configured -- open Settings to set your backend URL'
  document.getElementById('dashboard').href = backendUrl || 'options.html'

  const { activity = [] } = await chrome.storage.local.get('activity')
  const list = document.getElementById('activity')
  list.innerHTML = ''
  if (!activity.length) {
    list.innerHTML = '<li class="empty">Nothing checked yet.</li>'
    return
  }
  for (const a of activity.slice(0, 10)) {
    const li = document.createElement('li')
    const dot = document.createElement('span')
    dot.className = 'dot'
    dot.style.background = DOT[a.verdict] || DOT.unknown
    const text = document.createElement('span')
    text.textContent = `${a.target} — ${a.verdict}`
    li.append(dot, text)
    list.appendChild(li)
  }
}

document.getElementById('enabled').addEventListener('change', (e) => {
  chrome.storage.sync.set({ enabled: e.target.checked })
})

load()
