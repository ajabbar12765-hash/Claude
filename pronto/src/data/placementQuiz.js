// Shared by the onboarding placement quiz and the standalone "Level check"
// in Profile (for people who already onboarded before this quiz existed).
// Free-response, not multiple choice — a 4-option MCQ can be answered right
// by guessing a quarter of the time, which makes the resulting level a bad
// signal. Typing the answer (or honestly saying "I don't know") gives a
// real read on what someone actually knows, which is what sets italianLevel
// and tunes how simple or natural Volpe's Italian is during voice calls.

// Ordered easy → hard, so the quiz has enough range to actually tell an
// intermediate speaker apart from an advanced/fluent one — six survival
// words alone would let both groups ace it and land in the same bucket.
export const QUIZ_ITEMS = [
  // Beginner-testable
  { it: 'Ciao', display: 'Hi / Bye', accepted: ['hi', 'bye', 'hello', 'goodbye', 'good bye'] },
  { it: 'Grazie', display: 'Thank you', accepted: ['thank you', 'thanks'] },
  { it: 'Acqua', display: 'Water', accepted: ['water'] },
  { it: 'Buongiorno', display: 'Good morning', accepted: ['good morning', 'good day'] },
  // Elementary-testable
  { it: 'Il conto', display: 'The bill', accepted: ['the bill', 'bill', 'the check', 'check'] },
  { it: 'Scusi', display: 'Excuse me', accepted: ['excuse me', 'sorry', 'pardon', 'pardon me'] },
  // Intermediate-testable — everyday connecting words, not survival phrases
  { it: 'Magari', display: 'Maybe / I wish', accepted: ['maybe', 'i wish', 'hopefully', 'if only', 'perhaps'] },
  { it: 'Purtroppo', display: 'Unfortunately', accepted: ['unfortunately', 'sadly'] },
  // Advanced-testable — idioms and colloquial phrases a course rarely covers
  { it: 'In bocca al lupo', display: 'Good luck', accepted: ['good luck', 'break a leg'] },
  { it: 'Meno male', display: 'Thank goodness / good thing', accepted: ['thank goodness', 'good thing', 'thankfully', 'thank god'] },
]

export const QUIZ_PASS_SCORE = 7 // out of QUIZ_ITEMS.length — the intermediate threshold, high enough to genuinely skip Unit 1

export const LEVEL_LABELS = {
  beginner: 'Beginner',
  elementary: 'Elementary',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export const LEVEL_RESULT_COPY = {
  beginner: 'Totally normal to start from zero — Volpe will keep it simple, short sentences and everyday words.',
  elementary: 'A solid start — Volpe will speak at a relaxed, everyday pace while you build up.',
  intermediate: 'You already know some Italian — Volpe will talk to you more naturally, at a normal pace.',
  advanced: 'You clearly know your way around Italian — Volpe will talk to you like a real conversation partner, idioms and all.',
}

export function levelFromScore(score) {
  if (score >= 9) return 'advanced'
  if (score >= QUIZ_PASS_SCORE) return 'intermediate'
  if (score >= 3) return 'elementary'
  return 'beginner'
}

function normalizeAnswer(raw) {
  return (raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// A typed answer can honestly give more than one sense of a word ("hello/bye",
// "hi or bye", "sorry, excuse me") — split on the common separators so each
// sense is checked on its own instead of normalizing the whole string into
// one run-together blob that matches nothing.
function answerParts(raw) {
  return (raw || '')
    .split(/[/,;]|\band\b|\bor\b/i)
    .map((p) => p.trim())
    .filter(Boolean)
}

export function checkAnswer(item, raw) {
  const parts = answerParts(raw)
  if (parts.length === 0) return false
  return parts.some((part) => {
    const norm = normalizeAnswer(part)
    return norm.length > 0 && item.accepted.some((a) => normalizeAnswer(a) === norm)
  })
}
