// Runs one automatic task with nobody watching, stores the result and emails it to the owner.
import { store } from './store.js';
import { runAgent, toolsFor, systemPrompt } from './agent.js';
import { nextRun, describe } from './schedule.js';
import { gmailTools } from './tools-google.js';
import { googleApps } from './google.js';
import { MOCK } from './http.js';

export function publicTask(t) {
  return {
    id: t.id, title: t.title, prompt: t.prompt, schedule: t.schedule, timezone: t.timezone, when: describe(t.schedule, t.timezone),
    next_run_at: t.next_run_at ? new Date(t.next_run_at).toISOString() : null, enabled: t.enabled, can_act: t.can_act,
    deliver_email: t.deliver_email, last_status: t.last_status,
  };
}

export async function runTask(task, { deadlineMs = 50_000 } = {}) {
  const s = await store();
  const user = await s.getUser(task.user_id);
  if (!user) return null;
  const run = await s.addRun({ task_id: task.id, user_id: user.id });
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  let text = '';
  let errorMsg = '';
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), deadlineMs);
  let result = {};
  try {
    if (!key && !MOCK) throw new Error('Automatic tasks need GEMINI_API_KEY set on the server');
    const { apps } = await toolsFor(user);
    const system = systemPrompt({ user, tz: task.timezone, apps, instructions: '' }) +
      `\n\nThis is the automatic task “${task.title}”, running on its schedule (${describe(task.schedule, task.timezone)}). Nobody is watching: do the work with your tools, then write the result as a short, skimmable report for the user. Do not ask questions.${task.can_act ? '' : ' You may only read; for anything that would change or send something, say what you would do instead.'}`;
    result = await runAgent({
      user, key, system, tz: task.timezone, mode: 'fast', policy: 'task', canAct: task.can_act, signal: ac.signal,
      contents: [{ role: 'user', parts: [{ text: task.prompt }] }],
      send: (t, v) => { if (t === 'text') text += v; if (t === 'error') errorMsg = v; },
    });
    if (result.aborted) errorMsg = 'The task took too long and was stopped';
  } catch (e) { errorMsg = e.message; } finally { clearTimeout(timer); }

  const ok = !errorMsg && text.trim().length > 0;
  const output = ok ? text.trim() : `This run failed: ${errorMsg || 'no answer'}`;
  let emailed = false;
  if (task.deliver_email) {
    const g = (await s.listConnections(user.id)).find((c) => c.kind === 'google');
    if (g && googleApps(g).includes('gmail')) {
      try {
        const send = gmailTools.find((t) => t.name === 'gmail_send');
        await send.run({ to: user.email, subject: `Tern: ${task.title}`, body: `${output}\n\n—\nSent by your Tern task “${task.title}” (${describe(task.schedule, task.timezone)}).` }, { conn: g, user });
        emailed = true;
      } catch {}
    }
  }
  const finished = await s.finishRun(run.id, { status: ok ? 'ok' : 'error', output, steps: (result.steps || []).map(({ app, label, status, detail }) => ({ app, label, status, detail })), emailed });
  const latest = await s.getTask(user.id, task.id);
  if (latest) await s.saveTask({ ...latest, last_status: ok ? 'ok' : 'error', enabled: latest.schedule?.freq === 'once' ? false : latest.enabled });
  return finished;
}

// Claim due tasks atomically, then run them in parallel within the function's time limit.
export async function runDue({ limit = 6 } = {}) {
  const s = await store();
  const now = new Date();
  const due = await s.dueTasks(now.toISOString(), limit);
  const claimed = [];
  for (const t of due) {
    const next = nextRun(t.schedule, t.timezone, now);
    if (await s.claimTask(t.id, t.next_run_at, next ? next.toISOString() : null)) claimed.push(t);
  }
  const results = await Promise.allSettled(claimed.map((t) => runTask(t, { deadlineMs: 48_000 })));
  return { due: due.length, ran: claimed.length, ok: results.filter((r) => r.status === 'fulfilled' && r.value?.status === 'ok').length };
}
