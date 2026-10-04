import Anthropic from '@anthropic-ai/sdk';
import { TASKS } from '../lib/tasks.js';

// POST /api/claude  { task, input }  ->  newline-delimited JSON events:
//   {t:"status", msg}            what the model is doing
//   {t:"delta", text}            streamed text (text tasks)
//   {t:"progress", n}            items written so far (json tasks)
//   {t:"reset"}                  a fallback model restarted the answer
//   {t:"result", data}           parsed result (json tasks)
//   {t:"done"}
//   {t:"error", code, message}

const MODEL = 'claude-opus-5-5';
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

  let body;
  try {
    body = await readBody(req);
  } catch (err) {
    send({ t: 'error', code: err.code || 'bad_request', message: err.message || 'Could not read the request.' });
    return res.end();
  }

  const task = TASKS[body.task];
  if (!task) {
    send({ t: 'error', code: 'bad_request', message: `Unknown task "${body.task}".` });
    return res.end();
  }

  const apiKey = req.headers['x-recall-key'] || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    send({ t: 'error', code: 'no_key', message: 'No Claude API key is set up. Add your key in Settings, or set ANTHROPIC_API_KEY on the server.' });
    return res.end();
  }

  const client = new Anthropic({ apiKey, maxRetries: 2 });
  let messages;
  try {
    messages = task.build(body.input || {});
  } catch {
    send({ t: 'error', code: 'bad_request', message: 'Some course details were missing for this request.' });
    return res.end();
  }

  send({ t: 'status', msg: task.status });

  const params = {
    model: MODEL,
    max_tokens: task.maxTokens,
    system: task.system,
    messages,
    thinking: { type: 'adaptive' },
    output_config: { effort: task.effort },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  };
  if (task.mode === 'json') params.output_config.format = { type: 'json_schema', schema: task.schema };

  let closed = false;
  req.on?.('close', () => { closed = true; });

  try {
    const stream = client.beta.messages.stream(params);
    let text = '';
    let lastCount = 0;
    const key = PROGRESS_KEY[body.task];

    for await (const event of stream) {
      if (closed) { stream.abort(); return; }
      if (event.type === 'content_block_start' && event.content_block.type === 'fallback') {
        // The first model declined part-way; the fallback model starts over.
        text = '';
        lastCount = 0;
        send({ t: 'reset' });
      } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        text += event.delta.text;
        if (task.mode === 'text') {
          send({ t: 'delta', text: event.delta.text });
        } else if (key) {
          const n = text.split(key).length - 1;
          if (n !== lastCount) { lastCount = n; send({ t: 'progress', n }); }
        }
      }
    }

    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') {
      send({ t: 'error', code: 'refusal', message: 'Claude declined this request. Try rewording the syllabus or topic.' });
      return res.end();
    }
    if (final.stop_reason === 'max_tokens') {
      send({ t: 'error', code: 'too_long', message: 'The answer ran out of room. Try fewer questions or a shorter syllabus.' });
      return res.end();
    }
    if (task.mode === 'json') {
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        send({ t: 'error', code: 'bad_output', message: 'Claude returned something unreadable. Please try again.' });
        return res.end();
      }
      send({ t: 'result', data });
    }
    send({ t: 'done' });
  } catch (err) {
    let code = 'api_error';
    let message = err?.message || 'Something went wrong talking to Claude.';
    if (err instanceof Anthropic.AuthenticationError) { code = 'bad_key'; message = 'That API key was rejected. Check it in Settings.'; }
    else if (err instanceof Anthropic.PermissionDeniedError) { code = 'bad_key'; message = 'This API key cannot use the model. Check your Anthropic Console.'; }
    else if (err instanceof Anthropic.RateLimitError) { code = 'rate_limit'; message = 'Too many requests right now — wait a minute and try again.'; }
    else if (err instanceof Anthropic.BadRequestError) { code = 'bad_request'; }
    else if (err instanceof Anthropic.APIConnectionError) { code = 'network'; message = 'Could not reach Claude. Check your connection and try again.'; }
    else if (err instanceof Anthropic.APIError) { code = 'api_error'; }
    send({ t: 'error', code, message });
  }
  res.end();
}
