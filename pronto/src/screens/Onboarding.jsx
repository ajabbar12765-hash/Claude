import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Mascot from '../components/Mascot.jsx'
import Icon from '../components/Icon.jsx'

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

  function pickMotivation(id) {
    setMotivation(id)
    setStep(1)
  }

  function pickPace(pace) {
    onDone({ motivation, goalXpPerDay: pace.goalXp })
  }

  return (
    <div className="screen screen-onboarding">
      <div className="onboarding-dots">
        <span className={`onboarding-dot ${step >= 0 ? 'onboarding-dot-active' : ''}`} />
        <span className={`onboarding-dot ${step >= 1 ? 'onboarding-dot-active' : ''}`} />
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
      </AnimatePresence>
    </div>
  )
}
