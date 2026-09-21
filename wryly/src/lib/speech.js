// Thin wrapper around the browser's built-in Web Speech API. Fully free and
// client-side — no API key, no server round trip. Not every browser supports
// it, so every export degrades to a no-op / false when it doesn't.

const SpeechRecognitionImpl =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

export const voiceInputSupported = Boolean(SpeechRecognitionImpl)
export const voiceOutputSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

export function listenOnce({ onResult, onEnd, onError }) {
  if (!SpeechRecognitionImpl) {
    onError?.('Voice input is not supported in this browser.')
    return () => {}
  }
  const recognizer = new SpeechRecognitionImpl()
  recognizer.lang = navigator.language || 'en-US'
  recognizer.interimResults = false
  recognizer.maxAlternatives = 1

  recognizer.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript ?? ''
    onResult?.(transcript)
  }
  recognizer.onerror = (event) => onError?.(event.error || 'Voice input failed.')
  recognizer.onend = () => onEnd?.()

  recognizer.start()
  return () => recognizer.stop()
}

export function speak(text) {
  if (!voiceOutputSupported || !text) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 1.05
  utterance.pitch = 1
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking() {
  if (voiceOutputSupported) window.speechSynthesis.cancel()
}
