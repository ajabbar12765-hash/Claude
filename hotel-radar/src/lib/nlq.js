// Natural-language filter parser.
//
// Turns a phrase like "5 star hotel near Lake Como under 300 with a pool"
// into structured filter terms. Anything it recognises is removed from the
// string; whatever survives becomes a plain keyword match, so the box never
// silently drops what the user typed.

import { LANDMARKS, CITIES, AMENITIES, distanceKm } from './catalog.js'

const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
}

// Words that map onto amenity ids. Longest phrases first so "lake view" wins
// over a bare "lake".
const AMENITY_PHRASES = [
  ['lake view', 'lakeview'], ['lakeview', 'lakeview'], ['lake facing', 'lakeview'],
  ['sea view', 'seaview'], ['seaview', 'seaview'], ['ocean view', 'seaview'],
  ['beach front', 'beach'], ['beachfront', 'beach'], ['on the beach', 'beach'],
  ['swimming pool', 'pool'], ['infinity pool', 'pool'],
  ['pet friendly', 'petfriendly'], ['dog friendly', 'petfriendly'],
  ['family friendly', 'familyfriendly'], ['kid friendly', 'familyfriendly'],
  ['adults only', 'adultsonly'], ['child free', 'adultsonly'],
  ['free breakfast', 'breakfast'], ['with breakfast', 'breakfast'],
  ['air conditioning', 'aircon'], ['air con', 'aircon'], ['ac', 'aircon'],
  ['ev charging', 'ev'], ['electric car', 'ev'],
  ['car park', 'parking'], ['free parking', 'parking'],
  ['rooftop bar', 'rooftop'], ['roof terrace', 'rooftop'],
  ['fitness', 'gym'], ['wi-fi', 'wifi'], ['wifi', 'wifi'],
  ...AMENITIES.map((a) => [a.label.toLowerCase(), a.id]),
  ...AMENITIES.map((a) => [a.id, a.id]),
]

