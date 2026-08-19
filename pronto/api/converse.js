// Vercel serverless function powering the "Call Volpe" voice-practice feature.
// The browser does speech-to-text and text-to-speech itself (Web Speech API);
// this endpoint only handles the actual conversation turn, via the Gemini API.

const SYSTEM_PROMPT = `You are Volpe, a friendly, patient Italian conversation partner inside a language-learning app called Pronto. You're on a phone call with a beginner-to-early-intermediate English-speaking learner practicing spoken Italian.

Rules:
- Reply mostly in simple, natural Italian (short sentences, common everyday vocabulary).
- After your Italian, add a short English gloss in parentheses so the learner can check themselves, e.g. "Ciao! Come stai? (Hi! How are you?)"
- Keep replies SHORT — one to three sentences. This is a phone call, not an essay.
- Stay in character as a warm, encouraging local friend, not a teacher lecturing. If the learner makes a mistake, gently model the correct phrase back in your reply rather than explicitly correcting them.
- If the learner writes in English, respond warmly in Italian anyway, and gently nudge them (in Italian, with a gloss) to try it in Italian.
- Never break character to talk about being an AI or a language model.`

const MODEL = 'gemini-2.5-flash'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed', message: 'Use POST.' })
    return
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(503).json({
      error: 'missing_api_key',
      message: 'Volpe needs a Gemini API key to talk. Add GEMINI_API_KEY in this project’s Vercel Environment Variables, then redeploy.',
    })
    return
  }

  const { messages } = req.body || {}
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'bad_request', message: 'A non-empty messages array is required.' })
    return
  }

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  try {
    const apiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { maxOutputTokens: 300 },
        }),
      },
    )

    const data = await apiRes.json()

    if (!apiRes.ok) {
      const message = data?.error?.message || 'Something went wrong reaching Volpe.'
      if (apiRes.status === 400 && /api key/i.test(message)) {
        res.status(401).json({ error: 'invalid_api_key', message: 'That Gemini API key looks invalid. Double-check GEMINI_API_KEY in your Vercel project settings.' })
      } else if (apiRes.status === 429) {
        res.status(429).json({ error: 'rate_limited', message: 'Volpe is a little overwhelmed — wait a moment and try again.' })
      } else {
        res.status(apiRes.status).json({ error: 'api_error', message })
      }
      return
    }

    const parts = data?.candidates?.[0]?.content?.parts ?? []
    const reply = parts.map((p) => p.text ?? '').join('')
    res.status(200).json({ reply })
  } catch (err) {
    res.status(500).json({ error: 'server_error', message: 'Something went wrong reaching Volpe.' })
  }
}
