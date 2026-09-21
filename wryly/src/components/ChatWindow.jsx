import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble.jsx'
import { randomQuip } from '../lib/quips'

export function ChatWindow({ messages }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, messages[messages.length - 1]?.content])

  if (messages.length === 0) {
    return (
      <div className="chat-window empty">
        <div className="empty-state">
          <div className="empty-mark">W</div>
          <h1>Wryly</h1>
          <p>{randomQuip()}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-window">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      <div ref={endRef} />
    </div>
  )
}
