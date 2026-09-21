// Minimal, dependency-free "markdown-lite" renderer for model output. Handles
// **bold**, `inline code`, and paragraph breaks as real React nodes (never
// dangerouslySetInnerHTML) so nothing the model says can inject markup.

function renderInline(line, keyPrefix) {
  const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={`${keyPrefix}-${i}`} className="inline-code">
          {part.slice(1, -1)}
        </code>
      )
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>
  })
}

export function FormattedText({ text }) {
  const paragraphs = text.split(/\n{2,}/)
  return (
    <>
      {paragraphs.map((para, pi) => (
        <p key={pi}>
          {para.split('\n').map((line, li, arr) => (
            <span key={li}>
              {renderInline(line, `${pi}-${li}`)}
              {li < arr.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </>
  )
}
