// Minimal MCP client over Streamable HTTP, plus MCP OAuth (discovery, dynamic client
// registration, PKCE). This is how Tern reaches the user's other apps.
import { encrypt, decrypt, randomToken, pkceChallenge } from './http.js';
import { store } from './store.js';
import { AppError } from './google.js';

const PROTOCOL = '2025-06-18';
const sessions = new Map(); // connection -> Mcp-Session-Id, per warm instance
// The real endpoint lives in the encrypted secret (Zapier-style URLs embed a key); connections.url is for display.
export const realUrl = (conn) => (decrypt(conn.secret_enc) || {}).url || conn.url;

export const PRESETS = [
  { slug: 'zapier', name: 'Zapier', url: '', note: 'Paste your personal server URL from mcp.zapier.com. It reaches the 8,000+ apps you turn on there, like Spotify, Zoho Books, Slack and Sheets', auth: 'url' },
  { slug: 'notion', name: 'Notion', url: 'https://mcp.notion.com/mcp', auth: 'oauth' },
  { slug: 'linear', name: 'Linear', url: 'https://mcp.linear.app/mcp', auth: 'oauth' },
  { slug: 'vercel', name: 'Vercel', url: 'https://mcp.vercel.com', auth: 'oauth' },
  { slug: 'canva', name: 'Canva', url: 'https://mcp.canva.com/mcp', auth: 'oauth' },
  { slug: 'atlassian', name: 'Jira and Confluence', url: 'https://mcp.atlassian.com/v1/mcp', auth: 'oauth' },
  { slug: 'github', name: 'GitHub', url: 'https://api.githubcopilot.com/mcp/', note: 'Needs a personal access token', auth: 'bearer' },
  { slug: 'apify', name: 'Apify', url: 'https://mcp.apify.com', auth: 'oauth' },
];

export const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 20) || 'app';

function checkUrl(url) {
  let u;
  try { u = new URL(url); } catch { throw new AppError('That is not a valid URL'); }
  const local = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?$)/.test(u.hostname);
  if (u.protocol !== 'https:' && !(process.env.TERN_MOCK === '1' && local)) throw new AppError('App URLs must start with https://');
  if (local && process.env.TERN_MOCK !== '1') throw new AppError('Private network addresses are not allowed');
  return u;
}

async function tokenFor(conn) {
  if (conn.auth_type === 'none') return null;
  const secret = decrypt(conn.secret_enc) || {};
  if (conn.auth_type === 'bearer') return secret.token;
  if (!secret.access_token) throw new AppError(`${conn.name} needs you to sign in`, 'needs_auth');
  if (secret.expires_at && secret.expires_at < Date.now() + 60_000 && secret.refresh_token) {
    const res = await fetch(secret.token_endpoint, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: secret.refresh_token, client_id: secret.client_id, ...(secret.client_secret ? { client_secret: secret.client_secret } : {}), resource: realUrl(conn) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
      await (await store()).saveConnection({ ...conn, status: 'needs_auth' });
      throw new AppError(`${conn.name} needs you to sign in again`, 'needs_auth');
    }
    Object.assign(secret, { access_token: data.access_token, refresh_token: data.refresh_token || secret.refresh_token, expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : null });
    await (await store()).saveConnection({ ...conn, secret_enc: encrypt(secret), status: 'connected' });
  }
  return secret.access_token;
}

