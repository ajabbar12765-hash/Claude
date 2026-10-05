// Model providers. Each one streams a task and reports through callbacks:
//   onText(chunk)  a piece of the visible answer
//   onReset()      the model restarted its answer (fallback)
// and resolves with { text, stop } where stop is 'ok' | 'refusal' | 'max_tokens'.
// Failures throw a ProviderError carrying a code the browser understands.
import Anthropic from '@anthropic-ai/sdk';

export class ProviderError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

// ── Which provider does this request use? ──────────────────────────
// A key sent from the browser wins (Gemini keys start with "AIza", Claude
// keys with "sk-"); otherwise the server's own key is used.
export function pickProvider(sentKey) {
  const key = (sentKey || '').trim();
  if (key) return { name: key.startsWith('sk-') ? 'anthropic' : 'gemini', key };
  const gemini = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (gemini) return { name: 'gemini', key: gemini };
  if (process.env.ANTHROPIC_API_KEY) return { name: 'anthropic', key: process.env.ANTHROPIC_API_KEY };
  return null;
}

// ── Gemini ─────────────────────────────────────────────────────────
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
const GEMINI_BASE = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';

// Gemini accepts an OpenAPI-style subset: no additionalProperties, and enum
// only on strings. Keep the property order stable too.
function geminiSchema(s) {
  if (!s || typeof s !== 'object') return s;
  const out = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === 'additionalProperties') continue;
    if (k === 'enum' && s.type !== 'string') continue;
    if (k === 'properties') {
      out.properties = Object.fromEntries(Object.entries(v).map(([n, sub]) => [n, geminiSchema(sub)]));
      out.propertyOrdering = Object.keys(v);
    } else if (k === 'items') out.items = geminiSchema(v);
    else out[k] = v;
  }
  return out;
}

// The task builders write Anthropic-style messages; translate them.
function geminiContents(messages) {
  return messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: (typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content).map((b) =>
      b.type === 'document' ? { inlineData: { mimeType: b.source.media_type, data: b.source.data } } : { text: b.text },
    ),
  }));
}

function geminiError(status, body) {
  let msg = '';
  try { msg = JSON.parse(body)?.error?.message || ''; } catch { /* not JSON */ }
  if (status === 429) return new ProviderError('rate_limit', 'Too many requests right now — wait a minute and try again.');
  if (status === 401 || status === 403 || /api key/i.test(msg)) return new ProviderError('bad_key', 'That API key was rejected. Check it in Settings.');
  if (status === 404) return new ProviderError('api_error', `The model “${GEMINI_MODEL}” isn’t available for this key. Set GEMINI_MODEL to one that is.`);
  if (status === 413) return new ProviderError('too_large', 'That file is too large. Try pasting the syllabus text instead.');
  return new ProviderError('api_error', msg ? `Gemini said: ${msg}` : `Gemini returned an error (${status}).`);
}

export async function streamGemini({ key, task, messages, signal, onText }) {
  const json = task.mode === 'json';
  const body = {
    systemInstruction: { parts: [{ text: task.system }] },
    contents: geminiContents(messages),
    generationConfig: {
      maxOutputTokens: Math.min(task.maxTokens, 65000),
      temperature: json ? 0.3 : 0.7,
      ...(json ? { responseMimeType: 'application/json', responseSchema: geminiSchema(task.schema) } : {}),
    },
  };
  const url = `${GEMINI_BASE}/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`;

  let res;
  for (let attempt = 0; ; attempt++) {
    try {
      res = await fetch(url, { method: 'POST', signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) });
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      throw new ProviderError('network', 'Could not reach Gemini. Check your connection and try again.');
    }
    if (res.ok) break;
    if ((res.status === 429 || res.status >= 500) && attempt < 2) { await new Promise((r) => setTimeout(r, 1500 * (attempt + 1))); continue; }
    throw geminiError(res.status, await res.text());
  }

  const decoder = new TextDecoder();
  let buf = '', text = '', finish = '', blocked = false;
  const take = (line) => {
    if (!line.startsWith('data:')) return;
    let ev;
    try { ev = JSON.parse(line.slice(5)); } catch { return; }
    if (ev.promptFeedback?.blockReason) blocked = true;
    const cand = ev.candidates?.[0];
    if (!cand) return;
    for (const p of cand.content?.parts || []) {
      if (p.thought || typeof p.text !== 'string') continue; // skip the model's thinking summary
      text += p.text;
      onText(p.text);
    }
    if (cand.finishReason) finish = cand.finishReason;
  };
  for await (const chunk of res.body) {
    buf += decoder.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) { take(buf.slice(0, i).replace(/\r$/, '')); buf = buf.slice(i + 1); }
  }
  take(buf.trim());

  if (blocked || ['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII'].includes(finish)) return { text, stop: 'refusal' };
  if (finish === 'MAX_TOKENS') return { text, stop: 'max_tokens' };
  return { text, stop: 'ok' };
}

// ── Claude ─────────────────────────────────────────────────────────
const CLAUDE_MODEL = 'claude-opus-5-5';

export async function streamClaude({ key, task, messages, signal, onText, onReset }) {
  const client = new Anthropic({ apiKey: key, maxRetries: 2 });
  const params = {
    model: CLAUDE_MODEL,
    max_tokens: task.maxTokens,
    system: task.system,
    messages,
    thinking: { type: 'adaptive' },
    output_config: { effort: task.effort },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  };
  if (task.mode === 'json') params.output_config.format = { type: 'json_schema', schema: task.schema };

  try {
    const stream = client.beta.messages.stream(params, { signal });
    let text = '';
    for await (const event of stream) {
      if (event.type === 'content_block_start' && event.content_block.type === 'fallback') {
        text = '';
        onReset();
      } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        text += event.delta.text;
        onText(event.delta.text);
      }
    }
    const final = await stream.finalMessage();
    return { text, stop: final.stop_reason === 'refusal' ? 'refusal' : final.stop_reason === 'max_tokens' ? 'max_tokens' : 'ok' };
  } catch (err) {
    if (err.name === 'AbortError' || signal?.aborted) throw err;
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) throw new ProviderError('bad_key', 'That API key was rejected. Check it in Settings.');
    if (err instanceof Anthropic.RateLimitError) throw new ProviderError('rate_limit', 'Too many requests right now — wait a minute and try again.');
    if (err instanceof Anthropic.APIConnectionError) throw new ProviderError('network', 'Could not reach Claude. Check your connection and try again.');
    throw new ProviderError('api_error', err?.message || 'Something went wrong talking to Claude.');
  }
}
