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

export function shuffle(array) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
