// Public, unauthenticated "phrase of the day" feed — powers the Scriptable
// home-screen widget (and anything else that wants a daily Italian phrase).
// No API key needed: it's just today's pick from the curriculum, rotating
// deterministically so everyone sees the same phrase on the same day.
import { UNITS } from '../src/data/curriculum.js'

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

export default function handler(req, res) {
  const phrases = allPhrases()
  const dayIndex = Math.floor(Date.now() / 86400000)
  const phrase = phrases[dayIndex % phrases.length]

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.status(200).json({
    it: phrase.it,
    en: phrase.en,
    date: new Date().toISOString().slice(0, 10),
  })
}
