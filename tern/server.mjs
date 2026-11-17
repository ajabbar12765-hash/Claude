// Local server: serves the app and runs the same /api handlers Vercel runs.
// Usage: GEMINI_API_KEY=... node server.mjs   (or TERN_MOCK=1 for an offline stand-in)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
try { for (const l of (await readFile(join(root, '.env'), 'utf8')).split('\n')) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch {}

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const port = Number(process.env.PORT) || 5180;

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      const name = url.pathname.slice(5).replace(/[^a-z]/g, '');
      const mod = await import(join(root, 'api', `${name}.js`));
      const handler = mod[req.method];
      if (!handler) { res.writeHead(405).end(); return; }
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const ac = new AbortController();
      res.on('close', () => ac.abort());
      const request = new Request(url, { method: req.method, headers: req.headers, body: chunks.length ? Buffer.concat(chunks) : undefined, signal: ac.signal });
      const response = await handler(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      if (response.body) for await (const c of response.body) res.write(c);
      res.end();
      return;
    }
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    if (path === '/' || !extname(path)) path = '/index.html';
    const file = await readFile(join(root, path));
    res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' }).end(file);
  } catch (e) {
    if (!res.headersSent) res.writeHead(e.code === 'ENOENT' ? 404 : 500).end(e.code === 'ENOENT' ? 'Not found' : 'Server error');
    else res.end();
  }
}).listen(port, () => console.log(`Tern on http://localhost:${port}`));
