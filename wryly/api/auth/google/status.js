// GET /api/auth/google/status -> { connected, configured }

import { isConfigured } from '../../_lib/google.js'
import { parseCookies } from '../../_lib/cookies.js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  const cookies = parseCookies(req)
  return Response.json({
    connected: Boolean(cookies['wryly_g_refresh']),
    configured: isConfigured(),
  })
}
