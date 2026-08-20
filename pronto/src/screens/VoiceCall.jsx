import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Mascot from '../components/Mascot.jsx'
import Icon from '../components/Icon.jsx'
import { canSpeak, canListen, canRecordAudio, speakItalian, listenOnce, startAudioRecording, blobToBase64 } from '../lib/speech.js'

const GREETING = { role: 'assistant', italian: 'Pronto! Sono Volpe. Come va oggi?', gloss: 'Hello! It’s Volpe. How’s it going today?' }

const RECOGNITION_ERROR_MESSAGES = {
  'not-allowed': 'Microphone access was denied. Check your browser’s site permissions and try again.',
  'service-not-allowed': 'Microphone access was denied. Check your browser’s site permissions and try again.',
  'no-speech': 'Didn’t catch that — try again, a little closer to the mic.',
  'audio-capture': 'No microphone found on this device.',
  network: 'A network hiccup interrupted listening. Try again.',
}

// Native SpeechRecognition (Android Chrome etc.) if the browser has it;
// otherwise raw audio recording sent to the server (works on Safari/iOS,
// which never shipped SpeechRecognition); otherwise typing.
function micMode() {
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
  const scrollRef = useRef(null)
  const speechSupported = canSpeak()

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
      const body = audioBlob
        ? { history, audioBase64: await blobToBase64(audioBlob), audioMimeType: audioBlob.type }
        : { history, text: text.trim() }
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
    const blob = await recorderRef.current.stop()
    recorderRef.current = null
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
          {callState === 'recording' && 'Recording — tap again when you’re done'}
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
              {m.role === 'assistant' ? (
                <>
                  {m.italian}
                  {m.gloss && <span className="call-bubble-gloss">{m.gloss}</span>}
                </>
              ) : (
                m.text
              )}
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
