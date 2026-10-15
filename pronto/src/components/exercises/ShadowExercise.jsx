import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Icon from '../Icon.jsx'
import Mascot from '../Mascot.jsx'
import { canSpeak, pickRecordingMode, speakItalian, listenOnce, startAudioRecording, transcribeAudio } from '../../lib/speech.js'
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

const MIN_RECORDING_MS = 500

// True shadowing: the Italian text stays hidden until after you attempt it,
// so you're reacting to sound alone rather than reading along — a different
// skill from Speak (text shown) or Respond (open-ended reply). Feedback
// shows exactly which words of the target landed and which didn't. Native
// Web Speech recognition where it's reliable; on WebKit (unreliable there —
// see speech.js) records and transcribes server-side instead, so this
// actually hears you everywhere rather than trusting a self-report.
export default function ShadowExercise({ exercise, onAnswered, onContinue }) {
  const { it, en, note } = exercise
  const [status, setStatus] = useState('answering') // answering | correct | incorrect
  const [listening, setListening] = useState(false)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [playCount, setPlayCount] = useState(0)
  const [result, setResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const speechAvailable = canSpeak()
  const mode = useRef(pickRecordingMode())
  const recorderRef = useRef(null)
  const recordStartRef = useRef(0)
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

  async function startRecording() {
    setErrorMessage('')
    try {
      recorderRef.current = await startAudioRecording()
      recordStartRef.current = Date.now()
      setRecording(true)
    } catch (err) {
      setErrorMessage(
        err?.name === 'NotAllowedError'
          ? 'Microphone access was denied — check your browser’s site permissions.'
          : 'Couldn’t access the microphone on this device.',
      )
    }
  }

  async function stopRecording() {
    if (!recorderRef.current) return
    const elapsed = Date.now() - recordStartRef.current
    const blob = await recorderRef.current.stop()
    recorderRef.current = null
    setRecording(false)
    if (elapsed < MIN_RECORDING_MS) {
      setErrorMessage('That was too quick to catch — hold the mic a beat longer and try again.')
      return
    }
    setTranscribing(true)
    try {
      const transcript = await transcribeAudio(blob)
      if (!transcript.trim()) {
        setErrorMessage('Didn’t catch what you said — try again, and start speaking right after you tap the mic.')
        return
      }
      report(speechMatchDetails(transcript, it))
    } catch (err) {
      setErrorMessage(err.message || 'Something went wrong. Try again.')
    } finally {
      setTranscribing(false)
    }
  }

  function handleMicTap() {
    if (mode.current === 'native') startListening()
    else if (mode.current === 'record') (recording ? stopRecording() : startRecording())
  }

  const micActive = listening || recording
  const micBusy = status !== 'answering' || transcribing
  const hintText = transcribing
    ? 'Checking what you said…'
    : recording
      ? 'Recording — tap again when you’re done'
      : listening
        ? 'Listening…'
        : status === 'answering'
          ? 'Tap the mic and repeat what you heard'
          : ''

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

          {mode.current !== 'none' ? (
            <>
              <motion.button
                type="button"
                whileTap={{ scale: 0.93 }}
                className={`speak-mic ${micActive ? 'speak-mic-active' : ''}`}
                disabled={micBusy}
                onClick={handleMicTap}
                aria-label="Repeat what you heard"
              >
                <Icon name={micActive ? 'x' : 'volume'} size={24} strokeWidth={2} />
              </motion.button>
              <p className="speak-hint">{hintText}</p>
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
