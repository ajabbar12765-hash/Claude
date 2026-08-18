// Thin wrapper around the browser's built-in speech synthesis so
// listening exercises work with zero API keys / zero backend.

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

export function speakItalian(text, { rate = 0.92 } = {}) {
  if (!canSpeak()) return false
  const synth = window.speechSynthesis
  synth.cancel() // stop anything already playing
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'it-IT'
  utterance.rate = rate
  if (!voicesLoaded) cachedItalianVoice = pickItalianVoice()
  if (cachedItalianVoice) utterance.voice = cachedItalianVoice
  synth.speak(utterance)
  return true
}
