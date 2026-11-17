import { rateLimited, getKey, toContents } from './_lib/gemini.js';
import { json, readJson, MOCK, sameOrigin, str } from './_lib/http.js';
import { currentUser } from './_lib/session.js';
import { runAgent, toolsFor, systemPrompt } from './_lib/agent.js';
import { validZone } from './_lib/schedule.js';
import { store } from './_lib/store.js';

// One assistant turn, streamed as server-sent events:
//   thought, text, sources, step (an app action), confirm (needs approval), error, done
export async function POST(req) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  if (rateLimited(req)) return json({ error: 'Too many messages. Wait a minute and try again.' }, 429);
  const body = await readJson(req);
  const key = getKey(req);
  if (!key && !MOCK) return json({ error: 'No Gemini API key yet. Add one in Settings, or set GEMINI_API_KEY on the server.', code: 'no_key' }, 401);

  const user = await currentUser(req);
  let tz = validZone(body.timezone) ? body.timezone : (user?.timezone || 'UTC');
  if (user && validZone(body.timezone) && body.timezone !== user.timezone) (await store()).updateUser(user.id, { timezone: body.timezone }).catch(() => {});

  let contents = null;
  let system = '';
  const resume = body.resume && typeof body.resume.id === 'string' ? { id: body.resume.id, approve: !!body.resume.approve, edits: body.resume.edits && typeof body.resume.edits === 'object' ? body.resume.edits : null } : null;
  if (!resume) {
    try { contents = toContents(body.messages); } catch (e) { return json({ error: e.message }, 400); }
    const { apps } = await toolsFor(user).catch(() => ({ apps: [] }));
    system = systemPrompt({ user, tz, apps, instructions: str(body.instructions), search: !!body.search });
  } else if (!user) return json({ error: 'Sign in to approve actions' }, 401);

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (t, v) => { try { controller.enqueue(enc.encode(`data: ${JSON.stringify({ t, v })}\n\n`)); } catch {} };
      const r = await runAgent({ user, key, contents, system, mode: body.mode === 'think' ? 'think' : 'fast', search: !!body.search, send, signal: req.signal, resume, tz });
      send('done', { paused: !!r.paused });
      controller.close();
    },
  });
  return new Response(stream, { headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store, no-transform', 'x-accel-buffering': 'no' } });
}
