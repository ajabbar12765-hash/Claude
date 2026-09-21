// Streaming chat proxy (Vercel Edge Function).
//
// Keeps API keys server-side (anything shipped to the browser is public) and
// normalizes two very different streaming formats — Anthropic's Messages API
// and any OpenAI-compatible Chat Completions API (OpenRouter, Groq,
// Together, Fireworks, ...) — into one simple SSE shape the client reads:
//   data: {"delta":"text chunk"}\n\n
//   data: [DONE]\n\n
//
// Configure in your deployment's environment variables — pick ONE provider:
//   ANTHROPIC_API_KEY    uses Claude directly (api.anthropic.com)
//   ANTHROPIC_MODEL      optional, defaults to claude-haiku-4-5-20251001
// or, if ANTHROPIC_API_KEY is absent:
//   OPENAI_API_KEY        any OpenAI-compatible key (OpenRouter's is free to get)
//   OPENAI_BASE_URL       optional, defaults to https://openrouter.ai/api/v1
//   OPENAI_MODEL          optional, defaults to a free OpenRouter model
//
// With no key configured at all, this returns a friendly setup message
// instead of a crash, so the UI is still explorable out of the box.

export const config = { runtime: 'edge' }

const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001'
const DEFAULT_OPENAI_BASE_URL = 'https://openrouter.ai/api/v1'
const DEFAULT_OPENAI_MODEL = 'meta-llama/llama-3.3-70b-instruct:free'

function buildSystemPrompt({ fun = true, snark = 60, think = false } = {}) {
  const snarkLevel =
    snark >= 80 ? 'Turn the snark way up — sharp, teasing, borderline savage, but never actually mean.'
    : snark >= 50 ? 'Keep a confident, dry, sarcastic edge in most replies.'
    : snark >= 20 ? 'Stay mostly straight, with the occasional dry aside.'
    : 'Dial the humor back almost entirely — clear and professional, only a flicker of personality.'

  const funLine = fun
    ? 'Fun Mode is ON: feel free to joke, riff, use vivid analogies, and have an actual opinion.'
    : 'Fun Mode is OFF: be direct, efficient, and mostly serious — still yourself, just buttoned-up.'

  const thinkLine = think
    ? "Think Mode is ON: before answering, reason through the problem step by step inside <thinking>...</thinking> tags (your scratch work — it's shown to the user in a collapsible panel, so it can be informal). Then write your real answer AFTER the closing </thinking> tag, on its own, with no tags around it. Always include both parts."
    : "Answer directly. Do not use <thinking> tags."

  return [
    "You are Wryly — a witty, sharp-tongued AI assistant with your own personality, not a copy of any other product. ",
    "You're confident, quick, a little irreverent, and genuinely helpful underneath the banter — style is never an excuse for a wrong or lazy answer. ",
    "You have real opinions and aren't afraid to gently push back on a bad premise. Keep replies tight; don't pad them.",
    `\n\n${funLine}\n${snarkLevel}\n${thinkLine}`,
  ].join('')
}

function sse(obj) {
  return `data: ${JSON.stringify(obj)}\n\n`
}

function setupMessage(reason) {
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      controller.enqueue(
        enc.encode(
          sse({
            delta:
              `⚠️ ${reason}\n\nAdd \`OPENAI_API_KEY\` (a free OpenRouter key works — openrouter.ai) ` +
              'or `ANTHROPIC_API_KEY` to this project\'s environment variables, then redeploy.',
          })
        )
      )
      controller.enqueue(enc.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
}

// Re-frames a raw upstream SSE byte stream into a stream of parsed JSON
// events, buffering partial lines across chunk boundaries.
async function* sseEvents(body) {
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

async function streamAnthropic({ apiKey, model, system, messages }) {
  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
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
  })

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

async function streamOpenAICompat({ apiKey, baseUrl, model, system, messages }) {
  const upstream = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
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
  })

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

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { messages, settings, searchContext } = body ?? {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('messages[] required', { status: 400 })
  }

  let system = buildSystemPrompt(settings)
  if (searchContext) {
    system += `\n\nYou ran a live web search for the user's latest message. Here are the results — use them when relevant, cite what you used in plain language, and say so if they don't actually help:\n\n${searchContext}`
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  try {
    if (anthropicKey) {
      const stream = await streamAnthropic({
        apiKey: anthropicKey,
        model: process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL,
        system,
        messages,
      })
      return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
    }

    if (openaiKey) {
      const stream = await streamOpenAICompat({
        apiKey: openaiKey,
        baseUrl: process.env.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL,
        model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
        system,
        messages,
      })
      return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
    }

    return setupMessage('No AI provider is configured yet.')
  } catch (err) {
    return setupMessage(err.message || 'The AI provider request failed.')
  }
}