// Filler that carries no filtering meaning once the structure is extracted.
const STOPWORDS = new Set([
  'a', 'an', 'the', 'hotel', 'hotels', 'stay', 'stays', 'place', 'places',
  'room', 'rooms', 'find', 'show', 'me', 'want', 'looking', 'for', 'somewhere',
  'something', 'with', 'and', 'or', 'that', 'has', 'have', 'is', 'are', 'to',
  'i', 'my', 'we', 'need', 'please', 'any', 'good', 'nice', 'star', 'stars',
  'night', 'nights', 'per', 'euro', 'euros', 'eur', 'usd', 'gbp',
  'cheap', 'cheapest', 'budget', 'affordable', 'bargain', 'deal', 'deals',
  'best', 'top', 'great', 'value', 'discount', 'discounted', 'offer', 'offers',
])

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripAccents(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// Whole-word containment. Raw substring matching let a short alias match
// inside an unrelated word — the airport code "isb" matched L-isb-on, so
// "3-star in Lisbon" resolved to Islamabad. Every short alias has that
// failure mode, so the check has to be about words, not characters.
function containsPhrase(hay, needle) {
  if (!needle) return false
  return new RegExp(`(^|[^a-z0-9])${escapeRe(needle)}([^a-z0-9]|$)`).test(hay)
}

function norm(s) {
  return stripAccents(String(s || '').toLowerCase()).replace(/[’']/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * @returns {{
 *   raw: string, landmark: object|null, radiusKm: number|null, city: object|null,
 *   minStars: number|null, maxPrice: number|null, minPrice: number|null,
 *   amenities: string[], keywords: string[], notes: string[]
 * }}
 */
export function parseQuery(raw) {
  const result = {
    raw: raw || '',
    landmark: null,
    radiusKm: null,
    city: null,
    minStars: null,
    maxPrice: null,
    minPrice: null,
    amenities: [],
    keywords: [],
    notes: [],
  }
  let text = norm(raw)
  if (!text) return result

  const consume = (phrase) => {
    const re = new RegExp(`(^|\\s)${escapeRe(phrase)}(?=\\s|$)`, 'g')
    text = text.replace(re, ' ')
  }

  // ---- price ------------------------------------------------------------
  // "between 100 and 200" / "100-200"
  const between = text.match(/(?:between\s+)?[€$£]?\s*(\d{2,5})\s*(?:-|–|to|and)\s*[€$£]?\s*(\d{2,5})/)
  if (between) {
    result.minPrice = Math.min(+between[1], +between[2])
    result.maxPrice = Math.max(+between[1], +between[2])
    text = text.replace(between[0], ' ')
  }
  if (result.maxPrice == null) {
    const under = text.match(/(?:under|below|less than|cheaper than|max|maximum|up to|no more than|within)\s*[€$£]?\s*(\d{2,5})/)
    if (under) {
      result.maxPrice = +under[1]
      text = text.replace(under[0], ' ')
    }
  }
  if (result.minPrice == null) {
    const over = text.match(/(?:over|above|more than|at least|from)\s*[€$£]?\s*(\d{2,5})/)
    if (over) {
      result.minPrice = +over[1]
      text = text.replace(over[0], ' ')
    }
  }
  if (result.maxPrice == null) {
    // A bare currency amount reads as a ceiling: "hotel in Rome €150".
    const bare = text.match(/[€$£]\s*(\d{2,5})/)
    if (bare) {
      result.maxPrice = +bare[1]
      text = text.replace(bare[0], ' ')
    }
  }

  // ---- stars ------------------------------------------------------------
  const starMatch = text.match(/\b(\d|one|two|three|four|five)\s*(?:\*|star|stars|-star)/)
  if (starMatch) {
    const n = NUMBER_WORDS[starMatch[1]] ?? +starMatch[1]
    if (n >= 1 && n <= 5) result.minStars = n
    text = text.replace(starMatch[0], ' ')
  } else {
    const glyph = text.match(/\b([1-5])\s*\*/)
    if (glyph) {
      result.minStars = +glyph[1]
      text = text.replace(glyph[0], ' ')
    }
  }
  if (/\b(luxury|luxurious|five star|high end|upscale)\b/.test(text) && result.minStars == null) {
    result.minStars = 5
    text = text.replace(/\b(luxury|luxurious|five star|high end|upscale)\b/g, ' ')
  }

  // ---- radius -----------------------------------------------------------
  const radius = text.match(
    /within\s*(\d{1,3})\s*(kilometres|kilometers|kilometre|kilometer|miles|mile|km|mi)\b/
  )
  if (radius) {
    const value = +radius[1]
    result.radiusKm = /mi/.test(radius[2]) ? value * 1.609 : value
    text = text.replace(radius[0], ' ')
  }
  if (/\b(walking distance|walkable|walk to|steps from|right next to)\b/.test(text)) {
    result.radiusKm = result.radiusKm ?? 1.2
    text = text.replace(/\b(walking distance|walkable|walk to|steps from|right next to)\b/g, ' ')
  }

  // City detection reads this snapshot, taken before the landmark pass
  // consumes its match — otherwise "in Lake Como" loses the city entirely.
  const textBeforeLandmark = text

  // ---- landmark ("near X") ---------------------------------------------
  // Prefer an explicit proximity phrase, but still match a bare landmark name.
  const nearPhrase = text.match(/\b(?:near|nearby|close to|next to|by|beside|around|overlooking|on)\s+(?:the\s+)?([a-z0-9\s'-]{3,40})/)
  const candidates = LANDMARKS.map((l) => ({
    landmark: l,
    names: [norm(l.name), ...l.aliases.map(norm)],
  }))

  const findLandmark = (hay) => {
    let best = null
    for (const c of candidates) {
      for (const n of c.names) {
        if (!n) continue
        if (containsPhrase(hay, n) && (!best || n.length > best.matched.length)) {
          best = { landmark: c.landmark, matched: n }
        }
      }
    }
    return best
  }

  // Only the landmark name itself is consumed, never the whole tail of the
  // phrase — "near Lake Como with a pool" must still yield the pool.
  let landmarkHit = nearPhrase ? findLandmark(nearPhrase[1]) : null
  if (landmarkHit) result.radiusKm = result.radiusKm ?? 8
  else landmarkHit = findLandmark(text)
  if (landmarkHit) {
    result.landmark = landmarkHit.landmark
    consume(landmarkHit.matched)
  }

  // strip a dangling proximity word left behind
  text = text.replace(/\b(near|nearby|close to|next to|beside|around|overlooking)\b/g, ' ')

  // ---- city ("in X") ----------------------------------------------------
  // A phrase can name more than one place ("near Lake Como in Milan"), so
  // collect every match, longest name first, and reconcile against the
  // landmark rather than taking the first hit.
  const cityMatches = CITIES.filter((c) => containsPhrase(textBeforeLandmark, norm(c.city))).sort(
    (a, b) => norm(b.city).length - norm(a.city).length
  )

  if (result.landmark) {
    // A city that contains the landmark is consistent; keep it. A city
    // somewhere else is a mental shortcut — the landmark wins, and we say
    // why rather than silently returning nothing.
    result.city = cityMatches.find((c) => c.id === result.landmark.destinationId) ?? null
    const elsewhere = cityMatches.find((c) => c.id !== result.landmark.destinationId)
    if (elsewhere) {
      const km = Math.round(distanceKm(result.landmark, elsewhere))
      result.notes.push(
        `${result.landmark.name} is about ${km} km from ${elsewhere.city}. Showing stays near ${result.landmark.name} — clear the search text to look in ${elsewhere.city} instead.`
      )
    }
  } else {
    result.city = cityMatches[0] ?? null
  }

  // Every place name mentioned is accounted for, so none should survive as
  // a keyword.
  for (const c of cityMatches) consume(norm(c.city))
  text = text.replace(/\b(in|at)\b/g, ' ')

  // ---- amenities --------------------------------------------------------
  for (const [phrase, id] of AMENITY_PHRASES) {
    const p = norm(phrase)
    if (!p) continue
    const re = new RegExp(`(^|\\s)${escapeRe(p)}(?=\\s|$)`)
    if (re.test(text)) {
      if (!result.amenities.includes(id)) result.amenities.push(id)
      consume(p)
    }
  }

  // ---- leftovers --------------------------------------------------------
  result.keywords = text
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))

  return result
}

/** Human-readable chips describing what the parser understood. */
export function describeQuery(q) {
  const chips = []
  if (q.landmark) {
    chips.push({
      key: 'landmark',
      icon: '📍',
      label: q.radiusKm ? `within ${Math.round(q.radiusKm)} km of ${q.landmark.name}` : `near ${q.landmark.name}`,
    })
  }
  if (q.city) chips.push({ key: 'city', icon: '🏙️', label: q.city.city })
  if (q.minStars) chips.push({ key: 'stars', icon: '⭐', label: `${q.minStars}+ stars` })
  if (q.minPrice != null && q.maxPrice != null) {
    chips.push({ key: 'price', icon: '💶', label: `${q.minPrice}–${q.maxPrice} / night` })
  } else if (q.maxPrice != null) {
    chips.push({ key: 'price', icon: '💶', label: `under ${q.maxPrice} / night` })
  } else if (q.minPrice != null) {
    chips.push({ key: 'price', icon: '💶', label: `over ${q.minPrice} / night` })
  }
  for (const a of q.amenities) chips.push({ key: `am-${a}`, icon: '✓', label: a })
  for (const k of q.keywords) chips.push({ key: `kw-${k}`, icon: '🔎', label: `"${k}"` })
  return chips
}
