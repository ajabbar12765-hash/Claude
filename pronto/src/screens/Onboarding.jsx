import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Mascot from '../components/Mascot.jsx'
import Icon from '../components/Icon.jsx'
import { shuffle } from '../lib/matching.js'
import { QUIZ_ITEMS, QUIZ_PASS_SCORE, levelFromScore } from '../data/placementQuiz.js'

const MOTIVATIONS = [
  { id: 'trip', label: 'An upcoming trip', icon: 'compass' },
  { id: 'family', label: 'Family or heritage', icon: 'heart' },
  { id: 'living', label: 'Living or working there', icon: 'home' },
  { id: 'fun', label: 'Just for fun', icon: 'spark' },
]

const PACES = [
  { id: 'casual', label: 'Casual', minutes: '5 min/day', goalXp: 15 },
  { id: 'regular', label: 'Regular', minutes: '10 min/day', goalXp: 30 },
  { id: 'serious', label: 'Serious', minutes: '15 min/day', goalXp: 45 },
  { id: 'intense', label: 'Intense', minutes: '20 min/day', goalXp: 60 },
]

const slide = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 340, damping: 30 } },
  exit: { opacity: 0, x: -24, transition: { duration: 0.2 } },
}

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0)
  const [motivation, setMotivation] = useState(null)
  const [goalXpPerDay, setGoalXpPerDay] = useState(null)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizScore, setQuizScore] = useState(0)
  const [quizSelected, setQuizSelected] = useState(null)
  const [quizFinished, setQuizFinished] = useState(false)
  const quizItems = useMemo(() => QUIZ_ITEMS.map((q) => ({ ...q, shuffled: shuffle(q.options) })), [])

  function pickMotivation(id) {
    setMotivation(id)
    setStep(1)
  }

  function pickPace(pace) {
    setGoalXpPerDay(pace.goalXp)
    setStep(2)
  }

  function pickQuizAnswer(opt) {
    if (quizSelected) return
    setQuizSelected(opt)
    const correct = opt === quizItems[quizIndex].correct
    if (correct) setQuizScore((s) => s + 1)
    setTimeout(() => {
      if (quizIndex + 1 < quizItems.length) {
        setQuizIndex((i) => i + 1)
        setQuizSelected(null)
      } else {
        setQuizFinished(true)
      }
    }, 550)
  }

  function finishQuiz() {
    onDone({
      motivation,
      goalXpPerDay,
      quizScore,
      quizTotal: quizItems.length,
      skipAhead: quizScore >= QUIZ_PASS_SCORE,
      italianLevel: levelFromScore(quizScore),
    })
  }

  const currentQuiz = quizItems[quizIndex]

  return (
    <div className="screen screen-onboarding">
      <div className="onboarding-dots">
        <span className={`onboarding-dot ${step >= 0 ? 'onboarding-dot-active' : ''}`} />
        <span className={`onboarding-dot ${step >= 1 ? 'onboarding-dot-active' : ''}`} />
        <span className={`onboarding-dot ${step >= 2 ? 'onboarding-dot-active' : ''}`} />
      </div>
      <button type="button" className="onboarding-skip" onClick={() => onDone({})}>
        Skip
      </button>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="step0" className="onboarding-step" variants={slide} initial="hidden" animate="show" exit="exit">
            <Mascot expression="idle" size={72} />
            <h1 className="onboarding-question">What are you learning Italian for?</h1>
            <div className="onboarding-options">
              {MOTIVATIONS.map((m) => (
                <motion.button
                  key={m.id}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  className="onboarding-option"
                  onClick={() => pickMotivation(m.id)}
                >
                  <Icon name={m.icon} size={22} strokeWidth={1.9} />
                  {m.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="step1" className="onboarding-step" variants={slide} initial="hidden" animate="show" exit="exit">
            <Mascot expression="happy" size={72} />
            <h1 className="onboarding-question">How much time can you give it?</h1>
            <p className="onboarding-subtext">You can always change this later.</p>
            <div className="onboarding-options">
              {PACES.map((p) => (
                <motion.button key={p.id} type="button" whileTap={{ scale: 0.96 }} className="onboarding-option" onClick={() => pickPace(p)}>
                  <span className="onboarding-option-label">{p.label}</span>
                  <span className="onboarding-option-sub">{p.minutes}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 2 && !quizFinished && (
          <motion.div key="step2" className="onboarding-step" variants={slide} initial="hidden" animate="show" exit="exit">
            <Mascot expression="thinking" size={72} />
            <h1 className="onboarding-question">Quick check — any Italian already?</h1>
            <p className="onboarding-subtext">
              {quizIndex + 1} of {quizItems.length} — no pressure, guessing is fine
            </p>
            <AnimatePresence mode="wait">
              <motion.div
                key={quizIndex}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                className="onboarding-quiz-card"
              >
                <p className="onboarding-quiz-word">{currentQuiz.it}</p>
                <div className="option-grid">
                  {currentQuiz.shuffled.map((opt) => {
                    const isSelected = quizSelected === opt
                    const revealCorrect = quizSelected && opt === currentQuiz.correct
                    const revealWrong = quizSelected && isSelected && opt !== currentQuiz.correct
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={!!quizSelected}
                        className={[
                          'option-tile',
                          revealCorrect ? 'option-correct' : '',
                          revealWrong ? 'option-wrong' : '',
                        ].join(' ')}
                        onClick={() => pickQuizAnswer(opt)}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}

        {step === 2 && quizFinished && (
          <motion.div key="step2-result" className="onboarding-step" variants={slide} initial="hidden" animate="show" exit="exit">
            <Mascot expression={quizScore >= QUIZ_PASS_SCORE ? 'happy' : 'idle'} celebrate={quizScore >= QUIZ_PASS_SCORE} size={72} />
            <h1 className="onboarding-question">
              {quizScore} of {quizItems.length}
            </h1>
            <p className="onboarding-subtext">
              {quizScore >= QUIZ_PASS_SCORE
                ? 'You already know some Italian — we’ll skip straight past the absolute basics.'
                : quizScore >= 3
                  ? 'A solid start — we’ll still build the fundamentals properly before speeding up.'
                  : 'Totally normal to start from zero — that’s exactly what the first unit is for.'}
            </p>
            <div className="onboarding-options">
              <motion.button type="button" whileTap={{ scale: 0.96 }} className="onboarding-option" onClick={finishQuiz}>
                <Icon name="chevronRight" size={22} strokeWidth={1.9} />
                Let’s go
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
