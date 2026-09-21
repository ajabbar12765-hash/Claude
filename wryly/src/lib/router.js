import { AGENTS } from './agents'

// Free, instant, keyword-based routing — no extra model call. Picks the
// agent whose keyword list scores highest against the message; returns null
// (plain Wryly, no specialist) when nothing scores.
export function routeAgent(text) {
  const lower = text.toLowerCase()
  let best = null
  let bestScore = 0

  for (const agent of AGENTS) {
    let score = 0
    for (const kw of agent.keywords) {
      if (lower.includes(kw)) score += 1
    }
    if (score > bestScore) {
      bestScore = score
      best = agent.id
    }
  }

  return best
}
