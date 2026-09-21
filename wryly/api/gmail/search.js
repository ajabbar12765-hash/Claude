// Read-only Gmail search, used to feed real inbox context into a chat reply.
// GET /api/gmail/search?q=<gmail search syntax>&limit=5

import { refreshAccessToken, isConfigured } from '../_lib/google.js'
import { parseCookies } from '../_lib/cookies.js'

export const config = { runtime: 'edge' }

function headerValue(headers, name) {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

export default async function handler(req) {
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  const limit = Math.min(Number(url.searchParams.get('limit')) || 5, 10)

  if (!isConfigured()) {
    return Response.json({ connected: false, configured: false, results: [], text: '' })
  }

  const cookies = parseCookies(req)
  const refreshToken = cookies['wryly_g_refresh']
  if (!refreshToken) {
    return Response.json({ connected: false, configured: true, results: [], text: '' })
  }

  if (!q) {
    return Response.json({ connected: true, configured: true, results: [], text: '' })
  }

  try {
    const { access_token } = await refreshAccessToken(refreshToken)
    const authHeaders = { authorization: `Bearer ${access_token}` }

    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${new URLSearchParams({
        q,
        maxResults: String(limit),
      })}`,
      { headers: authHeaders }
    )
    if (!listRes.ok) throw new Error(`Gmail list failed (${listRes.status})`)
    const list = await listRes.json()
    const ids = (list.messages || []).map((m) => m.id)

    const messages = await Promise.all(
      ids.map(async (id) => {
        const params = new URLSearchParams({ format: 'metadata' })
        params.append('metadataHeaders', 'Subject')
        params.append('metadataHeaders', 'From')
        params.append('metadataHeaders', 'Date')
        const res = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?${params.toString()}`,
          { headers: authHeaders }
        )
        if (!res.ok) return null
        const msg = await res.json()
        return {
          subject: headerValue(msg.payload?.headers, 'Subject') || '(no subject)',
          from: headerValue(msg.payload?.headers, 'From'),
          date: headerValue(msg.payload?.headers, 'Date'),
          snippet: msg.snippet || '',
        }
      })
    )

    const results = messages.filter(Boolean)
    const text = results
      .map((m, i) => `${i + 1}. From: ${m.from} | Subject: ${m.subject} | ${m.snippet}`)
      .join('\n')

    return Response.json({ connected: true, configured: true, results, text })
  } catch (err) {
    return Response.json({ connected: true, configured: true, results: [], text: '', error: err.message })
  }
}
