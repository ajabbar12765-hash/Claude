import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import ExerciseShell from '../ExerciseShell.jsx'
import { expandOptions } from '../../lib/matching.js'

// The instruction line used to be one fixed sentence per direction,
// repeated verbatim on literally every mcq exercise in the course — a
// learner stops reading an instruction that never changes, which is
// exactly the "I don't even need to read the question" autopilot this
// varies against.
const EYEBROWS = {
  'it-en': ['What does this mean?', 'What’s the meaning of this?', 'Translate this:', 'What is this saying?'],
  'en-it': ['How do you say this in Italian?', 'Say this in Italian:', 'What’s the Italian for this?', 'Translate this into Italian:'],
}

export default function McqExercise({ exercise, onAnswered, onContinue, distractorPool }) {
  const { dir, it, en, options, note } = exercise
  const promptText = dir === 'it-en' ? it : en
  const correctAnswer = dir === 'it-en' ? en : it
  const shuffledOptions = useMemo(() => {
    const pool = (distractorPool || []).map((p) => (dir === 'it-en' ? p.en : p.it))
    return expandOptions(correctAnswer, options, pool)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id])
  const eyebrow = useMemo(() => {
    const choices = EYEBROWS[dir] || EYEBROWS['it-en']
    return choices[Math.floor(Math.random() * choices.length)]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id])

  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('answering')

  function handleCheck() {
    const isCorrect = selected === correctAnswer
    setStatus(isCorrect ? 'correct' : 'incorrect')
    onAnswered(isCorrect)
  }

  return (
    <ExerciseShell
      eyebrow={eyebrow}
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
            <motion.button
              key={opt}
              type="button"
              disabled={status !== 'answering'}
              whileTap={status === 'answering' ? { scale: 0.95 } : undefined}
              animate={revealWrong ? { x: [0, -6, 6, -4, 4, 0] } : {}}
              transition={{ duration: 0.35 }}
              className={[
                'option-tile',
                isSelected && status === 'answering' ? 'option-selected' : '',
                revealCorrect ? 'option-correct' : '',
                revealWrong ? 'option-wrong' : '',
              ].join(' ')}
              onClick={() => setSelected(opt)}
            >
              {opt}
            </motion.button>
          )
        })}
      </div>
    </ExerciseShell>
  )
}
