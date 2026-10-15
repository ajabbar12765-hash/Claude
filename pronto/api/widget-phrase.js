// Public, unauthenticated feed for the Scriptable home-screen widget: a
// "phrase of the day" plus the current streak and a mascot expression
// derived from it, so the widget can render Volpe looking however the
// streak warrants. One fetch covers everything the widget needs.
import { UNITS } from '../src/data/curriculum.js'
import { getStreak } from './_lib/kv.js'

function allPhrases() {
  const phrases = []
  for (const unit of UNITS) {
    for (const lesson of unit.lessons) {
      if (lesson.type !== 'lesson') continue
      for (const ex of lesson.exercises) {
        if (ex.it && ex.en) phrases.push({ it: ex.it, en: ex.en })
      }
    }
  }
  return phrases
}

function expressionForStreak(streak) {
  if (streak >= 14) return 'ecstatic'
  if (streak >= 7) return 'excited'
  if (streak >= 3) return 'happy'
  if (streak >= 1) return 'idle'
  return 'sleepy'
}

export default async function handler(req, res) {
  const phrases = allPhrases()
  const dayIndex = Math.floor(Date.now() / 86400000)
  const phrase = phrases[dayIndex % phrases.length]

  // Streak sync is optional infrastructure (Upstash env vars) — the
  // phrase-of-the-day feature works fine without it, just without a real
  // streak number, so a missing/failed store is never fatal here.
  let streak = 0
  let streakDate = null
  try {
    ;({ streak, date: streakDate } = await getStreak())
  } catch {
    // no streak store configured yet — widget falls back to 0/sleepy
  }

  const today = new Date().toISOString().slice(0, 10)
  // The app only pushes a streak update the moment the day's first
  // XP-earning activity lands (see App.jsx's sync effect), so streakDate
  // matching today's server date IS "already practiced today" — exactly
  // the signal the widget needs to decide whether to nudge or celebrate.
  const doneToday = streakDate === today

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'public, max-age=300')
  res.status(200).json({
    it: phrase.it,
    en: phrase.en,
    date: today,
    streak,
    doneToday,
    expression: expressionForStreak(streak),
  })
}
