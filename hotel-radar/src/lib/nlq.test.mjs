// Filter-box test suite. Run with: node src/lib/nlq.test.mjs
//
// Each case asserts what the parser must extract from a phrase, and that the
// phrase actually returns hotels once the filters are applied. A query that
// parses perfectly but matches nothing is still a broken filter box.

import { parseQuery } from './nlq.js'
import { buildDeals, DEFAULT_FILTERS } from './filters.js'
import { scan } from './providers/simulated.js'

const offers = scan({ checkIn: '2026-09-10', checkOut: '2026-09-13', adults: 2, rooms: 1 })

let pass = 0
const failures = []

function check(query, expect, { minResults = 1, budget = 2000 } = {}) {
  const q = parseQuery(query)
  const problems = []

  const got = {
    landmark: q.landmark?.name ?? null,
    city: q.city?.city ?? null,
    stars: q.minStars,
    maxPrice: q.maxPrice,
    minPrice: q.minPrice,
    amenities: [...q.amenities].sort(),
    keywords: [...q.keywords].sort(),
    radius: q.radiusKm == null ? null : Math.round(q.radiusKm),
  }

  for (const [key, want] of Object.entries(expect)) {
    const actual = got[key]
    const same = Array.isArray(want)
      ? JSON.stringify([...want].sort()) === JSON.stringify(actual)
      : want === actual
    if (!same) problems.push(`${key}: expected ${JSON.stringify(want)}, got ${JSON.stringify(actual)}`)
  }

  const { deals } = buildDeals(offers, { ...DEFAULT_FILTERS, query, budget })
  if (deals.length < minResults) {
    problems.push(`expected >= ${minResults} results, got ${deals.length}`)
  }

  if (problems.length) failures.push({ query, problems })
  else pass++
}

// ---- landmarks ----------------------------------------------------------
check('a hotel near Lake Como', { landmark: 'Lake Como', radius: 8 })
check('near lake como', { landmark: 'Lake Como' })
check('hotels by the Trevi Fountain', { landmark: 'Trevi Fountain' })
check('somewhere close to the Colosseum', { landmark: 'Colosseum' })
check('overlooking the Grand Canal', { landmark: 'Grand Canal' })
check('next to Sagrada Familia', { landmark: 'Sagrada Família' })
check('near the Sagrada Família', { landmark: 'Sagrada Família' }) // accents
check('stay near St Marks Square', { landmark: "St Mark's Square" }) // apostrophe
check('near the duomo in milan', { landmark: 'Duomo di Milano', city: 'Milan' })
check('hotel near Park Guell', { landmark: 'Park Güell' })
check('near Burj Khalifa', { landmark: 'Burj Khalifa' })
check('somewhere near Montmartre', { landmark: 'Montmartre' })

// ---- radius -------------------------------------------------------------
check('walking distance to the Colosseum', { landmark: 'Colosseum', radius: 1 })
check('within 3 km of the Duomo di Milano', { landmark: 'Duomo di Milano', radius: 3 })
check('within 2 miles of Hyde Park', { landmark: 'Hyde Park', radius: 3 })

// ---- cities -------------------------------------------------------------
check('hotels in Milan', { city: 'Milan' })
check('a place in Rome', { city: 'Rome' })
check('somewhere in Amsterdam', { city: 'Amsterdam' })
check('Santorini', { city: 'Santorini' })
check('stay in Lake Como', { city: 'Lake Como' })

// ---- stars --------------------------------------------------------------
check('5 star hotel in Milan', { stars: 5, city: 'Milan' })
check('5* in Rome', { stars: 5, city: 'Rome' })
check('five star in Paris', { stars: 5, city: 'Paris' })
check('four star hotel in Venice', { stars: 4, city: 'Venice' })
check('a luxury hotel in Dubai', { stars: 5, city: 'Dubai' })
check('3-star in Lisbon', { stars: 3, city: 'Lisbon' })

