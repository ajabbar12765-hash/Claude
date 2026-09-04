// Vercel serverless function powering the "Call Volpe" voice-practice feature.
// Text turns still do speech-to-text in the browser (Web Speech API) where
// available; on platforms without it (Safari/iOS never shipped
// SpeechRecognition), the browser records raw audio instead and this
// endpoint sends it straight to Gemini, which transcribes and replies in
// one call. Output is structured JSON — {heard, italian, gloss} — so the
// client never has to regex-guess where the Italian ends and the English
// gloss begins before speaking it aloud.

const LEVEL_RULES = {
  beginner:
    'The learner is a total beginner — day one or two of learning Italian. This is a hard constraint, not a suggestion: every sentence must be 3-5 words, present tense only, and built ONLY from words an absolute beginner learns first — greetings (ciao, buongiorno), essere/avere/stare in the io/tu form, basic nouns (casa, cane, acqua, cibo), numbers 1-10, sì/no, colors, family words (madre, padre). If a natural reply would need a harder word or any past/future tense, replace the whole idea with a simpler one instead of using the hard word anyway. No idioms, no subjunctive, no compound tenses, no rare or literary vocabulary, no long or compound sentences. Prefer questions and short exchanges a first-week learner could actually understand and answer.',
  elementary:
    'The learner has some basic Italian, roughly a few weeks in. Sentences should be 5-9 words, present tense only (no past or future), built from everyday high-frequency words a beginner course covers early. No idioms, no subjunctive, no rare vocabulary. Common connecting words (e, ma, perché, quando) are fine, but keep each sentence to one simple idea.',
  intermediate: 'The learner already has a working grasp of Italian. Use natural, everyday Italian at a normal pace — past and future tense are fine, along with common idioms — but keep vocabulary conversational, not literary.',
  advanced: 'The learner is advanced or near-fluent. Speak the way you naturally would with a friend — full native pace, idioms, colloquialisms, subjunctive and any other mood/tense as it comes up. Don\'t simplify, slow down, or hold back.',
}

const MAX_KNOWN_VOCAB = 50

function formatKnownVocab(knownVocab) {
  if (!Array.isArray(knownVocab)) return ''
  return knownVocab
    .slice(0, MAX_KNOWN_VOCAB)
    .filter((p) => p && p.it && p.en)
    .map((p) => `${p.it}=${p.en}`)
    .join('; ')
}

function buildSystemPrompt(level, knownVocab, topic, isAudio) {
  const levelRule = LEVEL_RULES[level] || LEVEL_RULES.beginner
  const vocabList = formatKnownVocab(knownVocab)
  const vocabRule = vocabList
    ? `\n- HARD VOCABULARY LIMIT — treat this as more important than sounding natural. The learner has only been taught these Italian words/phrases so far, given as "italian=english": ${vocabList}. Every content word (noun, verb, adjective, adverb) you use MUST come from this list — conjugating or changing the ending of a listed verb/adjective is fine (e.g. the list has "parlare" so "parlo"/"parli" are fine), but a different word entirely that isn't on the list is NOT allowed, no matter how basic or common it seems. The only exception is small grammatical glue words: articles (il/la/un/una), basic pronouns (io/tu/lui/lei), and (e), or (o), not (non), of (di), to/at (a), the question words (che, chi, dove, quando, come, perché). If you can't say something with only the listed words plus that short glue-word list, do NOT reach for an easier-seeming outside word — pick a simpler idea you CAN fully express with what's available, even if that makes the conversation more repetitive. A learner hearing a word they were never taught is the single worst outcome for this exercise.`
    : ''
  const topicRule = topic
    ? `\n- This is a topic-practice call, not a free-ranging chat: stay on the topic of "${topic}" for the whole conversation. Every question you ask should invite the learner to produce their own sentence about this topic using the vocabulary above, rather than just answering yes/no. If they drift off-topic, warmly steer back within a line.`
    : ''
  const sentenceCap =
    level === 'beginner' ? 'exactly ONE short sentence' : level === 'elementary' ? 'one, or at most two, short sentences' : 'one to three sentences'
  return `You are Volpe, a friendly, patient Italian conversation partner inside a language-learning app called Pronto. You're on a phone call with an English-speaking learner practicing spoken Italian.

Rules:
- ${levelRule}${vocabRule}${topicRule}
- Put the English translation of your reply in the "gloss" field — never inside the "italian" field, and never combine them into one string.
- Keep "italian" SHORT — ${sentenceCap}. This is a phone call, not an essay. Never pad a reply with a second idea just to sound fuller — shorter and simpler always wins over natural-but-long.
- Your job is to get the learner producing their OWN sentences, not just picking answers — always end your turn with a question or prompt that requires them to build a sentence back, using the vocabulary above.
- Stay in character as a warm, encouraging local friend, not a teacher lecturing. If the learner makes a mistake, gently model the correct phrase back in your reply rather than explicitly correcting them.
- If the learner writes or says something in English, respond warmly in Italian anyway, and gently nudge them (in Italian, with the gloss) to try it in Italian.
- Never break character to talk about being an AI or a language model.${
    isAudio
      ? '\n- Your input this turn is audio — transcribe exactly what the learner said (in whatever language they said it) into the "heard" field.'
      : ''
  }`
}

