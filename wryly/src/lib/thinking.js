// Splits a raw streamed reply into its <thinking>...</thinking> scratch work
// and the real answer that follows it, working correctly mid-stream (before
// the closing tag has even arrived yet).

const OPEN = '<thinking>'
const CLOSE = '</thinking>'

export function parseThinking(text) {
  const openIdx = text.indexOf(OPEN)
  if (openIdx === -1) {
    return { thinking: '', answer: text, thinkingDone: true }
  }
  const afterOpen = text.slice(openIdx + OPEN.length)
  const closeIdx = afterOpen.indexOf(CLOSE)
  if (closeIdx === -1) {
    return { thinking: afterOpen, answer: '', thinkingDone: false }
  }
  return {
    thinking: afterOpen.slice(0, closeIdx),
    answer: afterOpen.slice(closeIdx + CLOSE.length).trimStart(),
    thinkingDone: true,
  }
}
