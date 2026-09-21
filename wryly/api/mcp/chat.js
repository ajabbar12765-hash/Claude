// Tool-calling agent loop for Zapier (or any Streamable-HTTP MCP server).
// Non-streaming, and deliberately never auto-executes a tool: every model
// tool call comes back to the client as a pending approval instead. The
// client shows it, the user approves or denies each one, and the *next*
// request carries that decision back here — this endpoint executes only
// what was approved, then asks the model to continue.
//
// One HTTP request == at most one model turn. A turn that wants to call
// tools stops and returns them for approval rather than looping further;
// resuming after approval can itself surface more tool calls, which again
// come back for approval. That's intentional, not a bug — "ask before
// anything real-world" applies to every single call, not just the first.
//
// Requires the OpenAI-compatible provider path (OPENAI_API_KEY) — Gemini,
// OpenRouter, etc. Not available when only ANTHROPIC_API_KEY is set; the
// Anthropic Messages API has its own native MCP connector that's a better
// fit there, and mixing both tool-call shapes isn't worth the complexity
// for one deployment that only uses one provider at a time.
//
// Configure with:
//   MCP_SERVER_URL     the Streamable-HTTP MCP server endpoint (e.g. your
//                       Zapier MCP server URL)
//   MCP_SERVER_TOKEN    optional bearer token, sent as Authorization: Bearer

import { AGENTS_BY_ID } from '../../src/lib/agents.js'
import { buildSystemPrompt } from '../_lib/persona.js'
import { resolveProvider, callOpenAICompatWithTools } from '../_lib/provider.js'
import { isConfigured as mcpConfigured, mcpInitialize, mcpListTools, mcpCallTool } from '../_lib/mcp.js'

export const config = { runtime: 'edge' }

function toOpenAITool(tool) {
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

function formatMcpResult(result) {
  if (!result) return '(no result)'
  const text = (result.content || []).map((c) => c.text || JSON.stringify(c)).join('\n') || '(empty result)'
  return result.isError ? `Error: ${text}` : text
}

function safeParseArgs(argsText) {
  try {
    return JSON.parse(argsText || '{}')
  } catch {
    return {}
  }
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

  const { messages, settings, agentId, pendingApproval } = body ?? {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ done: true, content: '⚠️ messages[] required.' })
  }

  const provider = resolveProvider()
  if (!provider) {
    return Response.json({ done: true, content: '⚠️ No AI provider is configured on this deployment yet.' })
  }
  if (provider.type !== 'openai') {
    return Response.json({
      done: true,
      content:
        '⚠️ Zapier tools need the OpenAI-compatible provider (OPENAI_API_KEY, e.g. Gemini or OpenRouter) — this deployment is using ANTHROPIC_API_KEY instead.',
    })
  }
  if (!mcpConfigured()) {
    return Response.json({
      done: true,
      content: '⚠️ No MCP server is configured yet — set MCP_SERVER_URL (and MCP_SERVER_TOKEN) in your environment variables.',
    })
  }

  let system = buildSystemPrompt(settings)
  const agent = agentId ? AGENTS_BY_ID[agentId] : null
  if (agent) system += `\n\n${agent.systemPrompt}`
  system +=
    '\n\nYou have access to real external tools through a connected Zapier account, which can search or act in the user\'s connected apps. Use them when they genuinely help. Every tool call you make is shown to the user for approval before it runs, so just call the tool when it\'s the right move — you don\'t need to ask permission in words first.'

  const workingMessages = messages.map((m) => ({ role: m.role, content: m.content }))

  try {
    const { sessionId } = await mcpInitialize()
    const mcpTools = await mcpListTools(sessionId)
    const tools = mcpTools.map(toOpenAITool)

    if (pendingApproval?.assistantMessage) {
      workingMessages.push(pendingApproval.assistantMessage)
      for (const call of pendingApproval.assistantMessage.tool_calls || []) {
        const decision = pendingApproval.decisions?.[call.id] || 'deny'
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
        workingMessages.push({ role: 'tool', tool_call_id: call.id, content })
      }
    }

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
      return Response.json({
        done: false,
        needsApproval: true,
        assistantMessage,
        toolCalls: assistantMessage.tool_calls.map((c) => ({
          id: c.id,
          name: c.function.name,
          args: safeParseArgs(c.function.arguments),
        })),
      })
    }

    return Response.json({ done: true, content: assistantMessage.content || '' })
  } catch (err) {
    return Response.json({ done: true, content: `⚠️ ${err.message || 'The MCP agent request failed.'}` })
  }
}
