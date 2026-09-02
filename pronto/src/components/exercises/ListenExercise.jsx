import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import ExerciseShell from '../ExerciseShell.jsx'
import Icon from '../Icon.jsx'
import { expandOptions } from '../../lib/matching.js'
import { canSpeak, speakItalian } from '../../lib/speech.js'

const EYEBROWS = ['Listen and choose what it means', 'What does this mean?', 'Listen, then pick the meaning']

export default function ListenExercise({ exercise, onAnswered, onContinue, distractorPool }) {
  const { it, en, options, note } = exercise
  const shuffledOptions = useMemo(() => {
    const pool = (distractorPool || []).map((p) => p.en)
    return expandOptions(en, options, pool)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id])
  const eyebrow = useMemo(() => EYEBROWS[Math.floor(Math.random() * EYEBROWS.length)], [exercise.id])
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('answering')
  // Options used to be visible (and the audio auto-played) the instant the
  // exercise loaded, so answering never actually required hearing anything
  // — a learner could pattern-match the option set, especially once a
  // phrase repeated across lessons, without ever really listening. Options
  // now stay locked until the audio has genuinely played at least once, and
  // playback only starts on an explicit tap — the one thing this exercise
  // is supposed to test.
  const [hasPlayed, setHasPlayed] = useState(false)
  const speechAvailable = canSpeak()

  function play() {
    speakItalian(it)
    setHasPlayed(true)
  }

  useEffect(() => {
    // No auto-play: without native audio at all there's nothing to gate on,
    // so unlock immediately and fall back to the transcript below.
    if (!speechAvailable) setHasPlayed(true)
  }, [exercise.id, speechAvailable])

  function handleCheck() {
    const isCorrect = selected === en
    setStatus(isCorrect ? 'correct' : 'incorrect')
    onAnswered(isCorrect)
  }

  return (
    <ExerciseShell
      eyebrow={eyebrow}
      status={status}
      canCheck={hasPlayed && selected != null}
      onCheck={handleCheck}
      onContinue={onContinue}
      correctAnswerLabel={en}
      note={status === 'correct' ? note : undefined}
    >
      <div className="listen-block">
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          className={`listen-play ${!hasPlayed ? 'listen-play-pulse' : ''}`}
          onClick={play}
          aria-label="Play audio"
        >
          <Icon name="volume" size={30} strokeWidth={1.9} />
        </motion.button>
        {speechAvailable && !hasPlayed && status === 'answering' && <p className="listen-hint">Tap to hear it — the options unlock once you have</p>}
        {!speechAvailable && <p className="listen-fallback">Your browser can’t play audio here, so here’s the phrase: “{it}”</p>}
        {status !== 'answering' && speechAvailable && <p className="listen-transcript">“{it}”</p>}
      </div>
      <div className={`option-grid ${!hasPlayed ? 'option-grid-locked' : ''}`}>
        {shuffledOptions.map((opt) => {
          const isSelected = selected === opt
          const revealCorrect = status !== 'answering' && opt === en
          const revealWrong = status === 'incorrect' && isSelected && opt !== en
          return (
            <motion.button
              key={opt}
              type="button"
              disabled={status !== 'answering' || !hasPlayed}
              whileTap={status === 'answering' && hasPlayed ? { scale: 0.95 } : undefined}
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
