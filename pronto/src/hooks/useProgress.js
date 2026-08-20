import { useCallback, useEffect, useMemo, useState } from 'react'
import { UNITS, OBJECTIVES, OBJECTIVE_REQUIREMENTS } from '../data/curriculum.js'

const STORAGE_KEY = 'pronto:progress:v1'

function todayStr() {
  const d = new Date()
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
    correct: {},
    goalXpPerDay: 30,
    motivation: null,
    xpToday: { date: todayStr(), amount: 0 },
    startedAt: new Date().toISOString(),
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

  const completeLesson = useCallback((lessonId, exerciseCount) => {
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
      }
    })
  }, [])

  const resetProgress = useCallback(() => {
    setState(defaultState())
  }, [])

  const setOnboardingAnswers = useCallback(({ motivation, goalXpPerDay }) => {
    setState((prev) => ({
      ...prev,
      motivation: motivation ?? prev.motivation,
      goalXpPerDay: goalXpPerDay ?? prev.goalXpPerDay,
    }))
  }, [])

  const isLessonComplete = useCallback((lessonId) => !!state.completedLessons[lessonId], [state.completedLessons])

  const isUnitUnlocked = useCallback(
    (unitIndex) => {
      if (unitIndex === 0) return true
      const prevUnit = UNITS[unitIndex - 1]
      return prevUnit.lessons.every((l) => state.completedLessons[l.id])
    },
    [state.completedLessons],
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
    recordCorrect,
    completeLesson,
    isLessonComplete,
    isUnitUnlocked,
    isLessonUnlocked,
    resetProgress,
    setOnboardingAnswers,
  }
}
