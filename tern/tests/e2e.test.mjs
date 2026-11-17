// End-to-end tests against the local server in mock mode (no Google, no Gemini, no network).
// Run: node --test tests/e2e.test.mjs   (needs Playwright with Chromium installed)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startMockMcp } from './mock-mcp.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const PORT = 5199;
const BASE = `http://localhost:${PORT}`;
const SHOTS = process.env.TERN_SHOTS;
let server; let browser; let mcp;
const problems = [];

before(async () => {
  mcp = await startMockMcp(5191);
  server = spawn(process.execPath, ['server.mjs'], { cwd: new URL('..', import.meta.url).pathname, env: { ...process.env, TERN_MOCK: '1', PORT: String(PORT), TERN_DATA_FILE: join(mkdtempSync(join(tmpdir(), 'tern-e2e-')), 'db.json') }, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stderr.on('data', (d) => problems.push('server: ' + d));
  await new Promise((r) => server.stdout.once('data', r));
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); mcp?.close(); });

async function page(viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport, colorScheme: 'dark' });
  const p = await ctx.newPage();
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: '' }));
  p.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  p.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  p.on('response', (r) => { if (r.status() >= 500) problems.push(`5xx: ${r.url()}`); });
  return p;
}
async function axe(p, label) {
  await p.addScriptTag({ content: AXE });
  const r = await p.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ') + ' ' + (n.failureSummary || '').split('\n').slice(1, 2).join('')).join(' | ')}`));
  assert.deepEqual(r, [], `axe ${label}`);
}
// Waits until the previous reply has finished: Enter while busy means Stop.
const send = async (p, text) => { await p.locator('#sendBtn:not(.stop)').waitFor(); await p.getByLabel('Message').fill(text); await p.keyboard.press('Enter'); };
const shot = (p, name) => (SHOTS ? p.screenshot({ path: `${SHOTS}/${name}.png` }) : null);

test('F01 chat streams an answer; signed-out app request explains sign-in', async () => {
  const p = await page();
  await p.goto(BASE);
  await axe(p, 'S01 home');
  await send(p, 'What is a tern?');
  await p.getByRole('button', { name: 'Regenerate' }).waitFor();
  assert.match(await p.locator('.msg.assistant .md').first().innerText(), /Here is a reply/);
  await p.getByRole('button', { name: 'Apps' }).click();
  await p.getByRole('link', { name: 'Sign in with Google' }).waitFor();
  await p.context().close();
});

test('F05–F07 sign in, connect Gmail, triage inbox, edit and send a reply with approval', async () => {
  const p = await page();
  await p.goto(BASE);
  await p.getByRole('button', { name: 'Apps' }).click();
  await p.getByRole('link', { name: 'Sign in with Google' }).click();
  await p.waitForURL(BASE + '/');
  await p.getByRole('button', { name: 'Apps' }).click();
  await p.locator('.app-row', { hasText: 'Gmail' }).getByRole('link', { name: 'Connect' }).click();
  await p.locator('#appsDialog .app-row', { hasText: 'Gmail' }).getByText('Connected').waitFor();
  await axe(p, 'S05 apps');
  await shot(p, 'S05-apps');
  await p.keyboard.press('Escape');
  assert.equal(await p.locator('#accountEmail').innerText(), 'you@example.com');

  await send(p, 'Summarise my unread email');
  await p.locator('.step.done', { hasText: 'Searched Gmail' }).waitFor();
  await p.getByText('You have 2 unread emails').waitFor();

  await send(p, 'Reply to Lena and send yes');
  const card = p.locator('.confirm').last();
  await card.getByText('Needs your OK').waitFor({ timeout: 8000 }).catch(async (e) => { console.log('LAST', await p.locator('.msg.assistant').last().innerText()); throw e; });
  await axe(p, 'S06 confirm');
  await shot(p, 'S06-confirm');
  await card.getByLabel('Message').fill('Saturday at 7 is perfect.');
  await card.getByRole('button', { name: 'Send' }).click();
  await p.locator('.step.done', { hasText: 'Send email to lena@gmail.com' }).waitFor();
  await p.getByText('Sent your reply to Lena').waitFor();

  await send(p, 'Reply to Lena and send yes');
  await p.locator('.confirm:not(.settled)').getByRole('button', { name: 'Cancel' }).click();
  await p.locator('.step.denied').waitFor();
  await p.locator('#sendBtn:not(.stop)').waitFor();
  await p.waitForTimeout(200); // let IndexedDB finish writing
  await p.reload();
  await p.locator('.step.denied').waitFor(); // the answered card becomes an action row that survives reload
  assert.equal(await p.locator('.confirm').count(), 0);
  await p.context().close();
});

