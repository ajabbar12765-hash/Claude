import { useEffect, useMemo, useState } from 'react'
import ExerciseShell from '../ExerciseShell.jsx'
import Icon from '../Icon.jsx'
import { shuffle } from '../../lib/matching.js'
import { canSpeak, speakItalian } from '../../lib/speech.js'

export default function ListenExercise({ exercise, onAnswered, onContinue }) {
  const { it, en, options, note } = exercise
  const shuffledOptions = useMemo(() => shuffle(options), [exercise.id])
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('answering')
  const speechAvailable = canSpeak()

  function play() {
    speakItalian(it)
  }

  useEffect(() => {
    if (speechAvailable) play()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id])

  function handleCheck() {
    const isCorrect = selected === en
    setStatus(isCorrect ? 'correct' : 'incorrect')
    onAnswered(isCorrect)
  }

  return (
    <ExerciseShell
      eyebrow="Listen and choose what it means"
      status={status}
      canCheck={selected != null}
      onCheck={handleCheck}
      onContinue={onContinue}
      correctAnswerLabel={en}
      note={status === 'correct' ? note : undefined}
    >
      <div className="listen-block">
        <button type="button" className="listen-play" onClick={play} aria-label="Play audio">
          <Icon name="volume" size={30} strokeWidth={1.9} />
        </button>
        {!speechAvailable && <p className="listen-fallback">Your browser can’t play audio here, so here’s the phrase: “{it}”</p>}
        {status !== 'answering' && speechAvailable && <p className="listen-transcript">“{it}”</p>}
      </div>
      <div className="option-grid">
        {shuffledOptions.map((opt) => {
          const isSelected = selected === opt
          const revealCorrect = status !== 'answering' && opt === en
          const revealWrong = status === 'incorrect' && isSelected && opt !== en
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
