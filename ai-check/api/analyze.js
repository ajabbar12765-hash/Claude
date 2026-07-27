// Optional server function for "Is This Real?".
//
// Deploying this keeps the Anthropic API key on the server instead of on the
// phone. Set ANTHROPIC_API_KEY in your hosting environment, deploy, then paste
// the resulting address (e.g. https://your-app.vercel.app/api/analyze) into the
// app's Settings screen under "Server address".
//
// Runs as-is on Vercel. The handler is a plain (req, res) function, so it also
// drops into Netlify Functions, a Node/Express route, or Cloudflare with minor
// edits.

const MODEL = 'claude-opus-5';

const SYSTEM = [
  "You help an older adult decide whether a picture or video they were sent is genuine, or was",
  "created or altered by a computer, and whether it looks like part of a scam.",
  "",
  "How to judge:",
  "- Look at what is actually in front of you: hands and fingers, teeth, ears, jewellery, eyeglasses,",
  "  text and signage, logos, reflections, shadows and light direction, background objects that bend,",
  "  merge or repeat, skin and hair that look unnaturally smooth or plasticky, and edges that smear.",
  "- For video frames, also consider whether the same person looks consistent from frame to frame,",
  "  and whether the mouth, teeth and jawline look natural.",
  "- Weigh what the image is being used FOR. A celebrity endorsing an investment, a 'family member'",
  "  in trouble, a giveaway, a miracle cure, a delivery problem, or anything urging urgency,",
  "  secrecy, gift cards, crypto, or a payment is a scam pattern regardless of how the image was made.",
  "",
  "Honesty rules, these matter more than anything else:",
  "- You genuinely cannot be certain whether something was made by AI. Modern generators leave no",
  "  reliable tell. Say 'not_sure' whenever the evidence is thin. Being unsure is a good answer.",
  "- Never invent a percentage, score, or confidence number.",
  "- Only cite details you can actually see in the image. Never invent a detail to justify a verdict.",
  "- If the picture is blurry, small, a screenshot, or an ordinary everyday photo with nothing",
  "  notable about it, say 'not_sure' rather than guessing.",
  "- A real photo can still be used in a scam, and an AI picture can be completely harmless.",
  "  Judge those two things separately.",
  "",
  "How to write:",
  "- Write to a warm, capable older adult. Short sentences. Everyday words.",
  "- No technical words at all: no 'artifacts', 'AI-generated', 'diffusion', 'compression',",
  "  'metadata', 'pixels', 'rendering'. Say things like 'her fingers are blurry and there are six",
  "  of them' or 'the writing on the sign is jumbled'.",
  "- Never be alarming for no reason, and never be reassuring for no reason.",
  "- Address the reader as 'you'. Do not mention that you are an AI model."
].join('\n');

const SCHEMA = {
  type: 'object',
  properties: {
    verdict:    { type: 'string', enum: ['looks_real', 'not_sure', 'likely_ai'] },
    headline:   { type: 'string', description: 'One short plain sentence, under 12 words.' },
    summary:    { type: 'string', description: 'One or two short sentences expanding on the headline.' },
    reasons:    { type: 'array', minItems: 1, maxItems: 4,
                  items: { type: 'string', description: 'One short sentence about something visible.' } },
    scam_risk:  { type: 'string', enum: ['none', 'some', 'high'] },
    scam_note:  { type: 'string', description: 'Empty string when scam_risk is none.' },
    what_to_do: { type: 'string', description: 'One or two sentences of concrete advice.' }
  },
  required: ['verdict', 'headline', 'summary', 'reasons', 'scam_risk', 'scam_note', 'what_to_do'],
  additionalProperties: false
};

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // per image, after base64 decoding

function setCors(res) {
  // Lock this down to your own page's origin if you host the app somewhere fixed.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Use POST.' } });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(500).json({ error: { message: 'ANTHROPIC_API_KEY is not set on the server.' } });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  const kind = body && body.kind === 'video' ? 'video' : 'photo';
  const images = (body && Array.isArray(body.images)) ? body.images : [];

  if (!images.length) {
    return res.status(400).json({ error: { message: 'No images were sent.' } });
  }
  if (images.length > MAX_IMAGES) {
    return res.status(400).json({ error: { message: 'Too many images were sent.' } });
  }
  for (const img of images) {
    if (!img || typeof img.data !== 'string' ||
        !['image/jpeg', 'image/png', 'image/webp'].includes(img.media_type)) {
      return res.status(400).json({ error: { message: 'An image was not in a supported format.' } });
    }
    if (img.data.length * 0.75 > MAX_IMAGE_BYTES) {
      return res.status(413).json({ error: { message: 'An image was too large.' } });
    }
  }

  const content = images.map((img) => ({
    type: 'image',
    source: { type: 'base64', media_type: img.media_type, data: img.data }
  }));
  content.push({
    type: 'text',
    text: kind === 'video'
      ? `These are ${images.length} still pictures taken evenly through a short video that was sent `
        + 'to me, in order from beginning to end. Look at them together and tell me whether the video '
        + 'looks genuine or made by a computer, and whether it looks like a scam.'
      : 'Someone sent me this picture. Tell me whether it looks genuine or made by a computer, '
        + 'and whether it looks like part of a scam.'
  });

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: SYSTEM,
        output_config: {
          effort: 'medium',
          format: { type: 'json_schema', schema: SCHEMA }
        },
        messages: [{ role: 'user', content }]
      })
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('content-type', 'application/json');
    return res.send(text);
  } catch (err) {
    return res.status(502).json({ error: { message: 'Could not reach the service. ' + err.message } });
  }
};

// Vercel's default body limit is 1 MB, which is too small for a few JPEG frames.
module.exports.config = { api: { bodyParser: { sizeLimit: '12mb' } } };
