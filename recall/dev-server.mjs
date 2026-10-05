// Local dev server: static files + /api/ai. Set GEMINI_API_KEY (or ANTHROPIC_API_KEY)
// to use a real model, or MOCK=1 for canned answers. Not used on Vercel.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from './api/ai.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const PORT = +process.env.PORT || 3000;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/ai') {
    if (process.env.MOCK) {
      let raw = '';
      for await (const c of req) raw += c;
      const { task, input } = JSON.parse(raw || '{}');
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
      const { mock } = await import('./dev/mock.js');
      await mock(task, input, (e) => res.write(JSON.stringify(e) + '\n'));
      return res.end(JSON.stringify({ t: 'done' }) + '\n');
    }
    return handler(req, res);
  }
  let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  if (p.endsWith('/')) p += 'index.html';
  let file = join(root, p);
  try {
    if (!(await stat(file)).isFile()) throw 0;
  } catch {
    try { file = join(root, p + '.html'); await stat(file); } catch { res.writeHead(404); return res.end('Not found'); }
  }
  if (file.includes('node_modules') || file.includes('/dev/') || file.includes('/lib/')) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(await readFile(file));
}).listen(PORT, () => console.log(`Recall on http://localhost:${PORT}${process.env.MOCK ? ' (mock AI)' : ''}`));
