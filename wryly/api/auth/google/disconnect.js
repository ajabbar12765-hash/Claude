// POST /api/auth/google/disconnect -> revokes the token with Google and
// clears the local cookie.

import { GOOGLE_REVOKE_URL } from '../../_lib/google.js'
import { parseCookies, clearCookie } from '../../_lib/cookies.js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const cookies = parseCookies(req)
  const refreshToken = cookies['wryly_g_refresh']

  if (refreshToken) {
    try {
      await fetch(GOOGLE_REVOKE_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: refreshToken }),
        signal: AbortSignal.timeout(10000),
      })
    } catch {
      // best-effort — clearing the local cookie is what actually matters
    }
  }

  return new Response(JSON.stringify({ connected: false }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'Set-Cookie': clearCookie('wryly_g_refresh'),
    },
  })
}
