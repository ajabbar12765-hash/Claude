// Static achievement definitions. Each `check` runs against a small snapshot
// of derived progress values (see useProgress's achievementStatuses) — no
// achievement needs its own bespoke storage beyond the handful of counters
// useProgress already tracks.

export const ACHIEVEMENTS = [
  { id: 'first-lesson', label: 'First Steps', desc: 'Complete your first lesson', icon: 'check', check: (p) => p.completedCount >= 1 },
  { id: 'perfect-1', label: 'Flawless', desc: 'Finish a lesson with zero mistakes', icon: 'spark', check: (p) => p.perfectLessons >= 1 },
  { id: 'streak-3', label: 'Warming Up', desc: 'Reach a 3-day streak', icon: 'flame', check: (p) => p.streak >= 3 },
  { id: 'chatterbox', label: 'Chatterbox', desc: 'Call Volpe for a live conversation', icon: 'chat', check: (p) => p.voiceCallCount >= 1 },
  { id: 'wordsmith', label: 'Wordsmith', desc: 'Look up 10 words in the Dictionary', icon: 'book', check: (p) => p.dictionaryLookups >= 10 },
  { id: 'streak-7', label: 'One Week In', desc: 'Reach a 7-day streak', icon: 'flame', check: (p) => p.streak >= 7 },
  { id: 'level-5', label: 'Level 5', desc: 'Reach level 5', icon: 'trophy', check: (p) => p.level >= 5 },
  { id: 'perfect-5', label: 'Sharp Shooter', desc: 'Finish 5 lessons with zero mistakes', icon: 'spark', check: (p) => p.perfectLessons >= 5 },
  { id: 'halfway', label: 'Halfway There', desc: 'Reach 50% real-life ready', icon: 'target', check: (p) => p.readinessPercent >= 50 },
  { id: 'streak-14', label: 'Two Weeks Strong', desc: 'Reach a 14-day streak', icon: 'flame', check: (p) => p.streak >= 14 },
  { id: 'level-10', label: 'Level 10', desc: 'Reach level 10', icon: 'trophy', check: (p) => p.level >= 10 },
  { id: 'ready', label: 'Ready for Italy', desc: 'Reach 100% real-life ready', icon: 'compass', check: (p) => p.readinessPercent >= 100 },
  { id: 'streak-30', label: 'Unstoppable', desc: 'Reach a 30-day streak', icon: 'flame', check: (p) => p.streak >= 30 },
]
