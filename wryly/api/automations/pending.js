// GET /api/automations/pending — everything waiting on a human decision,
// across all automations. Polled by the app so items queued while nobody
// had it open still show up next time someone does.

import { isConfigured as redisConfigured } from '../_lib/redis.js'
import { listPending } from '../_lib/automations.js'

export const config = { runtime: 'edge' }

export default async function handler() {
  if (!redisConfigured()) {
    return Response.json({ pending: [] })
  }
  const pending = await listPending()
  return Response.json({
    pending: pending.map((p) => ({
      id: p.id,
      automationId: p.automationId,
      automationName: p.automationName,
      toolCalls: p.toolCalls,
      createdAt: p.createdAt,
    })),
  })
}
