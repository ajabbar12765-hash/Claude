import { requireToken } from './_lib/auth.js'
import { kv } from './_lib/kv.js'

const VAULT_KEY = 'clickwarden:vault'

// Pure ciphertext storage -- the salt/iv/ciphertext here are meaningless
// without the master password, which never reaches this endpoint. See
// src/lib/vaultCrypto.js for where the actual encryption happens.
export default async function handler(req, res) {
  if (!requireToken(req, res)) return

  let store
  try {
    store = kv()
  } catch (e) {
    return res.status(503).json({ error: String(e) })
  }

  if (req.method === 'GET') {
    const blob = await store.get(VAULT_KEY)
    return res.status(200).json({ blob: blob || null })
  }

  if (req.method === 'PUT') {
    const { salt, iterations, iv, ciphertext } = req.body || {}
    if (!salt || !iterations || !iv || !ciphertext) {
      return res.status(400).json({ error: 'salt, iterations, iv, and ciphertext are all required' })
    }
    await store.set(VAULT_KEY, { salt, iterations, iv, ciphertext, updatedAt: new Date().toISOString() })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'GET or PUT only' })
}