test('F10–F11 create a task from chat and from the form, run it, read the result', async () => {
  const p = await page();
  await p.goto(BASE + '/api/auth?step=start&apps=gmail,calendar');
  await p.locator('#appsDialog[open] .app-row').first().waitFor();
  await p.keyboard.press('Escape');
  await send(p, 'Every weekday at 7 email me a digest of my inbox');
  await p.locator('.confirm').getByRole('button', { name: 'Approve' }).click();
  await p.getByText(/Weekdays at 07:00/).first().waitFor();
  await p.getByRole('button', { name: 'Tasks' }).click();
  const row = p.locator('.task-row', { hasText: 'Morning inbox digest' });
  await row.waitFor();
  await row.getByRole('button', { name: 'Run now' }).click();
  await p.locator('.run', { hasText: 'Morning inbox digest' }).waitFor();
  await p.getByRole('button', { name: 'New task' }).click();
  const f = p.locator('#taskForm');
  await f.getByLabel('Name').fill('Friday wrap');
  await f.getByLabel('What should Tern do').fill('List what I sent this week');
  await f.getByLabel('Repeat').selectOption('weekly');
  await f.getByLabel('Fri').check();
  await f.getByRole('button', { name: 'Create task' }).click();
  await p.locator('.task-row', { hasText: 'Friday wrap' }).getByText(/Mon, Fri at 07:00/).waitFor();
  await axe(p, 'S07 tasks');
  await shot(p, 'S07-tasks');
  await p.locator('.task-row', { hasText: 'Friday wrap' }).getByLabel('Task on').uncheck();
  await p.locator('.task-row.paused', { hasText: 'Friday wrap' }).waitFor();
  await p.context().close();
});

test('F09 connect any app over MCP and use it with approval', async () => {
  const p = await page();
  await p.goto(BASE + '/api/auth?step=start');
  await p.getByRole('button', { name: 'Apps' }).click();
  await p.getByRole('button', { name: 'Any app' }).click();
  await p.locator('#addApp').getByLabel('Name').fill('Team board');
  await p.locator('#addApp').getByLabel('Server URL').fill('http://127.0.0.1:5191/mcp');
  await p.locator('#addApp').getByRole('button', { name: 'Connect' }).click();
  await p.locator('.app-row', { hasText: 'Team board' }).getByText('2 actions').waitFor();
  await p.keyboard.press('Escape');
  await send(p, 'Use the board app tool to say hello');
  const card = p.locator('.confirm:not(.settled)');
  await card.getByText('Team board').first().waitFor();
  await card.getByRole('button', { name: 'Approve' }).click();
  await p.locator('.step.done', { hasText: 'Team board' }).waitFor();
  assert.equal(mcp.calls.at(-1).name, 'post_message');
  await p.context().close();
});

test('phone width: panels fit with no sideways scroll', async () => {
  const p = await page({ width: 390, height: 844 });
  await p.goto(BASE + '/api/auth?step=start&apps=gmail');
  await p.locator('#appsDialog[open]').waitFor();
  await shot(p, 'S05-apps-phone');
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await p.keyboard.press('Escape');
  await send(p, 'Reply to Lena and send yes');
  await p.locator('.confirm').waitFor();
  await shot(p, 'S06-confirm-phone');
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await p.context().close();
});

test('no console errors, page errors or 5xx', () => {
  assert.deepEqual(problems.filter((x) => !/favicon|Failed to load resource: the server responded with a status of 401/.test(x)), []);
});
