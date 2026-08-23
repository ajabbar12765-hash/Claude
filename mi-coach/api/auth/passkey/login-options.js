import { buildAuthenticationOptions } from '../../_lib/webauthn.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  try {
    const options = await buildAuthenticationOptions(req)
    return res.status(200).json(options)
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message })
  }
}
