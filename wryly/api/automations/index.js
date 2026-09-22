// GET  /api/automations       -> list automation rules
// POST /api/automations       -> create one, { name, instruction, approvalMode }

import { isConfigured as redisConfigured } from '../_lib/redis.js'
import { listAutomations, saveAutomation } from '../_lib/automations.js'

export const config = { runtime: 'edge' }

function withWebhookUrl(req, automation) {
  const url = new URL(req.url)
  return { ...automation, webhookUrl: `${url.protocol}//${url.host}/api/automations/${automation.id}/trigger` }
}

export default async function handler(req) {
  if (!redisConfigured()) {
    return Response.json({ configured: false, automations: [] })
  }

  if (req.method === 'GET') {
    const automations = await listAutomations()
    return Response.json({ configured: true, automations: automations.map((a) => withWebhookUrl(req, a)) })
  }

  if (req.method === 'POST') {
    let body
    try {
      body = await req.json()
    } catch {
      return new Response('Invalid JSON', { status: 400 })
    }

    const name = (body?.name || '').trim()
    const instruction = (body?.instruction || '').trim()
    const approvalMode = body?.approvalMode === 'auto' ? 'auto' : 'ask'

    if (!name || !instruction) {
      return new Response('name and instruction are required', { status: 400 })
    }

    const automation = {
      id: crypto.randomUUID(),
      name,
      instruction,
      approvalMode,
      createdAt: Date.now(),
    }
    await saveAutomation(automation)
    return Response.json({ automation: withWebhookUrl(req, automation) })
  }

  return new Response('Method not allowed', { status: 405 })
}
