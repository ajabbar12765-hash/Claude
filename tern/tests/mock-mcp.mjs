// A tiny MCP server (Streamable HTTP, JSON responses) used by the e2e tests.
import { createServer } from 'node:http';
export function startMockMcp(port) {
  const calls = [];
  const srv = createServer(async (req, res) => {
    let body = ''; for await (const c of req) body += c;
    const msg = body ? JSON.parse(body) : {};
    const reply = (result) => { res.writeHead(200, { 'content-type': 'application/json', 'mcp-session-id': 'sess-1' }); res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result })); };
    if (msg.method === 'initialize') return reply({ protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'echo', version: '1' } });
    if (!msg.id) { res.writeHead(202); return res.end(); }
    if (msg.method === 'tools/list') return reply({ tools: [
      { name: 'post_message', description: 'Post a message to the team board', inputSchema: { type: 'object', properties: { message: { type: 'string' } }, required: ['message'] } },
      { name: 'list_messages', description: 'List board messages', inputSchema: { type: 'object', properties: {} }, annotations: { readOnlyHint: true } },
    ] });
    if (msg.method === 'tools/call') { calls.push(msg.params); return reply({ content: [{ type: 'text', text: `Posted: ${msg.params.arguments.message}` }] }); }
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'nope' } }));
  });
  return new Promise((r) => srv.listen(port, '127.0.0.1', () => r({ close: () => srv.close(), calls })));
}
