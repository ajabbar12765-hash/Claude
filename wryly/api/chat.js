// Streaming chat proxy (Vercel Edge Function).
//
// Keeps API keys server-side (anything shipped to the browser is public) and
// normalizes two very different streaming formats — Anthropic's Messages API
// and any OpenAI-compatible Chat Completions API (OpenRouter, Groq,
// Gemini, Together, Fireworks, ...) — into one simple SSE shape the client
// reads:
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

import { AGENTS_BY_ID } from '../src/lib/agents.js'
import { buildSystemPrompt } from './_lib/persona.js'
import { resolveProvider, streamAnthropic, streamOpenAICompat, sse } from './_lib/provider.js'

export const config = { runtime: 'edge' }

function setupMessage(reason) {
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      controller.enqueue(
        enc.encode(
          sse({
            delta:
              `⚠️ ${reason}\n\nAdd \`OPENAI_API_KEY\` (a free OpenRouter or Gemini key works) ` +
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

  const { messages, settings, searchContext, gmailContext, agentId } = body ?? {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('messages[] required', { status: 400 })
  }

  let system = buildSystemPrompt(settings)
  const agent = agentId ? AGENTS_BY_ID[agentId] : null
  if (agent) {
    system += `\n\n${agent.systemPrompt}`
  }
  if (searchContext) {
    system += `\n\nYou ran a live web search for the user's latest message. Here are the results — use them when relevant, cite what you used in plain language, and say so if they don't actually help:\n\n${searchContext}`
  }
  if (gmailContext) {
    system += `\n\nYou searched the user's real Gmail inbox (read-only) for their latest message. Here's what matched — treat it as private data, only surface what's relevant, and say plainly if nothing useful came up:\n\n${gmailContext}`
  }

  const provider = resolveProvider()

  try {
    if (provider?.type === 'anthropic') {
      const stream = await streamAnthropic({ apiKey: provider.apiKey, model: provider.model, system, messages })
      return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
    }

    if (provider?.type === 'openai') {
      const stream = await streamOpenAICompat({
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl,
        model: provider.model,
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
