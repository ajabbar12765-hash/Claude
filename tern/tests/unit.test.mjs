// Unit tests: schedules and DST, crypto, schema sync, both storage backends, schema conversion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.SESSION_SECRET = 'test-secret-test-secret-test-secret';
const { nextRun, zonedToUtc, normalize, describe: describeS } = await import('../api/_lib/schedule.js');
const { sign, unsign, encrypt, decrypt } = await import('../api/_lib/http.js');
const { pgStore, fileStore } = await import('../api/_lib/store.js');
const { geminiSchema } = await import('../api/_lib/mcp.js');
const SCHEMA = (await import('../api/_lib/schema.js')).default;

test('weekday 07:00 New York lands at 12:00Z in winter and 11:00Z in summer', () => {
  assert.equal(nextRun({ freq: 'weekdays', time: '07:00' }, 'America/New_York', new Date('2026-11-17T13:00:00Z')).toISOString(), '2026-11-18T12:00:00.000Z');
  assert.equal(nextRun({ freq: 'weekdays', time: '07:00' }, 'America/New_York', new Date('2026-07-01T00:00:00Z')).toISOString(), '2026-07-01T11:00:00.000Z');
});
test('weekdays skip the weekend', () => {
  // Fri 2026-11-20 after 07:00 London -> Mon 23rd
  assert.equal(nextRun({ freq: 'weekdays', time: '07:00' }, 'Europe/London', new Date('2026-11-20T08:00:00Z')).toISOString(), '2026-11-23T07:00:00.000Z');
});
test('daily schedule across the spring-forward gap keeps wall time', () => {
  // London clocks go forward 2027-03-28 01:00 -> 02:00
  const a = nextRun({ freq: 'daily', time: '08:00' }, 'Europe/London', new Date('2027-03-27T09:00:00Z'));
  assert.equal(a.toISOString(), '2027-03-28T07:00:00.000Z');
  const skipped = zonedToUtc(2027, 3, 28, 1, 30, 'Europe/London'); // 01:30 does not exist
  assert.ok(!isNaN(skipped));
});
test('weekly picks the listed days; once in the past is null', () => {
  const r = nextRun({ freq: 'weekly', time: '09:30', days: [3] }, 'UTC', new Date('2026-11-17T10:00:00Z')); // Tue -> Wed
  assert.equal(r.toISOString(), '2026-11-18T09:30:00.000Z');
  assert.equal(nextRun({ freq: 'once', at: '2020-01-01T00:00:00Z' }, 'UTC', new Date()), null);
});
test('hourly runs at the minute past the next hour', () => {
  assert.equal(nextRun({ freq: 'hourly', time: '00:15' }, 'Asia/Kolkata', new Date('2026-11-17T10:20:00Z')).toISOString(), '2026-11-17T10:45:00.000Z');
});
test('bad schedules are normalised', () => {
  assert.deepEqual(normalize({ freq: 'nope', time: '25:00' }), { freq: 'daily', time: '08:00' });
  assert.equal(describeS({ freq: 'weekly', time: '09:00', days: [1, 5] }, 'UTC'), 'Mon, Fri at 09:00');
});
test('signed values reject tampering and expiry', () => {
  const t = sign({ uid: 'u1', exp: Date.now() + 1000 });
  assert.equal(unsign(t).uid, 'u1');
  assert.equal(unsign(t.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'))), null);
  assert.equal(unsign(sign({ uid: 'u1', exp: Date.now() - 1 })), null);
});
test('encryption round-trips and detects tampering', () => {
  const e = encrypt({ refresh_token: 'secret' });
  assert.ok(!e.includes('secret'));
  assert.equal(decrypt(e).refresh_token, 'secret');
  const parts = e.split('.'); parts[3] = parts[3].replace(/^./, (c) => (c === 'A' ? 'B' : 'A'));
  assert.throws(() => decrypt(parts.join('.')));
});
test('schema module matches replica/schema.sql', () => {
  assert.equal(SCHEMA, readFileSync(new URL('../replica/schema.sql', import.meta.url), 'utf8'));
});
test('MCP JSON Schema converts to the Gemini subset', () => {
  const s = geminiSchema({ type: 'object', properties: { a: { type: ['string', 'null'], format: 'uri' }, b: { anyOf: [{ type: 'null' }, { type: 'integer' }] }, c: { type: 'array' }, d: { $ref: '#/x' } }, required: ['a', 'zzz'], additionalProperties: false });
  assert.deepEqual(s, { type: 'object', properties: { a: { type: 'string' }, b: { type: 'integer' }, c: { type: 'array', items: { type: 'string' } }, d: { type: 'string' } }, required: ['a'] });
});

async function storeContract(name, s) {
  await s.migrate();
  const a = await s.upsertUser({ sub: 'a', email: 'a@x.io', name: 'A' });
  const b = await s.upsertUser({ sub: 'b', email: 'b@x.io', name: 'B' });
  assert.equal((await s.upsertUser({ sub: 'a', email: 'a2@x.io', name: 'A' })).id, a.id, `${name}: upsert keeps id`);
  const c = await s.saveConnection({ user_id: a.id, kind: 'mcp', provider: 'notion', name: 'Notion', url: 'mcp.notion.com', secret_enc: 'x', settings: { k: 1 } });
  assert.equal((await s.listConnections(b.id)).length, 0, `${name}: second user sees no connections`);
  assert.equal(await s.getConnection(b.id, c.id), null, `${name}: no cross-user read`);
  const p = await s.savePending(a.id, 'state');
  assert.equal(await s.takePending(b.id, p), null, `${name}: other user cannot take`);
  assert.equal(await s.takePending(a.id, p), 'state');
  assert.equal(await s.takePending(a.id, p), null, `${name}: single use`);
  const past = new Date(Date.now() - 60e3).toISOString();
  const t = await s.saveTask({ user_id: a.id, title: 'T', prompt: 'P', schedule: { freq: 'daily', time: '07:00' }, timezone: 'UTC', deliver_email: true, can_act: false, enabled: true, next_run_at: past });
  assert.equal((await s.listTasks(b.id)).length, 0);
  const due = await s.dueTasks(new Date().toISOString());
  assert.equal(due.length, 1);
  const next = new Date(Date.now() + 864e5).toISOString();
  assert.equal(await s.claimTask(t.id, due[0].next_run_at, next), true);
  assert.equal(await s.claimTask(t.id, due[0].next_run_at, next), false, `${name}: second claim loses`);
  const r = await s.addRun({ task_id: t.id, user_id: a.id });
  await s.finishRun(r.id, { status: 'ok', output: 'hi', steps: [{ label: 'x' }], emailed: true });
  assert.equal(await s.unreadRuns(a.id), 1);
  assert.equal(await s.unreadRuns(b.id), 0);
  assert.equal((await s.listRuns(a.id))[0].title, 'T');
  await s.markRunsRead(a.id);
  assert.equal(await s.unreadRuns(a.id), 0);
  // Updating someone else's task id must not change it
  await s.saveTask({ ...t, user_id: b.id, title: 'hijack' }).catch(() => {});
  assert.equal((await s.getTask(a.id, t.id)).title, 'T', `${name}: no cross-user task write`);
  await s.deleteUser(a.id);
  assert.equal((await s.listTasks(a.id)).length, 0, `${name}: delete cascades`);
  assert.equal((await s.listConnections(a.id)).length, 0);
}

test('file store contract', async () => {
  await storeContract('file', fileStore(join(mkdtempSync(join(tmpdir(), 'tern-')), 'db.json')));
});
test('postgres store contract (PGlite)', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite();
  await storeContract('postgres', pgStore(async (text, params = []) => (await db.query(text, params)).rows));
});
