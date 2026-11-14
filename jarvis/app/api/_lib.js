// Shared helpers for the Jarvis server functions (files starting with _ are not routes).

const GATEWAY = 'https://ai-gateway.vercel.sh/v1/chat/completions';
// Tried in order until one answers (free AI Gateway credit covers a subset of models).
const MODELS = (process.env.JARVIS_MODELS || 'google/gemini-2.5-flash,google/gemini-2.0-flash,google/gemini-2.5-flash-lite,openai/gpt-4.1-mini,openai/gpt-4o-mini')
  .split(',').map((s) => s.trim()).filter(Boolean);

function gatewayToken(req) {
  return (req && req.headers && req.headers['x-vercel-oidc-token']) || process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY || '';
}

let workingModel = null;

/** OpenAI-compatible chat call through Vercel AI Gateway. Returns the first choice message. */
async function llm(req, body) {
  const token = gatewayToken(req);
  if (!token) throw new Error('AI is not available on this deployment (no gateway token).');
  const order = workingModel ? [workingModel].concat(MODELS.filter((m) => m !== workingModel)) : MODELS;
  let lastErr = 'no model answered';
  for (const model of order) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(GATEWAY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(Object.assign({ model, temperature: 0.4 }, body)),
      });
      const text = await res.text();
      if (res.ok) {
        workingModel = model;
        const j = JSON.parse(text);
        return j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message : { content: '' };
      }
      lastErr = model + ' ' + res.status + ': ' + text.slice(0, 200);
      if (res.status === 429 || res.status >= 500) { await sleep(800 * (attempt + 1)); continue; }
      break; // 4xx: try the next model
    }
  }
  throw new Error(lastErr);
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (_) { return {}; } }
  return await new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (_) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

function authorised(body) {
  const key = process.env.JARVIS_KEY;
  return !!key && body && String(body.key || '') === key;
}

/** Call the user's Google Apps Script (Gmail, Calendar, reminders, background timer). */
async function gas(gasInfo, payload) {
  if (!gasInfo || !gasInfo.url || !gasInfo.secret) {
    return { ok: false, error: 'Google is not connected yet. In the Jarvis app, open Settings and tap "Connect Google".' };
  }
  const res = await fetch(gasInfo.url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(Object.assign({}, payload, { secret: gasInfo.secret, client: 'server' })),
    redirect: 'follow',
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch (_) {
    return { ok: false, error: 'Your Google script did not answer properly. Make sure it is deployed with access "Anyone".' };
  }
}

module.exports = { llm, cors, readBody, authorised, gas, sleep };
