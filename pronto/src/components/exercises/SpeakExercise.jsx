import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Icon from '../Icon.jsx'
import Mascot from '../Mascot.jsx'
import { canSpeak, canListenReliably, speakItalian, listenOnce } from '../../lib/speech.js'
import { speechMatchRatio, normalize } from '../../lib/matching.js'
import { playCorrect, playIncorrect } from '../../lib/sound.js'

const ERROR_MESSAGES = {
  'not-allowed': 'Microphone access was denied — check your browser’s site permissions.',
  'service-not-allowed': 'Microphone access was denied — check your browser’s site permissions.',
  'no-speech': 'Didn’t catch that. Tap the mic and try again.',
  'no-match': 'Didn’t catch that. Tap the mic and try again.',
  'audio-capture': 'No microphone found on this device.',
  network: 'A network hiccup interrupted listening. Try again.',
}

// Pronunciation practice: speak the phrase out loud instead of tapping an
// answer. Reuses the same speech.js Web Speech wiring as the voice call, but
// scored locally (word-overlap ratio) rather than sent to Gemini — this is a
// quick in-lesson check, not a conversation.
export default function SpeakExercise({ exercise, onAnswered, onContinue }) {
  const { it, en, note } = exercise
  const [status, setStatus] = useState('answering')
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const speechAvailable = canSpeak()
  const listenAvailable = canListenReliably()
  const wordCount = normalize(it).split(' ').filter(Boolean).length
  const threshold = wordCount <= 2 ? 1 : 0.6

  useEffect(() => {
    if (speechAvailable) speakItalian(it)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id])

  function report(isCorrect) {
    setStatus(isCorrect ? 'correct' : 'incorrect')
    if (isCorrect) playCorrect()
    else playIncorrect()
    onAnswered(isCorrect)
  }

  function startListening() {
    setErrorMessage('')
    setListening(true)
    listenOnce({
      lang: 'it-IT',
      onResult: (transcript) => {
        setHeard(transcript)
        report(speechMatchRatio(transcript, it) >= threshold)
      },
      onError: (code) => setErrorMessage(ERROR_MESSAGES[code] || 'Something went wrong while listening. Try again.'),
      onEnd: () => setListening(false),
    })
  }

  return (
    <div className="exercise">
      <div className="exercise-body">
        <p className="exercise-eyebrow">Say it out loud</p>
        <h2 className="exercise-prompt">{en}</h2>

        <div className="speak-block">
          <p className="speak-target">{it}</p>
          {speechAvailable && (
            <button type="button" className="speak-play" onClick={() => speakItalian(it)} aria-label="Hear the pronunciation">
              <Icon name="volume" size={16} strokeWidth={2} /> Hear it
            </button>
          )}

          {listenAvailable ? (
            <>
              <motion.button
                type="button"
                whileTap={{ scale: 0.93 }}
                className={`speak-mic ${listening ? 'speak-mic-active' : ''}`}
                disabled={status !== 'answering'}
                onClick={startListening}
                aria-label="Tap and say the phrase"
              >
                <Icon name={listening ? 'x' : 'volume'} size={24} strokeWidth={2} />
              </motion.button>
              <p className="speak-hint">{listening ? 'Listening…' : status === 'answering' ? 'Tap the mic and say it in Italian' : ''}</p>
              {heard && status !== 'answering' && <p className="speak-heard">You said: “{heard}”</p>}
              {errorMessage && <p className="speak-error">{errorMessage}</p>}
            </>
          ) : (
            <>
              <p className="speak-hint">Your browser can’t listen here — practice out loud, then mark it done.</p>
              {status === 'answering' && (
                <motion.button whileTap={{ scale: 0.97 }} type="button" className="btn-primary speak-self-report" onClick={() => report(true)}>
                  I said it
                </motion.button>
              )}
            </>
          )}
        </div>
      </div>

      <div className={`exercise-footer exercise-footer-${status}`}>
        <AnimatePresence>
          {status !== 'answering' && (
            <motion.div
              key="feedback"
              className={`feedback-banner feedback-${status}`}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            >
              <div className="feedback-mascot">
                <Mascot expression={status === 'correct' ? 'happy' : 'thinking'} celebrate={status === 'correct'} size={40} />
              </div>
              <div className="feedback-text">
                <strong>{status === 'correct' ? 'Nice work!' : 'Close, but not quite'}</strong>
                {status === 'incorrect' && (
                  <span>
                    Target: <em>{it}</em>
                  </span>
                )}
                {status === 'correct' && note && <span className="feedback-note">{note}</span>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          className={`btn-check ${status !== 'answering' ? `btn-check-${status}` : ''}`}
          disabled={status === 'answering'}
          onClick={onContinue}
        >
          {status === 'answering' ? 'Speak above to check' : 'Continue'}
        </motion.button>
      </div>
    </div>
  )
}
