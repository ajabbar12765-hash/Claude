// Raw REST call to the Gemini API (Google AI Studio) — no SDK dependency.
// Free tier: create a key at https://aistudio.google.com/apikey and set it
// as GEMINI_API_KEY in Vercel env vars. Model is configurable via
// GEMINI_MODEL in case a given model is retired or rate-limited.

const DEFAULT_MODEL = 'gemini-2.5-flash'

export async function askGemini({ system, messages }) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY is not set on the server. Add it in Vercel -> Settings -> Environment Variables.')
    err.statusCode = 503
    throw err
  }
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { role: 'system', parts: [{ text: system }] },
        contents: messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: { temperature: 0.6, maxOutputTokens: 1024 },
      }),
    }
  )

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const err = new Error(`Gemini API error (${res.status}): ${text.slice(0, 300)}`)
    err.statusCode = res.status === 429 ? 429 : 502
    throw err
  }

  const data = await res.json()
  const reply = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || ''
  if (!reply) {
    const blockReason = data?.promptFeedback?.blockReason
    throw new Error(blockReason ? `Gemini blocked the request: ${blockReason}` : 'Gemini returned an empty reply')
  }
  return reply.trim()
}
