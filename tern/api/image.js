import { API, IMAGE_MODEL, rateLimited, getKey, json, friendlyError } from './_gemini.js';

// Makes or edits an image with Gemini. If the key's free tier has no image quota,
// it answers {fallback:true} and the app draws with a free keyless service instead.
export async function POST(req) {
  if (rateLimited(req, 10)) return json({ error: 'Too many images. Wait a minute and try again.' }, 429);
  let body;
  try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }
  const prompt = typeof body.prompt === 'string' ? body.prompt.slice(0, 4000).trim() : '';
  if (!prompt) return json({ error: 'Describe the image first' }, 400);

  if (process.env.TERN_MOCK === '1') return json({ fallback: true });
  const key = getKey(req);
  if (!key) return json({ fallback: true });

  const parts = [];
  for (const img of (Array.isArray(body.images) ? body.images : []).slice(0, 3)) {
    if (img && /^image\/(png|jpeg|webp)$/.test(img.mime) && typeof img.data === 'string') {
      parts.push({ inline_data: { mime_type: img.mime, data: img.data } });
    }
  }
  parts.push({ text: prompt });

  try {
    const res = await fetch(`${API}/${IMAGE_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }),
      signal: req.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      // Free keys often have zero image quota (429) or no access (403/404): fall back quietly.
      if ([403, 404, 429].includes(res.status) || /quota|billing|not found/i.test(text)) return json({ fallback: true });
      return json({ error: friendlyError(res.status, text) }, 502);
    }
    const data = await res.json();
    const out = { images: [], text: '' };
    for (const p of data.candidates?.[0]?.content?.parts || []) {
      const inline = p.inlineData || p.inline_data;
      if (inline?.data) out.images.push({ mime: inline.mimeType || inline.mime_type || 'image/png', data: inline.data });
      else if (p.text) out.text += p.text;
    }
    if (!out.images.length) return json({ fallback: true, text: out.text });
    return json(out);
  } catch {
    return json({ fallback: true });
  }
}
