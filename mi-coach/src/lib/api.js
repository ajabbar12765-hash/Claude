async function request(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`)
  }
  return data
}

export const api = {
  me: () => request('/api/auth/me'),
  login: (password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  data: (range) => request(`/api/data?range=${encodeURIComponent(range)}`),
  insight: (refresh) => request(`/api/coach/insight${refresh ? '?refresh=1' : ''}`),
  chat: (message) => request('/api/coach/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  chatHistory: () => request('/api/coach/history'),
  clearChat: () => request('/api/coach/history', { method: 'DELETE' }),
  ingest: (payload) => request('/api/ingest', { method: 'POST', body: JSON.stringify(payload) }),
  xiaomiSync: () => request('/api/xiaomi/sync', { method: 'POST' }),
}
