import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Icon from '../Icon.jsx'
import Mascot from '../Mascot.jsx'
import { canSpeak, pickRecordingMode, speakItalian, listenOnce, startAudioRecording, transcribeAudio } from '../../lib/speech.js'
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

const MIN_RECORDING_MS = 500

// Pronunciation practice: speak the phrase out loud instead of tapping an
// answer. Uses native Web Speech recognition where it's reliable; on WebKit
// (where it isn't — see speech.js) records the clip instead and sends it to
// the same Gemini transcription endpoint the voice call uses, so this can
// actually hear you everywhere rather than falling back to a trust-me
// self-report.
export default function SpeakExercise({ exercise, onAnswered, onContinue }) {
  const { it, en, note } = exercise
  const [status, setStatus] = useState('answering')
  const [listening, setListening] = useState(false)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [heard, setHeard] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const speechAvailable = canSpeak()
  const mode = useRef(pickRecordingMode())
  const recorderRef = useRef(null)
  const recordStartRef = useRef(0)
  const wordCount = normalize(it).split(' ').filter(Boolean).length
  const threshold = wordCount <= 2 ? 1 : 0.6

  useEffect(() => {
    if (speechAvailable) speakItalian(it)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id])

  function report(isCorrect, transcript) {
    if (transcript != null) setHeard(transcript)
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
      onResult: (transcript) => report(speechMatchRatio(transcript, it) >= threshold, transcript),
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
      report(speechMatchRatio(transcript, it) >= threshold, transcript)
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
    ? 'Checking your pronunciation…'
    : recording
      ? 'Recording — tap again when you’re done'
      : listening
        ? 'Listening…'
        : status === 'answering'
          ? 'Tap the mic and say it in Italian'
          : ''

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

          {mode.current !== 'none' ? (
            <>
              <motion.button
                type="button"
                whileTap={{ scale: 0.93 }}
                className={`speak-mic ${micActive ? 'speak-mic-active' : ''}`}
                disabled={micBusy}
                onClick={handleMicTap}
                aria-label="Tap and say the phrase"
              >
                <Icon name={micActive ? 'x' : 'volume'} size={24} strokeWidth={2} />
              </motion.button>
              <p className="speak-hint">{hintText}</p>
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
