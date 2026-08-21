import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Mascot from '../components/Mascot.jsx'
import Icon from '../components/Icon.jsx'
import { canSpeak, canListen, canRecordAudio, isAppleWebKit, speakItalian, listenOnce, startAudioRecording, blobToBase64 } from '../lib/speech.js'

const GREETING = { role: 'assistant', italian: 'Pronto! Sono Volpe. Come va oggi?', gloss: 'Hello! It’s Volpe. How’s it going today?' }

const RECOGNITION_ERROR_MESSAGES = {
  'not-allowed': 'Microphone access was denied. Check your browser’s site permissions and try again.',
  'service-not-allowed': 'Microphone access was denied. Check your browser’s site permissions and try again.',
  'no-speech': 'Didn’t catch that — try again, a little closer to the mic.',
  'no-match': 'Didn’t catch that — try again, a little closer to the mic.',
  'audio-capture': 'No microphone found on this device.',
  network: 'A network hiccup interrupted listening. Try again.',
}

const MIN_RECORDING_MS = 500

// Native SpeechRecognition where it's actually reliable; raw audio
// recording sent to the server everywhere else — including WebKit/Safari
// (desktop and everything on iOS/iPadOS), where the native API technically
// exists but is known to fail silently in practice. See isAppleWebKit().
function micMode() {
  if (canRecordAudio() && isAppleWebKit()) return 'record'
  if (canListen()) return 'native'
  if (canRecordAudio()) return 'record'
  return 'type'
}

