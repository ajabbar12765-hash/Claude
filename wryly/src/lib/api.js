// Client-side helpers for talking to the /api/chat and /api/search edge
// functions, including SSE parsing for streamed replies.

export async function streamChat({ messages, settings, searchContext, gmailContext, agentId, onDelta, signal }) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages, settings, searchContext, gmailContext, agentId }),
    signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text.slice(0, 300) || `Request failed (${res.status}).`)
  }

  if (!res.body) {
    throw new Error('The server did not return a response stream.')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') return
      try {
        const evt = JSON.parse(payload)
        if (evt.delta) onDelta(evt.delta)
      } catch {
        // ignore malformed keep-alive lines
      }
    }
  }
}

export async function fetchSearch(query) {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
    if (!res.ok) return { results: [], text: '' }
    return await res.json()
  } catch {
    return { results: [], text: '' }
  }
}

export async function fetchGmailStatus() {
  try {
    const res = await fetch('/api/auth/google/status')
    if (!res.ok) return { connected: false, configured: false }
    return await res.json()
  } catch {
    return { connected: false, configured: false }
  }
}

export async function fetchGmail(query) {
  try {
    const res = await fetch(`/api/gmail/search?q=${encodeURIComponent(query)}`)
    if (!res.ok) return { connected: false, results: [], text: '' }
    return await res.json()
  } catch {
    return { connected: false, results: [], text: '' }
  }
}

export async function disconnectGmail() {
  try {
    await fetch('/api/auth/google/disconnect', { method: 'POST' })
  } catch {
    // ignore — worst case the cookie lingers until it expires
  }
}
