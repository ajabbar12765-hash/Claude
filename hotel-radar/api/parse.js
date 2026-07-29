// Smart filter parsing via Gemini (Vercel serverless function).
//
// The built-in regex parser handles the common shapes but falls over on
// anything phrased unusually — "somewhere romantic on the water that won't
// break the bank". This endpoint hands the phrase to Gemini along with the
// exact vocabulary the app understands, and gets structured filters back.
//
// The model only ever returns *names* from the supplied vocabulary. All
// coordinates, distances and matching still happen locally against the
// catalogue, so the model cannot invent a hotel or a location.
//
// Set in Vercel → Settings → Environment Variables:
//   GEMINI_API_KEY   from https://aistudio.google.com/apikey (free tier)
//   GEMINI_MODEL     optional, defaults to gemini-2.5-flash

const DEFAULT_MODEL = 'gemini-2.5-flash'
const CACHE_TTL_MS = 30 * 60 * 1000

// Identical phrases are common (the user retypes, or several tabs are open).
// Caching keeps the free tier intact.
const cache = new Map()

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    landmark: { type: 'string', nullable: true },
    city: { type: 'string', nullable: true },
    radiusKm: { type: 'number', nullable: true },
    minStars: { type: 'integer', nullable: true },
    maxPrice: { type: 'number', nullable: true },
    minPrice: { type: 'number', nullable: true },
    amenities: { type: 'array', items: { type: 'string' } },
    keywords: { type: 'array', items: { type: 'string' } },
    note: { type: 'string', nullable: true },
  },
  required: ['amenities', 'keywords'],
}

function buildPrompt({ query, cities, landmarks, amenities, currency }) {
  return `You convert a traveller's hotel search phrase into structured filters.

Return ONLY values drawn from these vocabularies. Never invent a place name.

CITIES (destinations the app covers):
${cities.join(', ')}

LANDMARKS (use the exact spelling given):
${landmarks.join(', ')}

AMENITY IDS:
${amenities.join(', ')}

Rules:
- "landmark": an exact landmark name, or null. Use it whenever the traveller
  anchors on a place ("near the Duomo", "by the lake", "steps from the beach").
- "city": an exact city name, or null.
- "radiusKm": only when proximity is implied. "walking distance" ~ 1.5,
  "near" ~ 8, "in the area" ~ 15. Otherwise null.
- "minStars": 1-5, or null. "luxury"/"5 star"/"high end" means 5.
  "budget"/"cheap" does NOT set stars — it is a price signal.
- "maxPrice"/"minPrice": per-night amounts in ${currency}, or null.
  "cheap" with no number implies maxPrice 120. "mid-range" implies 250.
  "budget" implies 100. Convert any other currency the user names into
  ${currency} at a sensible rate.
- "amenities": only ids from the list. Infer generously but sensibly:
  "romantic" -> adultsonly; "on the water" -> lakeview or seaview;
  "with the kids" -> familyfriendly; "somewhere to swim" -> pool;
  "I'm driving" -> parking; "bringing the dog" -> petfriendly.
- "keywords": only distinctive words that should match a hotel NAME, such as
  a brand ("Bulgari", "Hilton"). Never put descriptive adjectives here —
  leave them out entirely rather than over-filtering.
- "note": one short sentence ONLY if something needs explaining, such as the
  traveller naming a destination the app does not cover, or a landmark and
  city that are far apart. Otherwise null.

If the traveller names a place that is NOT in the CITIES or LANDMARKS lists,
set both to null and write a note saying the app does not cover it yet, and
list two or three covered destinations that are closest in spirit.

Phrase: "${query}"`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    // Not an error: the app falls back to its built-in parser and carries on.
    return res.status(200).json({ available: false, reason: 'GEMINI_API_KEY is not set' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      return res.status(400).json({ error: 'Body must be JSON' })
    }
  }

  const query = String(body?.query ?? '').trim()
  if (!query) return res.status(400).json({ error: 'query is required' })
  if (query.length > 300) return res.status(400).json({ error: 'query too long' })

  const cacheKey = `${body.currency || 'EUR'}:${query.toLowerCase()}`
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return res.status(200).json({ available: true, cached: true, filters: hit.value })
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt({ ...body, query }) }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          maxOutputTokens: 800,
        },
      }),
    })

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '')
      return res.status(502).json({
        error: `Gemini responded ${upstream.status}`,
        detail: detail.slice(0, 300),
      })
    }

    const json = await upstream.json()
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return res.status(502).json({ error: 'Gemini returned no content' })

    const filters = JSON.parse(text)
    cache.set(cacheKey, { value: filters, at: Date.now() })
    if (cache.size > 500) cache.delete(cache.keys().next().value)

    return res.status(200).json({ available: true, cached: false, filters })
  } catch (err) {
    return res.status(502).json({ error: err?.message || 'Smart parsing failed' })
  }
}
