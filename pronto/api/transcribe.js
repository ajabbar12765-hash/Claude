// Bare speech-to-text for the pronunciation exercises (Speak/Shadow/
// Respond) on platforms with no working native SpeechRecognition —
// WebKit's implementation is unreliable in practice (see speech.js), so
// this is the only way those exercises can actually hear a spoken answer
// there rather than falling back to an unverified self-report. Unlike
// converse.js this returns only a transcript, no conversational reply —
// there's nothing to reply to, so no reason to spend tokens generating one.

const MODEL = 'gemini-3.6-flash'

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    heard: { type: 'STRING', description: 'Exact transcription of what was said, verbatim.' },
  },
  required: ['heard'],
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed', message: 'Use POST.' })
    return
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(503).json({
      error: 'missing_api_key',
      message: 'Transcription needs a Gemini API key. Add GEMINI_API_KEY in this project’s Vercel Environment Variables, then redeploy.',
    })
    return
  }

  const { audioBase64, audioMimeType } = req.body || {}
  if (!audioBase64) {
    res.status(400).json({ error: 'bad_request', message: 'audioBase64 is required.' })
    return
  }

  async function callGemini() {
    const apiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: audioMimeType || 'audio/webm', data: audioBase64 } },
                { text: 'Transcribe exactly what is spoken in this audio clip, verbatim, in whatever language it is spoken. If nothing intelligible was said, return an empty string.' },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 120,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            thinkingConfig: { thinkingLevel: 'minimal' },
          },
        }),
      },
    )
    const data = await apiRes.json()
    return { apiRes, data }
  }

  try {
    let { apiRes, data } = await callGemini()

    const isOverloaded = !apiRes.ok && apiRes.status === 503 && /overloaded|high demand/i.test(data?.error?.message || '')
    if (isOverloaded) {
      await new Promise((r) => setTimeout(r, 800))
      ;({ apiRes, data } = await callGemini())
    }

    if (!apiRes.ok) {
      const message = data?.error?.message || 'Something went wrong transcribing that.'
      if (apiRes.status === 400 && /api key/i.test(message)) {
        res.status(401).json({ error: 'invalid_api_key', message: 'That Gemini API key looks invalid. Double-check GEMINI_API_KEY in your Vercel project settings.' })
      } else if (apiRes.status === 429) {
        res.status(429).json({ error: 'rate_limited', message: 'A little overwhelmed right now — wait a moment and try again.' })
      } else if (apiRes.status === 503) {
        res.status(503).json({ error: 'overloaded', message: 'High demand right now — give it a few seconds and try again.' })
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
      res.status(502).json({ error: 'api_error', message: 'Couldn’t make out that recording. Try again.' })
      return
    }

    res.status(200).json({ heard: parsed.heard ?? '' })
  } catch {
    res.status(500).json({ error: 'server_error', message: 'Couldn’t reach the transcription service. Try again.' })
  }
}
