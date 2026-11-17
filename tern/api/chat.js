import { API, CHAT_MODEL, SYSTEM, rateLimited, getKey, json, toContents, friendlyError } from './_gemini.js';

// Streams one answer as server-sent events:
//   {t:"thought", v}  a piece of the model's reasoning summary (Think mode)
//   {t:"text", v}     a piece of the answer
//   {t:"sources", v}  [{title, url}] when web search was used
//   {t:"error", v}    a message to show the user
export async function POST(req) {
  if (rateLimited(req)) return json({ error: 'Too many messages. Wait a minute and try again.' }, 429);
  let body;
  try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }

  const mock = process.env.TERN_MOCK === '1';
  const key = getKey(req);
  if (!key && !mock) return json({ error: 'No Gemini API key yet. Add one in Settings, or set GEMINI_API_KEY on the server.', code: 'no_key' }, 401);

  let contents;
  try { contents = toContents(body.messages); } catch (e) { return json({ error: e.message }, 400); }

  const think = body.mode === 'think';
  const instructions = typeof body.instructions === 'string' ? body.instructions.slice(0, 4000).trim() : '';
  const system = SYSTEM.replace('{DATE}', new Date().toUTCString().slice(0, 16)) +
    (instructions ? `\n\nThe user's own instructions, follow them:\n${instructions}` : '');

  const payload = {
    contents,
    systemInstruction: { parts: [{ text: system }] },
    generationConfig: {
      temperature: think ? 0.7 : 0.9,
      thinkingConfig: think ? { thinkingBudget: -1, includeThoughts: true } : { thinkingBudget: 0 },
    },
  };
  if (body.search) payload.tools = [{ google_search: {} }];

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (t, v) => controller.enqueue(enc.encode(`data: ${JSON.stringify({ t, v })}\n\n`));
      try {
        if (mock) { await mockAnswer(send, contents, think, body.search); return; }
        const res = await fetch(`${API}/${CHAT_MODEL}:streamGenerateContent?alt=sse`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify(payload),
          signal: req.signal,
        });
        if (!res.ok) { send('error', friendlyError(res.status, await res.text())); return; }

        const reader = res.body.getReader();
        const dec = new TextDecoder();
        const sources = new Map();
        let buf = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!line.startsWith('data:')) continue;
            let chunk;
            try { chunk = JSON.parse(line.slice(5)); } catch { continue; }
            const cand = chunk.candidates?.[0];
            for (const p of cand?.content?.parts || []) {
              if (typeof p.text === 'string' && p.text) send(p.thought ? 'thought' : 'text', p.text);
            }
            for (const g of cand?.groundingMetadata?.groundingChunks || []) {
              if (g.web?.uri && !sources.has(g.web.uri)) sources.set(g.web.uri, { title: g.web.title || g.web.uri, url: g.web.uri });
            }
            if (cand?.finishReason === 'SAFETY') send('error', 'Gemini declined to answer this one.');
            if (chunk.promptFeedback?.blockReason) send('error', 'Gemini blocked this message.');
          }
        }
        if (sources.size) send('sources', [...sources.values()].slice(0, 12));
      } catch (e) {
        if (e.name !== 'AbortError') send('error', 'Lost the connection to Gemini. Try again.');
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store, no-transform', 'x-accel-buffering': 'no' },
  });
}

// Offline stand-in used by the local test server (TERN_MOCK=1). Never used in production.
async function mockAnswer(send, contents, think, search) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const last = contents.at(-1).parts.map((p) => p.text || '[image]').join(' ');
  if (think) for (const w of ['Reading the question. ', 'Checking the edge cases. ', 'Settling on an answer.']) { send('thought', w); await wait(60); }
  const answer = `Here is a reply to: **${last.slice(0, 80)}**\n\n- Point one\n- Point two\n\n\`\`\`js\nconsole.log("hi")\n\`\`\`\n\nInline maths $e^{i\\pi}+1=0$.`;
  for (const piece of answer.match(/.{1,12}/gs)) { send('text', piece); await wait(25); }
  if (search) send('sources', [{ title: 'Example source', url: 'https://example.com/' }]);
}
