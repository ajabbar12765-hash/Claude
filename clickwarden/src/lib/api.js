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

export const pollGmailNow = () => request('/api/gmail/poll', { method: 'POST' })

export const getVault = () => request('/api/vault')

export const saveVault = (payload) => request('/api/vault', { method: 'PUT', body: JSON.stringify(payload) })

export async function sha256File(file) {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Have I Been Pwned's Pwned Passwords "range" API: k-anonymity means only
// the first 5 hex chars of the SHA-1 hash ever leave the browser -- HIBP
// receives ~500 candidate suffixes back and never learns which one (or
// whether any) matched. The real password never leaves the device, and
// this is a free, keyless, CORS-enabled endpoint (HIBP's own site uses it
// the same way client-side).
export async function checkPasswordBreach(password) {
  const bytes = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-1', bytes)
  const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
  const prefix = hash.slice(0, 5)
  const suffix = hash.slice(5)

  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`)
  if (!res.ok) throw new Error(`Pwned Passwords lookup failed (${res.status})`)
  const text = await res.text()

  for (const line of text.split('\n')) {
    const [lineSuffix, count] = line.trim().split(':')
    if (lineSuffix === suffix) return Number(count)
  }
  return 0
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
