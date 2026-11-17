// The agent loop: Gemini function calling over the user's connected apps.
// Reads run straight away; writes pause for the user's approval (or, in tasks, need "can act").
import { generate, SYSTEM, AGENT_RULES, ModelError } from './gemini.js';
import { store } from './store.js';
import { encrypt, decrypt, MOCK } from './http.js';
import { googleApps } from './google.js';
import { googleToolsFor } from './tools-google.js';
import { mcpToolsFor, listTools } from './mcp.js';
import { nextRun, normalize, describe, zonedToUtc } from './schedule.js';
import { AppError } from './google.js';

const MAX_ROUNDS = 8;
const clipJson = (v, n = 24000) => { const s = JSON.stringify(v ?? null); return s.length > n ? { truncated: true, text: s.slice(0, n) } : v; };

function coreTools(user) {
  const tools = [{
    name: 'web_search', app: 'web',
    description: 'Search the live web and get a short factual answer with sources. Use for news, prices, facts after your training, or anything you are unsure of.',
    parameters: { type: 'object', properties: { query: { type: 'string', description: 'What to search for' } }, required: ['query'] },
    label: (a) => `Searched the web for “${a.query}”`,
    async run(a, ctx) {
      const r = await generate({ key: ctx.key, contents: [{ role: 'user', parts: [{ text: a.query }] }], system: 'Answer with the key facts, dates and numbers in a few lines.', search: true, signal: ctx.signal });
      if (r.sources.length) ctx.addSources(r.sources);
      return { answer: r.text, sources: r.sources };
    },
  }];
  if (!user) return tools;
  tools.push({
    name: 'create_task', app: 'tasks', write: true,
    description: 'Create an automatic task that runs on a schedule, even when the app is closed, and emails the user the result. Use for "every morning…", "each Friday…", "remind me tomorrow at 9…".',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short name' },
        prompt: { type: 'string', description: 'What to do each run, written as an instruction to yourself' },
        freq: { type: 'string', enum: ['once', 'hourly', 'daily', 'weekdays', 'weekly'] },
        time: { type: 'string', description: 'Local time HH:MM (24h)' },
        days: { type: 'array', items: { type: 'integer' }, description: 'For weekly: 1=Mon … 7=Sun' },
        at: { type: 'string', description: 'For once: local date and time, YYYY-MM-DDTHH:MM' },
      },
      required: ['title', 'prompt', 'freq'],
    },
    label: (a) => `Create task “${a.title}”`,
    preview: (a, ctx) => ({ kind: 'task', editable: ['title', 'prompt'], fields: { title: a.title, prompt: a.prompt, when: describe(scheduleFrom(a, ctx.tz), ctx.tz) + ` (${ctx.tz})` } }),
    async run(a, ctx) {
      const schedule = scheduleFrom(a, ctx.tz);
      const next = nextRun(schedule, ctx.tz);
      const t = await (await store()).saveTask({ user_id: user.id, title: String(a.title).slice(0, 80), prompt: String(a.prompt).slice(0, 4000), schedule, timezone: ctx.tz, deliver_email: true, can_act: false, enabled: true, next_run_at: next ? next.toISOString() : null });
      return { created: true, id: t.id, schedule: describe(schedule, ctx.tz), next_run: next ? next.toLocaleString('en-GB', { timeZone: ctx.tz, dateStyle: 'medium', timeStyle: 'short' }) : null };
    },
  }, {
    name: 'list_tasks', app: 'tasks',
    description: 'List the user\'s automatic tasks.',
    parameters: { type: 'object', properties: {} },
    label: () => 'Checked your tasks',
    async run(_, ctx) {
      const list = await (await store()).listTasks(user.id);
      return { tasks: list.map((t) => ({ title: t.title, schedule: describe(t.schedule, t.timezone), enabled: t.enabled, next_run: t.next_run_at })) };
    },
  });
  return tools;
}

function scheduleFrom(a, tz) {
  const s = { freq: a.freq, time: a.time, days: a.days };
  if (a.freq === 'once' && a.at) {
    const m = String(a.at).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (m) s.at = zonedToUtc(+m[1], +m[2], +m[3], +m[4], +m[5], tz).toISOString();
  }
  return normalize(s);
}

