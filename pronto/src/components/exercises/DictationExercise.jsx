import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import ExerciseShell from '../ExerciseShell.jsx'
import Icon from '../Icon.jsx'
import { isAcceptableAnswer } from '../../lib/matching.js'
import { canSpeak, speakItalian } from '../../lib/speech.js'

// Classic university-lab dictation: hear the sentence, type exactly what you
// heard. No English shown up front — this tests whether the sounds map to
// words in your head, not translation.
export default function DictationExercise({ exercise, onAnswered, onContinue }) {
  const { it, en, accept = [], note } = exercise
  const [value, setValue] = useState('')
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
    const isCorrect = isAcceptableAnswer(value, it, accept)
    setStatus(isCorrect ? 'correct' : 'incorrect')
    onAnswered(isCorrect)
  }

  return (
    <ExerciseShell
      eyebrow="Listen, then type what you hear"
      status={status}
      canCheck={value.trim().length > 0}
      onCheck={handleCheck}
      onContinue={onContinue}
      correctAnswerLabel={it}
      note={status === 'correct' && note ? note : `Meaning: “${en}”`}
    >
      <div className="listen-block">
        <motion.button type="button" whileTap={{ scale: 0.9 }} className="listen-play" onClick={play} aria-label="Play audio" disabled={!speechAvailable}>
          <Icon name="volume" size={30} strokeWidth={1.9} />
        </motion.button>
        {!speechAvailable && <p className="listen-fallback">Your browser can’t play audio here, so here’s the phrase: “{it}”</p>}
      </div>
      <motion.input
        type="text"
        className="type-input"
        placeholder="Scrivi quello che senti..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={status !== 'answering'}
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        animate={status === 'incorrect' ? { x: [0, -6, 6, -4, 4, 0] } : {}}
        transition={{ duration: 0.35 }}
      />
      <p className="type-hint">Play it as many times as you need — accents and punctuation don’t need to be perfect.</p>
    </ExerciseShell>
  )
}
