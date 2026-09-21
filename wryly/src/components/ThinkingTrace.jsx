import { useState } from 'react'

export function ThinkingTrace({ thinking, thinkingDone }) {
  const [open, setOpen] = useState(false)
  if (!thinking) return null

  return (
    <div className={`thinking-trace ${open ? 'open' : ''}`}>
      <button className="thinking-toggle" onClick={() => setOpen((o) => !o)}>
        <span className={`think-dot ${thinkingDone ? '' : 'pulsing'}`} />
        {thinkingDone ? 'Reasoning' : 'Thinking…'}
        <span className="chevron">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="thinking-body">{thinking}</div>}
    </div>
  )
}
