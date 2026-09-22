// POST /api/automations/:id/trigger — the webhook a Zapier "Webhooks by
// Zapier" step calls when the automation's trigger fires (e.g. a new
// WhatsApp message). Body is intentionally loose: { from?, message? } plus
// whatever else the Zap sends — only `message` is really required.
//
// "ask" mode (default): runs one model turn, and if it wants to call a
// tool, queues it in the pending-approval list instead of running it —
// same rule as live chat, just reviewed later instead of immediately.
// "auto" mode: loops the tool-calling turn to completion on its own,
// logging every call it actually makes, since there's no human to ask.

import { AGENTS_BY_ID } from '../../../src/lib/agents.js'
import { routeAgent } from '../../../src/lib/router.js'
import { buildSystemPrompt } from '../../_lib/persona.js'
import { resolveProvider, callOpenAICompatWithTools } from '../../_lib/provider.js'
import {
  isConfigured as mcpConfigured,
  mcpInitialize,
  mcpListTools,
  mcpCallTool,
  toOpenAITool,
  formatMcpResult,
  safeParseArgs,
} from '../../_lib/mcp.js'
import { isConfigured as redisConfigured } from '../../_lib/redis.js'
import { getAutomation, savePending, logActivity } from '../../_lib/automations.js'

export const config = { runtime: 'edge' }

const MAX_AUTO_ITERATIONS = 4
const DEFAULT_SETTINGS = { fun: true, snark: 50, think: false }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const id = new URL(req.url).pathname.split('/').at(-2)

  if (!redisConfigured()) {
    return Response.json({ ok: false, error: 'No Redis store connected on this deployment.' }, { status: 503 })
  }

  const automation = await getAutomation(id)
  if (!automation) {
    return Response.json({ ok: false, error: 'Unknown automation id.' }, { status: 404 })
  }

  const provider = resolveProvider()
  if (!provider || provider.type !== 'openai') {
    return Response.json(
      { ok: false, error: 'Automations need the OpenAI-compatible provider (OPENAI_API_KEY) configured.' },
      { status: 503 }
    )
  }
  if (!mcpConfigured()) {
    return Response.json({ ok: false, error: 'No MCP server configured (MCP_SERVER_URL).' }, { status: 503 })
  }

  let payload = {}
  try {
    payload = await req.json()
  } catch {
    // some Zaps send no body at all — that's fine, the instruction alone may be enough
  }

  const triggerText = payload?.message || payload?.text || JSON.stringify(payload)
  const fromText = payload?.from ? ` from ${payload.from}` : ''

  const userText = `Incoming trigger${fromText}: "${triggerText}"\n\nWhat to do: ${automation.instruction}`
  const agentId = routeAgent(userText)
  const agent = agentId ? AGENTS_BY_ID[agentId] : null

  let system = buildSystemPrompt(DEFAULT_SETTINGS)
  if (agent) system += `\n\n${agent.systemPrompt}`
  system +=
    '\n\nThis message came from an automated trigger, not a live chat — there is no one to answer follow-up questions right now, so act on the best interpretation of the instruction. You have real external tools available through Zapier.'

  let workingMessages = [{ role: 'user', content: userText }]

  try {
    const { sessionId } = await mcpInitialize()
    const mcpTools = await mcpListTools(sessionId)
    const tools = mcpTools.map(toOpenAITool)

    for (let i = 0; i < MAX_AUTO_ITERATIONS; i++) {
      const response = await callOpenAICompatWithTools({
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl,
        model: provider.model,
        system,
        messages: workingMessages,
        tools,
      })

      const assistantMessage = response.choices?.[0]?.message
      if (!assistantMessage) throw new Error('No response from the model.')

      if (!assistantMessage.tool_calls?.length) {
        await logActivity({
          id: crypto.randomUUID(),
          automationId: automation.id,
          automationName: automation.name,
          kind: 'info',
          summary: assistantMessage.content || '(no reply)',
          createdAt: Date.now(),
        })
        return Response.json({ ok: true, done: true })
      }

      if (automation.approvalMode === 'ask') {
        const pending = {
          id: crypto.randomUUID(),
          automationId: automation.id,
          automationName: automation.name,
          messages: workingMessages,
          assistantMessage,
          toolCalls: assistantMessage.tool_calls.map((c) => ({
            id: c.id,
            name: c.function.name,
            args: safeParseArgs(c.function.arguments),
          })),
          createdAt: Date.now(),
        }
        await savePending(pending)
        await logActivity({
          id: crypto.randomUUID(),
          automationId: automation.id,
          automationName: automation.name,
          kind: 'queued',
          summary: `Queued ${pending.toolCalls.length} action(s) for approval`,
          createdAt: Date.now(),
        })
        return Response.json({ ok: true, done: false, queued: true })
      }

      // auto mode — execute every call now, then let the loop continue so
      // the model can react to the result (or decide it's actually done)
      workingMessages = [...workingMessages, assistantMessage]
      for (const call of assistantMessage.tool_calls) {
        const args = safeParseArgs(call.function.arguments)
        let content
        try {
          const result = await mcpCallTool(sessionId, call.function.name, args)
          content = formatMcpResult(result)
        } catch (err) {
          content = `Error running tool: ${err.message}`
        }
        await logActivity({
          id: crypto.randomUUID(),
          automationId: automation.id,
          automationName: automation.name,
          kind: 'executed',
          summary: `${call.function.name}(${JSON.stringify(args)}) → ${content.slice(0, 200)}`,
          createdAt: Date.now(),
        })
        workingMessages.push({ role: 'tool', tool_call_id: call.id, content })
      }
    }

    await logActivity({
      id: crypto.randomUUID(),
      automationId: automation.id,
      automationName: automation.name,
      kind: 'error',
      summary: `Stopped after ${MAX_AUTO_ITERATIONS} tool-call rounds without finishing.`,
      createdAt: Date.now(),
    })
    return Response.json({ ok: true, done: true, truncated: true })
  } catch (err) {
    await logActivity({
      id: crypto.randomUUID(),
      automationId: automation.id,
      automationName: automation.name,
      kind: 'error',
      summary: err.message || 'The automation failed.',
      createdAt: Date.now(),
    })
    return Response.json({ ok: false, error: err.message }, { status: 500 })
  }
}
