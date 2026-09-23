// A minimal client for the MCP "Streamable HTTP" transport — POST JSON-RPC
// 2.0 requests to a single server URL, auth via a Bearer token, session
// tracked with the Mcp-Session-Id header. Written against the general MCP
// spec rather than any one server's private docs, since this deployment's
// sandbox couldn't reach Zapier's own documentation to verify it directly —
// Zapier's UI does describe "Authorization header" as its recommended way
// to use a connection token, which is what this implements. If a specific
// server needs something slightly different, that's the first thing to
// check when tools/list comes back empty.

export function isConfigured() {
  return Boolean(process.env.MCP_SERVER_URL)
}

// Every MCP call is a real network round-trip to a third-party server we
// don't control. Without a timeout, a slow/unresponsive server hangs the
// whole request until Vercel force-kills the function — which bypasses our
// own error handling entirely and shows the user a raw platform error
// instead of a normal "⚠️ ..." message. This turns that into a catchable
// error well before the platform limit.
const MCP_TIMEOUT_MS = 20000

async function mcpFetch(body) {
  try {
    return await fetch(process.env.MCP_SERVER_URL, {
      method: 'POST',
      headers: body.headers,
      body: body.body,
      signal: AbortSignal.timeout(MCP_TIMEOUT_MS),
    })
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new Error(`MCP server didn't respond within ${MCP_TIMEOUT_MS / 1000}s.`)
    }
    throw err
  }
}

function authHeaders() {
  const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }
  if (process.env.MCP_SERVER_TOKEN) {
    headers.authorization = `Bearer ${process.env.MCP_SERVER_TOKEN}`
  }
  return headers
}

// Parses either a plain JSON-RPC response body or an SSE stream of them,
// returning the message whose id matches the request (or the first message
// for a notification-style response with no id to match).
async function parseRpcResponse(res, expectedId) {
  const contentType = res.headers.get('content-type') || ''
  const text = await res.text()

  if (contentType.includes('text/event-stream')) {
    let last = null
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      try {
        const msg = JSON.parse(trimmed.slice(5).trim())
        last = msg
        if (expectedId !== undefined && msg.id === expectedId) return msg
      } catch {
        // ignore malformed SSE data lines
      }
    }
    return last
  }

  if (!text) return null
  return JSON.parse(text)
}

let idCounter = 1

async function rpcCall(sessionId, method, params) {
  const id = idCounter++
  const headers = authHeaders()
  if (sessionId) headers['mcp-session-id'] = sessionId

  const res = await mcpFetch({
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  })

  const newSessionId = res.headers.get('mcp-session-id') || sessionId

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`MCP server error ${res.status}: ${text.slice(0, 300)}`)
  }

  const message = await parseRpcResponse(res, id)
  if (message?.error) {
    throw new Error(`MCP error: ${message.error.message || JSON.stringify(message.error)}`)
  }
  return { result: message?.result, sessionId: newSessionId }
}

async function rpcNotify(sessionId, method, params) {
  const headers = authHeaders()
  if (sessionId) headers['mcp-session-id'] = sessionId
  await mcpFetch({
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', method, params }),
  }).catch(() => {
    // notifications don't get a meaningful response either way
  })
}

// Opens a session: initialize -> notifications/initialized. Returns the
// session id to reuse for tools/list and tools/call in the same request.
export async function mcpInitialize() {
  const { result, sessionId } = await rpcCall(undefined, 'initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'wryly', version: '1.0.0' },
  })
  await rpcNotify(sessionId, 'notifications/initialized', {})
  return { sessionId, serverInfo: result?.serverInfo }
}

export async function mcpListTools(sessionId) {
  const { result } = await rpcCall(sessionId, 'tools/list', {})
  return result?.tools || []
}

export async function mcpCallTool(sessionId, name, args) {
  const { result } = await rpcCall(sessionId, 'tools/call', { name, arguments: args || {} })
  return result
}

// Shared formatting between the live-chat MCP loop and the automations
// webhook loop, so a change to one shape doesn't quietly drift from the
// other.

export function toOpenAITool(tool) {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description || '',
      parameters:
        tool.inputSchema && Object.keys(tool.inputSchema).length > 0
          ? tool.inputSchema
          : { type: 'object', properties: {} },
    },
  }
}

export function formatMcpResult(result) {
  if (!result) return '(no result)'
  const text = (result.content || []).map((c) => c.text || JSON.stringify(c)).join('\n') || '(empty result)'
  return result.isError ? `Error: ${text}` : text
}

export function safeParseArgs(argsText) {
  try {
    return JSON.parse(argsText || '{}')
  } catch {
    return {}
  }
}
