// Lets the client push its bank connection details (and already-imported
// transaction ids) to server-side storage, so the cron job knows what to
// poll without needing the browser open. Called right after a successful
// GoCardless connect, after a manual sync, and on disconnect.

import { setBankConfig, seedDedupeIds, clearBankData } from '../_lib/kv.js'

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    try {
      await clearBankData()
      res.status(200).json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const { requisitionId, accountIds, institutionName, importedIds } = req.body || {}
    if (!requisitionId || !Array.isArray(accountIds)) {
      res.status(400).json({ error: 'Missing "requisitionId" or "accountIds".' })
      return
    }
    await setBankConfig({ requisitionId, accountIds, institutionName })
    if (Array.isArray(importedIds) && importedIds.length > 0) {
      await seedDedupeIds(importedIds)
    }
    res.status(200).json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
