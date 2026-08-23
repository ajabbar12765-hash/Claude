// Daily AI insight card, cached for the calendar day so the dashboard
// doesn't spend a Gemini call on every load.

import { requireSession } from '../_lib/auth.js'
import { readJSON, writeJSON, HEALTH_KEY, INSIGHT_KEY } from '../_lib/store.js'
import { computeSummary } from '../_lib/schema.js'
import { buildDataContext } from '../_lib/coachContext.js'
import { askGemini } from '../_lib/gemini.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  if (!requireSession(req, res)) return

  const todayKey = new Date().toISOString().slice(0, 10)
  const force = new URL(req.url, `https://${req.headers.host}`).searchParams.get('refresh') === '1'

  try {
    const cached = await readJSON(INSIGHT_KEY, null)
    if (!force && cached?.date === todayKey && cached?.text) {
      return res.status(200).json(cached)
    }

    const healthStore = await readJSON(HEALTH_KEY, { records: {} })
    const summary = computeSummary(healthStore, 14)

    if (summary.daysLogged === 0) {
      const empty = {
        date: todayKey,
        text: "No data yet — connect your Smart Band 9 data in the Import tab and I'll start giving you daily insights based on your actual steps, heart rate, sleep, and workouts.",
      }
      await writeJSON(INSIGHT_KEY, empty)
      return res.status(200).json(empty)
    }

    const text = await askGemini({
      system:
        'You are Mi Coach. Write ONE short daily insight (2-4 sentences, no greeting, no markdown headers) for the dashboard, based on the data below. Call out the single most useful trend or observation and one concrete suggestion. Be warm but concise.',
      messages: [{ role: 'user', content: buildDataContext(summary) }],
    })

    const result = { date: todayKey, text }
    await writeJSON(INSIGHT_KEY, result)
    return res.status(200).json(result)
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message })
  }
}
