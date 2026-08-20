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

// Fallback for platforms with no SpeechRecognition (Safari/iOS never
// shipped it): record raw audio instead and let the server-side model
// transcribe it directly.
export function canRecordAudio() {
  return typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined'
}

const AUDIO_MIME_CANDIDATES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']

export async function startAudioRecording() {
  if (!canRecordAudio()) throw new Error('audio-recording-unsupported')
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mimeType = AUDIO_MIME_CANDIDATES.find((t) => window.MediaRecorder.isTypeSupported?.(t)) || ''
  const recorder = new window.MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  const chunks = []
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }
  recorder.start()

  function cleanup() {
    stream.getTracks().forEach((t) => t.stop())
  }

  return {
    mimeType: recorder.mimeType || mimeType || 'audio/webm',
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = () => {
          cleanup()
          resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' }))
        }
        recorder.stop()
      }),
    cancel: () => {
      recorder.onstop = cleanup
      recorder.stop()
    },
  }
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
