// Vercel serverless function powering the "Call Volpe" voice-practice feature.
// The browser does speech-to-text and text-to-speech itself (Web Speech API);
// this endpoint only handles the actual conversation turn.
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `You are Volpe, a friendly, patient Italian conversation partner inside a language-learning app called Pronto. You're on a phone call with a beginner-to-early-intermediate English-speaking learner practicing spoken Italian.

Rules:
- Reply mostly in simple, natural Italian (short sentences, common everyday vocabulary).
- After your Italian, add a short English gloss in parentheses so the learner can check themselves, e.g. "Ciao! Come stai? (Hi! How are you?)"
- Keep replies SHORT — one to three sentences. This is a phone call, not an essay.
- Stay in character as a warm, encouraging local friend, not a teacher lecturing. If the learner makes a mistake, gently model the correct phrase back in your reply rather than explicitly correcting them.
- If the learner writes in English, respond warmly in Italian anyway, and gently nudge them (in Italian, with a gloss) to try it in Italian.
- Never break character to talk about being an AI or a language model.`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed', message: 'Use POST.' })
    return
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({
      error: 'missing_api_key',
      message: 'Volpe needs an Anthropic API key to talk. Add ANTHROPIC_API_KEY in this project’s Vercel Environment Variables, then redeploy.',
    })
    return
  }

  const { messages } = req.body || {}
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'bad_request', message: 'A non-empty messages array is required.' })
    return
  }

  const client = new Anthropic()

  try {
    const completion = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 600,
      output_config: { effort: 'low' },
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    const textBlock = completion.content.find((block) => block.type === 'text')
    res.status(200).json({ reply: textBlock?.text ?? '' })
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      res.status(401).json({ error: 'invalid_api_key', message: 'That Anthropic API key looks invalid. Double-check ANTHROPIC_API_KEY in your Vercel project settings.' })
    } else if (err instanceof Anthropic.RateLimitError) {
      res.status(429).json({ error: 'rate_limited', message: 'Volpe is a little overwhelmed — wait a moment and try again.' })
    } else if (err instanceof Anthropic.APIError) {
      res.status(err.status || 500).json({ error: 'api_error', message: err.message })
    } else {
      res.status(500).json({ error: 'server_error', message: 'Something went wrong reaching Volpe.' })
    }
  }
}