// Everything the model can call for this user, keyed by function name.
export async function toolsFor(user, { onlyApps } = {}) {
  const list = coreTools(user);
  const apps = [];
  if (user) {
    const s = await store();
    for (const conn of await s.listConnections(user.id)) {
      if (conn.kind === 'google') {
        const enabled = googleApps(conn);
        for (const t of googleToolsFor(enabled)) list.push({ ...t, conn });
        apps.push(...enabled);
      } else if (conn.kind === 'mcp' && conn.status === 'connected') {
        let c = conn;
        if (!c.tools_cache?.tools) { try { await listTools(c, { fresh: true }); c = await s.getConnection(user.id, c.id); } catch { continue; } }
        for (const t of mcpToolsFor(c)) list.push({ ...t, conn: c });
        apps.push(c.name);
      }
    }
  }
  const filtered = onlyApps ? list.filter((t) => onlyApps.includes(t.app) || t.app === 'web') : list;
  return { tools: Object.fromEntries(filtered.slice(0, 120).map((t) => [t.name, t])), apps };
}

const isWrite = (tool, args) => (typeof tool.write === 'function' ? tool.write(args) : !!tool.write);

export function systemPrompt({ user, tz, apps, instructions, search }) {
  const nowLocal = new Date().toLocaleString('en-GB', { timeZone: tz, dateStyle: 'full', timeStyle: 'short' });
  let s = `${SYSTEM}\n\nNow: ${nowLocal} (${tz}). Use this time zone for dates the user mentions.`;
  if (user) s += `\nThe user is ${user.name || 'the account owner'} <${user.email}>.${apps.length ? ` Connected apps: ${apps.join(', ')}.` : ' No apps are connected yet; if they ask for something in their email, calendar or other apps, tell them to connect it under Apps.'}\n${AGENT_RULES}`;
  else s += '\nThe user is not signed in, so you cannot reach their email, calendar or other apps. If they ask, tell them to sign in with Google under Apps.';
  if (search) s += '\nThe user turned on Search: use web_search before answering anything factual.';
  if (instructions) s += `\n\nThe user's own instructions, follow them:\n${instructions}`;
  return s;
}

/**
 * Run (or resume) one agent turn.
 * send(t, v): 'thought' | 'text' | 'sources' | 'step' | 'confirm' | 'error'
 * policy: 'interactive' pauses on writes; 'task' runs writes only if canAct.
 */
