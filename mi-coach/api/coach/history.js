import { requireSession } from '../_lib/auth.js'
import { readJSON, writeJSON, CHAT_KEY } from '../_lib/store.js'

export default async function handler(req, res) {
  if (!requireSession(req, res)) return

  if (req.method === 'GET') {
    try {
      const chatStore = await readJSON(CHAT_KEY, { messages: [] })
      return res.status(200).json({ messages: chatStore.messages || [] })
    } catch (err) {
      return res.status(err.statusCode || 500).json({ error: err.message })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await writeJSON(CHAT_KEY, { messages: [] })
      return res.status(200).json({ ok: true })
    } catch (err) {
      return res.status(err.statusCode || 500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'GET or DELETE only' })
}
