import { FormattedText } from '../lib/format.jsx'
import { parseThinking } from '../lib/thinking'
import { ThinkingTrace } from './ThinkingTrace.jsx'
import { voiceOutputSupported, speak } from '../lib/speech'

export function MessageBubble({ message }) {
  const isUser = message.role === 'user'

  if (message.image) {
    return (
      <div className={`bubble-row ${isUser ? 'user' : 'assistant'}`}>
        <div className="bubble image-bubble">
          <img src={message.image.url} alt={message.image.prompt} loading="lazy" />
          <div className="image-caption">“{message.image.prompt}”</div>
        </div>
      </div>
    )
  }

  if (isUser) {
    return (
      <div className="bubble-row user">
        <div className="bubble">
          <FormattedText text={message.content} />
        </div>
      </div>
    )
  }

  const { thinking, answer, thinkingDone } = parseThinking(message.content)
  const showEmpty = !thinking && !answer && message.streaming

  return (
    <div className="bubble-row assistant">
      <div className="avatar" aria-hidden="true">
        W
      </div>
      <div className="bubble">
        <ThinkingTrace thinking={thinking} thinkingDone={thinkingDone} />
        {showEmpty ? (
          <span className="typing-dots">
            <span />
            <span />
            <span />
          </span>
        ) : (
          <>
            <FormattedText text={answer} />
            {!message.streaming && voiceOutputSupported && answer && (
              <button className="speak-btn" title="Read aloud" onClick={() => speak(answer)}>
                🔊
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