export async function runAgent({ user, key, contents, system, mode, search, send, policy = 'interactive', canAct = false, signal, resume, tz = 'UTC' }) {
  const think = mode === 'think';
  const { tools } = await toolsFor(user);
  const decls = Object.values(tools).map((t) => ({ name: t.name, description: t.description, parameters: t.parameters }));
  const steps = [];
  const sources = [];
  let finalText = '';
  const ctx = { key, signal, tz, user, addSources: (s) => { for (const x of s) if (!sources.some((y) => y.url === x.url)) sources.push(x); send('sources', sources.slice(0, 12)); } };

  const step = (s) => {
    const i = steps.findIndex((x) => x.id === s.id);
    if (i >= 0) steps[i] = { ...steps[i], ...s }; else steps.push(s);
    send('step', steps[i >= 0 ? i : steps.length - 1]);
  };

  async function execute(call, tool, args) {
    const id = `${call.name}-${steps.length}-${Date.now().toString(36)}`;
    step({ id, app: tool.appName || tool.app, label: safeLabel(tool, args), status: 'running' });
    try {
      const result = await tool.run(args, { ...ctx, conn: tool.conn });
      step({ id, status: 'done', detail: detailOf(result) });
      return { result: clipJson(result) };
    } catch (e) {
      step({ id, status: 'error', detail: e.message });
      return { error: e.message || 'failed' };
    }
  }

  // Process function calls from index i; returns 'paused' or the list of responses.
  async function process(calls, i, responses) {
    for (; i < calls.length; i++) {
      const call = calls[i];
      const tool = tools[call.name];
      if (!tool) { responses.push({ name: call.name, id: call.id, response: { error: 'Unknown tool' } }); continue; }
      const args = call.args || {};
      if (isWrite(tool, args)) {
        if (policy === 'task') {
          if (!canAct) {
            step({ id: `${call.name}-denied-${i}`, app: tool.appName || tool.app, label: safeLabel(tool, args), status: 'denied', detail: 'Automatic tasks can only read unless “Can act” is on' });
            responses.push({ name: call.name, id: call.id, response: { error: 'Not allowed: this automatic task may only read. Describe what you would do instead.' } });
            continue;
          }
        } else {
          const pendingId = await (await store()).savePending(user.id, encrypt({ contents, calls, i, responses, mode, search, system, tz, steps, sources }));
          const preview = tool.preview ? tool.preview(args, ctx) : { kind: 'generic', fields: args };
          send('confirm', { pendingId, app: tool.appName || tool.app, label: safeLabel(tool, args), preview });
          return 'paused';
        }
      }
      responses.push({ name: call.name, id: call.id, response: await execute(call, tool, args) });
    }
    return responses;
  }

  const fnParts = (responses) => responses.map((r) => ({ functionResponse: { name: r.name, ...(r.id ? { id: r.id } : {}), response: r.response } }));

  try {
    if (resume) {
      if (!user) throw new AppError('Sign in to approve actions');
      const enc = await (await store()).takePending(user.id, resume.id);
      if (!enc) throw new AppError('This action has expired or was already handled');
      const st = decrypt(enc);
      Object.assign(ctx, { tz: st.tz });
      contents = st.contents; system = st.system; mode = st.mode; tz = st.tz;
      steps.push(...(st.steps || [])); sources.push(...(st.sources || []));
      const call = st.calls[st.i];
      const tool = tools[call.name];
      let resp;
      if (!tool) resp = { error: 'That app is no longer connected' };
      else if (resume.approve) {
        const args = { ...(call.args || {}) };
        const editable = tool.preview?.(call.args || {}, ctx)?.editable || [];
        for (const k of editable) if (resume.edits && typeof resume.edits[k] === 'string') args[k] = resume.edits[k].slice(0, 20000);
        resp = await execute(call, tool, args);
      } else {
        step({ id: `${call.name}-declined-${Date.now()}`, app: tool.appName || tool.app, label: safeLabel(tool, call.args || {}), status: 'denied', detail: 'You cancelled this' });
        resp = { error: 'The user cancelled this action. Do not retry it; ask what they would like instead if it is unclear.' };
      }
      const responses = [...st.responses, { name: call.name, id: call.id, response: resp }];
      const out = await process(st.calls, st.i + 1, responses);
      if (out === 'paused') return { paused: true, steps, sources };
      contents.push({ role: 'user', parts: fnParts(out) });
    }

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const r = await generate({ key, contents, system, tools: decls, search, think: think && round === 0, signal, onEvent: (t, v) => { if (t === 'sources') ctx.addSources(v); else { if (t === 'text') finalText += v; send(t, v); } } });
      if (!r.calls.length) return { text: finalText, steps, sources };
      contents.push({ role: 'model', parts: r.parts });
      const out = await process(r.calls, 0, []);
      if (out === 'paused') return { paused: true, text: finalText, steps, sources };
      contents.push({ role: 'user', parts: fnParts(out) });
    }
    send('text', '\n\nI stopped after several steps to keep this quick. Say “continue” to keep going.');
    return { text: finalText, steps, sources };
  } catch (e) {
    if (e.name === 'AbortError') return { aborted: true, steps };
    send('error', e instanceof ModelError || e instanceof AppError ? e.message : 'Something went wrong. Try again.');
    if (!(e instanceof ModelError || e instanceof AppError) && !MOCK) console.error(e);
    return { error: e.message, steps };
  }
}

function safeLabel(tool, args) { try { return tool.label ? tool.label(args) : tool.name; } catch { return tool.name; } }
function detailOf(r) {
  if (!r || typeof r !== 'object') return '';
  if (Array.isArray(r.messages)) return `${r.messages.length} email${r.messages.length === 1 ? '' : 's'}`;
  if (Array.isArray(r.events)) return `${r.events.length} event${r.events.length === 1 ? '' : 's'}`;
  if (Array.isArray(r.files)) return `${r.files.length} file${r.files.length === 1 ? '' : 's'}`;
  if (Array.isArray(r.free)) return `${r.free.length} free slot${r.free.length === 1 ? '' : 's'}`;
  if (r.sent) return 'Sent';
  if (r.drafted) return 'Saved to Drafts';
  if (r.created) return 'Created';
  if (r.updated !== undefined) return 'Updated';
  if (r.deleted || r.trashed) return 'Done';
  if (Array.isArray(r.sources)) return `${r.sources.length} source${r.sources.length === 1 ? '' : 's'}`;
  return '';
}
