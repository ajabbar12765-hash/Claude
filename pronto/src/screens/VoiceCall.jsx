import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Mascot from '../components/Mascot.jsx'
import Icon from '../components/Icon.jsx'
import { canSpeak, canListen, speakItalian, listenOnce } from '../lib/speech.js'

const GREETING = { role: 'assistant', content: 'Pronto! Sono Volpe. Come va oggi? (Hello! It’s Volpe. How’s it going today?)' }

function stripGloss(text) {
  return text.replace(/\s*\([^)]*\)\s*$/, '').trim()
}

export default function VoiceCall({ onExit }) {
  const [messages, setMessages] = useState([GREETING])
  const [callState, setCallState] = useState('speaking') // idle | listening | thinking | speaking | error-no-key | error
  const [typedValue, setTypedValue] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const recognitionRef = useRef(null)
  const scrollRef = useRef(null)
  const speechSupported = canSpeak()
  const listenSupported = canListen()

  useEffect(() => {
    if (speechSupported) {
      speakItalian(stripGloss(GREETING.content), { onStart: () => setCallState('speaking'), onEnd: () => setCallState('idle') })
    } else {
      setCallState('idle')
    }
    return () => recognitionRef.current?.abort?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, callState])

  async function sendTurn(userText) {
    const trimmed = userText.trim()
    if (!trimmed) return
    const nextMessages = [...messages, { role: 'user', content: trimmed }]
    setMessages(nextMessages)
    setCallState('thinking')
    setErrorMessage('')

    try {
      const res = await fetch('/api/converse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
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

      const reply = data.reply || '...'
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
      if (speechSupported) {
        speakItalian(stripGloss(reply), { onStart: () => setCallState('speaking'), onEnd: () => setCallState('idle') })
      } else {
        setCallState('idle')
      }
    } catch {
      setCallState('error')
      setErrorMessage('Couldn’t reach the server. Check your connection and try again.')
    }
  }

  function startListening() {
    if (callState !== 'idle' || !listenSupported) return
    setCallState('listening')
    recognitionRef.current = listenOnce({
      lang: 'it-IT',
      onResult: (transcript) => sendTurn(transcript),
      onError: () => setCallState('idle'),
      onEnd: () => setCallState((s) => (s === 'listening' ? 'idle' : s)),
    })
  }

  function stopListening() {
    recognitionRef.current?.stop?.()
  }

  function handleTypedSubmit(e) {
    e.preventDefault()
    if (callState !== 'idle' && callState !== 'error' && callState !== 'error-no-key') return
    sendTurn(typedValue)
    setTypedValue('')
  }

  const mascotExpression = callState === 'speaking' ? 'talking' : callState === 'thinking' ? 'thinking' : 'idle'

  return (
    <div className="screen screen-call">
      <div className="call-header">
        <button type="button" className="lesson-exit" onClick={onExit} aria-label="End call">
          <Icon name="x" size={22} strokeWidth={2.2} />
        </button>
        <span className="call-header-title">Call Volpe</span>
      </div>

      <div className="call-avatar-zone">
        <motion.div
          className={`call-avatar-ring ${callState === 'listening' ? 'call-avatar-ring-listening' : ''} ${callState === 'speaking' ? 'call-avatar-ring-speaking' : ''}`}
        >
          <Mascot expression={mascotExpression} size={104} />
        </motion.div>
        <p className="call-status-label">
          {callState === 'listening' && 'Listening…'}
          {callState === 'thinking' && 'Volpe is thinking…'}
          {callState === 'speaking' && 'Volpe is talking…'}
          {callState === 'idle' && (listenSupported ? 'Tap the mic and speak' : 'Type your reply below')}
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
              {m.content}
            </motion.div>
          ))}
        </AnimatePresence>

        {(callState === 'error' || callState === 'error-no-key') && errorMessage && (
          <div className={`call-error ${callState === 'error-no-key' ? 'call-error-key' : ''}`}>{errorMessage}</div>
        )}
      </div>

      <div className="call-controls">
        {listenSupported ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            className={`call-mic ${callState === 'listening' ? 'call-mic-active' : ''}`}
            disabled={callState === 'thinking' || callState === 'speaking'}
            onClick={callState === 'listening' ? stopListening : startListening}
            aria-label={callState === 'listening' ? 'Stop listening' : 'Start speaking'}
          >
            <Icon name={callState === 'listening' ? 'x' : 'volume'} size={26} strokeWidth={2} />
          </motion.button>
        ) : (
          <form className="call-type-form" onSubmit={handleTypedSubmit}>
            <input
              type="text"
              className="type-input"
              placeholder="Scrivi la tua risposta..."
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              disabled={callState === 'thinking' || callState === 'speaking'}
            />
            <motion.button whileTap={{ scale: 0.95 }} type="submit" className="btn-primary call-type-send" disabled={callState === 'thinking' || callState === 'speaking'}>
              Send
            </motion.button>
          </form>
        )}
      </div>
    </div>
  )
}