async function rpc(conn, method, params, { notify = false, retry = true } = {}) {
  const url = realUrl(conn);
  checkUrl(url);
  const token = await tokenFor(conn);
  const key = conn.id || url;
  const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': PROTOCOL };
  if (token) headers.authorization = `Bearer ${token}`;
  const sid = sessions.get(key);
  if (sid) headers['mcp-session-id'] = sid;
  const id = notify ? undefined : Math.floor(Math.random() * 1e9);
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', method, ...(id !== undefined ? { id } : {}), ...(params ? { params } : {}) }), signal: AbortSignal.timeout(30_000) });
  if (res.status === 401) {
    await (await store()).saveConnection({ ...conn, status: 'needs_auth' }).catch(() => {});
    throw new AppError(`${conn.name} needs you to sign in`, 'needs_auth');
  }
  if (res.status === 404 && sid && retry) { sessions.delete(key); await initialize(conn); return rpc(conn, method, params, { notify, retry: false }); }
  const newSid = res.headers.get('mcp-session-id');
  if (newSid) sessions.set(key, newSid);
  if (method === 'initialize') sessions.set(key + ':init', true);
  if (notify) return null;
  if (!res.ok) throw new AppError(`${conn.name} returned ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  let msg;
  if (ct.includes('text/event-stream')) {
    const text = await res.text();
    for (const block of text.split(/\n\n/)) {
      const data = block.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
      if (!data) continue;
      try { const m = JSON.parse(data); if (m.id === id) { msg = m; break; } } catch {}
    }
  } else msg = await res.json();
  if (!msg) throw new AppError(`${conn.name} sent no answer`);
  if (msg.error) throw new AppError(`${conn.name}: ${msg.error.message || 'error'}`);
  return msg.result;
}

async function initialize(conn) {
  const r = await rpc(conn, 'initialize', { protocolVersion: PROTOCOL, capabilities: {}, clientInfo: { name: 'Tern', version: '1.0' } }, { retry: false });
  await rpc(conn, 'notifications/initialized', undefined, { notify: true }).catch(() => {});
  return r;
}

export async function listTools(conn, { fresh = false } = {}) {
  const cache = conn.tools_cache;
  if (!fresh && cache?.tools && Date.now() - (cache.at || 0) < 10 * 60e3) return cache.tools;
  await initialize(conn);
  const tools = [];
  let cursor;
  for (let i = 0; i < 5; i++) {
    const r = await rpc(conn, 'tools/list', cursor ? { cursor } : {});
    tools.push(...(r.tools || []));
    cursor = r.nextCursor;
    if (!cursor) break;
  }
  const slim = tools.slice(0, 60).map((t) => ({ name: t.name, description: (t.description || '').slice(0, 900), inputSchema: t.inputSchema || { type: 'object' }, readOnly: !!t.annotations?.readOnlyHint, title: t.annotations?.title || t.title || '' }));
  await (await store()).saveConnection({ ...conn, tools_cache: { at: Date.now(), tools: slim }, status: 'connected' });
  return slim;
}

export async function callTool(conn, name, args) {
  if (!sessions.has((conn.id || realUrl(conn)) + ':init')) await initialize(conn).catch(() => {});
  const r = await rpc(conn, 'tools/call', { name, arguments: args || {} });
  const text = (r.content || []).map((c) => (c.type === 'text' ? c.text : c.type === 'resource' ? (c.resource?.text || c.resource?.uri) : `[${c.type}]`)).join('\n');
  const out = r.structuredContent ? { ...r.structuredContent, text: text.slice(0, 20000) } : { text: text.slice(0, 20000) };
  if (r.isError) throw new AppError(text.slice(0, 500) || `${conn.name} reported an error`);
  return out;
}

// Turn an MCP JSON Schema into the subset Gemini accepts.
export function geminiSchema(s, depth = 0) {
  if (!s || typeof s !== 'object' || depth > 5) return { type: 'string' };
  let type = Array.isArray(s.type) ? s.type.find((t) => t !== 'null') : s.type;
  if (!type && s.anyOf) return geminiSchema(s.anyOf.find((x) => x.type !== 'null') || s.anyOf[0], depth);
  if (!type && s.properties) type = 'object';
  type = ['string', 'number', 'integer', 'boolean', 'array', 'object'].includes(type) ? type : 'string';
  const out = { type };
  if (s.description) out.description = String(s.description).slice(0, 400);
  if (Array.isArray(s.enum) && type === 'string') out.enum = s.enum.map(String).slice(0, 50);
  if (type === 'array') out.items = geminiSchema(s.items || { type: 'string' }, depth + 1);
  if (type === 'object') {
    const props = s.properties || {};
    out.properties = Object.fromEntries(Object.entries(props).slice(0, 40).map(([k, v]) => [k, geminiSchema(v, depth + 1)]));
    const req = (s.required || []).filter((k) => k in out.properties);
    if (req.length) out.required = req;
    if (!Object.keys(out.properties).length) delete out.properties;
  }
  return out;
}

export function mcpToolsFor(conn) {
  const tools = conn.tools_cache?.tools || [];
  const prefix = `${conn.provider}__`;
  return tools.map((t) => ({
    name: (prefix + t.name.replace(/[^a-zA-Z0-9_.-]/g, '_')).slice(0, 63),
    app: conn.provider, appName: conn.name,
    description: `[${conn.name}] ${t.description || t.title || t.name}`,
    parameters: geminiSchema(t.inputSchema),
    write: !t.readOnly && !/^(get|list|search|find|read|fetch|query|lookup|describe|show|view)[_-]?/i.test(t.name),
    label: () => `${conn.name}: ${t.title || t.name.replace(/[_-]+/g, ' ')}`,
    preview: (a) => ({ kind: 'generic', fields: { App: conn.name, Action: t.title || t.name, ...Object.fromEntries(Object.entries(a || {}).slice(0, 8).map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 400) : JSON.stringify(v).slice(0, 400)])) } }),
    run: (a) => callTool(conn, t.name, a),
  }));
}

/* ---------- MCP OAuth ---------- */
async function getJson(url) {
  const r = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
  if (!r.ok) return null;
  return r.json().catch(() => null);
}

export async function discover(serverUrl) {
  const u = checkUrl(serverUrl);
  let resourceMeta = null;
  // RFC 9728: the 401 points at the resource metadata; otherwise try the well-known paths.
  try {
    const probe = await fetch(serverUrl, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: PROTOCOL, capabilities: {}, clientInfo: { name: 'Tern', version: '1.0' } } }), signal: AbortSignal.timeout(10_000) });
    const m = (probe.headers.get('www-authenticate') || '').match(/resource_metadata="([^"]+)"/);
    if (m) resourceMeta = await getJson(m[1]);
    if (probe.ok) return { open: true };
  } catch {}
  if (!resourceMeta) resourceMeta = await getJson(`${u.origin}/.well-known/oauth-protected-resource${u.pathname.replace(/\/$/, '')}`) || await getJson(`${u.origin}/.well-known/oauth-protected-resource`);
  const issuer = resourceMeta?.authorization_servers?.[0] || u.origin;
  const iu = new URL(issuer);
  const path = iu.pathname.replace(/\/$/, '');
  const meta = await getJson(`${iu.origin}/.well-known/oauth-authorization-server${path}`) || await getJson(`${iu.origin}/.well-known/openid-configuration${path}`) || await getJson(`${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`);
  if (!meta?.authorization_endpoint || !meta?.token_endpoint) throw new AppError('This app does not offer sign-in that Tern can use. Try an access token instead.');
  return { meta, scopes: resourceMeta?.scopes_supported || meta.scopes_supported || [] };
}

export async function startOAuth(conn, redirectUri) {
  const found = await discover(realUrl(conn));
  if (found.open) return { open: true };
  const { meta, scopes } = found;
  const secret = decrypt(conn.secret_enc) || {};
  if (!secret.client_id || secret.redirect_uri !== redirectUri) {
    if (!meta.registration_endpoint) throw new AppError('This app needs a pre-registered client. Use an access token instead.');
    const r = await fetch(meta.registration_endpoint, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_name: 'Tern', redirect_uris: [redirectUri], grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], token_endpoint_auth_method: 'none' }),
    });
    const reg = await r.json().catch(() => ({}));
    if (!r.ok || !reg.client_id) throw new AppError('Could not register Tern with this app');
    Object.assign(secret, { client_id: reg.client_id, client_secret: reg.client_secret || null, redirect_uri: redirectUri });
  }
  secret.token_endpoint = meta.token_endpoint;
  await (await store()).saveConnection({ ...conn, secret_enc: encrypt(secret), status: 'needs_auth' });
  const verifier = randomToken(48);
  const state = randomToken(24);
  const p = new URLSearchParams({ response_type: 'code', client_id: secret.client_id, redirect_uri: redirectUri, code_challenge: pkceChallenge(verifier), code_challenge_method: 'S256', state, resource: realUrl(conn) });
  if (scopes.length) p.set('scope', scopes.join(' '));
  return { url: `${meta.authorization_endpoint}?${p}`, verifier, state };
}

export async function finishOAuth(conn, code, verifier) {
  const secret = decrypt(conn.secret_enc) || {};
  const res = await fetch(secret.token_endpoint, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: secret.redirect_uri, client_id: secret.client_id, code_verifier: verifier, resource: realUrl(conn), ...(secret.client_secret ? { client_secret: secret.client_secret } : {}) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new AppError(data.error_description || 'Sign-in to the app failed');
  Object.assign(secret, { access_token: data.access_token, refresh_token: data.refresh_token || null, expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : null });
  const s = await store();
  const saved = await s.saveConnection({ ...conn, auth_type: 'oauth', secret_enc: encrypt(secret), status: 'connected' });
  return saved;
}
