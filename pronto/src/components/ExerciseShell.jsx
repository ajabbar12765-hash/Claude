import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Mascot from './Mascot.jsx'
import { playCorrect, playIncorrect } from '../lib/sound.js'

// Shared chrome for every exercise type: the prompt area up top, the
// type-specific interactive area (passed as children), and a bottom
// action bar that mirrors the familiar check -> feedback -> continue loop.
export default function ExerciseShell({
  eyebrow,
  prompt,
  children,
  status, // 'answering' | 'correct' | 'incorrect'
  canCheck,
  onCheck,
  onContinue,
  correctAnswerLabel,
  note,
}) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key !== 'Enter') return
      if (status === 'answering' && canCheck) onCheck()
      else if (status !== 'answering') onContinue()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [status, canCheck, onCheck, onContinue])

  useEffect(() => {
    if (status === 'correct') playCorrect()
    else if (status === 'incorrect') playIncorrect()
  }, [status])

  return (
    <motion.div className="exercise" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 30 }}>
      <div className="exercise-body">
        {eyebrow && <p className="exercise-eyebrow">{eyebrow}</p>}
        {prompt && <h2 className="exercise-prompt">{prompt}</h2>}
        <div className="exercise-interactive">{children}</div>
      </div>

      <div className={`exercise-footer exercise-footer-${status}`}>
        <AnimatePresence>
          {status !== 'answering' && (
            <motion.div
              key="feedback"
              className={`feedback-banner feedback-${status}`}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            >
              <div className="feedback-mascot">
                <Mascot expression={status === 'correct' ? 'happy' : 'thinking'} celebrate={status === 'correct'} size={40} />
              </div>
              <div className="feedback-text">
                <strong>{status === 'correct' ? 'Nice work!' : 'Not quite'}</strong>
                {status === 'incorrect' && correctAnswerLabel && (
                  <span>
                    Correct answer: <em>{correctAnswerLabel}</em>
                  </span>
                )}
                {note && <span className="feedback-note">{note}</span>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          className={`btn-check ${status !== 'answering' ? `btn-check-${status}` : ''}`}
          disabled={status === 'answering' && !canCheck}
          onClick={status === 'answering' ? onCheck : onContinue}
        >
          {status === 'answering' ? 'Check' : 'Continue'}
        </motion.button>
      </div>
    </motion.div>
  )
}
