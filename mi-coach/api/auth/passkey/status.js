import { passkeysEnabled } from '../../_lib/webauthn.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  try {
    const enabled = await passkeysEnabled()
    return res.status(200).json({ enabled })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message })
  }
}
