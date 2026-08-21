const TOKEN_KEY = 'clickwarden:token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

async function request(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      'x-clickwarden-token': getToken(),
      ...(options.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export const scanUrl = (url) => request('/api/scan-url', { method: 'POST', body: JSON.stringify({ url }) })

export const scanFile = (payload) => request('/api/scan-file', { method: 'POST', body: JSON.stringify(payload) })

export const getHistory = (limit = 50) => request(`/api/history?limit=${limit}`)

export const getGmailStatus = () => request('/api/gmail/status')

export const disconnectGmail = () => request('/api/gmail/disconnect', { method: 'POST' })

export async function sha256File(file) {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Chunked to avoid blowing the call stack on String.fromCharCode(...bytes)
// for anything past a few hundred KB.
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}
