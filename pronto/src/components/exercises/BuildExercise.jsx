import { useMemo, useState } from 'react'
import ExerciseShell from '../ExerciseShell.jsx'
import { shuffle } from '../../lib/matching.js'

export default function BuildExercise({ exercise, onAnswered, onContinue }) {
  const { en, it, distractors = [], note } = exercise

  const allTiles = useMemo(() => {
    const words = [...it.split(' '), ...distractors]
    return shuffle(words).map((word, i) => ({ word, key: `${word}-${i}` }))
  }, [exercise.id])

  const [bank, setBank] = useState(allTiles)
  const [built, setBuilt] = useState([])
  const [status, setStatus] = useState('answering')

  function moveToBuilt(tile) {
    if (status !== 'answering') return
    setBank((b) => b.filter((t) => t.key !== tile.key))
    setBuilt((b) => [...b, tile])
  }

  function moveToBank(tile) {
    if (status !== 'answering') return
    setBuilt((b) => b.filter((t) => t.key !== tile.key))
    setBank((b) => [...b, tile])
  }

  function handleCheck() {
    const attempt = built.map((t) => t.word).join(' ')
    const isCorrect = attempt === it
    setStatus(isCorrect ? 'correct' : 'incorrect')
    onAnswered(isCorrect)
  }

  return (
    <ExerciseShell
      eyebrow="Build the Italian sentence"
      prompt={en}
      status={status}
      canCheck={built.length > 0}
      onCheck={handleCheck}
      onContinue={onContinue}
      correctAnswerLabel={it}
      note={status === 'correct' ? note : undefined}
    >
      <div className="build-answer-row" role="group" aria-label="Your sentence">
        {built.length === 0 && <span className="build-placeholder">Tap words below to build your answer</span>}
        {built.map((tile) => (
          <button key={tile.key} type="button" className="tile tile-built" onClick={() => moveToBank(tile)} disabled={status !== 'answering'}>
            {tile.word}
          </button>
        ))}
      </div>
      <div className="build-bank-row" role="group" aria-label="Word bank">
        {bank.map((tile) => (
          <button key={tile.key} type="button" className="tile" onClick={() => moveToBuilt(tile)} disabled={status !== 'answering'}>
            {tile.word}
          </button>
        ))}
      </div>
    </ExerciseShell>
  )
}
