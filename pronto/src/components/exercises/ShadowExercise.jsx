import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Icon from '../Icon.jsx'
import Mascot from '../Mascot.jsx'
import { canSpeak, canListenReliably, speakItalian, listenOnce } from '../../lib/speech.js'
import { speechMatchDetails, normalize } from '../../lib/matching.js'
import { playCorrect, playIncorrect } from '../../lib/sound.js'

const ERROR_MESSAGES = {
  'not-allowed': 'Microphone access was denied — check your browser’s site permissions.',
  'service-not-allowed': 'Microphone access was denied — check your browser’s site permissions.',
  'no-speech': 'Didn’t catch that. Tap the mic and try again.',
  'no-match': 'Didn’t catch that. Tap the mic and try again.',
  'audio-capture': 'No microphone found on this device.',
  network: 'A network hiccup interrupted listening. Try again.',
}

// True shadowing: the Italian text stays hidden until after you attempt it,
// so you're reacting to sound alone rather than reading along — a different
// skill from Speak (text shown) or Respond (open-ended reply). Feedback
// shows exactly which words of the target landed and which didn't.
export default function ShadowExercise({ exercise, onAnswered, onContinue }) {
  const { it, en, note } = exercise
  const [status, setStatus] = useState('answering') // answering | correct | incorrect
  const [listening, setListening] = useState(false)
  const [playCount, setPlayCount] = useState(0)
  const [result, setResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const speechAvailable = canSpeak()
  const listenAvailable = canListenReliably()
  const wordCount = normalize(it).split(' ').filter(Boolean).length
  const threshold = wordCount <= 2 ? 1 : 0.6

  function playTarget() {
    speakItalian(it)
    setPlayCount((c) => c + 1)
  }

  useEffect(() => {
    if (speechAvailable) playTarget()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id])

  function report(details) {
    const isCorrect = details.ratio >= threshold
    setResult(details)
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
      onResult: (transcript) => report(speechMatchDetails(transcript, it)),
      onError: (code) => setErrorMessage(ERROR_MESSAGES[code] || 'Something went wrong while listening. Try again.'),
      onEnd: () => setListening(false),
    })
  }

  return (
    <div className="exercise">
      <div className="exercise-body">
        <p className="exercise-eyebrow">Shadow it — listen, then repeat exactly what you hear</p>
        <h2 className="exercise-prompt">{en}</h2>

        <div className="speak-block">
          <button type="button" className="listen-play" onClick={playTarget} aria-label="Play audio" disabled={!speechAvailable}>
            <Icon name="volume" size={30} strokeWidth={1.9} />
          </button>
          {playCount > 1 && <p className="speak-hint">Played {playCount} times — replay as often as you need</p>}
          {!speechAvailable && <p className="listen-fallback">Your browser can’t play audio here.</p>}

          {listenAvailable ? (
            <>
              <motion.button
                type="button"
                whileTap={{ scale: 0.93 }}
                className={`speak-mic ${listening ? 'speak-mic-active' : ''}`}
                disabled={status !== 'answering'}
                onClick={startListening}
                aria-label="Repeat what you heard"
              >
                <Icon name={listening ? 'x' : 'volume'} size={24} strokeWidth={2} />
              </motion.button>
              <p className="speak-hint">{listening ? 'Listening…' : status === 'answering' ? 'Tap the mic and repeat what you heard' : ''}</p>
              {errorMessage && <p className="speak-error">{errorMessage}</p>}
            </>
          ) : (
            <>
              <p className="speak-hint">Your browser can’t listen here — say it out loud, then mark it done.</p>
              {status === 'answering' && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  className="btn-primary speak-self-report"
                  onClick={() => report({ ratio: 1, words: it.split(' ').map((w) => ({ word: w, matched: true })) })}
                >
                  I said it
                </motion.button>
              )}
            </>
          )}
        </div>

        {result && status !== 'answering' && (
          <div className="shadow-result">
            <p className="shadow-result-words">
              {result.words.map((w, i) => (
                <span key={i} className={`shadow-word ${w.matched ? 'shadow-word-hit' : 'shadow-word-miss'}`}>
                  {w.word}
                </span>
              ))}
            </p>
            <p className="shadow-result-score">{Math.round(result.ratio * 100)}% matched</p>
          </div>
        )}
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
                <strong>{status === 'correct' ? 'Nice shadowing!' : 'Close, but not quite'}</strong>
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
          {status === 'answering' ? 'Repeat above to check' : 'Continue'}
        </motion.button>
      </div>
    </div>
  )
}
