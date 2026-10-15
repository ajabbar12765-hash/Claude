import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
        <AnimatePresence>
          {built.map((tile) => (
            <motion.button
              layout
              key={tile.key}
              type="button"
              className="tile tile-built"
              onClick={() => moveToBank(tile)}
              disabled={status !== 'answering'}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              whileTap={status === 'answering' ? { scale: 0.92 } : undefined}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              {tile.word}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
      <div className="build-bank-row" role="group" aria-label="Word bank">
        <AnimatePresence>
          {bank.map((tile) => (
            <motion.button
              layout
              key={tile.key}
              type="button"
              className="tile"
              onClick={() => moveToBuilt(tile)}
              disabled={status !== 'answering'}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              whileTap={status === 'answering' ? { scale: 0.92 } : undefined}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              {tile.word}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </ExerciseShell>
  )
}