const MODEL = 'gemini-3.6-flash'

// "heard" (a verbatim transcription) is only meaningful — and only asked
// for — when the turn is audio. For typed turns the client already has the
// exact text, so making the model regenerate it as an echo would just be
// wasted output tokens on every single turn, adding latency for nothing.
function buildResponseSchema(isAudio) {
  const properties = {
    italian: { type: 'STRING', description: 'Your reply, in Italian only.' },
    gloss: { type: 'STRING', description: 'English translation of the italian field.' },
  }
  const required = ['italian', 'gloss']
  if (isAudio) {
    properties.heard = { type: 'STRING', description: 'Transcription of the learner’s turn, verbatim.' }
    required.unshift('heard')
  }
  return { type: 'OBJECT', properties, required }
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

  const { history, text, audioBase64, audioMimeType, level, knownVocab, topic } = req.body || {}
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

  const isAudio = !!audioBase64
  const turnParts = isAudio
    ? [{ inlineData: { mimeType: audioMimeType || 'audio/webm', data: audioBase64 } }, { text: 'Respond to what I just said, in character, following the JSON schema.' }]
    : [{ text }]
  contents.push({ role: 'user', parts: turnParts })

  async function callGemini() {
    const apiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: buildSystemPrompt(level, knownVocab, topic, isAudio) }] },
          generationConfig: {
            // Replies are capped at 1-3 short sentences by the prompt itself;
            // a smaller budget here means less to generate, which is the
            // other big lever on response latency besides thinkingConfig.
            maxOutputTokens: isAudio ? 260 : 190,
            responseMimeType: 'application/json',
            responseSchema: buildResponseSchema(isAudio),
            // Volpe doesn't need to reason before answering — every extra
            // "thinking" token here is pure added latency on a phone call
            // where the learner is sitting waiting for a reply.
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

    // "Model overloaded" (Google's own capacity, not our quota) is exactly
    // the kind of transient failure worth one quiet retry before bothering
    // the learner — a few hundred ms usually clears it.
    const isOverloaded = !apiRes.ok && apiRes.status === 503 && /overloaded|high demand/i.test(data?.error?.message || '')
    if (isOverloaded) {
      await new Promise((r) => setTimeout(r, 800))
      ;({ apiRes, data } = await callGemini())
    }

    if (!apiRes.ok) {
      const message = data?.error?.message || 'Something went wrong reaching Volpe.'
      if (apiRes.status === 400 && /api key/i.test(message)) {
        res.status(401).json({ error: 'invalid_api_key', message: 'That Gemini API key looks invalid. Double-check GEMINI_API_KEY in your Vercel project settings.' })
      } else if (apiRes.status === 429) {
        res.status(429).json({ error: 'rate_limited', message: 'Volpe is a little overwhelmed — wait a moment and try again.' })
      } else if (apiRes.status === 503) {
        res.status(503).json({ error: 'overloaded', message: 'Volpe’s line is busy right now (Gemini is at high demand) — give it a few seconds and try again.' })
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
