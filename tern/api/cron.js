import { json, MOCK } from './_lib/http.js';
import { runDue } from './_lib/tasks.js';

// Runs due tasks. Called every 15 minutes by .github/workflows/tern-cron.yml and daily by Vercel Cron.
async function handle(req) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') || '';
  if (!MOCK && (!secret || auth !== `Bearer ${secret}`)) return json({ error: 'Unauthorized' }, 401);
  return json(await runDue());
}
export const GET = handle;
export const POST = handle;
