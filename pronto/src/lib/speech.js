// Thin wrapper around the browser's built-in speech APIs — synthesis (TTS)
// for listening exercises and Volpe's spoken replies, recognition (STT) for
// the voice call feature. Zero API keys, zero backend, for the audio layer.

let cachedItalianVoice
let voicesLoaded = false

function pickItalianVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return undefined
  const voices = window.speechSynthesis.getVoices()
  if (voices.length) voicesLoaded = true
  return voices.find((v) => v.lang?.toLowerCase().startsWith('it')) || voices[0]
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedItalianVoice = pickItalianVoice()
  }
}

export function canSpeak() {
  return typeof window !== 'undefined' && !!window.speechSynthesis
}

export function speakItalian(text, { rate = 0.92, onStart, onEnd } = {}) {
  if (!canSpeak()) return false
  const synth = window.speechSynthesis
  synth.cancel() // stop anything already playing
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'it-IT'
  utterance.rate = rate
  if (!voicesLoaded) cachedItalianVoice = pickItalianVoice()
  if (cachedItalianVoice) utterance.voice = cachedItalianVoice
  if (onStart) utterance.onstart = onStart
  if (onEnd) utterance.onend = onEnd
  synth.speak(utterance)
  return true
}

export function canListen() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

// Starts one round of speech-to-text and returns the recognizer so the
// caller can cancel it early. Fires exactly one of onResult/onError, then onEnd.
export function listenOnce({ lang = 'it-IT', onResult, onError, onEnd } = {}) {
  if (!canListen()) return null
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const recognition = new SpeechRecognition()
  recognition.lang = lang
  recognition.interimResults = false
  recognition.maxAlternatives = 1
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript
    onResult?.(transcript)
  }
  recognition.onerror = (event) => onError?.(event.error)
  recognition.onend = () => onEnd?.()
  recognition.start()
  return recognition
}
