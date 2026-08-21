// Shared by the onboarding placement quiz and the standalone "Level check"
// in Profile (for people who already onboarded before this quiz existed).
// The score doesn't just skip Unit 1 — it also sets italianLevel, which
// tunes how simple or natural Volpe's Italian is during voice calls.

export const QUIZ_ITEMS = [
  { it: 'Ciao', correct: 'Hi / Bye', options: ['Hi / Bye', 'Please', 'Sorry', 'Yes'] },
  { it: 'Grazie', correct: 'Thank you', options: ['Goodbye', 'Thank you', 'Excuse me', 'Good morning'] },
  { it: 'Acqua', correct: 'Water', options: ['Bread', 'Coffee', 'Water', 'Wine'] },
  { it: 'Buongiorno', correct: 'Good morning', options: ['Good night', 'Good evening', 'Good morning', 'Hello there'] },
  { it: 'Il conto', correct: 'The bill', options: ['The menu', 'The bill', 'The table', 'The waiter'] },
  { it: 'Scusi', correct: 'Excuse me', options: ['Please', 'Thanks', 'Excuse me', 'Welcome'] },
]

export const QUIZ_PASS_SCORE = 5 // out of QUIZ_ITEMS.length — high enough to genuinely skip Unit 1

export const LEVEL_LABELS = {
  beginner: 'Beginner',
  elementary: 'Elementary',
  intermediate: 'Intermediate',
}

export function levelFromScore(score) {
  if (score >= QUIZ_PASS_SCORE) return 'intermediate'
  if (score >= 3) return 'elementary'
  return 'beginner'
}
