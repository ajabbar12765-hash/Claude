import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api.js'

const STARTERS = [
  'How was my week overall?',
  'Is my sleep good enough?',
  'Give me a step goal for tomorrow.',
  'How is my resting heart rate trending?',
]

export default function Coach() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    api.chatHistory().then((r) => setMessages(r.messages || [])).catch(() => {})
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  async function send(text) {
    const message = (text ?? input).trim()
    if (!message || sending) return
    setError('')
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: message, at: new Date().toISOString() }])
    setSending(true)
    try {
      const { reply } = await api.chat(message)
      setMessages((m) => [...m, { role: 'assistant', content: reply, at: new Date().toISOString() }])
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  async function clear() {
    await api.clearChat().catch(() => {})
    setMessages([])
  }

  return (
    <div className="coach">
      <div className="coach-head">
        <h1>AI Coach</h1>
        {messages.length > 0 && (
          <button className="link-btn" onClick={clear}>Clear conversation</button>
        )}
      </div>

      <div className="coach-thread" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="coach-empty">
            <p>Ask me anything about your steps, heart rate, sleep, stress, or workouts.</p>
            <div className="coach-starters">
              {STARTERS.map((s) => (
                <button key={s} onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`coach-msg ${m.role}`}>
            <div className="coach-msg-bubble">{m.content}</div>
          </div>
        ))}
        {sending && (
          <div className="coach-msg assistant">
            <div className="coach-msg-bubble coach-typing">
              <span /><span /><span />
            </div>
          </div>
        )}
      </div>

      {error && <div className="coach-error">{error}</div>}

      <form
        className="coach-input"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message your coach…"
        />
        <button type="submit" disabled={sending || !input.trim()}>Send</button>
      </form>
    </div>
  )
}
