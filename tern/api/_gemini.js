// Shared helpers for the Gemini proxy. Files starting with "_" are not routes on Vercel.

export const API = 'https://generativelanguage.googleapis.com/v1beta/models';
export const CHAT_MODEL = process.env.TERN_MODEL || 'gemini-2.5-flash';
export const IMAGE_MODEL = process.env.TERN_IMAGE_MODEL || 'gemini-2.5-flash-image';

export const SYSTEM = `You are Tern, a direct, quick and candid assistant.
Answer the question first, then add only the detail that helps. Prefer short paragraphs and plain words.
Use Markdown when structure helps: headings for long answers, lists for steps, tables for comparisons, fenced code blocks with a language tag for code.
Write maths in LaTeX with $...$ inline and $$...$$ for display.
Have opinions when asked for them and say plainly when you are unsure or something is false. Light dry humour is fine; never pad.
Today's date is ${'{DATE}'}.`;

const hits = new Map();
// Best-effort per-instance limiter so one visitor cannot drain the shared free quota.
export function rateLimited(req, max = 30, windowMs = 60_000) {
  const ip = (req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}

export function getKey(req) {
  const own = req.headers.get('x-gemini-key');
  if (own && /^[\w-]{20,80}$/.test(own)) return own;
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

const MIME = /^image\/(png|jpeg|webp|heic|heif)$/;

// Turn the app's messages into Gemini "contents", validating as we go.
export function toContents(messages) {
  if (!Array.isArray(messages) || messages.length === 0) throw new Error('No messages');
  const recent = messages.slice(-40);
  return recent.map((m, i) => {
    const role = m.role === 'assistant' ? 'model' : 'user';
    const parts = [];
    const keepImages = i >= recent.length - 6; // older images are dropped to stay inside request limits
    if (keepImages && Array.isArray(m.images)) {
      for (const img of m.images.slice(0, 4)) {
        if (img && MIME.test(img.mime) && typeof img.data === 'string' && img.data.length < 6_000_000) {
          parts.push({ inline_data: { mime_type: img.mime, data: img.data } });
        }
      }
    }
    const text = typeof m.text === 'string' ? m.text.slice(0, 60_000) : '';
    if (text) parts.push({ text });
    if (!parts.length) parts.push({ text: role === 'user' ? '(image)' : '…' });
    return { role, parts };
  });
}

export function friendlyError(status, body) {
  let msg = '';
  try { msg = JSON.parse(body).error?.message || ''; } catch { msg = body?.slice(0, 200) || ''; }
  if (status === 429) return 'The free Gemini quota is used up for the moment. Wait a minute and try again.';
  if (status === 400 && /API key/i.test(msg)) return 'The Gemini API key is not valid. Check it in Settings or in GEMINI_API_KEY.';
  if (status === 403) return 'This Gemini key is not allowed to use that model.';
  return msg || `Gemini returned ${status}`;
}
