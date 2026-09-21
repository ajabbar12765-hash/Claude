// GET /api/mcp/status -> { configured, connected, toolCount, error? }
// Used by the Settings panel to show what's actually reachable, without the
// client ever seeing the server URL or token.

import { isConfigured, mcpInitialize, mcpListTools } from '../_lib/mcp.js'

export const config = { runtime: 'edge' }

export default async function handler() {
  if (!isConfigured()) {
    return Response.json({ configured: false, connected: false, toolCount: 0 })
  }

  try {
    const { sessionId } = await mcpInitialize()
    const tools = await mcpListTools(sessionId)
    return Response.json({ configured: true, connected: true, toolCount: tools.length })
  } catch (err) {
    return Response.json({ configured: true, connected: false, toolCount: 0, error: err.message })
  }
}
