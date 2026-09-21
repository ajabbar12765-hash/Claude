import { useRef, useState } from 'react'
import { SLASH_COMMANDS } from '../lib/commands'
import { voiceInputSupported, listenOnce } from '../lib/speech'
import { AgentPicker } from './AgentPicker.jsx'

export function Composer({ onSubmit, disabled, onStop, agent, onAgentChange }) {
  const [value, setValue] = useState('')
  const [listening, setListening] = useState(false)
  const stopListenRef = useRef(null)
  const textareaRef = useRef(null)

  const showSuggestions = value.startsWith('/') && !value.includes(' ')
  const suggestions = showSuggestions
    ? SLASH_COMMANDS.filter((c) => c.cmd.startsWith(value.toLowerCase()))
    : []

  function submit() {
    const text = value.trim()
    if (!text || disabled) return
    onSubmit(text)
    setValue('')
    textareaRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function toggleMic() {
    if (listening) {
      stopListenRef.current?.()
      setListening(false)
      return
    }
    setListening(true)
    stopListenRef.current = listenOnce({
      onResult: (transcript) => setValue((v) => (v ? `${v} ${transcript}` : transcript)),
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    })
  }

  return (
    <div className="composer">
      {suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map((s) => (
            <button key={s.cmd} onClick={() => setValue(s.cmd + ' ')} type="button">
              <span className="cmd">{s.cmd}</span>
              <span className="hint">{s.hint}</span>
            </button>
          ))}
        </div>
      )}
      <div className="composer-row">
        <AgentPicker value={agent} onChange={onAgentChange} />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Wryly anything. Try /help for commands…"
          rows={1}
        />
        {voiceInputSupported && (
          <button
            type="button"
            className={`icon-btn mic ${listening ? 'active' : ''}`}
            onClick={toggleMic}
            title="Voice input"
          >
            {listening ? '●' : '🎙'}
          </button>
        )}
        {disabled ? (
          <button type="button" className="icon-btn stop" onClick={onStop} title="Stop">
            ■
          </button>
        ) : (
          <button type="button" className="icon-btn send" onClick={submit} title="Send" disabled={!value.trim()}>
            ➤
          </button>
        )}
      </div>
    </div>
  )
}
