// Vercel serverless function powering the "Call Volpe" voice-practice feature.
// Text turns still do speech-to-text in the browser (Web Speech API) where
// available; on platforms without it (Safari/iOS never shipped
// SpeechRecognition), the browser records raw audio instead and this
// endpoint sends it straight to Gemini, which transcribes and replies in
// one call. Output is structured JSON — {heard, italian, gloss} — so the
// client never has to regex-guess where the Italian ends and the English
// gloss begins before speaking it aloud.

const LEVEL_RULES = {
  beginner: 'The learner is a true beginner. Use only the simplest, most common words and very short present-tense sentences (3-6 words). No idioms, no compound tenses, no subjunctive. Speak the way you would to someone who started learning last week.',
  elementary: 'The learner knows some basic Italian. Use simple everyday vocabulary and mostly present tense, short sentences (up to ~10 words). Avoid idioms and complex grammar, but common connecting words are fine.',
  intermediate: 'The learner already has a working grasp of Italian. Use natural, everyday Italian at a normal pace — past and future tense are fine, along with common idioms — but keep vocabulary conversational, not literary.',
}

function buildSystemPrompt(level) {
  const levelRule = LEVEL_RULES[level] || LEVEL_RULES.elementary
  return `You are Volpe, a friendly, patient Italian conversation partner inside a language-learning app called Pronto. You're on a phone call with an English-speaking learner practicing spoken Italian.

Rules:
- ${levelRule}
- Put the English translation of your reply in the "gloss" field — never inside the "italian" field, and never combine them into one string.
- Keep "italian" SHORT — one to three sentences. This is a phone call, not an essay.
- Stay in character as a warm, encouraging local friend, not a teacher lecturing. If the learner makes a mistake, gently model the correct phrase back in your reply rather than explicitly correcting them.
- If the learner writes or says something in English, respond warmly in Italian anyway, and gently nudge them (in Italian, with the gloss) to try it in Italian.
- Never break character to talk about being an AI or a language model.
- If your input is audio, transcribe exactly what the learner said (in whatever language they said it) into the "heard" field. If your input is already text, copy that same text into "heard" unchanged.`
}

const MODEL = 'gemini-3.6-flash'

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    heard: { type: 'STRING', description: 'Transcription of the learner’s turn, verbatim.' },
    italian: { type: 'STRING', description: 'Your reply, in Italian only.' },
    gloss: { type: 'STRING', description: 'English translation of the italian field.' },
  },
  required: ['heard', 'italian', 'gloss'],
}

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

  const { history, text, audioBase64, audioMimeType, level } = req.body || {}
  if (!Array.isArray(history)) {
    res.status(400).json({ error: 'bad_request', message: 'A history array is required.' })
    return
  }
  if (!text && !audioBase64) {
    res.status(400).json({ error: 'bad_request', message: 'Either text or audioBase64 is required.' })
    return
  }

  const contents = history.map((h) => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.text }],
  }))

  const turnParts = audioBase64
    ? [{ inlineData: { mimeType: audioMimeType || 'audio/webm', data: audioBase64 } }, { text: 'Respond to what I just said, in character, following the JSON schema.' }]
    : [{ text }]
  contents.push({ role: 'user', parts: turnParts })

  try {
    const apiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: buildSystemPrompt(level) }] },
          generationConfig: {
            maxOutputTokens: 400,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            // Volpe doesn't need to reason before answering — every extra
            // "thinking" token here is pure added latency on a phone call
            // where the learner is sitting waiting for a reply.
            thinkingConfig: { thinkingLevel: 'minimal' },
          },
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

    const raw = (data?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('')
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      res.status(502).json({ error: 'api_error', message: 'Volpe said something that didn’t parse. Try again.' })
      return
    }

    if (audioBase64 && !(parsed.heard || '').trim()) {
      // Helps distinguish "the mic genuinely caught silence" from "Gemini
      // choked on the audio container" when checking Vercel function logs.
      console.warn(`converse: empty transcript for audio turn (mimeType=${audioMimeType || 'unset'})`)
    }

    res.status(200).json({
      heard: parsed.heard ?? text ?? '',
      italian: parsed.italian ?? '',
      gloss: parsed.gloss ?? '',
    })
  } catch (err) {
    res.status(500).json({ error: 'server_error', message: 'Something went wrong reaching Volpe.' })
  }
}
