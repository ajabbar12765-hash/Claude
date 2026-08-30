import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ExerciseRunner from '../components/exercises/ExerciseRunner.jsx'
import Icon from '../components/Icon.jsx'
import Mascot from '../components/Mascot.jsx'
import { playComplete, playCombo } from '../lib/sound.js'
import { canSpeak, speakItalian } from '../lib/speech.js'
import { vocabForExercise } from '../data/curriculum.js'

let requeueCounter = 0

function freshState(lesson) {
  return {
    queue: lesson.exercises.map((ex) => ({ key: ex.id, exercise: ex })),
    doneIds: new Set(),
    missedOnce: new Set(),
    combo: 0,
  }
}

// Which of one exercise's words the learner hasn't met yet this run and
// doesn't already know from a prior lesson — taught one at a time, right
// before the exercise that uses it, instead of a batch of flashcards up
// front. Explain cards show their own examples inline, so they never get a
// separate flashcard step.
function newWordsForExercise(ex, taught) {
  if (!ex || ex.type === 'explain') return []
  const seen = new Set()
  return vocabForExercise(ex).filter((p) => {
    if (!p.it || !p.en) return false
    const key = p.it.toLowerCase()
    if (taught.has(key) || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export default function Lesson({ lesson, progress, onExit, onFinished }) {
  const [run, setRun] = useState(() => freshState(lesson))
  // A ref, not state: some exercises (Explain) call onAnswered and onContinue
  // back-to-back in the same event handler with no render in between, so
  // state wouldn't have committed yet by the time handleContinue reads it.
  const lastAnswerCorrect = useRef(null)
  const [finished, setFinished] = useState(false)
  const [comboToast, setComboToast] = useState(null)
  const [xpPopup, setXpPopup] = useState(null)
  const [taught, setTaught] = useState(() => new Set((progress.knownVocab || []).map((p) => p.it.toLowerCase())))
  const [pendingTeach, setPendingTeach] = useState(() => newWordsForExercise(run.queue[0]?.exercise, taught))
  const speechSupported = canSpeak()

  const { queue, doneIds, missedOnce, combo } = run
  const total = lesson.exercises.length
  const current = queue[0]

  useEffect(() => {
    if (queue.length === 0 && !finished) {
      setFinished(true)
      progress.completeLesson(lesson.id, total, missedOnce.size === 0)
      playComplete()
    }
  }, [queue, finished, progress, lesson.id, total, missedOnce])

  // Every time the queue lands on a different exercise, work out which of
  // its words are genuinely new and line them up as teaching cards shown
  // one at a time immediately before that exercise runs.
  useEffect(() => {
    setPendingTeach(newWordsForExercise(current?.exercise, taught))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.key])

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
    lastAnswerCorrect.current = isCorrect
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
      }))
    }
  }

  function handleContinue() {
    // Capture the ref's value now, synchronously — React may not invoke the
    // setRun updater below until its next render pass, by which point the
    // ref reset at the end of this function would already have run.
    const wasCorrect = lastAnswerCorrect.current
    setRun((prev) => {
      const [head, ...rest] = prev.queue
      if (wasCorrect) return { ...prev, queue: rest }
      requeueCounter += 1
      return { ...prev, queue: [...rest, { key: `${head.exercise.id}-r${requeueCounter}`, exercise: head.exercise }] }
    })
    lastAnswerCorrect.current = null
  }

  function handleTeachNext() {
    const [word, ...rest] = pendingTeach
    if (word) setTaught((prev) => new Set(prev).add(word.it.toLowerCase()))
    setPendingTeach(rest)
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

  if (pendingTeach.length > 0) {
    const word = pendingTeach[0]
    return (
      <div className="screen screen-lesson">
        <div className="lesson-header">
          <button type="button" className="lesson-exit" onClick={onExit} aria-label="Exit lesson">
            <Icon name="x" size={22} strokeWidth={2.2} />
          </button>
          <span className="call-header-title">New word</span>
        </div>

        <div className="teach-zone">
          <Mascot expression="happy" size={72} />
          <p className="onboarding-subtext">Learn it, then use it right away</p>
          <motion.div
            key={word.it}
            className="teach-word-card"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="onboarding-quiz-word">{word.it}</p>
            <p className="teach-word-meaning">{word.en}</p>
            {speechSupported && (
              <button type="button" className="dict-listen" onClick={() => speakItalian(word.it)} aria-label="Listen">
                <Icon name="volume" size={20} strokeWidth={2} />
              </button>
            )}
          </motion.div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            className="btn-primary onboarding-confirm"
            onClick={handleTeachNext}
          >
            <Icon name="chevronRight" size={22} strokeWidth={1.9} />
            Try it
          </motion.button>
        </div>
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
