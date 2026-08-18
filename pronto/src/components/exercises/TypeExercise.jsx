import { useRef, useState } from 'react'
import ExerciseShell from '../ExerciseShell.jsx'
import { isAcceptableAnswer } from '../../lib/matching.js'

export default function TypeExercise({ exercise, onAnswered, onContinue }) {
  const { en, it, accept = [], note } = exercise
  const [value, setValue] = useState('')
  const [status, setStatus] = useState('answering')
  const inputRef = useRef(null)

  function handleCheck() {
    const isCorrect = isAcceptableAnswer(value, it, accept)
    setStatus(isCorrect ? 'correct' : 'incorrect')
    onAnswered(isCorrect)
  }

  return (
    <ExerciseShell
      eyebrow="Type it in Italian"
      prompt={en}
      status={status}
      canCheck={value.trim().length > 0}
      onCheck={handleCheck}
      onContinue={onContinue}
      correctAnswerLabel={it}
      note={status === 'correct' ? note : undefined}
    >
      <input
        ref={inputRef}
        type="text"
        className="type-input"
        placeholder="Scrivi qui..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={status !== 'answering'}
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
      />
      <p className="type-hint">Accents and punctuation don’t need to be perfect — we’re listening for the words.</p>
    </ExerciseShell>
  )
}
