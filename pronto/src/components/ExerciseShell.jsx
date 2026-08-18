import { useEffect } from 'react'
import Icon from './Icon.jsx'

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

  return (
    <div className="exercise">
      <div className="exercise-body">
        {eyebrow && <p className="exercise-eyebrow">{eyebrow}</p>}
        {prompt && <h2 className="exercise-prompt">{prompt}</h2>}
        <div className="exercise-interactive">{children}</div>
      </div>

      <div className={`exercise-footer exercise-footer-${status}`}>
        {status !== 'answering' && (
          <div className={`feedback-banner feedback-${status}`}>
            <div className="feedback-icon">
              <Icon name={status === 'correct' ? 'check' : 'x'} size={22} strokeWidth={2.4} />
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
          </div>
        )}
        <button
          type="button"
          className={`btn-check ${status !== 'answering' ? `btn-check-${status}` : ''}`}
          disabled={status === 'answering' && !canCheck}
          onClick={status === 'answering' ? onCheck : onContinue}
        >
          {status === 'answering' ? 'Check' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
