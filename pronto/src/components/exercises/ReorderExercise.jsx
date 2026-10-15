import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ExerciseShell from '../ExerciseShell.jsx'
import Icon from '../Icon.jsx'
import { shuffle } from '../../lib/matching.js'
import { canSpeak, speakItalian } from '../../lib/speech.js'

// Word-order drill sourced purely from listening: the tiles are the target
// sentence's own words, scrambled, with no English translation shown until
// after you check — you're reconstructing Italian syntax from sound, not
// translating from English the way the Build exercise does.
export default function ReorderExercise({ exercise, onAnswered, onContinue }) {
  const { it, en, note } = exercise
  const speechAvailable = canSpeak()

  const allTiles = useMemo(() => shuffle(it.split(' ')).map((word, i) => ({ word, key: `${word}-${i}` })), [exercise.id])
  const [bank, setBank] = useState(allTiles)
  const [built, setBuilt] = useState([])
  const [status, setStatus] = useState('answering')

  function play() {
    speakItalian(it)
  }

  useEffect(() => {
    if (speechAvailable) play()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id])

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
      eyebrow="Listen, then put the words in order"
      status={status}
      canCheck={built.length > 0}
      onCheck={handleCheck}
      onContinue={onContinue}
      correctAnswerLabel={it}
      note={status === 'correct' && note ? note : `Meaning: “${en}”`}
    >
      <div className="listen-block">
        <motion.button type="button" whileTap={{ scale: 0.9 }} className="listen-play" onClick={play} aria-label="Play audio" disabled={!speechAvailable}>
          <Icon name="volume" size={30} strokeWidth={1.9} />
        </motion.button>
        {!speechAvailable && <p className="listen-fallback">Your browser can’t play audio here — sound it out from the words below.</p>}
      </div>
      <div className="build-answer-row" role="group" aria-label="Your sentence">
        {built.length === 0 && <span className="build-placeholder">Tap words below in the order you hear them</span>}
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
