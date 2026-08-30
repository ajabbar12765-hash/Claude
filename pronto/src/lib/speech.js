// Thin wrapper around the browser's built-in speech APIs — synthesis (TTS)
// for listening exercises and Volpe's spoken replies, recognition (STT) for
// the voice call feature. Zero API keys, zero backend, for the audio layer.

let cachedItalianVoice
let voicesLoaded = false

function pickItalianVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return undefined
  const voices = window.speechSynthesis.getVoices()
  if (voices.length) voicesLoaded = true
  const italian = voices.filter((v) => v.lang?.toLowerCase().startsWith('it'))
  if (!italian.length) return undefined // no Italian voice at all — better to let the engine pick its own default than force the wrong language
  // Cloud/network voices are consistently far clearer than the low-quality
  // local ones some platforms ship by default; prefer them, and prefer an
  // exact it-IT locale over regional variants like it-CH.
  const score = (v) => (v.localService ? 0 : 2) + (v.lang?.toLowerCase() === 'it-it' ? 1 : 0)
  return [...italian].sort((a, b) => score(b) - score(a))[0]
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedItalianVoice = pickItalianVoice()
  }
}

export function canSpeak() {
  return typeof window !== 'undefined' && !!window.speechSynthesis
}

export function speakItalian(text, { rate = 0.88, onStart, onEnd } = {}) {
  if (!canSpeak()) return false
  const synth = window.speechSynthesis
  synth.cancel() // stop anything already playing
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'it-IT'
  utterance.rate = rate
  utterance.pitch = 1
  if (!voicesLoaded) cachedItalianVoice = pickItalianVoice()
  if (cachedItalianVoice) utterance.voice = cachedItalianVoice
  if (onStart) utterance.onstart = onStart

  let settled = false
  let safetyTimer
  const settle = () => {
    if (settled) return
    settled = true
    clearTimeout(safetyTimer)
    onEnd?.()
  }
  utterance.onend = settle
  utterance.onerror = settle
  // Some browsers never fire `end` at all — mobile Safari/Chrome silently
  // dropping speech that wasn't started from a direct tap, or Chrome's
  // long-standing bug where a playing utterance's `end` event just never
  // arrives. Any caller gating UI (like a disabled mic button) on onEnd
  // would otherwise be stuck forever, so force it after a generous,
  // length-scaled timeout.
  safetyTimer = setTimeout(settle, Math.max(2500, text.length * 90))

  synth.speak(utterance)
  return true
}

export function canListen() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

// Safari/WebKit (desktop Safari, and *everything* on iOS/iPadOS, since Apple
// forces every browser there onto WebKit) technically exposes
// webkitSpeechRecognition, but the implementation is well known to be
// unreliable in practice — it can silently end with no result and no error
// after a permission prompt or a moment of ambient noise, which reads to a
// user as "the mic just isn't picking me up." Our own MediaRecorder-based
// fallback (record raw audio, transcribe server-side with Gemini) is more
// predictable and gives us actual error visibility, so we prefer it on
// WebKit even when the native API is technically present. iPadOS Safari
// spoofs a desktop Mac user-agent by default, so UA sniffing alone isn't
// enough — the maxTouchPoints check catches that case too.
export function isAppleWebKit() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isDesktopSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua)
  return isIOSDevice || isDesktopSafari
}

// Starts one round of speech-to-text and returns the recognizer so the
// caller can cancel it early. Fires exactly one of onResult/onError, then
// onEnd. If recognition ends without ever firing a result or an error
// (a real, silent failure mode on some browsers when it just doesn't catch
// anything), this synthesizes an onError('no-match') so the caller always
// gets a chance to tell the user something rather than going quiet.
export function listenOnce({ lang = 'it-IT', onResult, onError, onEnd } = {}) {
  if (!canListen()) return null
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const recognition = new SpeechRecognition()
  recognition.lang = lang
  recognition.interimResults = false
  recognition.maxAlternatives = 1
  let settled = false
  recognition.onresult = (event) => {
    settled = true
    const transcript = event.results[0][0].transcript
    onResult?.(transcript)
  }
  recognition.onerror = (event) => {
    settled = true
    onError?.(event.error)
  }
  recognition.onend = () => {
    if (!settled) onError?.('no-match')
    onEnd?.()
  }
  recognition.start()
  return recognition
}

// Fallback for platforms with no SpeechRecognition (Safari/iOS never
// shipped it): record raw audio instead and let the server-side model
// transcribe it directly.
export function canRecordAudio() {
  return typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined'
}

// Browsers can only encode to the container formats they actually
// implement (Safari: mp4/AAC, Chrome/Firefox: webm/opus) — there's no way
// to produce Gemini's most-documented formats (wav/mp3/aac/flac as bare
// files) from MediaRecorder without a client-side transcoder, so this list
// is "best available per browser," not "Gemini's preferred list." The
// server side treats a suspiciously short transcript as a possible format
// hiccup rather than trusting it blindly — see api/converse.js.
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
