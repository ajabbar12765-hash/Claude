// Talks to /api/claude, which streams newline-delimited JSON events back.
import { state } from './store.js';

export class AIError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export async function run(task, input, { onStatus, onDelta, onProgress, onReset, signal } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.settings.apiKey) headers['x-recall-key'] = state.settings.apiKey.trim();

  let res;
  try {
    res = await fetch('api/claude', { method: 'POST', headers, body: JSON.stringify({ task, input }), signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new AIError('network', 'Could not reach the Recall server. Check your connection and try again.');
  }
  if (!res.ok || !res.body) {
    if (res.status === 404 || res.status === 405 || res.status === 501) {
      throw new AIError('no_server', 'The AI server isn’t running here. Deploy Recall to Vercel (or run the dev server) to generate lessons and exams.');
    }
    if (res.status === 413) throw new AIError('too_large', 'That file is too large. Try pasting the syllabus text instead.');
    throw new AIError('api_error', `The server answered with an error (${res.status}). Please try again.`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '', text = '', result, done = false;

  const handle = (line) => {
    if (!line.trim()) return;
    let ev;
    try { ev = JSON.parse(line); } catch { return; }
    switch (ev.t) {
      case 'status': onStatus?.(ev.msg); break;
      case 'delta': text += ev.text; onDelta?.(ev.text, text); break;
      case 'progress': onProgress?.(ev.n); break;
      case 'reset': text = ''; onReset?.(); break;
      case 'result': result = ev.data; break;
      case 'done': done = true; break;
      case 'error': throw new AIError(ev.code, ev.message);
    }
  };

  while (true) {
    const { value, done: end } = await reader.read();
    if (end) break;
    buf += decoder.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      handle(line);
    }
  }
  handle(buf);
  if (!done && result === undefined) throw new AIError('cut_off', 'The connection closed before Claude finished. Please try again.');
  return result !== undefined ? result : text;
}

// Run jobs with at most `limit` in flight.
export async function pool(jobs, limit = 4) {
  const out = new Array(jobs.length);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const i = next++;
      out[i] = await jobs[i]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, worker));
  return out;
}

export function explainError(err) {
  if (err?.name === 'AbortError') return '';
  const msg = err?.message || 'Something went wrong.';
  const needsKey = ['no_key', 'bad_key'].includes(err?.code);
  return { msg, needsKey, offline: err?.code === 'no_server' };
}
