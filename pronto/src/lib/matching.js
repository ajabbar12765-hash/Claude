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

// Same matching as speechMatchRatio, but keeps which target words were
// actually heard — used by the Shadow exercise to show the learner exactly
// which words landed and which didn't, instead of a single opaque score.
export function speechMatchDetails(transcript, target) {
  const heard = normalize(transcript).split(' ').filter(Boolean)
  const wanted = normalize(target).split(' ').filter(Boolean)
  const targetWords = target.split(' ').filter(Boolean)
  if (!wanted.length) return { ratio: 0, words: [] }
  const remainingHeard = [...heard]
  let matches = 0
  const words = targetWords.map((displayWord, i) => {
    const normalized = wanted[i]
    const idx = remainingHeard.indexOf(normalized)
    if (idx !== -1) {
      matches += 1
      remainingHeard.splice(idx, 1)
      return { word: displayWord, matched: true }
    }
    return { word: displayWord, matched: false }
  })
  return { ratio: matches / wanted.length, words }
}

export function shuffle(array) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// The same fixed 3-4 wrong answers, hand-authored once per item, keep
// reappearing verbatim every time that item comes up — shuffled into a new
// order, but a learner quickly starts recognizing the *set* itself rather
// than actually evaluating the current prompt. Mixing in a couple of
// randomly-drawn extra distractors from the learner's own known vocabulary
// (a different combination on every attempt) breaks that memorized shape
// without touching the hand-picked, plausible-confusion distractors that
// make the exercise meaningful — and a bigger option grid is a little
// harder to blitz through than a fixed 4.
export function expandOptions(correctAnswer, authoredOptions, pool, { max = 6 } = {}) {
  const known = new Set(authoredOptions)
  const extraCandidates = shuffle((pool || []).filter((v) => v && !known.has(v)))
  // Only bother if there's enough real variety to draw from — a handful of
  // extra candidates would just make the same two or three items rotate in
  // and out, which is the same staleness problem in a different shape.
  if (extraCandidates.length < 4) return shuffle(authoredOptions)
  const room = Math.max(0, max - authoredOptions.length)
  const extraCount = Math.min(room, 1 + Math.floor(Math.random() * Math.min(2, room)))
  return shuffle([...authoredOptions, ...extraCandidates.slice(0, extraCount)])
}
