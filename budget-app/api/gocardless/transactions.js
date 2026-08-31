import { getAccountTransactions } from '../_lib/gocardless.js'

function normalize(t, pending) {
  const amount = Number(t.transactionAmount?.amount ?? 0)
  const description =
    t.remittanceInformationUnstructured ||
    (Array.isArray(t.remittanceInformationUnstructuredArray) && t.remittanceInformationUnstructuredArray[0]) ||
    t.creditorName ||
    t.debtorName ||
    t.additionalInformation ||
    'Transaction'
  return {
    id: t.transactionId || t.internalTransactionId || null,
    date: t.bookingDate || t.valueDate || null,
    amount,
    currency: t.transactionAmount?.currency || null,
    description: String(description).trim(),
    pending: !!pending,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const raw = req.query?.accountIds
    const accountIds = (Array.isArray(raw) ? raw : String(raw || '').split(','))
      .map((s) => s.trim())
      .filter(Boolean)
    if (accountIds.length === 0) {
      res.status(400).json({ error: 'Missing "accountIds" (comma-separated).' })
      return
    }

    const results = []
    for (const accountId of accountIds) {
      const { booked = [], pending = [] } = await getAccountTransactions(accountId)
      for (const t of booked) results.push(normalize(t, false))
      for (const t of pending) results.push(normalize(t, true))
    }

    res.status(200).json({ transactions: results })
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message })
  }
}
