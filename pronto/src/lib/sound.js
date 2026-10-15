// Tiny synthesized sound effects — no audio files, just short oscillator
// tones via the Web Audio API. Zero network weight, zero licensing to
// worry about, and it means the app finally has audio feedback at all.

const SOUND_KEY = 'pronto:sound:v1'
let ctx

function getCtx() {
  if (typeof window === 'undefined') return null
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return null
  if (!ctx) ctx = new AudioContextClass()
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

export function isSoundEnabled() {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(SOUND_KEY) !== '0'
  } catch {
    return true
  }
}

export function setSoundEnabled(enabled) {
  try {
    window.localStorage.setItem(SOUND_KEY, enabled ? '1' : '0')
  } catch {
    // localStorage unavailable — preference just won't persist
  }
}

// Schedules one short tone. `delay`/`duration` in seconds, relative to now.
function tone(freq, { delay = 0, duration = 0.14, type = 'sine', gain = 0.16 } = {}) {
  const audioCtx = getCtx()
  if (!audioCtx) return
  const osc = audioCtx.createOscillator()
  const env = audioCtx.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t0 = audioCtx.currentTime + delay
  env.gain.setValueAtTime(0, t0)
  env.gain.linearRampToValueAtTime(gain, t0 + 0.012)
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(env)
  env.connect(audioCtx.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

function play(fn) {
  if (!isSoundEnabled()) return
  try {
    fn()
  } catch {
    // audio can fail silently (autoplay policy, no AudioContext) — never block the UI for it
  }
}

export const playCorrect = () =>
  play(() => {
    tone(660, { type: 'sine', gain: 0.14 })
    tone(880, { delay: 0.08, type: 'sine', gain: 0.16 })
  })

export const playIncorrect = () =>
  play(() => {
    tone(220, { type: 'triangle', duration: 0.2, gain: 0.12 })
  })

export const playCombo = () =>
  play(() => {
    tone(784, { type: 'sine', gain: 0.13 })
    tone(988, { delay: 0.07, type: 'sine', gain: 0.14 })
    tone(1175, { delay: 0.14, type: 'sine', gain: 0.15 })
  })

export const playComplete = () =>
  play(() => {
    tone(523, { type: 'sine', gain: 0.14 })
    tone(659, { delay: 0.1, type: 'sine', gain: 0.15 })
    tone(784, { delay: 0.2, type: 'sine', gain: 0.16 })
    tone(1047, { delay: 0.32, duration: 0.3, type: 'sine', gain: 0.18 })
  })

export const playFail = () =>
  play(() => {
    tone(392, { type: 'triangle', duration: 0.18, gain: 0.14 })
    tone(311, { delay: 0.14, type: 'triangle', duration: 0.28, gain: 0.14 })
  })

export const playLevelUp = () =>
  play(() => {
    tone(523, { type: 'square', duration: 0.1, gain: 0.1 })
    tone(659, { delay: 0.09, type: 'square', duration: 0.1, gain: 0.1 })
    tone(784, { delay: 0.18, type: 'square', duration: 0.1, gain: 0.1 })
    tone(1047, { delay: 0.27, duration: 0.35, type: 'sine', gain: 0.18 })
  })

export const playAchievement = () =>
  play(() => {
    tone(587, { type: 'sine', gain: 0.13 })
    tone(880, { delay: 0.09, duration: 0.28, type: 'sine', gain: 0.16 })
  })
