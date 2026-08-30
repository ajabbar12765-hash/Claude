import { useCallback, useEffect, useMemo, useState } from 'react'
import { UNITS, OBJECTIVES, OBJECTIVE_REQUIREMENTS, vocabForLesson } from '../data/curriculum.js'
import { ACHIEVEMENTS } from '../data/achievements.js'

const XP_PER_LEVEL = 100

// How many taught words/phrases to send Volpe as "known vocabulary" context.
// Capped so a learner deep into the course doesn't balloon every voice-call
// request — the most recent (most advanced) items in curriculum order win.
const KNOWN_VOCAB_CAP = 50

// Leitner-style spaced repetition: each box index is the number of days
// until the next review after a correct recall. A miss always drops an
// item back to box 0 (review again tomorrow) rather than losing all prior
// progress, since a slip after weeks of correct recalls isn't "starting over."
const SRS_INTERVALS = [1, 2, 4, 8, 16, 30, 60]
const REVIEW_XP_PER_ITEM = 3
// Cap a single review session so it stays a quick daily habit, not homework.
const REVIEW_SESSION_SIZE = 15

const STORAGE_KEY = 'pronto:progress:v1'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(dateStr, n) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysBetween(a, b) {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((new Date(b) - new Date(a)) / msPerDay)
}

function defaultState() {
  return {
    xp: 0,
    streak: { count: 0, lastActiveDate: null },
    completedLessons: {},
    unitTestPassed: {},
    correct: {},
    goalXpPerDay: 30,
    motivation: null,
    xpToday: { date: todayStr(), amount: 0 },
    startedAt: new Date().toISOString(),
    perfectLessons: 0,
    voiceCallCount: 0,
    dictionaryLookups: 0,
    italianLevel: null,
    srs: {},
    reviewSessionsCompleted: 0,
  }
}

function loadState() {
  if (typeof window === 'undefined') return defaultState()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw)
    return { ...defaultState(), ...parsed }
  } catch {
    return defaultState()
  }
}

