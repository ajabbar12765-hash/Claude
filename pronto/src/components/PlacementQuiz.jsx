import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Mascot from './Mascot.jsx'
import Icon from './Icon.jsx'
import { QUIZ_ITEMS, LEVEL_RESULT_COPY, levelFromScore, checkAnswer } from '../data/placementQuiz.js'

const slide = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 340, damping: 30 } },
  exit: { opacity: 0, x: -24, transition: { duration: 0.2 } },
}

// Free-response placement check, reused by onboarding and by Profile's
// "Level check". Typing an answer (or honestly picking "I don't know")
// gives a real read on what someone knows — multiple choice lets you
// guess right a quarter of the time, which isn't an accurate level.
export default function PlacementQuiz({ onFinish, confirmLabel = 'Continue', confirmIcon = 'chevronRight' }) {
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [feedback, setFeedback] = useState(null) // { correct, dontKnow } | null
  const [finished, setFinished] = useState(false)

  const current = QUIZ_ITEMS[index]

  function submitAnswer(e) {
    e.preventDefault()
    if (feedback || !inputValue.trim()) return
    const correct = checkAnswer(current, inputValue)
    if (correct) setScore((s) => s + 1)
    setFeedback({ correct, dontKnow: false })
  }

  function dontKnow() {
    if (feedback) return
    setFeedback({ correct: false, dontKnow: true })
  }

  function continueOn() {
    setFeedback(null)
    setInputValue('')
    if (index + 1 < QUIZ_ITEMS.length) {
      setIndex((i) => i + 1)
    } else {
      setFinished(true)
    }
  }

  const resultLevel = levelFromScore(score)

  return (
    <AnimatePresence mode="wait">
      {finished ? (
        <motion.div key="result" className="onboarding-step" variants={slide} initial="hidden" animate="show" exit="exit">
          <Mascot expression={resultLevel === 'intermediate' ? 'happy' : 'idle'} celebrate={resultLevel === 'intermediate'} size={72} />
          <h1 className="onboarding-question">
            {score} of {QUIZ_ITEMS.length}
          </h1>
          <p className="onboarding-subtext">{LEVEL_RESULT_COPY[resultLevel]}</p>
          <div className="onboarding-options">
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              className="onboarding-option"
              onClick={() => onFinish(score, QUIZ_ITEMS.length)}
            >
              <Icon name={confirmIcon} size={22} strokeWidth={1.9} />
              {confirmLabel}
            </motion.button>
          </div>
        </motion.div>
      ) : (
        <motion.div key="quiz" className="onboarding-step" variants={slide} initial="hidden" animate="show" exit="exit">
          <Mascot expression="thinking" size={72} />
          <h1 className="onboarding-question">Quick check — how much Italian do you know?</h1>
          <p className="onboarding-subtext">
            {index + 1} of {QUIZ_ITEMS.length} — type what it means, or say you don’t know
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="onboarding-quiz-card"
            >
              <p className="onboarding-quiz-word">{current.it}</p>

              {!feedback ? (
                <form className="quiz-answer-form" onSubmit={submitAnswer}>
                  <input
                    type="text"
                    className="type-input"
                    placeholder="Type the English meaning..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                  />
                  <div className="quiz-answer-actions">
                    <button type="submit" className="btn-primary quiz-answer-check">
                      Check
                    </button>
                    <button type="button" className="quiz-dontknow-btn" onClick={dontKnow}>
                      I don’t know
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  className={`quiz-feedback ${feedback.correct ? 'quiz-feedback-correct' : feedback.dontKnow ? 'quiz-feedback-skip' : 'quiz-feedback-wrong'}`}
                >
                  <span>
                    {feedback.correct ? 'Correct!' : feedback.dontKnow ? 'No worries.' : 'Not quite.'}{' '}
                    <span className="quiz-feedback-meaning">{current.it}</span> means{' '}
                    <span className="quiz-feedback-meaning">{current.display}</span>.
                  </span>
                  <motion.button type="button" whileTap={{ scale: 0.96 }} className="onboarding-option" onClick={continueOn}>
                    <Icon name="chevronRight" size={22} strokeWidth={1.9} />
                    Continue
                  </motion.button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
