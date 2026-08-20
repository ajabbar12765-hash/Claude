// Vercel serverless function powering the "Dictionary" quick-lookup feature —
// type any word (English or Italian) and get back the Italian translation
// with the details a learner actually needs to use it: article + gender for
// nouns, the plural, a plain-English pronunciation guide, and a real example
// sentence. Same Gemini structured-JSON pattern as api/converse.js.

const SYSTEM_PROMPT = `You are a compact, accurate Italian dictionary inside a language-learning app called Pronto. The user types a single word or short phrase, in English or Italian.

Rules:
- Detect which language they typed. Always return the Italian side in "italian" and the English side in "english" — regardless of which one the user typed.
- If it's a noun, include its definite article (il/lo/la/l'/i/gli/le) prefixed in "italianWithArticle" (e.g. "l'acqua", "il pane"), set "gender" to "masculine" or "feminine", and give the plural form in "plural". If it's not a noun, leave "italianWithArticle", "gender", and "plural" as empty strings.
- "pronunciation" is a short, plain-English phonetic guide a beginner can read aloud (e.g. "AK-kwa"), not IPA.
- "exampleIt" is one short, natural, everyday sentence using the word. "exampleEn" is its English translation.
- "partOfSpeech" is one of: noun, verb, adjective, adverb, phrase, other.
- If the input is gibberish or not a real word in either language, still fill in your best-effort guess rather than leaving fields empty.
- Keep every field short — this renders on a small card, not an essay.`

const MODEL = 'gemini-2.5-flash'

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    italian: { type: 'STRING', description: 'The bare Italian word or phrase, no article.' },
    italianWithArticle: { type: 'STRING', description: 'The Italian noun with its definite article, e.g. "l\'acqua". Empty string if not a noun.' },
    english: { type: 'STRING', description: 'The English word or phrase.' },
    partOfSpeech: { type: 'STRING', enum: ['noun', 'verb', 'adjective', 'adverb', 'phrase', 'other'] },
    gender: { type: 'STRING', enum: ['masculine', 'feminine', ''] },
    plural: { type: 'STRING', description: 'Plural form of the Italian noun. Empty string if not a noun.' },
    pronunciation: { type: 'STRING', description: 'Plain-English phonetic guide.' },
    exampleIt: { type: 'STRING' },
    exampleEn: { type: 'STRING' },
  },
  required: ['italian', 'italianWithArticle', 'english', 'partOfSpeech', 'gender', 'plural', 'pronunciation', 'exampleIt', 'exampleEn'],
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed', message: 'Use POST.' })
    return
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(503).json({
      error: 'missing_api_key',
      message: 'The dictionary needs a Gemini API key. Add GEMINI_API_KEY in this project’s Vercel Environment Variables, then redeploy.',
    })
    return
  }

  const query = (req.body?.query || '').trim().slice(0, 80)
  if (!query) {
    res.status(400).json({ error: 'bad_request', message: 'A query string is required.' })
    return
  }

  try {
    const apiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: query }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: {
            maxOutputTokens: 300,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      },
    )

    const data = await apiRes.json()

    if (!apiRes.ok) {
      const message = data?.error?.message || 'Something went wrong looking that up.'
      if (apiRes.status === 400 && /api key/i.test(message)) {
        res.status(401).json({ error: 'invalid_api_key', message: 'That Gemini API key looks invalid. Double-check GEMINI_API_KEY in your Vercel project settings.' })
      } else if (apiRes.status === 429) {
        res.status(429).json({ error: 'rate_limited', message: 'Too many lookups at once — wait a moment and try again.' })
      } else {
        res.status(apiRes.status).json({ error: 'api_error', message })
      }
      return
    }

    const raw = (data?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('')
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      res.status(502).json({ error: 'api_error', message: 'Got an answer that didn’t parse. Try again.' })
      return
    }

    res.status(200).json({
      query,
      italian: parsed.italian ?? '',
      italianWithArticle: parsed.italianWithArticle ?? '',
      english: parsed.english ?? '',
      partOfSpeech: parsed.partOfSpeech ?? 'other',
      gender: parsed.gender ?? '',
      plural: parsed.plural ?? '',
      pronunciation: parsed.pronunciation ?? '',
      exampleIt: parsed.exampleIt ?? '',
      exampleEn: parsed.exampleEn ?? '',
    })
  } catch (err) {
    res.status(500).json({ error: 'server_error', message: 'Something went wrong looking that up.' })
  }
}
