import { findInstitution, createRequisition } from '../_lib/gocardless.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const { country } = req.body || {}
    if (!country || typeof country !== 'string') {
      res.status(400).json({ error: 'Missing "country" (2-letter code, e.g. DE, FR, IE).' })
      return
    }

    const institution = await findInstitution(country.toUpperCase())

    const proto = req.headers['x-forwarded-proto'] || 'https'
    const host = req.headers['x-forwarded-host'] || req.headers.host
    const redirectUrl = `${proto}://${host}/?gocardless=return`

    const requisition = await createRequisition({
      institutionId: institution.id,
      redirectUrl,
      reference: `budget-${Date.now()}`,
    })

    res.status(200).json({
      link: requisition.link,
      requisitionId: requisition.id,
      institution: { id: institution.id, name: institution.name, logo: institution.logo },
    })
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message })
  }
}
