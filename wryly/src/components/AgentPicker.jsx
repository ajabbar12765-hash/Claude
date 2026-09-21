import { useState, useRef, useEffect } from 'react'
import { AGENTS, AGENTS_BY_ID } from '../lib/agents'

export function AgentPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = AGENTS_BY_ID[value]

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <div className="agent-picker" ref={ref}>
      <button
        type="button"
        className="agent-chip"
        style={current ? { borderColor: current.color, color: current.color } : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="agent-dot" style={{ background: current?.color ?? '#8b8fa3' }} />
        <span className="agent-chip-label">{current ? current.name : 'Auto'}</span>
      </button>

      {open && (
        <div className="agent-menu">
          <button
            type="button"
            className={`agent-option ${value === 'auto' ? 'selected' : ''}`}
            onClick={() => {
              onChange('auto')
              setOpen(false)
            }}
          >
            <span className="agent-dot" style={{ background: '#8b8fa3' }} />
            <div>
              <div className="agent-option-name">Auto</div>
              <div className="agent-option-blurb">Wryly picks the right specialist</div>
            </div>
          </button>
          {AGENTS.map((a) => (
            <button
              type="button"
              key={a.id}
              className={`agent-option ${value === a.id ? 'selected' : ''}`}
              onClick={() => {
                onChange(a.id)
                setOpen(false)
              }}
            >
              <span className="agent-dot" style={{ background: a.color }} />
              <div>
                <div className="agent-option-name">{a.name}</div>
                <div className="agent-option-blurb">{a.blurb}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
