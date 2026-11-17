// Storage. Postgres when DATABASE_URL is set (Neon, Supabase or any Postgres 14+),
// otherwise a JSON file for local use and tests. Every query is scoped by user_id
// taken from the signed session, never from request input.
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import SCHEMA from './schema.js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let impl = null;

export function storeKind() { return process.env.DATABASE_URL ? 'postgres' : 'file'; }

export async function store() {
  if (impl) return impl;
  if (process.env.DATABASE_URL) {
    const { default: postgres } = await import('postgres');
    const sql = postgres(process.env.DATABASE_URL, { max: 3, idle_timeout: 20, prepare: false, ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL) ? false : 'require' });
    impl = pgStore((text, params = []) => sql.unsafe(text, params));
  } else {
    impl = fileStore(process.env.TERN_DATA_FILE || join(dirname(fileURLToPath(import.meta.url)), '../../.data/tern.json'));
  }
  await impl.migrate();
  return impl;
}
export function useStore(s) { impl = s; } // tests

const now = () => new Date().toISOString();
const J = (v) => (v === undefined || v === null ? null : JSON.stringify(v));

/* ---------------- Postgres ---------------- */
export function pgStore(q) {
  const one = async (t, p) => (await q(t, p))[0] || null;
  return {
    kind: 'postgres',
    async migrate() {
      for (const stmt of SCHEMA.split(/;\s*\n/).map((s) => s.replace(/--.*$/gm, '').trim()).filter(Boolean)) await q(stmt);
    },
    getUser: (id) => one('select * from users where id = $1', [id]),
    async upsertUser({ sub, email, name, timezone }) {
      return one(`insert into users (google_sub, email, name, timezone) values ($1,$2,$3,coalesce($4,'UTC'))
        on conflict (google_sub) do update set email = excluded.email, name = excluded.name, updated_at = now() returning *`, [sub, email, name || '', timezone || null]);
    },
    updateUser: (id, { timezone }) => one('update users set timezone = $2, updated_at = now() where id = $1 returning *', [id, timezone]),
    deleteUser: (id) => q('delete from users where id = $1', [id]),

    listConnections: (uid) => q('select * from connections where user_id = $1 order by created_at', [uid]),
    getConnection: (uid, id) => one('select * from connections where user_id = $1 and id = $2', [uid, id]),
    getConnectionByProvider: (uid, provider) => one('select * from connections where user_id = $1 and provider = $2', [uid, provider]),
    async saveConnection(c) {
      return one(`insert into connections (id, user_id, kind, provider, name, url, auth_type, scopes, secret_enc, expires_at, status, tools_cache, settings)
        values (coalesce($1::uuid, gen_random_uuid()),$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,coalesce($13::jsonb,'{}'::jsonb))
        on conflict (user_id, provider) do update set name=excluded.name, url=excluded.url, auth_type=excluded.auth_type, scopes=excluded.scopes,
          secret_enc=excluded.secret_enc, expires_at=excluded.expires_at, status=excluded.status, tools_cache=excluded.tools_cache, settings=excluded.settings, updated_at=now()
        returning *`,
      [c.id || null, c.user_id, c.kind, c.provider, c.name, c.url || null, c.auth_type || 'none', c.scopes || '', c.secret_enc || null, c.expires_at || null, c.status || 'connected', J(c.tools_cache), J(c.settings)]);
    },
    deleteConnection: (uid, id) => q('delete from connections where user_id = $1 and id = $2', [uid, id]),

    async savePending(uid, stateEnc) {
      await q('delete from pending_actions where expires_at < now()');
      return (await one('insert into pending_actions (user_id, state_enc) values ($1,$2) returning id', [uid, stateEnc])).id;
    },
    async takePending(uid, id) {
      const r = await one('delete from pending_actions where user_id = $1 and id = $2 and expires_at > now() returning state_enc', [uid, id]);
      return r ? r.state_enc : null;
    },

    listTasks: (uid) => q('select * from tasks where user_id = $1 order by created_at desc', [uid]),
    getTask: (uid, id) => one('select * from tasks where user_id = $1 and id = $2', [uid, id]),
    async saveTask(t) {
      return one(`insert into tasks (id, user_id, title, prompt, schedule, timezone, deliver_email, can_act, enabled, next_run_at, last_status)
        values (coalesce($1::uuid, gen_random_uuid()),$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11)
        on conflict (id) do update set title=excluded.title, prompt=excluded.prompt, schedule=excluded.schedule, timezone=excluded.timezone,
          deliver_email=excluded.deliver_email, can_act=excluded.can_act, enabled=excluded.enabled, next_run_at=excluded.next_run_at,
          last_status=excluded.last_status, updated_at=now()
        where tasks.user_id = excluded.user_id returning *`,
      [t.id || null, t.user_id, t.title, t.prompt, J(t.schedule), t.timezone, !!t.deliver_email, !!t.can_act, t.enabled !== false, t.next_run_at || null, t.last_status || null]);
    },
    deleteTask: (uid, id) => q('delete from tasks where user_id = $1 and id = $2', [uid, id]),
    dueTasks: (at, limit = 10) => q('select * from tasks where enabled and next_run_at <= $1 order by next_run_at limit $2', [at, limit]),
    async claimTask(id, oldNext, newNext) {
      const r = await q('update tasks set next_run_at = $3, updated_at = now() where id = $1 and next_run_at = $2 returning id', [id, oldNext, newNext]);
      return r.length === 1;
    },

    addRun: async (r) => (await one(`insert into task_runs (task_id, user_id, status) values ($1,$2,'running') returning *`, [r.task_id, r.user_id])),
    finishRun: (id, p) => one(`update task_runs set status=$2, output=$3, steps=$4::jsonb, emailed=$5, finished_at=now(), updated_at=now() where id=$1 returning *`, [id, p.status, p.output || '', J(p.steps || []), !!p.emailed]),
    listRuns: (uid, taskId, limit = 20) => taskId
      ? q('select * from task_runs where user_id = $1 and task_id = $2 order by started_at desc limit $3', [uid, taskId, limit])
      : q('select r.*, t.title from task_runs r join tasks t on t.id = r.task_id where r.user_id = $1 order by r.started_at desc limit $2', [uid, limit]),
    markRunsRead: (uid) => q('update task_runs set read = true where user_id = $1 and not read', [uid]),
    unreadRuns: async (uid) => Number((await one('select count(*)::int as n from task_runs where user_id = $1 and not read and status <> \'running\'', [uid])).n),
  };
}

