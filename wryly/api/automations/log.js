// GET /api/automations/log — recent activity across all automations, so
// what fired (and what it did or didn't do) is visible even if you weren't
// watching when it happened.

import { isConfigured as redisConfigured } from '../_lib/redis.js'
import { listActivity } from '../_lib/automations.js'

export const config = { runtime: 'edge' }

export default async function handler() {
  if (!redisConfigured()) {
    return Response.json({ activity: [] })
  }
  const activity = await listActivity()
  return Response.json({ activity })
}
