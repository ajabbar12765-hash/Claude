import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Icon from '../components/Icon.jsx'
import Mascot from '../components/Mascot.jsx'
import { canSpeak, speakItalian } from '../lib/speech.js'
import { playCorrect, playIncorrect, playComplete } from '../lib/sound.js'

let requeueCounter = 0

// A spaced-repetition flashcard deck: every word surfaces here again on a
// schedule set by useProgress's Leitner boxes, so review time goes toward
// whatever's actually at risk of being forgotten rather than a fixed list.
// A miss requeues the card later in this same session instead of just
// rescheduling it for tomorrow — the point is to leave having actually
// recalled it, not just having been reminded once.
export default function Review({ progress, onExit }) {
  const [queue, setQueue] = useState(() => progress.dueReviewItems.map((item, i) => ({ key: `${item.it}-${i}`, item })))
  const [total] = useState(queue.length)
  const [seen, setSeen] = useState(() => new Set())
  const [revealed, setRevealed] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [finished, setFinished] = useState(false)
  const [sessionLogged, setSessionLogged] = useState(false)
  const speechSupported = canSpeak()

  const current = queue[0]

  function handleReveal() {
    setRevealed(true)
    if (speechSupported) speakItalian(current.item.it)
  }

  function handleAnswer(gotIt) {
    progress.recordReview(current.item.it, gotIt)
    setSeen((prev) => new Set(prev).add(current.item.it.toLowerCase()))
    setLastResult(gotIt ? 'correct' : 'incorrect')
    if (gotIt) playCorrect()
    else playIncorrect()

    setQueue((prev) => {
      const [head, ...rest] = prev
      if (gotIt) return rest
      requeueCounter += 1
      return [...rest, { key: `${head.item.it}-r${requeueCounter}`, item: head.item }]
    })
    setRevealed(false)

    if (queue.length === 1 && gotIt) {
      setFinished(true)
      if (!sessionLogged) {
        progress.recordReviewSession(seen.size + 1)
        setSessionLogged(true)
        playComplete()
      }
    }
  }

  if (total === 0) {
    return (
      <div className="screen screen-review">
        <div className="lesson-header">
          <button type="button" className="lesson-exit" onClick={onExit} aria-label="Exit review">
            <Icon name="x" size={22} strokeWidth={2.2} />
          </button>
          <span className="call-header-title">Review</span>
        </div>
        <div className="teach-zone">
          <Mascot expression="happy" size={72} />
          <h1 className="review-caught-up-title">All caught up</h1>
          <p className="onboarding-subtext">Nothing’s due for review right now — finish a lesson to add new words to the deck.</p>
          <motion.button whileTap={{ scale: 0.97 }} type="button" className="btn-primary" onClick={onExit}>
            Back home
          </motion.button>
        </div>
      </div>
    )
  }

  if (finished) {
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
          <h1>Deck cleared!</h1>
          <p className="complete-sub">{total} word{total === 1 ? '' : 's'} refreshed — each one is scheduled a little further out now.</p>
          <div className="complete-stats">
            <div className="complete-stat">
              <Icon name="spark" size={18} strokeWidth={2} />
              <span>+{total * 3} XP</span>
            </div>
            <div className="complete-stat">
              <Icon name="flame" size={18} strokeWidth={2} />
              <span>{progress.streak.count} day streak</span>
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.97 }} type="button" className="btn-primary" onClick={onExit}>
            Continue
          </motion.button>
        </motion.div>
      </div>
    )
  }

  const doneCount = Math.min(seen.size, total)
  const progressPct = Math.round((doneCount / total) * 100)

  return (
    <div className="screen screen-review">
      <div className="lesson-header">
        <button type="button" className="lesson-exit" onClick={onExit} aria-label="Exit review">
          <Icon name="x" size={22} strokeWidth={2.2} />
        </button>
        <div className="lesson-progress-track">
          <motion.div className="lesson-progress-fill" animate={{ width: `${progressPct}%` }} transition={{ type: 'spring', stiffness: 200, damping: 26 }} />
        </div>
      </div>

      <div className="exercise">
        <div className="exercise-body">
          <p className="exercise-eyebrow">What does this mean?</p>
          <motion.div key={current.key} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }} className="review-card">
            <h2 className="review-card-word">{current.item.it}</h2>
            {speechSupported && (
              <button type="button" className="dict-listen" onClick={() => speakItalian(current.item.it)} aria-label="Listen">
                <Icon name="volume" size={20} strokeWidth={2} />
              </button>
            )}
            <AnimatePresence>
              {revealed && (
                <motion.p
                  className="review-card-answer"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {current.item.en}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="exercise-footer">
          {!revealed ? (
            <motion.button whileTap={{ scale: 0.97 }} type="button" className="btn-primary" onClick={handleReveal}>
              Show answer
            </motion.button>
          ) : (
            <div className="review-answer-buttons">
              <motion.button whileTap={{ scale: 0.96 }} type="button" className="btn-check btn-check-incorrect" onClick={() => handleAnswer(false)}>
                Still learning
              </motion.button>
              <motion.button whileTap={{ scale: 0.96 }} type="button" className="btn-check btn-check-correct" onClick={() => handleAnswer(true)}>
                Got it
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
