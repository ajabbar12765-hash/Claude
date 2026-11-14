// Plain AI endpoint used by the Google script (email sorting, reply drafts, auto-replies).
// POST { key, prompt, json?: boolean }  ->  { text }   (json: model must return a JSON object)
const { llm, cors, readBody, authorised } = require('./_lib');

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const body = await readBody(req);
  if (!authorised(body)) return res.status(401).json({ error: 'auth' });
  try {
    const msg = await llm(req, {
      messages: [{ role: 'user', content: String(body.prompt || '').slice(0, 60000) }],
      temperature: body.json ? 0.1 : 0.5,
      ...(body.json ? { response_format: { type: 'json_object' } } : {}),
    });
    res.status(200).json({ text: String(msg.content || '') });
  } catch (e) {
    res.status(200).json({ error: String(e.message || e) });
  }
};
