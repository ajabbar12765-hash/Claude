import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ExerciseRunner from '../components/exercises/ExerciseRunner.jsx'
import Icon from '../components/Icon.jsx'
import Mascot from '../components/Mascot.jsx'
import { playComplete, playFail, playCombo } from '../lib/sound.js'

let requeueCounter = 0
const MAX_HEARTS = 5

function freshState(lesson) {
  return {
    queue: lesson.exercises.map((ex) => ({ key: ex.id, exercise: ex })),
    doneIds: new Set(),
    missedOnce: new Set(),
    hearts: MAX_HEARTS,
    combo: 0,
  }
}

export default function Lesson({ lesson, progress, onExit, onFinished }) {
  const [run, setRun] = useState(() => freshState(lesson))
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(null)
  const [finished, setFinished] = useState(false)
  const [failed, setFailed] = useState(false)
  const [comboToast, setComboToast] = useState(null)
  const [xpPopup, setXpPopup] = useState(null)

  const { queue, doneIds, missedOnce, hearts, combo } = run
  const total = lesson.exercises.length
  const current = queue[0]

  useEffect(() => {
    if (queue.length === 0 && !finished && !failed) {
      setFinished(true)
      progress.completeLesson(lesson.id, total, missedOnce.size === 0)
      playComplete()
    }
  }, [queue, finished, failed, progress, lesson.id, total, missedOnce])

  useEffect(() => {
    if (!comboToast) return
    const t = setTimeout(() => setComboToast(null), 1500)
    return () => clearTimeout(t)
  }, [comboToast])

  useEffect(() => {
    if (!xpPopup) return
    const t = setTimeout(() => setXpPopup(null), 900)
    return () => clearTimeout(t)
  }, [xpPopup])

  function handleAnswered(isCorrect) {
    setLastAnswerCorrect(isCorrect)
    if (isCorrect) {
      progress.recordCorrect(current.exercise.id)
      setXpPopup({ id: Date.now(), text: '+10 XP' })
      setRun((prev) => {
        const nextCombo = prev.combo + 1
        if (nextCombo >= 3 && nextCombo % 2 === 1) {
          setComboToast({ id: Date.now(), count: nextCombo })
          playCombo()
        }
        return { ...prev, doneIds: new Set(prev.doneIds).add(current.exercise.id), combo: nextCombo }
      })
    } else {
      setRun((prev) => ({
        ...prev,
        missedOnce: new Set(prev.missedOnce).add(current.exercise.id),
        combo: 0,
        hearts: Math.max(0, prev.hearts - 1),
      }))
    }
  }

  function handleContinue() {
    if (!lastAnswerCorrect && hearts <= 0) {
      setFailed(true)
      playFail()
      return
    }
    setRun((prev) => {
      const [head, ...rest] = prev.queue
      if (lastAnswerCorrect) return { ...prev, queue: rest }
      requeueCounter += 1
      return { ...prev, queue: [...rest, { key: `${head.exercise.id}-r${requeueCounter}`, exercise: head.exercise }] }
    })
    setLastAnswerCorrect(null)
  }

  function retryLesson() {
    setRun(freshState(lesson))
    setLastAnswerCorrect(null)
    setFinished(false)
    setFailed(false)
    setComboToast(null)
    setXpPopup(null)
  }

  if (failed) {
    return (
      <div className="screen screen-lesson-complete">
        <motion.div
          className="complete-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          <motion.span
            className="complete-badge complete-badge-fail"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.1 }}
          >
            <Mascot expression="thinking" size={72} />
          </motion.span>
          <h1>Out of hearts</h1>
          <p className="complete-sub">Five misses and this attempt’s done — no XP for it. Take a breath and go again; nothing’s lost but a minute.</p>
          <div className="complete-stats">
            <div className="complete-stat">
              <Icon name="check" size={18} strokeWidth={2} />
              <span>{doneIds.size}/{total} phrases landed</span>
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.97 }} type="button" className="btn-primary" onClick={retryLesson}>
            Try again
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} type="button" className="btn-reset" onClick={onExit}>
            Back to home
          </motion.button>
        </motion.div>
      </div>
    )
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
        <div className="lesson-hearts" aria-label={`${hearts} of ${MAX_HEARTS} hearts left`}>
          {Array.from({ length: MAX_HEARTS }).map((_, i) => (
            <Icon key={i} name="heart" size={16} strokeWidth={2.2} className={i < hearts ? 'lesson-heart-full' : 'lesson-heart-lost'} />
          ))}
        </div>
      </div>

      <div className="lesson-toasts">
        <AnimatePresence>
          {comboToast && (
            <motion.div
              key={comboToast.id}
              className="combo-toast"
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            >
              🔥 {comboToast.count} in a row!
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {xpPopup && (
            <motion.div
              key={xpPopup.id}
              className="xp-popup"
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: -18, scale: 1 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              {xpPopup.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {current && <ExerciseRunner key={current.key} exercise={current.exercise} onAnswered={handleAnswered} onContinue={handleContinue} />}
    </div>
  )
}
