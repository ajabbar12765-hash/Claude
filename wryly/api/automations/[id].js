// DELETE /api/automations/:id
// PATCH  /api/automations/:id   -> { approvalMode } (flip ask/auto)

import { getAutomation, saveAutomation, deleteAutomation } from '../_lib/automations.js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  const id = new URL(req.url).pathname.split('/').pop()

  if (req.method === 'DELETE') {
    await deleteAutomation(id)
    return Response.json({ deleted: true })
  }

  if (req.method === 'PATCH') {
    const automation = await getAutomation(id)
    if (!automation) return new Response('Not found', { status: 404 })

    let body
    try {
      body = await req.json()
    } catch {
      return new Response('Invalid JSON', { status: 400 })
    }

    if (body?.approvalMode === 'auto' || body?.approvalMode === 'ask') {
      automation.approvalMode = body.approvalMode
    }
    await saveAutomation(automation)
    return Response.json({ automation })
  }

  return new Response('Method not allowed', { status: 405 })
}
