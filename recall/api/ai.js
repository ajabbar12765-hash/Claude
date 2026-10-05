import { TASKS } from '../lib/tasks.js';
import { pickProvider, streamGemini, streamClaude, ProviderError } from '../lib/providers.js';

// POST /api/ai  { task, input }  ->  newline-delimited JSON events:
//   {t:"status", msg}            what the model is doing
//   {t:"delta", text}            streamed text (text tasks)
//   {t:"progress", n}            items written so far (json tasks)
//   {t:"reset"}                  the model restarted its answer
//   {t:"result", data}           parsed result (json tasks)
//   {t:"done"}
//   {t:"error", code, message}

const MAX_BODY = 4_000_000;

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY) throw Object.assign(new Error('Request too large'), { code: 'too_large' });
  }
  return JSON.parse(raw || '{}');
}

// Rough "how far along" signal for JSON answers: count the item keys seen so far.
const PROGRESS_KEY = { course: '"objectives"', exam: '"prompt"', verify: '"verdict"', grade: '"feedback"', cards: '"front"' };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end('Method not allowed');
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Accel-Buffering', 'no');
  const send = (event) => res.write(JSON.stringify(event) + '\n');
  const fail = (code, message) => { send({ t: 'error', code, message }); res.end(); };

  let body;
  try {
    body = await readBody(req);
  } catch (err) {
    return fail(err.code || 'bad_request', err.message || 'Could not read the request.');
  }

  const task = TASKS[body.task];
  if (!task) return fail('bad_request', `Unknown task "${body.task}".`);

  const provider = pickProvider(req.headers['x-recall-key']);
  if (!provider) return fail('no_key', 'No AI key is set up yet. Add your key in Settings, or set GEMINI_API_KEY on the server.');

  let messages;
  try {
    messages = task.build(body.input || {});
  } catch {
    return fail('bad_request', 'Some course details were missing for this request.');
  }

  send({ t: 'status', msg: task.status });

  const ctrl = new AbortController();
  res.on('close', () => { if (!res.writableEnded) ctrl.abort(); });

  let text = '';
  let lastCount = 0;
  const key = PROGRESS_KEY[body.task];
  const onText = (chunk) => {
    text += chunk;
    if (task.mode === 'text') send({ t: 'delta', text: chunk });
    else if (key) {
      const n = text.split(key).length - 1;
      if (n !== lastCount) { lastCount = n; send({ t: 'progress', n }); }
    }
  };
  const onReset = () => { text = ''; lastCount = 0; send({ t: 'reset' }); };

  try {
    const run = provider.name === 'gemini' ? streamGemini : streamClaude;
    const out = await run({ key: provider.key, task, messages, signal: ctrl.signal, onText, onReset });

    if (out.stop === 'refusal') return fail('refusal', 'The AI declined this request. Try rewording the syllabus or topic.');
    if (out.stop === 'max_tokens') return fail('too_long', 'The answer ran out of room. Try fewer questions or a shorter syllabus.');
    if (task.mode === 'json') {
      let data;
      try {
        data = JSON.parse(out.text);
      } catch {
        return fail('bad_output', 'The AI returned something unreadable. Please try again.');
      }
      send({ t: 'result', data });
    }
    send({ t: 'done' });
    res.end();
  } catch (err) {
    if (err.name === 'AbortError') return res.end();
    if (err instanceof ProviderError) return fail(err.code, err.message);
    fail('api_error', err?.message || 'Something went wrong talking to the AI.');
  }
}
