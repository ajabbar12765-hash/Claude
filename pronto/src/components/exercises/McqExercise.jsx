import { useMemo, useState } from 'react'
import ExerciseShell from '../ExerciseShell.jsx'
import { shuffle } from '../../lib/matching.js'

export default function McqExercise({ exercise, onAnswered, onContinue }) {
  const { dir, it, en, options, note } = exercise
  const promptText = dir === 'it-en' ? it : en
  const correctAnswer = dir === 'it-en' ? en : it
  const shuffledOptions = useMemo(() => shuffle(options), [exercise.id])

  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('answering')

  function handleCheck() {
    const isCorrect = selected === correctAnswer
    setStatus(isCorrect ? 'correct' : 'incorrect')
    onAnswered(isCorrect)
  }

  return (
    <ExerciseShell
      eyebrow={dir === 'it-en' ? 'What does this mean?' : 'How do you say this in Italian?'}
      prompt={promptText}
      status={status}
      canCheck={selected != null}
      onCheck={handleCheck}
      onContinue={onContinue}
      correctAnswerLabel={correctAnswer}
      note={status === 'correct' ? note : undefined}
    >
      <div className="option-grid">
        {shuffledOptions.map((opt) => {
          const isSelected = selected === opt
          const revealCorrect = status !== 'answering' && opt === correctAnswer
          const revealWrong = status === 'incorrect' && isSelected && opt !== correctAnswer
          return (
            <button
              key={opt}
              type="button"
              disabled={status !== 'answering'}
              className={[
                'option-tile',
                isSelected && status === 'answering' ? 'option-selected' : '',
                revealCorrect ? 'option-correct' : '',
                revealWrong ? 'option-wrong' : '',
              ].join(' ')}
              onClick={() => setSelected(opt)}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </ExerciseShell>
  )
}
