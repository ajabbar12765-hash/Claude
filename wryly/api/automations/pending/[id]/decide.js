// POST /api/automations/pending/:id/decide — { decisions: { toolCallId: 'approve'|'deny' } }
// Executes only the approved calls, then lets the model continue. If that
// produces more tool calls, they become a fresh pending item (still needs
// approval) rather than ever auto-running.

import { AGENTS_BY_ID } from '../../../../src/lib/agents.js'
import { routeAgent } from '../../../../src/lib/router.js'
import { buildSystemPrompt } from '../../../_lib/persona.js'
import { resolveProvider, callOpenAICompatWithTools } from '../../../_lib/provider.js'
import {
  mcpInitialize,
  mcpListTools,
  mcpCallTool,
  toOpenAITool,
  formatMcpResult,
  safeParseArgs,
} from '../../../_lib/mcp.js'
import { isConfigured as redisConfigured } from '../../../_lib/redis.js'
import { getAutomation, getPending, savePending, deletePending, logActivity } from '../../../_lib/automations.js'

export const config = { runtime: 'edge' }

const DEFAULT_SETTINGS = { fun: true, snark: 50, think: false }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }
  if (!redisConfigured()) {
    return Response.json({ ok: false, error: 'No Redis store connected.' }, { status: 503 })
  }

  const id = new URL(req.url).pathname.split('/').at(-2)
  const pending = await getPending(id)
  if (!pending) {
    return Response.json({ ok: false, error: 'That approval is no longer pending.' }, { status: 404 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }
  const decisions = body?.decisions || {}

  const provider = resolveProvider()
  if (!provider || provider.type !== 'openai') {
    return Response.json({ ok: false, error: 'OpenAI-compatible provider not configured.' }, { status: 503 })
  }

  const automation = await getAutomation(pending.automationId)

  try {
    const { sessionId } = await mcpInitialize()

    const workingMessages = [...pending.messages, pending.assistantMessage]
    for (const call of pending.assistantMessage.tool_calls || []) {
      const decision = decisions[call.id] || 'deny'
      let content
      if (decision === 'approve') {
        try {
          const result = await mcpCallTool(sessionId, call.function.name, safeParseArgs(call.function.arguments))
          content = formatMcpResult(result)
        } catch (err) {
          content = `Error running tool: ${err.message}`
        }
      } else {
        content = 'The user declined to run this action.'
      }
      await logActivity({
        id: crypto.randomUUID(),
        automationId: pending.automationId,
        automationName: pending.automationName,
        kind: decision === 'approve' ? 'executed' : 'declined',
        summary: `${call.function.name} — ${decision}`,
        createdAt: Date.now(),
      })
      workingMessages.push({ role: 'tool', tool_call_id: call.id, content })
    }

    await deletePending(id)

    let system = buildSystemPrompt(DEFAULT_SETTINGS)
    if (automation) {
      const agentId = routeAgent(automation.instruction)
      const agent = agentId ? AGENTS_BY_ID[agentId] : null
      if (agent) system += `\n\n${agent.systemPrompt}`
    }
    system += '\n\nThis is an automated trigger with no one to answer follow-up questions right now.'

    const toolsList = await mcpListTools(sessionId)
    const tools = toolsList.map(toOpenAITool)

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

    if (assistantMessage.tool_calls?.length > 0) {
      const nextPending = {
        id: crypto.randomUUID(),
        automationId: pending.automationId,
        automationName: pending.automationName,
        messages: workingMessages,
        assistantMessage,
        toolCalls: assistantMessage.tool_calls.map((c) => ({
          id: c.id,
          name: c.function.name,
          args: safeParseArgs(c.function.arguments),
        })),
        createdAt: Date.now(),
      }
      await savePending(nextPending)
      return Response.json({ ok: true, done: false, queued: true })
    }

    await logActivity({
      id: crypto.randomUUID(),
      automationId: pending.automationId,
      automationName: pending.automationName,
      kind: 'info',
      summary: assistantMessage.content || '(no reply)',
      createdAt: Date.now(),
    })
    return Response.json({ ok: true, done: true })
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 })
  }
}