// ---- price --------------------------------------------------------------
check('hotel in Rome under 200', { city: 'Rome', maxPrice: 200 })
check('in Milan below €150', { city: 'Milan', maxPrice: 150 })
check('Rome less than 300', { city: 'Rome', maxPrice: 300 })
check('a hotel in Paris max 250', { city: 'Paris', maxPrice: 250 })
check('London no more than 180', { city: 'London', maxPrice: 180 })
check('Barcelona between 80 and 150', { city: 'Barcelona', minPrice: 80, maxPrice: 150 })
check('Rome 100-200', { city: 'Rome', minPrice: 100, maxPrice: 200 })
check('Venice over 400', { city: 'Venice', minPrice: 400 })
check('hotel in Lisbon €120', { city: 'Lisbon', maxPrice: 120 })

// ---- amenities ----------------------------------------------------------
check('hotel in Barcelona with a pool', { city: 'Barcelona', amenities: ['pool'] })
check('spa in Santorini', { city: 'Santorini', amenities: ['spa'] })
check('rooftop pool in Barcelona', { city: 'Barcelona', amenities: ['pool', 'rooftop'] })
check('lake view in Lake Como', { city: 'Lake Como', amenities: ['lakeview'] })
check('sea view in Santorini', { city: 'Santorini', amenities: ['seaview'] })
check('pet friendly in Rome', { city: 'Rome', amenities: ['petfriendly'] })
check('free parking in Milan', { city: 'Milan', amenities: ['parking'] })
check('adults only in Lisbon', { city: 'Lisbon', amenities: ['adultsonly'] })
check('family friendly in Dubai', { city: 'Dubai', amenities: ['familyfriendly'] })
check('beachfront in Barcelona', { city: 'Barcelona', amenities: ['beach'] })
check('hotel in Milan with breakfast', { city: 'Milan', amenities: ['breakfast'] })
check('gym in London', { city: 'London', amenities: ['gym'] })

// ---- full sentences the user might actually type -------------------------
// The city named is not where the landmark is; the landmark wins, the city
// resolves to the landmark's own destination, and a note explains the gap.
check('a hotel near the lake como in Milan', { landmark: 'Lake Como', city: 'Lake Como' })
check('5 star near the Duomo in Milan under 400', {
  landmark: 'Duomo di Milano', city: 'Milan', stars: 5, maxPrice: 400,
})
check('I want a 4 star hotel in Rome with a pool under 300', {
  city: 'Rome', stars: 4, amenities: ['pool'], maxPrice: 300,
})
check('find me somewhere cheap in Lisbon with breakfast', {
  city: 'Lisbon', amenities: ['breakfast'], keywords: [],
})
check('show me luxury hotels near Lake Como with a spa', {
  landmark: 'Lake Como', stars: 5, amenities: ['spa'],
})
check('near Lake Como with a pool', { landmark: 'Lake Como', amenities: ['pool'] })
check('hotel in Venice with lake view', { city: 'Venice', amenities: ['lakeview'] }, { minResults: 0 })

// ---- keyword fallback ---------------------------------------------------
check('Bulgari', { keywords: ['bulgari'] })
check('Savoy in London', { city: 'London', keywords: ['savoy'] })
check('hostel in Paris', { city: 'Paris', keywords: ['hostel'] }, { minResults: 0 })

// ---- junk and edge cases must not throw or over-match --------------------
check('', { landmark: null, city: null, stars: null, maxPrice: null }, { minResults: 10 })
check('   ', { landmark: null, city: null }, { minResults: 10 })
check('asdfghjkl', { keywords: ['asdfghjkl'] }, { minResults: 0 })
check('hotel', { landmark: null, city: null, keywords: [] }, { minResults: 10 })
check('!!! ??? ***', { landmark: null, city: null }, { minResults: 10 })

// ---- report -------------------------------------------------------------
const total = pass + failures.length
console.log(`\n${pass}/${total} filter-box cases passed\n`)
for (const f of failures) {
  console.log(`FAIL  "${f.query}"`)
  for (const p of f.problems) console.log(`      ${p}`)
}
process.exit(failures.length ? 1 : 0)