/* ---------------- JSON file (local only) ---------------- */
export function fileStore(path) {
  let data = null;
  let chain = Promise.resolve();
  const load = async () => {
    if (data) return data;
    try { data = JSON.parse(await readFile(path, 'utf8')); } catch { data = {}; }
    for (const k of ['users', 'connections', 'pending', 'tasks', 'runs']) data[k] ||= [];
    return data;
  };
  const save = () => { chain = chain.then(async () => { await mkdir(dirname(path), { recursive: true }); await writeFile(path, JSON.stringify(data, null, 1)); }); return chain; };
  const mine = (list, uid) => list.filter((x) => x.user_id === uid);
  const copy = (x) => (x ? structuredClone(x) : null);
  return {
    kind: 'file',
    migrate: load,
    async getUser(id) { return copy((await load()).users.find((u) => u.id === id)); },
    async upsertUser({ sub, email, name, timezone }) {
      const d = await load();
      let u = d.users.find((x) => x.google_sub === sub);
      if (u) Object.assign(u, { email, name: name || '', updated_at: now() });
      else d.users.push(u = { id: randomUUID(), google_sub: sub, email, name: name || '', timezone: timezone || 'UTC', created_at: now(), updated_at: now() });
      await save(); return copy(u);
    },
    async updateUser(id, { timezone }) { const u = (await load()).users.find((x) => x.id === id); if (u) { u.timezone = timezone; u.updated_at = now(); await save(); } return copy(u); },
    async deleteUser(id) {
      const d = await load();
      d.users = d.users.filter((u) => u.id !== id);
      for (const k of ['connections', 'pending', 'tasks', 'runs']) d[k] = d[k].filter((x) => x.user_id !== id);
      await save();
    },
    async listConnections(uid) { return mine((await load()).connections, uid).map(copy); },
    async getConnection(uid, id) { return copy((await load()).connections.find((c) => c.user_id === uid && c.id === id)); },
    async getConnectionByProvider(uid, p) { return copy((await load()).connections.find((c) => c.user_id === uid && c.provider === p)); },
    async saveConnection(c) {
      const d = await load();
      const i = d.connections.findIndex((x) => x.user_id === c.user_id && x.provider === c.provider);
      const row = { status: 'connected', auth_type: 'none', scopes: '', settings: {}, ...(i >= 0 ? d.connections[i] : { id: randomUUID(), created_at: now() }), ...c, updated_at: now() };
      if (i >= 0) { row.id = d.connections[i].id; d.connections[i] = row; } else d.connections.push(row);
      await save(); return copy(row);
    },
    async deleteConnection(uid, id) { const d = await load(); d.connections = d.connections.filter((c) => !(c.user_id === uid && c.id === id)); await save(); },
    async savePending(uid, state_enc) {
      const d = await load();
      d.pending = d.pending.filter((p) => new Date(p.expires_at) > new Date());
      const id = randomUUID();
      d.pending.push({ id, user_id: uid, state_enc, expires_at: new Date(Date.now() + 3600e3).toISOString() });
      await save(); return id;
    },
    async takePending(uid, id) {
      const d = await load();
      const p = d.pending.find((x) => x.id === id && x.user_id === uid);
      if (!p) return null;
      d.pending = d.pending.filter((x) => x !== p); await save();
      return new Date(p.expires_at) > new Date() ? p.state_enc : null;
    },
    async listTasks(uid) { return mine((await load()).tasks, uid).sort((a, b) => b.created_at.localeCompare(a.created_at)).map(copy); },
    async getTask(uid, id) { return copy((await load()).tasks.find((t) => t.user_id === uid && t.id === id)); },
    async saveTask(t) {
      const d = await load();
      const i = t.id ? d.tasks.findIndex((x) => x.id === t.id && x.user_id === t.user_id) : -1;
      const row = { ...(i >= 0 ? d.tasks[i] : { id: randomUUID(), created_at: now() }), ...t, updated_at: now() };
      if (i >= 0) d.tasks[i] = row; else d.tasks.push(row);
      await save(); return copy(row);
    },
    async deleteTask(uid, id) { const d = await load(); d.tasks = d.tasks.filter((t) => !(t.user_id === uid && t.id === id)); d.runs = d.runs.filter((r) => r.task_id !== id); await save(); },
    async dueTasks(at, limit = 10) { return (await load()).tasks.filter((t) => t.enabled && t.next_run_at && t.next_run_at <= at).slice(0, limit).map(copy); },
    async claimTask(id, oldNext, newNext) {
      const t = (await load()).tasks.find((x) => x.id === id);
      if (!t || t.next_run_at !== oldNext) return false;
      t.next_run_at = newNext; await save(); return true;
    },
    async addRun(r) { const d = await load(); const row = { id: randomUUID(), status: 'running', output: '', steps: [], emailed: false, read: false, started_at: now(), ...r }; d.runs.push(row); await save(); return copy(row); },
    async finishRun(id, p) { const r = (await load()).runs.find((x) => x.id === id); if (r) { Object.assign(r, p, { finished_at: now() }); await save(); } return copy(r); },
    async listRuns(uid, taskId, limit = 20) {
      const d = await load();
      return mine(d.runs, uid).filter((r) => !taskId || r.task_id === taskId).sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, limit)
        .map((r) => ({ ...copy(r), title: d.tasks.find((t) => t.id === r.task_id)?.title }));
    },
    async markRunsRead(uid) { for (const r of mine((await load()).runs, uid)) r.read = true; await save(); },
    async unreadRuns(uid) { return mine((await load()).runs, uid).filter((r) => !r.read && r.status !== 'running').length; },
  };
}
