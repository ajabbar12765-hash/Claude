import { getRequisition } from '../_lib/gocardless.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const requisitionId = req.query?.requisitionId
    if (!requisitionId) {
      res.status(400).json({ error: 'Missing "requisitionId".' })
      return
    }
    const requisition = await getRequisition(requisitionId)
    res.status(200).json({
      status: requisition.status,
      accountIds: requisition.accounts || [],
      institutionId: requisition.institution_id,
    })
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message })
  }
}
