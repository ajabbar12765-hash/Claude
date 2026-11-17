import { json, redirect, origin, cookies, cookie, sign, unsign, encrypt, readJson, sameOrigin, str, MOCK } from './_lib/http.js';
import { currentUser } from './_lib/session.js';
import { store } from './_lib/store.js';
import { googleApps, GOOGLE_APPS, revoke, AppError } from './_lib/google.js';
import { PRESETS, slugify, listTools, startOAuth, finishOAuth, realUrl } from './_lib/mcp.js';

const GOOGLE_INFO = {
  gmail: { name: 'Gmail', blurb: 'Read, sort, draft and send email' },
  calendar: { name: 'Google Calendar', blurb: 'See your schedule, find time, book events' },
  drive: { name: 'Google Drive', blurb: 'Search and read your Docs, Sheets and files' },
};

async function listing(user) {
  const s = await store();
  const conns = await s.listConnections(user.id);
  const g = conns.find((c) => c.kind === 'google');
  const enabled = googleApps(g);
  const google = GOOGLE_APPS.map((id) => ({ id, kind: 'google', ...GOOGLE_INFO[id], status: enabled.includes(id) ? (g.status === 'connected' ? 'connected' : 'needs_auth') : 'disconnected' }));
  const custom = conns.filter((c) => c.kind === 'mcp').map((c) => ({ id: c.id, kind: 'mcp', name: c.name, host: c.url, status: c.status, tools: (c.tools_cache?.tools || []).length }));
  const have = new Set(custom.map((c) => c.name));
  return { google, custom, presets: PRESETS.filter((p) => !have.has(p.name)) };
}

export async function GET(req) {
  const url = new URL(req.url);
  const step = url.searchParams.get('step');
  const user = await currentUser(req);
  if (!user) return step ? redirect('/?error=' + encodeURIComponent('Sign in first')) : json({ error: 'Sign in to connect apps', code: 'signin' }, 401);
  const s = await store();

  if (step === 'oauth') {
    const conn = await s.getConnection(user.id, url.searchParams.get('id') || '');
    if (!conn) return redirect('/?apps=1&error=' + encodeURIComponent('App not found'));
    try {
      const r = await startOAuth(conn, `${origin(req)}/api/apps?step=oauth-callback`);
      if (r.open) { await listTools({ ...conn, status: 'connected' }, { fresh: true }); return redirect('/?apps=1'); }
      const tmp = cookie('tern_m', sign({ id: conn.id, state: r.state, verifier: r.verifier, exp: Date.now() + 10 * 60e3 }), { maxAge: 600, req });
      return redirect(r.url, [tmp]);
    } catch (e) { return redirect('/?apps=1&error=' + encodeURIComponent(e.message)); }
  }
  if (step === 'oauth-callback') {
    const saved = unsign(cookies(req).tern_m);
    const clear = cookie('tern_m', '', { maxAge: 0, req });
    if (!saved || saved.state !== url.searchParams.get('state')) return redirect('/?apps=1&error=' + encodeURIComponent('Sign-in expired. Try again.'), [clear]);
    if (url.searchParams.get('error')) return redirect('/?apps=1&error=' + encodeURIComponent('Sign-in was cancelled'), [clear]);
    try {
      const conn = await s.getConnection(user.id, saved.id);
      const done = await finishOAuth(conn, url.searchParams.get('code'), saved.verifier);
      await listTools(done, { fresh: true }).catch(() => {});
      return redirect('/?apps=1', [clear]);
    } catch (e) { return redirect('/?apps=1&error=' + encodeURIComponent(e.message), [clear]); }
  }
  return json(await listing(user));
}

// Add a custom app by MCP URL, with optional access token.
export async function POST(req) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  const user = await currentUser(req);
  if (!user) return json({ error: 'Sign in to connect apps', code: 'signin' }, 401);
  const b = await readJson(req);
  const name = str(b.name, 40) || 'App';
  const url = str(b.url, 1000);
  const token = str(b.token, 4000);
  const s = await store();
  let display;
  try { const u = new URL(url); display = u.host; } catch { return json({ error: 'That is not a valid URL' }, 400); }
  const base = slugify(name);
  const taken = new Set((await s.listConnections(user.id)).map((c) => c.provider));
  let provider = base; for (let n = 2; taken.has(provider) || ['google', 'web', 'tasks'].includes(provider); n++) provider = `${base}${n}`;
  const conn = await s.saveConnection({ user_id: user.id, kind: 'mcp', provider, name, url: display, auth_type: token ? 'bearer' : 'none', secret_enc: encrypt({ url, ...(token ? { token } : {}) }), status: 'connected' });
  try {
    const tools = await listTools(conn, { fresh: true });
    return json({ ok: true, id: conn.id, tools: tools.length });
  } catch (e) {
    if (e.code === 'needs_auth' && !token) {
      await s.saveConnection({ ...conn, status: 'needs_auth' });
      return json({ ok: true, id: conn.id, needsAuth: true, authUrl: `/api/apps?step=oauth&id=${conn.id}` });
    }
    await s.deleteConnection(user.id, conn.id);
    return json({ error: e instanceof AppError ? e.message : 'Could not reach that app' }, 400);
  }
}

// Disconnect: ?id=<custom id> or ?google=gmail|calendar|drive|all
export async function DELETE(req) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  const user = await currentUser(req);
  if (!user) return json({ error: 'Not signed in' }, 401);
  const url = new URL(req.url);
  const s = await store();
  const g = url.searchParams.get('google');
  if (g) {
    const conn = await s.getConnectionByProvider(user.id, 'google');
    if (conn) {
      const enabled = (conn.settings?.enabled || []).filter((a) => g !== 'all' && a !== g);
      if (!enabled.length || g === 'all') { await revoke(conn); await s.deleteConnection(user.id, conn.id); }
      else await s.saveConnection({ ...conn, settings: { ...conn.settings, enabled } });
    }
    return json(await listing(user));
  }
  await s.deleteConnection(user.id, url.searchParams.get('id') || '');
  return json(await listing(user));
}
