// Shared LLM provider plumbing: which provider/model is configured, and the
// raw fetch calls to each one. Used by both the plain streaming chat
// endpoint and the MCP tool-calling agent endpoint.

export const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001'
export const DEFAULT_OPENAI_BASE_URL = 'https://openrouter.ai/api/v1'
export const DEFAULT_OPENAI_MODEL = 'meta-llama/llama-3.3-70b-instruct:free'

// Without a timeout, a slow/unresponsive provider hangs the request until
// Vercel force-kills the function — bypassing our own error handling and
// showing the user a raw platform error instead of a normal "⚠️ ..."
// message. Streaming calls get longer since a real response takes time to
// fully arrive; the non-streaming tool-call completion is capped tighter
// since it has no partial output to show while it's running.
const STREAM_TIMEOUT_MS = 45000
const COMPLETION_TIMEOUT_MS = 25000

function timeoutSignal(ms) {
  return AbortSignal.timeout(ms)
}

export function resolveProvider() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (anthropicKey) {
    return { type: 'anthropic', apiKey: anthropicKey, model: process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL }
  }
  if (openaiKey) {
    return {
      type: 'openai',
      apiKey: openaiKey,
      baseUrl: process.env.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL,
      model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
    }
  }
  return null
}

export function sse(obj) {
  return `data: ${JSON.stringify(obj)}\n\n`
}

// Re-frames a raw upstream SSE byte stream into a stream of parsed JSON
// events, buffering partial lines across chunk boundaries.
export async function* sseEvents(body) {
  const reader = body.getReader()
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
        yield JSON.parse(payload)
      } catch {
        // ignore partial/keep-alive lines
      }
    }
  }
}

export async function streamAnthropic({ apiKey, model, system, messages }) {
  let upstream
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system,
        stream: true,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
      signal: timeoutSignal(STREAM_TIMEOUT_MS),
    })
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new Error(`Anthropic didn't respond within ${STREAM_TIMEOUT_MS / 1000}s.`)
    }
    throw err
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '')
    throw new Error(`Anthropic error ${upstream.status}: ${text.slice(0, 300)}`)
  }

  return new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      try {
        for await (const evt of sseEvents(upstream.body)) {
          const text = evt?.delta?.type === 'text_delta' ? evt.delta.text : ''
          if (text) controller.enqueue(enc.encode(sse({ delta: text })))
        }
      } catch (err) {
        controller.enqueue(enc.encode(sse({ delta: `\n\n⚠️ ${err.message}` })))
      }
      controller.enqueue(enc.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
}

export async function streamOpenAICompat({ apiKey, baseUrl, model, system, messages }) {
  let upstream
  try {
    upstream = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://wryly.app',
        'X-Title': 'Wryly',
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [{ role: 'system', content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))],
      }),
      signal: timeoutSignal(STREAM_TIMEOUT_MS),
    })
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new Error(`Provider didn't respond within ${STREAM_TIMEOUT_MS / 1000}s.`)
    }
    throw err
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '')
    throw new Error(`Provider error ${upstream.status}: ${text.slice(0, 300)}`)
  }

  return new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      try {
        for await (const evt of sseEvents(upstream.body)) {
          const text = evt?.choices?.[0]?.delta?.content ?? ''
          if (text) controller.enqueue(enc.encode(sse({ delta: text })))
        }
      } catch (err) {
        controller.enqueue(enc.encode(sse({ delta: `\n\n⚠️ ${err.message}` })))
      }
      controller.enqueue(enc.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
}

// Non-streaming chat completion with tool-calling support, for the MCP
// agent loop — it needs to inspect tool_calls before deciding what happens
// next, which a token stream makes awkward. OpenAI-compatible only (Gemini,
// OpenRouter, Groq, ...); the MCP agent endpoint isn't offered when only
// ANTHROPIC_API_KEY is configured.
export async function callOpenAICompatWithTools({ apiKey, baseUrl, model, system, messages, tools }) {
  let res
  try {
    res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://wryly.app',
        'X-Title': 'Wryly',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, ...messages],
        tools: tools && tools.length > 0 ? tools : undefined,
      }),
      signal: timeoutSignal(COMPLETION_TIMEOUT_MS),
    })
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new Error(`Provider didn't respond within ${COMPLETION_TIMEOUT_MS / 1000}s.`)
    }
    throw err
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Provider error ${res.status}: ${text.slice(0, 300)}`)
  }

  return res.json()
}
