import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Mascot from '../components/Mascot.jsx'
import Icon from '../components/Icon.jsx'
import { shuffle } from '../lib/matching.js'
import { QUIZ_ITEMS, levelFromScore } from '../data/placementQuiz.js'

// The same quick check from onboarding, surfaced again in Profile — for
// anyone who onboarded before this quiz existed, or whose Italian has
// moved on since they last took it. The score sets italianLevel, which
// tunes how simple or natural Volpe's Italian is during voice calls.
const LEVEL_COPY = {
  beginner: 'Volpe will keep it simple: short sentences, everyday words, no idioms.',
  elementary: 'Volpe will speak at a relaxed pace with common everyday vocabulary.',
  intermediate: 'Volpe will talk more naturally — normal pacing, common idioms included.',
}

const slide = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 340, damping: 30 } },
  exit: { opacity: 0, x: -24, transition: { duration: 0.2 } },
}

export default function LevelCheck({ progress, onExit }) {
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState(null)
  const [finished, setFinished] = useState(false)
  const items = useMemo(() => QUIZ_ITEMS.map((q) => ({ ...q, shuffled: shuffle(q.options) })), [])

  function pick(opt) {
    if (selected) return
    setSelected(opt)
    if (opt === items[index].correct) setScore((s) => s + 1)
    setTimeout(() => {
      if (index + 1 < items.length) {
        setIndex((i) => i + 1)
        setSelected(null)
      } else {
        setFinished(true)
      }
    }, 550)
  }

  const resultLevel = levelFromScore(score)

  function save() {
    progress.setItalianLevel(resultLevel)
    onExit()
  }

  const current = items[index]

  return (
    <div className="screen screen-onboarding">
      <button type="button" className="onboarding-skip" onClick={onExit}>
        Close
      </button>

      <AnimatePresence mode="wait">
        {!finished && (
          <motion.div key="quiz" className="onboarding-step" variants={slide} initial="hidden" animate="show" exit="exit">
            <Mascot expression="thinking" size={72} />
            <h1 className="onboarding-question">Quick check — how much Italian do you know?</h1>
            <p className="onboarding-subtext">
              {index + 1} of {items.length} — this tunes how Volpe talks to you on calls
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
                <div className="option-grid">
                  {current.shuffled.map((opt) => {
                    const isSelected = selected === opt
                    const revealCorrect = selected && opt === current.correct
                    const revealWrong = selected && isSelected && opt !== current.correct
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={!!selected}
                        className={[
                          'option-tile',
                          revealCorrect ? 'option-correct' : '',
                          revealWrong ? 'option-wrong' : '',
                        ].join(' ')}
                        onClick={() => pick(opt)}
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

        {finished && (
          <motion.div key="result" className="onboarding-step" variants={slide} initial="hidden" animate="show" exit="exit">
            <Mascot expression={resultLevel === 'intermediate' ? 'happy' : 'idle'} celebrate={resultLevel === 'intermediate'} size={72} />
            <h1 className="onboarding-question">
              {score} of {items.length}
            </h1>
            <p className="onboarding-subtext">{LEVEL_COPY[resultLevel]}</p>
            <div className="onboarding-options">
              <motion.button type="button" whileTap={{ scale: 0.96 }} className="onboarding-option" onClick={save}>
                <Icon name="check" size={22} strokeWidth={1.9} />
                Save
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
