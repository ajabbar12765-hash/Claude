import { json, redirect, origin, cookies, cookie, sign, unsign, randomToken, MOCK, sameOrigin } from './_lib/http.js';
import { authUrl, exchangeCode, saveGoogle, GOOGLE_APPS, SCOPES } from './_lib/google.js';
import { authConfigured, currentUser, sessionCookie, clearSession } from './_lib/session.js';
import { store } from './_lib/store.js';
import { encrypt } from './_lib/http.js';

// /api/auth?step=start&apps=gmail,calendar  -> Google consent (sign-in plus the chosen apps)
// /api/auth?step=callback                   -> back from Google
// POST /api/auth?step=logout
export async function GET(req) {
  const url = new URL(req.url);
  const step = url.searchParams.get('step');
  if (!authConfigured()) return redirect('/?error=' + encodeURIComponent('Sign-in is not set up on this server yet'));
  const redirectUri = `${origin(req)}/api/auth?step=callback`;

  if (step === 'start') {
    const apps = (url.searchParams.get('apps') || '').split(',').filter((a) => GOOGLE_APPS.includes(a));
    if (MOCK) {
      const s = await store();
      const user = await s.upsertUser({ sub: 'mock-user', email: 'you@example.com', name: 'Sam Rivera', timezone: 'UTC' });
      const granted = [...SCOPES.base, ...apps.flatMap((a) => SCOPES[a])].join(' ');
      const prev = await s.getConnectionByProvider(user.id, 'google');
      await saveGoogle(user.id, { access_token: 'mock', refresh_token: 'mock', expires_in: 3600, scope: [prev?.scopes || '', granted].join(' ') }, apps);
      return redirect(apps.length ? '/?apps=1' : '/', [sessionCookie(req, user.id)]);
    }
    const state = randomToken(24);
    const user = await currentUser(req);
    const tmp = cookie('tern_o', sign({ state, apps, exp: Date.now() + 10 * 60e3 }), { maxAge: 600, req });
    return redirect(authUrl({ redirectUri, state, apps, loginHint: user?.email }), [tmp]);
  }

  if (step === 'callback') {
    const saved = unsign(cookies(req).tern_o);
    const clear = cookie('tern_o', '', { maxAge: 0, req });
    if (url.searchParams.get('error')) return redirect('/?error=' + encodeURIComponent('Google sign-in was cancelled'), [clear]);
    if (!saved || saved.state !== url.searchParams.get('state')) return redirect('/?error=' + encodeURIComponent('Sign-in expired. Try again.'), [clear]);
    try {
      const { tokens, profile } = await exchangeCode(url.searchParams.get('code'), redirectUri);
      const s = await store();
      const user = await s.upsertUser(profile);
      await saveGoogle(user.id, tokens, saved.apps || []);
      return redirect(saved.apps?.length ? '/?apps=1' : '/', [clear, sessionCookie(req, user.id)]);
    } catch (e) {
      return redirect('/?error=' + encodeURIComponent(e.message || 'Google sign-in failed'), [clear]);
    }
  }
  return json({ error: 'Unknown step' }, 400);
}

export async function POST(req) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  return new Response(null, { status: 204, headers: { 'set-cookie': clearSession(req) } });
}
