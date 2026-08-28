import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import ExerciseRunner from '../components/exercises/ExerciseRunner.jsx'
import Icon from '../components/Icon.jsx'
import Mascot from '../components/Mascot.jsx'

// A short, timed checkpoint that gates the next unit — retrieval practice
// under a bit of real time pressure, on material from across the whole
// unit rather than a copy of the lesson questions. No requeue-on-wrong like
// a regular lesson: each question is asked once, same as a real test.
export default function UnitTest({ unit, progress, onExit }) {
  const questions = unit.test
  const duration = Math.max(90, questions.length * 25)
  const passThreshold = Math.ceil(questions.length * 0.6)

  const [run, setRun] = useState({ index: 0, correct: 0 })
  const [phase, setPhase] = useState('running')
  const [timeLeft, setTimeLeft] = useState(duration)

  const current = questions[run.index]

  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (timeLeft === 0 && phase === 'running') setPhase('failed')
  }, [timeLeft, phase])

  useEffect(() => {
    if (run.index >= questions.length && phase === 'running') {
      const passed = run.correct >= passThreshold
      setPhase(passed ? 'passed' : 'failed')
      if (passed) progress.passUnitTest(unit.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.index])

  function handleAnswered(isCorrect) {
    if (isCorrect) setRun((prev) => ({ ...prev, correct: prev.correct + 1 }))
  }

  function handleContinue() {
    setRun((prev) => ({ ...prev, index: prev.index + 1 }))
  }

  function retryTest() {
    setRun({ index: 0, correct: 0 })
    setPhase('running')
    setTimeLeft(duration)
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = String(timeLeft % 60).padStart(2, '0')
  const low = timeLeft <= 20
  const timedOut = timeLeft === 0 && run.index < questions.length

  if (phase === 'passed') {
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
          <h1>Test passed!</h1>
          <p className="complete-sub">{unit.title} is done — the next topic just unlocked.</p>
          <div className="complete-stats">
            <div className="complete-stat">
              <Icon name="check" size={18} strokeWidth={2} />
              <span>{run.correct}/{questions.length} correct</span>
            </div>
            <div className="complete-stat">
              <Icon name="spark" size={18} strokeWidth={2} />
              <span>+30 XP</span>
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.97 }} type="button" className="btn-primary" onClick={onExit}>
            Continue
          </motion.button>
        </motion.div>
      </div>
    )
  }

  if (phase === 'failed') {
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
          <h1>Not this time</h1>
          <p className="complete-sub">
            {timedOut
              ? `Time ran out — ${run.correct}/${questions.length} correct.`
              : `${run.correct}/${questions.length} correct — needed ${passThreshold} to pass.`}{' '}
            Review the lessons above and try again whenever you’re ready.
          </p>
          <motion.button whileTap={{ scale: 0.97 }} type="button" className="btn-primary" onClick={retryTest}>
            Try again
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} type="button" className="btn-reset" onClick={onExit}>
            Back to home
          </motion.button>
        </motion.div>
      </div>
    )
  }

  if (!current) return null

  return (
    <div className="screen screen-lesson">
      <div className="lesson-header">
        <button type="button" className="lesson-exit" onClick={onExit} aria-label="Exit test">
          <Icon name="x" size={22} strokeWidth={2.2} />
        </button>
        <div className="unit-test-progress">
          Question {run.index + 1} of {questions.length}
        </div>
        <div className={`unit-test-timer ${low ? 'unit-test-timer-low' : ''}`}>
          <Icon name="clock" size={15} strokeWidth={2.1} />
          {minutes}:{seconds}
        </div>
      </div>
      <ExerciseRunner key={current.id} exercise={current} onAnswered={handleAnswered} onContinue={handleContinue} />
    </div>
  )
}
