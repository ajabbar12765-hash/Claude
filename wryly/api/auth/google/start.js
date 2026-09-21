// Kicks off the Google OAuth flow for read-only Gmail access.
// GET /api/auth/google/start -> 302 to Google's consent screen.

import { GMAIL_SCOPE, GOOGLE_AUTH_URL, isConfigured, redirectUri } from '../../_lib/google.js'
import { serializeCookie } from '../../_lib/cookies.js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (!isConfigured()) {
    return new Response('Gmail is not configured on this deployment yet (missing GOOGLE_CLIENT_ID/SECRET).', {
      status: 503,
    })
  }

  const state = crypto.randomUUID()

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(req),
    response_type: 'code',
    scope: GMAIL_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${GOOGLE_AUTH_URL}?${params.toString()}`,
      'Set-Cookie': serializeCookie('wryly_g_state', state, { maxAge: 600 }),
    },
  })
}
