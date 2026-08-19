import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Icon from '../components/Icon.jsx'
import Mascot from '../components/Mascot.jsx'

export default function Scenario({ scenario, progress, onExit, onFinished }) {
  const [turnIndex, setTurnIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('answering')
  const [finished, setFinished] = useState(false)

  const turn = scenario.turns[turnIndex]
  const total = scenario.turns.length

  useEffect(() => {
    if (finished) {
      progress.recordCorrect(`${scenario.id}-done`)
      progress.completeLesson(scenario.id, total)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  function pick(choice, index) {
    if (status === 'correct') return
    setSelected(index)
    setStatus(choice.correct ? 'correct' : 'incorrect')
  }

  function handleContinue() {
    if (turnIndex + 1 >= total) {
      setFinished(true)
      return
    }
    setTurnIndex((i) => i + 1)
    setSelected(null)
    setStatus('answering')
  }

  if (finished) {
    const xpEarned = total * 10 + 20
    return (
      <div className="screen screen-lesson-complete">
        <motion.div className="complete-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
          <motion.span className="complete-badge" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.1 }}>
            <Mascot expression="happy" celebrate size={72} />
          </motion.span>
          <h1>Conversation handled.</h1>
          <p className="complete-sub">That’s a full real-life exchange, start to finish — not a translated sentence in isolation.</p>
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

  return (
    <div className="screen screen-scenario">
      <div className="lesson-header">
        <button type="button" className="lesson-exit" onClick={onExit} aria-label="Exit scenario">
          <Icon name="x" size={22} strokeWidth={2.2} />
        </button>
        <div className="lesson-progress-track">
          <motion.div className="lesson-progress-fill" animate={{ width: `${(turnIndex / total) * 100}%` }} transition={{ type: 'spring', stiffness: 200, damping: 26 }} />
        </div>
      </div>

      {turnIndex === 0 && <p className="scenario-intro">{scenario.intro}</p>}

      <AnimatePresence mode="wait">
        <motion.div
          key={turnIndex}
          className="scenario-body"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        >
          <div className="scenario-speech">
            <span className="scenario-speaker">{turn.speaker}</span>
            <p className="scenario-line-it">{turn.it}</p>
            <p className="scenario-line-en">{turn.en}</p>
          </div>

          <p className="scenario-prompt-label">How do you respond?</p>
          <div className="scenario-choices">
            {turn.choices.map((choice, i) => {
              const isSelected = selected === i
              const showCorrect = status === 'correct' && isSelected
              const showWrong = status === 'incorrect' && isSelected
              return (
                <motion.button
                  key={choice.it}
                  type="button"
                  whileTap={status !== 'correct' ? { scale: 0.97 } : undefined}
                  animate={showWrong ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                  transition={{ duration: 0.35 }}
                  className={['scenario-choice', showCorrect ? 'choice-correct' : '', showWrong ? 'choice-wrong' : ''].join(' ')}
                  onClick={() => pick(choice, i)}
                  disabled={status === 'correct'}
                >
                  <span className="scenario-choice-it">{choice.it}</span>
                  <span className="scenario-choice-en">{choice.en}</span>
                  {(showCorrect || showWrong) && <span className="scenario-choice-feedback">{choice.feedback}</span>}
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {status === 'correct' && (
          <motion.div className="scenario-footer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <motion.button whileTap={{ scale: 0.97 }} type="button" className="btn-primary" onClick={handleContinue}>
              {turnIndex + 1 >= total ? 'Finish' : 'Continue'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
