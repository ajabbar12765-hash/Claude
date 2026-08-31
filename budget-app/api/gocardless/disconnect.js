import { deleteRequisition } from '../_lib/gocardless.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const { requisitionId } = req.body || {}
    if (!requisitionId) {
      res.status(400).json({ error: 'Missing "requisitionId".' })
      return
    }
    await deleteRequisition(requisitionId)
    res.status(200).json({ ok: true })
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message })
  }
}
