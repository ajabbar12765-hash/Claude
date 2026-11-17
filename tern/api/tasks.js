import { json, readJson, sameOrigin, str } from './_lib/http.js';
import { currentUser } from './_lib/session.js';
import { store } from './_lib/store.js';
import { nextRun, normalize, validZone } from './_lib/schedule.js';
import { runTask, publicTask } from './_lib/tasks.js';

export async function GET(req) {
  const user = await currentUser(req);
  if (!user) return json({ error: 'Sign in to use tasks', code: 'signin' }, 401);
  const url = new URL(req.url);
  const s = await store();
  if (url.searchParams.get('step') === 'runs') {
    const runs = await s.listRuns(user.id, url.searchParams.get('id') || null, 30);
    return json({ runs: runs.map((r) => ({ id: r.id, task_id: r.task_id, title: r.title, status: r.status, output: r.output, steps: r.steps, emailed: r.emailed, read: r.read, started_at: new Date(r.started_at).toISOString() })) });
  }
  return json({ tasks: (await s.listTasks(user.id)).map(publicTask), serverKey: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.TERN_MOCK === '1') });
}

function clean(b, base = {}) {
  const tz = validZone(b.timezone) ? b.timezone : base.timezone || 'UTC';
  const t = { ...base, timezone: tz };
  if ('title' in b) t.title = str(b.title, 80) || 'Task';
  if ('prompt' in b) t.prompt = str(b.prompt, 4000);
  if ('schedule' in b) t.schedule = normalize(b.schedule);
  if ('enabled' in b) t.enabled = !!b.enabled;
  if ('can_act' in b) t.can_act = !!b.can_act;
  if ('deliver_email' in b) t.deliver_email = !!b.deliver_email;
  const n = t.enabled === false ? null : nextRun(t.schedule, tz);
  t.next_run_at = n ? n.toISOString() : null;
  return t;
}

export async function POST(req) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  const user = await currentUser(req);
  if (!user) return json({ error: 'Sign in to use tasks', code: 'signin' }, 401);
  const url = new URL(req.url);
  const s = await store();
  if (url.searchParams.get('step') === 'run') {
    const t = await s.getTask(user.id, url.searchParams.get('id') || '');
    if (!t) return json({ error: 'Task not found' }, 404);
    const run = await runTask(t);
    return json({ run: { status: run.status, output: run.output, steps: run.steps, emailed: run.emailed } });
  }
  if (url.searchParams.get('step') === 'read') { await s.markRunsRead(user.id); return json({ ok: true }); }
  const b = await readJson(req);
  const t = clean({ title: '', prompt: '', schedule: {}, enabled: true, can_act: false, deliver_email: true, ...b }, { user_id: user.id, timezone: user.timezone });
  if (!t.prompt) return json({ error: 'Say what the task should do' }, 400);
  if ((await s.listTasks(user.id)).length >= 25) return json({ error: 'You can have up to 25 tasks' }, 400);
  return json({ task: publicTask(await s.saveTask(t)) });
}

export async function PATCH(req) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  const user = await currentUser(req);
  if (!user) return json({ error: 'Sign in to use tasks', code: 'signin' }, 401);
  const s = await store();
  const b = await readJson(req);
  const old = await s.getTask(user.id, str(b.id, 64));
  if (!old) return json({ error: 'Task not found' }, 404);
  const t = clean(b, old);
  if (!t.prompt) return json({ error: 'Say what the task should do' }, 400);
  return json({ task: publicTask(await s.saveTask(t)) });
}

export async function DELETE(req) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  const user = await currentUser(req);
  if (!user) return json({ error: 'Not signed in' }, 401);
  await (await store()).deleteTask(user.id, new URL(req.url).searchParams.get('id') || '');
  return new Response(null, { status: 204 });
}
