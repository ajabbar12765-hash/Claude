import { cookies, cookie, sign, unsign } from './http.js';
import { store } from './store.js';

const NAME = 'tern_s';
const DAYS = 30;

export function authConfigured() {
  return Boolean(process.env.TERN_MOCK === '1' || (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.SESSION_SECRET));
}

export async function currentUser(req) {
  const s = unsign(cookies(req)[NAME]);
  if (!s || !s.uid) return null;
  try { return await (await store()).getUser(s.uid); } catch { return null; }
}

export function sessionCookie(req, uid) {
  return cookie(NAME, sign({ uid, exp: Date.now() + DAYS * 864e5 }), { maxAge: DAYS * 86400, req });
}
export function clearSession(req) { return cookie(NAME, '', { maxAge: 0, req }); }