export function useProgress() {
  const [state, setState] = useState(loadState)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // localStorage unavailable (private mode, quota, etc.) — progress just won't persist
    }
  }, [state])

  const recordCorrect = useCallback((itemId) => {
    setState((prev) => ({
      ...prev,
      correct: { ...prev.correct, [itemId]: (prev.correct[itemId] || 0) + 1 },
    }))
  }, [])

  const completeLesson = useCallback((lessonId, exerciseCount, perfect = false) => {
    setState((prev) => {
      const alreadyDone = !!prev.completedLessons[lessonId]
      const xpGain = alreadyDone ? 5 : exerciseCount * 10 + 20
      const today = todayStr()
      let { count, lastActiveDate } = prev.streak
      if (lastActiveDate === today) {
        // already active today, no streak change
      } else if (lastActiveDate && daysBetween(lastActiveDate, today) === 1) {
        count += 1
      } else {
        count = 1
      }
      const xpToday =
        prev.xpToday.date === today
          ? { date: today, amount: prev.xpToday.amount + xpGain }
          : { date: today, amount: xpGain }
      return {
        ...prev,
        xp: prev.xp + xpGain,
        streak: { count, lastActiveDate: today },
        xpToday,
        completedLessons: { ...prev.completedLessons, [lessonId]: true },
        perfectLessons: perfect && !alreadyDone ? prev.perfectLessons + 1 : prev.perfectLessons,
      }
    })
  }, [])

  // Passing a timed unit test unlocks the next unit and pays a flat XP bonus
  // — idempotent like completeLesson's alreadyDone guard, so retaking an
  // already-passed test for XP isn't a thing.
  const UNIT_TEST_XP = 30

  const passUnitTest = useCallback((unitId) => {
    setState((prev) => {
      if (prev.unitTestPassed[unitId]) return prev
      const today = todayStr()
      let { count, lastActiveDate } = prev.streak
      if (lastActiveDate === today) {
        // already active today, no streak change
      } else if (lastActiveDate && daysBetween(lastActiveDate, today) === 1) {
        count += 1
      } else {
        count = 1
      }
      const xpToday =
        prev.xpToday.date === today
          ? { date: today, amount: prev.xpToday.amount + UNIT_TEST_XP }
          : { date: today, amount: UNIT_TEST_XP }
      return {
        ...prev,
        xp: prev.xp + UNIT_TEST_XP,
        streak: { count, lastActiveDate: today },
        xpToday,
        unitTestPassed: { ...prev.unitTestPassed, [unitId]: true },
      }
    })
  }, [])

  const recordVoiceCall = useCallback(() => {
    setState((prev) => ({ ...prev, voiceCallCount: prev.voiceCallCount + 1 }))
  }, [])

  const recordDictionaryLookup = useCallback(() => {
    setState((prev) => ({ ...prev, dictionaryLookups: prev.dictionaryLookups + 1 }))
  }, [])

  // Marks lessons as complete for unlock purposes only — no XP, no streak,
  // no perfect-lesson credit. Used by the onboarding placement quiz to skip
  // someone past content they've already demonstrated they know; their
  // readiness checklist still only fills in from phrases they actually
  // produce themselves going forward, which stays true to the app's own
  // "proven, not just recognized" standard.
  const markLessonsComplete = useCallback((lessonIds) => {
    setState((prev) => ({
      ...prev,
      completedLessons: { ...prev.completedLessons, ...Object.fromEntries(lessonIds.map((id) => [id, true])) },
    }))
  }, [])

  const resetProgress = useCallback(() => {
    setState(defaultState())
  }, [])

  const setOnboardingAnswers = useCallback(({ motivation, goalXpPerDay, italianLevel }) => {
    setState((prev) => ({
      ...prev,
      motivation: motivation ?? prev.motivation,
      goalXpPerDay: goalXpPerDay ?? prev.goalXpPerDay,
      italianLevel: italianLevel ?? prev.italianLevel,
    }))
  }, [])

  const setItalianLevel = useCallback((italianLevel) => {
    setState((prev) => ({ ...prev, italianLevel }))
  }, [])

  const isLessonComplete = useCallback((lessonId) => !!state.completedLessons[lessonId], [state.completedLessons])

  const isUnitUnlocked = useCallback(
    (unitIndex) => {
      if (unitIndex === 0) return true
      const prevUnit = UNITS[unitIndex - 1]
      const lessonsDone = prevUnit.lessons.every((l) => state.completedLessons[l.id])
      if (!lessonsDone) return false
      if (prevUnit.test?.length) return !!state.unitTestPassed[prevUnit.id]
      return true
    },
    [state.completedLessons, state.unitTestPassed],
  )

  // True once a unit's lessons are all done but its timed test hasn't been
  // passed yet — the gap between "finished practicing" and "topic unlocked."
  const unitAwaitingTest = useCallback(
    (unitIndex) => {
      const unit = UNITS[unitIndex]
      if (!unit?.test?.length) return false
      const lessonsDone = unit.lessons.every((l) => state.completedLessons[l.id])
      return lessonsDone && !state.unitTestPassed[unit.id]
    },
    [state.completedLessons, state.unitTestPassed],
  )

  const isLessonUnlocked = useCallback(
    (unitIndex, lessonIndex) => {
      if (!isUnitUnlocked(unitIndex)) return false
      if (lessonIndex === 0) return true
      const prevLesson = UNITS[unitIndex].lessons[lessonIndex - 1]
      return !!state.completedLessons[prevLesson.id]
    },
    [isUnitUnlocked, state.completedLessons],
  )

  const objectiveStatuses = useMemo(() => {
    return OBJECTIVES.map((obj) => {
      const requiredIds = OBJECTIVE_REQUIREMENTS[obj.id] || []
      const have = requiredIds.filter((id) => (state.correct[id] || 0) > 0).length
      return { ...obj, have, total: requiredIds.length, done: requiredIds.length > 0 && have === requiredIds.length }
    })
  }, [state.correct])

  const readinessPercent = useMemo(() => {
    if (!objectiveStatuses.length) return 0
    const done = objectiveStatuses.filter((o) => o.done).length
    return Math.round((done / objectiveStatuses.length) * 100)
  }, [objectiveStatuses])

  const totalLessons = useMemo(() => UNITS.reduce((sum, u) => sum + u.lessons.length, 0), [])
  const completedCount = Object.keys(state.completedLessons).length

  const dailyGoalMet = state.xpToday.date === todayStr() && state.xpToday.amount >= state.goalXpPerDay

  const level = Math.floor(state.xp / XP_PER_LEVEL) + 1
  const xpIntoLevel = state.xp % XP_PER_LEVEL

  const achievementStatuses = useMemo(() => {
    const snapshot = {
      completedCount,
      perfectLessons: state.perfectLessons,
      streak: state.streak.count,
      voiceCallCount: state.voiceCallCount,
      dictionaryLookups: state.dictionaryLookups,
      reviewSessionsCompleted: state.reviewSessionsCompleted,
      level,
      readinessPercent,
    }
    return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: a.check(snapshot) }))
  }, [completedCount, state.perfectLessons, state.streak.count, state.voiceCallCount, state.dictionaryLookups, state.reviewSessionsCompleted, level, readinessPercent])

  // Every {it, en} pair from lessons the learner has actually completed,
  // deduped by Italian phrase in curriculum order. Feeds both Volpe's
  // vocabulary context (capped below) and the spaced-repetition Review deck
  // (uncapped — every taught word is worth resurfacing, not just the recent
  // ones a live voice call needs).
  const allKnownVocab = useMemo(() => {
    const seen = new Map()
    for (const unit of UNITS) {
      for (const l of unit.lessons) {
        if (!state.completedLessons[l.id]) continue
        for (const pair of vocabForLesson(l)) {
          if (pair.it && pair.en) seen.set(pair.it.toLowerCase(), pair)
        }
      }
    }
    return Array.from(seen.values())
  }, [state.completedLessons])

  const knownVocab = useMemo(() => allKnownVocab.slice(-KNOWN_VOCAB_CAP), [allKnownVocab])

  // Every newly-learned word gets entered into the Leitner review deck the
  // moment its lesson is completed — due immediately, so it resurfaces in
  // the very next Review session rather than waiting on a fixed delay.
  // Words already tracked keep their existing box/due date untouched.
  useEffect(() => {
    setState((prev) => {
      let changed = false
      const srs = { ...prev.srs }
      const today = todayStr()
      for (const pair of allKnownVocab) {
        const key = pair.it.toLowerCase()
        if (!srs[key]) {
          srs[key] = { it: pair.it, en: pair.en, box: 0, dueDate: today, reps: 0 }
          changed = true
        }
      }
      return changed ? { ...prev, srs } : prev
    })
  }, [allKnownVocab])

  const dueReviewItems = useMemo(() => {
    const today = todayStr()
    return Object.values(state.srs)
      .filter((item) => item.dueDate <= today)
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0))
      .slice(0, REVIEW_SESSION_SIZE)
  }, [state.srs])

  const recordReview = useCallback((it, gotIt) => {
    setState((prev) => {
      const key = it.toLowerCase()
      const item = prev.srs[key]
      if (!item) return prev
      const nextBox = gotIt ? Math.min(item.box + 1, SRS_INTERVALS.length - 1) : 0
      return {
        ...prev,
        srs: {
          ...prev.srs,
          [key]: { ...item, box: nextBox, dueDate: addDays(todayStr(), SRS_INTERVALS[nextBox]), reps: item.reps + 1 },
        },
      }
    })
  }, [])

  // Finishing a Review session pays XP and counts toward the daily streak,
  // same as a lesson — reviewing is real practice, not a lesser activity.
  const recordReviewSession = useCallback((itemsReviewed) => {
    if (itemsReviewed <= 0) return
    setState((prev) => {
      const xpGain = itemsReviewed * REVIEW_XP_PER_ITEM
      const today = todayStr()
      let { count, lastActiveDate } = prev.streak
      if (lastActiveDate === today) {
        // already active today, no streak change
      } else if (lastActiveDate && daysBetween(lastActiveDate, today) === 1) {
        count += 1
      } else {
        count = 1
      }
      const xpToday =
        prev.xpToday.date === today
          ? { date: today, amount: prev.xpToday.amount + xpGain }
          : { date: today, amount: xpGain }
      return {
        ...prev,
        xp: prev.xp + xpGain,
        streak: { count, lastActiveDate: today },
        xpToday,
        reviewSessionsCompleted: prev.reviewSessionsCompleted + 1,
      }
    })
  }, [])

  const nextLesson = useMemo(() => {
    for (let ui = 0; ui < UNITS.length; ui++) {
      const unit = UNITS[ui]
      for (let li = 0; li < unit.lessons.length; li++) {
        const lesson = unit.lessons[li]
        if (isLessonUnlocked(ui, li) && !isLessonComplete(lesson.id)) {
          return { unit, lesson, unitIndex: ui }
        }
      }
    }
    return null
  }, [isLessonUnlocked, isLessonComplete])

  return {
    xp: state.xp,
    streak: state.streak,
    dailyGoalMet,
    xpToday: state.xpToday.date === todayStr() ? state.xpToday.amount : 0,
    goalXpPerDay: state.goalXpPerDay,
    motivation: state.motivation,
    totalLessons,
    completedCount,
    objectiveStatuses,
    readinessPercent,
    nextLesson,
    level,
    xpIntoLevel,
    xpPerLevel: XP_PER_LEVEL,
    perfectLessons: state.perfectLessons,
    achievementStatuses,
    italianLevel: state.italianLevel,
    knownVocab,
    unitTestPassed: state.unitTestPassed,
    dueReviewItems,
    dueReviewCount: dueReviewItems.length,
    reviewSessionsCompleted: state.reviewSessionsCompleted,
    recordCorrect,
    completeLesson,
    passUnitTest,
    recordVoiceCall,
    recordDictionaryLookup,
    recordReview,
    recordReviewSession,
    markLessonsComplete,
    isLessonComplete,
    isUnitUnlocked,
    isLessonUnlocked,
    unitAwaitingTest,
    resetProgress,
    setOnboardingAnswers,
    setItalianLevel,
  }
}
