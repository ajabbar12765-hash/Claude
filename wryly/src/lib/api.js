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

export async function fetchMcpStatus() {
  try {
    const res = await fetch('/api/mcp/status')
    if (!res.ok) return { configured: false, connected: false, toolCount: 0 }
    return await res.json()
  } catch {
    return { configured: false, connected: false, toolCount: 0 }
  }
}

// One turn of the MCP tool-calling loop. Returns either a final answer
// ({ done: true, content }) or a pending approval ({ done: false,
// needsApproval: true, assistantMessage, toolCalls }) the caller must show
// to the user before calling this again with `pendingApproval` filled in.
export async function runMcpChat({ messages, settings, agentId, pendingApproval }) {
  try {
    const res = await fetch('/api/mcp/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages, settings, agentId, pendingApproval }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { done: true, content: `⚠️ ${text.slice(0, 300) || `Request failed (${res.status}).`}` }
    }
    return await res.json()
  } catch (err) {
    return { done: true, content: `⚠️ ${err.message || 'The Zapier tool request failed.'}` }
  }
}

// Automations: standing rules triggered by an external webhook (a Zapier
// "Webhooks by Zapier" step) instead of a live chat message.

export async function fetchAutomations() {
  try {
    const res = await fetch('/api/automations')
    if (!res.ok) return { configured: false, automations: [] }
    return await res.json()
  } catch {
    return { configured: false, automations: [] }
  }
}

export async function createAutomationRule({ name, instruction, approvalMode }) {
  const res = await fetch('/api/automations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, instruction, approvalMode }),
  })
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || `Request failed (${res.status}).`)
  return res.json()
}

export async function deleteAutomationRule(id) {
  await fetch(`/api/automations/${id}`, { method: 'DELETE' }).catch(() => {})
}

export async function setAutomationMode(id, approvalMode) {
  await fetch(`/api/automations/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ approvalMode }),
  }).catch(() => {})
}

export async function fetchPendingAutomations() {
  try {
    const res = await fetch('/api/automations/pending')
    if (!res.ok) return { pending: [] }
    return await res.json()
  } catch {
    return { pending: [] }
  }
}

export async function decidePendingAutomation(id, decisions) {
  try {
    const res = await fetch(`/api/automations/pending/${id}/decide`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decisions }),
    })
    if (!res.ok) return { ok: false }
    return await res.json()
  } catch {
    return { ok: false }
  }
}

export async function fetchAutomationLog() {
  try {
    const res = await fetch('/api/automations/log')
    if (!res.ok) return { activity: [] }
    return await res.json()
  } catch {
    return { activity: [] }
  }
}
