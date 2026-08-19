import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import ExerciseRunner from '../components/exercises/ExerciseRunner.jsx'
import Icon from '../components/Icon.jsx'
import Mascot from '../components/Mascot.jsx'

let requeueCounter = 0

export default function Lesson({ lesson, progress, onExit, onFinished }) {
  const initialQueue = useMemo(() => lesson.exercises.map((ex) => ({ key: ex.id, exercise: ex })), [lesson.id])
  const [queue, setQueue] = useState(initialQueue)
  const [doneIds, setDoneIds] = useState(() => new Set())
  const [missedOnce, setMissedOnce] = useState(() => new Set())
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(null)
  const [finished, setFinished] = useState(false)

  const total = lesson.exercises.length
  const current = queue[0]

  useEffect(() => {
    if (queue.length === 0 && !finished) {
      setFinished(true)
      progress.completeLesson(lesson.id, total)
    }
  }, [queue, finished, progress, lesson.id, total])

  function handleAnswered(isCorrect) {
    setLastAnswerCorrect(isCorrect)
    if (isCorrect) {
      progress.recordCorrect(current.exercise.id)
      setDoneIds((prev) => new Set(prev).add(current.exercise.id))
    } else {
      setMissedOnce((prev) => new Set(prev).add(current.exercise.id))
    }
  }

  function handleContinue() {
    setQueue((prev) => {
      const [head, ...rest] = prev
      if (lastAnswerCorrect) return rest
      requeueCounter += 1
      return [...rest, { key: `${head.exercise.id}-r${requeueCounter}`, exercise: head.exercise }]
    })
    setLastAnswerCorrect(null)
  }

  if (finished) {
    const perfect = missedOnce.size === 0
    const xpEarned = total * 10 + 20
    return (
      <div className="screen screen-lesson-complete">
        <motion.div
          className="complete-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          <motion.span
            className="complete-badge"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.1 }}
          >
            <Mascot expression="happy" celebrate size={72} />
          </motion.span>
          <h1>{perfect ? 'Perfetto!' : 'Lesson complete!'}</h1>
          <p className="complete-sub">
            {perfect ? 'Every phrase, first try. That’s the whole lesson locked in.' : `You’ve got it — ${missedOnce.size} phrase${missedOnce.size === 1 ? '' : 's'} took a second pass, which is exactly how this is supposed to work.`}
          </p>
          <div className="complete-stats">
            <div className="complete-stat">
              <Icon name="spark" size={18} strokeWidth={2} />
              <span>+{xpEarned} XP</span>
            </div>
            <div className="complete-stat">
              <Icon name="flame" size={18} strokeWidth={2} />
              <span>{progress.streak.count} day streak</span>
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.97 }} type="button" className="btn-primary" onClick={onFinished}>
            Continue
          </motion.button>
        </motion.div>
      </div>
    )
  }

  const progressPct = Math.round((doneIds.size / total) * 100)

  return (
    <div className="screen screen-lesson">
      <div className="lesson-header">
        <button type="button" className="lesson-exit" onClick={onExit} aria-label="Exit lesson">
          <Icon name="x" size={22} strokeWidth={2.2} />
        </button>
        <div className="lesson-progress-track">
          <motion.div className="lesson-progress-fill" animate={{ width: `${progressPct}%` }} transition={{ type: 'spring', stiffness: 200, damping: 26 }} />
        </div>
      </div>
      {current && <ExerciseRunner key={current.key} exercise={current.exercise} onAnswered={handleAnswered} onContinue={handleContinue} />}
    </div>
  )
}
