import { requireSession } from '../_lib/auth.js'
import { readJSON, writeJSON, HEALTH_KEY, CHAT_KEY } from '../_lib/store.js'
import { computeSummary } from '../_lib/schema.js'
import { buildDataContext, COACH_SYSTEM_PROMPT } from '../_lib/coachContext.js'
import { askGemini } from '../_lib/gemini.js'

const MAX_HISTORY = 40

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!requireSession(req, res)) return

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = {}
    }
  }
  const message = String(body?.message || '').trim().slice(0, 2000)
  if (!message) return res.status(400).json({ error: 'message is required' })

  try {
    const [healthStore, chatStore] = await Promise.all([
      readJSON(HEALTH_KEY, { records: {} }),
      readJSON(CHAT_KEY, { messages: [] }),
    ])

    const summary = computeSummary(healthStore, 30)
    const dataContext = buildDataContext(summary)
    const history = (chatStore.messages || []).slice(-16)

    const reply = await askGemini({
      system: `${COACH_SYSTEM_PROMPT}\n\nUser's current data:\n${dataContext}`,
      messages: [...history, { role: 'user', content: message }],
    })

    const messages = [
      ...(chatStore.messages || []),
      { role: 'user', content: message, at: new Date().toISOString() },
      { role: 'assistant', content: reply, at: new Date().toISOString() },
    ].slice(-MAX_HISTORY)

    await writeJSON(CHAT_KEY, { messages })

    return res.status(200).json({ reply })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message })
  }
}
