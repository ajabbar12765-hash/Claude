// Small shared helpers: JSON responses, cookies, signing, encryption.
import { createHmac, createCipheriv, createDecipheriv, randomBytes, hkdfSync, timingSafeEqual, createHash } from 'node:crypto';

export const MOCK = process.env.TERN_MOCK === '1';

export function json(body, status = 200, headers = {}) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
  });
}

export function redirect(location, cookies = []) {
  const h = new Headers({ location, 'cache-control': 'no-store' });
  for (const c of cookies) h.append('set-cookie', c);
  return new Response(null, { status: 302, headers: h });
}

export function origin(req) {
  if (process.env.TERN_ORIGIN) return process.env.TERN_ORIGIN.replace(/\/$/, '');
  const u = new URL(req.url);
  const proto = req.headers.get('x-forwarded-proto') || u.protocol.replace(':', '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || u.host;
  return `${proto}://${host}`;
}

// Blocks cross-site writes: browsers always send Origin on POST/PATCH/DELETE.
export function sameOrigin(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return true;
  const o = req.headers.get('origin');
  if (!o) return true; // non-browser clients (cron, curl) carry no cookies anyway
  try { return new URL(o).host === new URL(origin(req)).host; } catch { return false; }
}

export function cookies(req) {
  const out = {};
  for (const part of (req.headers.get('cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function cookie(name, value, { maxAge, req } = {}) {
  const secure = req ? origin(req).startsWith('https') : true;
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}${maxAge !== undefined ? `; Max-Age=${maxAge}` : ''}`;
}

function secret() {
  const s = process.env.SESSION_SECRET || (MOCK || process.env.NODE_ENV !== 'production' ? 'tern-local-dev-secret-change-me' : '');
  if (!s || s.length < 16) throw new Error('SESSION_SECRET must be set (32+ random characters)');
  return s;
}
const keyFor = (label) => Buffer.from(hkdfSync('sha256', secret(), 'tern', label, 32));

const b64u = (buf) => Buffer.from(buf).toString('base64url');

export function sign(obj) {
  const body = b64u(JSON.stringify(obj));
  const mac = createHmac('sha256', keyFor('sign')).update(body).digest('base64url');
  return `${body}.${mac}`;
}
export function unsign(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const want = createHmac('sha256', keyFor('sign')).update(body).digest();
  let got;
  try { got = Buffer.from(mac, 'base64url'); } catch { return null; }
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    const obj = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (obj.exp && obj.exp < Date.now()) return null;
    return obj;
  } catch { return null; }
}

// AES-256-GCM for OAuth tokens and saved agent state.
export function encrypt(value) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', keyFor('enc'), iv);
  const data = Buffer.concat([c.update(JSON.stringify(value), 'utf8'), c.final()]);
  return `v1.${b64u(iv)}.${b64u(c.getAuthTag())}.${b64u(data)}`;
}
export function decrypt(text) {
  if (!text) return null;
  const [v, iv, tag, data] = text.split('.');
  if (v !== 'v1') return null;
  const d = createDecipheriv('aes-256-gcm', keyFor('enc'), Buffer.from(iv, 'base64url'));
  d.setAuthTag(Buffer.from(tag, 'base64url'));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(data, 'base64url')), d.final()]).toString('utf8'));
}

export const randomToken = (n = 32) => randomBytes(n).toString('base64url');
export const pkceChallenge = (verifier) => createHash('sha256').update(verifier).digest('base64url');

export async function readJson(req) {
  try { return await req.json(); } catch { return {}; }
}

export const str = (v, max = 4000) => (typeof v === 'string' ? v.slice(0, max).trim() : '');
