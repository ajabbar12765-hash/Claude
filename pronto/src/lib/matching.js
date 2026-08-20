// Answer-checking helpers shared by the exercise components.

const COMBINING_ACCENTS = new RegExp('[\\u0300-\\u036f]', 'g')
const APOSTROPHES = /[’'`]/g
const NON_ALPHANUMERIC = /[^a-z0-9\s]/g

export function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_ACCENTS, '') // strip accents (e.g. è -> e, à -> a)
    .replace(APOSTROPHES, '') // apostrophes are elision, not meaning-bearing
    .replace(NON_ALPHANUMERIC, '') // strip remaining punctuation
    .replace(/\s+/g, ' ')
    .trim()
}

export function isAcceptableAnswer(userInput, italianAnswer, acceptVariants = []) {
  const normalizedInput = normalize(userInput)
  if (!normalizedInput) return false
  const candidates = [italianAnswer, ...acceptVariants].map(normalize)
  return candidates.includes(normalizedInput)
}

// How much of the target phrase shows up in a speech-recognition transcript,
// as a 0-1 ratio of target words matched (order-independent, since STT can
// reorder or mishear small function words). Lenient by design — this is
// pronunciation practice, not a spelling test.
export function speechMatchRatio(transcript, target) {
  const heard = normalize(transcript).split(' ').filter(Boolean)
  const wanted = normalize(target).split(' ').filter(Boolean)
  if (!wanted.length) return 0
  const remaining = [...wanted]
  let matches = 0
  for (const word of heard) {
    const idx = remaining.indexOf(word)
    if (idx !== -1) {
      matches += 1
      remaining.splice(idx, 1)
    }
  }
  return matches / wanted.length
}

export function shuffle(array) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
