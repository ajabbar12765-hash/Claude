import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Mascot from '../components/Mascot.jsx'
import Icon from '../components/Icon.jsx'
import PlacementQuiz from '../components/PlacementQuiz.jsx'
import { QUIZ_PASS_SCORE, levelFromScore } from '../data/placementQuiz.js'

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

// The placement quiz runs first and can't be skipped — everything else it
// feeds (Volpe's vocabulary/level, which units get pre-unlocked) depends on
// an honest read of what someone already knows, so there's no "Skip" here.
// Motivation/pace are just preferences and stay skippable after it.
export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0) // 0=quiz, 1=motivation, 2=pace
  const [motivation, setMotivation] = useState(null)
  const [goalXpPerDay, setGoalXpPerDay] = useState(null)
  const [quizResult, setQuizResult] = useState(null)

  function finishQuizStep(quizScore, quizTotal) {
    setQuizResult({
      quizScore,
      quizTotal,
      skipAhead: quizScore >= QUIZ_PASS_SCORE,
      italianLevel: levelFromScore(quizScore),
    })
    setStep(1)
  }

  function pickMotivation(id) {
    setMotivation(id)
    setStep(2)
  }

  function pickPace(pace) {
    onDone({ motivation, goalXpPerDay: pace.goalXp, ...quizResult })
  }

  function skipRest() {
    onDone({ motivation, goalXpPerDay, ...quizResult })
  }

  return (
    <div className="screen screen-onboarding">
      <div className="onboarding-dots">
        <span className={`onboarding-dot ${step >= 0 ? 'onboarding-dot-active' : ''}`} />
        <span className={`onboarding-dot ${step >= 1 ? 'onboarding-dot-active' : ''}`} />
        <span className={`onboarding-dot ${step >= 2 ? 'onboarding-dot-active' : ''}`} />
      </div>
      {step > 0 && (
        <button type="button" className="onboarding-skip" onClick={skipRest}>
          Skip
        </button>
      )}

      <AnimatePresence mode="wait">
        {step === 0 && <PlacementQuiz key="step0" onFinish={finishQuizStep} confirmLabel="Continue" />}

        {step === 1 && (
          <motion.div key="step1" className="onboarding-step" variants={slide} initial="hidden" animate="show" exit="exit">
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

        {step === 2 && (
          <motion.div key="step2" className="onboarding-step" variants={slide} initial="hidden" animate="show" exit="exit">
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
      </AnimatePresence>
    </div>
  )
}
