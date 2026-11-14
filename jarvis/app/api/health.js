// GET /api/health?k=KEY  -> checks the key and that the free AI brain answers.
const { llm, cors, authorised } = require('./_lib');

module.exports = async (req, res) => {
  cors(res);
  const key = (req.query && req.query.k) || '';
  if (!authorised({ key })) return res.status(401).json({ ok: false, error: 'auth' });
  try {
    const t0 = Date.now();
    const msg = await llm(req, { messages: [{ role: 'user', content: 'Reply with exactly: online' }], max_tokens: 10 });
    res.status(200).json({ ok: true, brain: String(msg.content || '').trim(), ms: Date.now() - t0 });
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e.message || e) });
  }
};
