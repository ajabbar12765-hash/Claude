// Google sign-in and API access with the user's own tokens.
import { encrypt, decrypt, MOCK } from './http.js';
import { store } from './store.js';

export const SCOPES = {
  base: ['openid', 'email', 'profile'],
  gmail: ['https://www.googleapis.com/auth/gmail.modify'],
  calendar: [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
    'https://www.googleapis.com/auth/calendar.freebusy',
  ],
  drive: ['https://www.googleapis.com/auth/drive.readonly'],
};
export const GOOGLE_APPS = ['gmail', 'calendar', 'drive'];

export function authUrl({ redirectUri, state, apps, loginHint }) {
  const scopes = new Set(SCOPES.base);
  for (const a of apps) for (const s of SCOPES[a] || []) scopes.add(s);
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [...scopes].join(' '),
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: apps.length ? 'consent' : 'select_account',
    state,
  });
  if (loginHint) p.set('login_hint', loginHint);
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export async function exchangeCode(code, redirectUri) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Google sign-in failed');
  const claims = JSON.parse(Buffer.from(data.id_token.split('.')[1], 'base64url').toString());
  if (claims.aud !== process.env.GOOGLE_CLIENT_ID || !/accounts\.google\.com$/.test(claims.iss)) throw new Error('Unexpected Google token');
  return { tokens: data, profile: { sub: claims.sub, email: claims.email, name: claims.name || '' } };
}

// Merge newly granted tokens into the user's Google connection.
export async function saveGoogle(userId, tokens, wantApps) {
  const s = await store();
  const prev = await s.getConnectionByProvider(userId, 'google');
  const old = prev ? decrypt(prev.secret_enc) || {} : {};
  const secret = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || old.refresh_token,
    expires_at: Date.now() + (tokens.expires_in || 3600) * 1000,
  };
  const scopes = tokens.scope || prev?.scopes || '';
  const enabled = new Set(prev?.settings?.enabled || []);
  for (const a of wantApps) if (SCOPES[a].every((x) => scopes.includes(x))) enabled.add(a);
  return s.saveConnection({
    id: prev?.id, user_id: userId, kind: 'google', provider: 'google', name: 'Google', auth_type: 'google',
    scopes, secret_enc: encrypt(secret), status: secret.refresh_token ? 'connected' : 'needs_auth',
    settings: { ...(prev?.settings || {}), enabled: [...enabled] }, tools_cache: null,
  });
}

export function googleApps(conn) {
  if (!conn) return [];
  return (conn.settings?.enabled || []).filter((a) => SCOPES[a].every((x) => conn.scopes.includes(x)));
}

export async function accessToken(conn) {
  if (MOCK) return 'mock';
  const secret = decrypt(conn.secret_enc) || {};
  if (secret.access_token && secret.expires_at > Date.now() + 60_000) return secret.access_token;
  if (!secret.refresh_token) throw new AppError('Google needs you to sign in again', 'needs_auth');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, refresh_token: secret.refresh_token, grant_type: 'refresh_token' }),
  });
  const data = await res.json();
  const s = await store();
  if (!res.ok) {
    await s.saveConnection({ ...conn, status: 'expired' });
    throw new AppError('Google access has expired. Reconnect in Apps.', 'needs_auth');
  }
  secret.access_token = data.access_token;
  secret.expires_at = Date.now() + (data.expires_in || 3600) * 1000;
  await s.saveConnection({ ...conn, secret_enc: encrypt(secret), status: 'connected' });
  return secret.access_token;
}

export async function revoke(conn) {
  const secret = decrypt(conn.secret_enc) || {};
  const token = secret.refresh_token || secret.access_token;
  if (!token || MOCK) return;
  await fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token }) }).catch(() => {});
}

export class AppError extends Error {
  constructor(message, code) { super(message); this.code = code; }
}

// Fetch a Google API with one retry on rate limits.
export async function gfetch(conn, url, init = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await accessToken(conn);
    const res = await fetch(url, { ...init, headers: { authorization: `Bearer ${token}`, ...(init.body && typeof init.body === 'string' ? { 'content-type': 'application/json' } : {}), ...(init.headers || {}) } });
    if ((res.status === 429 || res.status === 403) && attempt === 0) {
      const text = await res.clone().text();
      if (/rate|quota/i.test(text)) { await new Promise((r) => setTimeout(r, 1200)); continue; }
    }
    if (res.status === 204) return {};
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('json') ? await res.json() : await res.text();
    if (!res.ok) throw new AppError((data && data.error && data.error.message) || `Google returned ${res.status}`, res.status === 401 ? 'needs_auth' : 'google');
    return data;
  }
}
