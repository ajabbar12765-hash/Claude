import { json, sameOrigin } from './_lib/http.js';
import { currentUser, clearSession } from './_lib/session.js';
import { store } from './_lib/store.js';
import { revoke } from './_lib/google.js';

export async function GET(req) {
  const user = await currentUser(req);
  if (!user) return json({ user: null });
  const unread = await (await store()).unreadRuns(user.id);
  return json({ user: { email: user.email, name: user.name, timezone: user.timezone }, unread });
}

// Deletes the account: revokes Google access and removes every stored row.
export async function DELETE(req) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  const user = await currentUser(req);
  if (!user) return json({ error: 'Not signed in' }, 401);
  const s = await store();
  for (const c of await s.listConnections(user.id)) if (c.kind === 'google') await revoke(c);
  await s.deleteUser(user.id);
  return new Response(null, { status: 204, headers: { 'set-cookie': clearSession(req) } });
}