export default function VoiceCall({ onExit, progress }) {
  const [messages, setMessages] = useState([GREETING])
  const [callState, setCallState] = useState('speaking') // idle | listening | recording | thinking | speaking | error-no-key | error
  const [typedValue, setTypedValue] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const mode = useRef(micMode())
  const recognitionRef = useRef(null)
  const recorderRef = useRef(null)
  const recordStartRef = useRef(0)
  const scrollRef = useRef(null)
  const speechSupported = canSpeak()
  const [recordingSeconds, setRecordingSeconds] = useState(0)

  useEffect(() => {
    progress?.recordVoiceCall()
    if (speechSupported) {
      speakItalian(GREETING.italian, { onStart: () => setCallState('speaking'), onEnd: () => setCallState('idle') })
    } else {
      setCallState('idle')
    }
    return () => {
      recognitionRef.current?.abort?.()
      recorderRef.current?.cancel?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, callState])

  // Live recording timer — concrete, visible proof the mic is actually
  // capturing, instead of a spinner-of-faith while the user talks.
  useEffect(() => {
    if (callState !== 'recording') {
      setRecordingSeconds(0)
      return
    }
    const t = setInterval(() => setRecordingSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [callState])

  function historyForApi() {
    return messages.map((m) =>
      m.role === 'assistant' ? { role: 'assistant', text: `${m.italian} (${m.gloss})` } : { role: 'user', text: m.text },
    )
  }

  async function sendTurn({ text, audioBlob }) {
    const history = historyForApi()
    setCallState('thinking')
    setErrorMessage('')

    try {
      const level = progress?.italianLevel || undefined
      const body = audioBlob
        ? { history, audioBase64: await blobToBase64(audioBlob), audioMimeType: audioBlob.type, level }
        : { history, text: text.trim(), level }
      if (!audioBlob && !body.text) {
        setCallState('idle')
        return
      }

      const res = await fetch('/api/converse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'missing_api_key' || data.error === 'invalid_api_key') {
          setCallState('error-no-key')
          setErrorMessage(data.message)
        } else {
          setCallState('error')
          setErrorMessage(data.message || 'Something went wrong. Try again.')
        }
        return
      }

      // A recorded clip that comes back with an empty/near-empty transcript
      // almost always means the mic didn't actually catch anything usable —
      // surfacing that plainly beats silently pushing a blank message and
      // leaving Volpe to reply to nothing.
      if (audioBlob && (data.heard || '').trim().length < 2) {
        setCallState('error')
        setErrorMessage('Didn’t catch what you said — try again, and start speaking right after you tap the mic.')
        return
      }

      setMessages((prev) => [
        ...prev,
        { role: 'user', text: data.heard || text || '(voice message)' },
        { role: 'assistant', italian: data.italian || '...', gloss: data.gloss || '' },
      ])
      if (speechSupported && data.italian) {
        speakItalian(data.italian, { onStart: () => setCallState('speaking'), onEnd: () => setCallState('idle') })
      } else {
        setCallState('idle')
      }
    } catch {
      setCallState('error')
      setErrorMessage('Couldn’t reach the server. Check your connection and try again.')
    }
  }

  function startListening() {
    if (callState !== 'idle') return
    setCallState('listening')
    recognitionRef.current = listenOnce({
      lang: 'it-IT',
      onResult: (transcript) => sendTurn({ text: transcript }),
      onError: (code) => {
        setCallState('error')
        setErrorMessage(RECOGNITION_ERROR_MESSAGES[code] || 'Something went wrong while listening. Try again.')
      },
      onEnd: () => setCallState((s) => (s === 'listening' ? 'idle' : s)),
    })
  }

  function stopListening() {
    recognitionRef.current?.stop?.()
  }

  async function startRecording() {
    if (callState !== 'idle' && callState !== 'error') return
    setErrorMessage('')
    try {
      recorderRef.current = await startAudioRecording()
      recordStartRef.current = Date.now()
      setCallState('recording')
    } catch (err) {
      setCallState('error')
      setErrorMessage(
        err?.name === 'NotAllowedError'
          ? 'Microphone access was denied. Check your browser’s site permissions and try again.'
          : 'Couldn’t access the microphone on this device.',
      )
    }
  }

  async function stopRecording() {
    if (!recorderRef.current) return
    const elapsed = Date.now() - recordStartRef.current
    const blob = await recorderRef.current.stop()
    recorderRef.current = null
    if (elapsed < MIN_RECORDING_MS) {
      setCallState('error')
      setErrorMessage('That was too quick for me to catch — hold the mic a beat longer and try again.')
      return
    }
    sendTurn({ audioBlob: blob })
  }

  function handleMicTap() {
    if (mode.current === 'native') {
      callState === 'listening' ? stopListening() : startListening()
    } else if (mode.current === 'record') {
      callState === 'recording' ? stopRecording() : startRecording()
    }
  }

  function handleTypedSubmit(e) {
    e.preventDefault()
    if (callState !== 'idle' && callState !== 'error' && callState !== 'error-no-key') return
    if (!typedValue.trim()) return
    sendTurn({ text: typedValue })
    setTypedValue('')
  }

  const mascotExpression = callState === 'speaking' ? 'talking' : callState === 'thinking' ? 'thinking' : 'idle'
  const micActive = callState === 'listening' || callState === 'recording'
  const micBusy = callState === 'thinking' || callState === 'speaking'

  return (
    <div className="screen screen-call">
      <div className="call-header">
        <button type="button" className="lesson-exit" onClick={onExit} aria-label="End call">
          <Icon name="x" size={22} strokeWidth={2.2} />
        </button>
        <span className="call-header-title">Call Volpe</span>
      </div>

      <div className="call-avatar-zone">
        <motion.div className={`call-avatar-ring ${micActive ? 'call-avatar-ring-listening' : ''} ${callState === 'speaking' ? 'call-avatar-ring-speaking' : ''}`}>
          <Mascot expression={mascotExpression} size={104} />
        </motion.div>
        <p className="call-status-label">
          {callState === 'listening' && 'Listening…'}
          {callState === 'recording' && (
            <>
              <span className="call-rec-dot" aria-hidden="true" /> Recording {String(Math.floor(recordingSeconds / 60)).padStart(1, '0')}:{String(recordingSeconds % 60).padStart(2, '0')} — tap again when you’re done
            </>
          )}
          {callState === 'thinking' && 'Volpe is thinking…'}
          {callState === 'speaking' && 'Volpe is talking…'}
          {callState === 'idle' && (mode.current === 'type' ? 'Type your reply below' : 'Tap the mic and speak')}
          {(callState === 'error' || callState === 'error-no-key') && 'Something needs your attention'}
        </p>
      </div>

      <div className="call-transcript" ref={scrollRef}>
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              className={`call-bubble ${m.role === 'user' ? 'call-bubble-user' : 'call-bubble-volpe'}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            >
              {m.role === 'assistant' ? m.italian : m.text}
            </motion.div>
          ))}
        </AnimatePresence>

        {(callState === 'error' || callState === 'error-no-key') && errorMessage && (
          <div className={`call-error ${callState === 'error-no-key' ? 'call-error-key' : ''}`}>{errorMessage}</div>
        )}
      </div>

      <div className="call-controls">
        {mode.current !== 'type' ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            className={`call-mic ${micActive ? 'call-mic-active' : ''}`}
            disabled={micBusy}
            onClick={handleMicTap}
            aria-label={micActive ? 'Stop and send' : 'Start speaking'}
          >
            <Icon name={micActive ? 'x' : 'volume'} size={26} strokeWidth={2} />
          </motion.button>
        ) : (
          <form className="call-type-form" onSubmit={handleTypedSubmit}>
            <input
              type="text"
              className="type-input"
              placeholder="Scrivi la tua risposta..."
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              disabled={micBusy}
            />
            <motion.button whileTap={{ scale: 0.95 }} type="submit" className="btn-primary call-type-send" disabled={micBusy}>
              Send
            </motion.button>
          </form>
        )}
      </div>
    </div>
  )
}
