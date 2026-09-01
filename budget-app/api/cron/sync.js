// Runs on a schedule (see vercel.json "crons") — checks GoCardless for new
// Revolut transactions and queues any it hasn't seen before. The client
// picks these up (and clears them) from /api/sync/pending on next load.
//
// Note: on Vercel's Hobby plan, cron jobs are limited to roughly once a day
// regardless of the schedule below — Pro removes that cap.

import { getAccountTransactions } from '../_lib/gocardless.js'
import { getBankConfig, filterNewIds, markSeen, appendPending } from '../_lib/kv.js'

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
  // Vercel Cron sends this header automatically; also accept a manual
  // Authorization: Bearer <CRON_SECRET> call for testing, when configured.
  const isVercelCron = req.headers['x-vercel-cron'] != null
  const cronSecret = process.env.CRON_SECRET
  const authOk = cronSecret ? req.headers.authorization === `Bearer ${cronSecret}` : true
  if (!isVercelCron && !authOk) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const config = await getBankConfig()
    if (!config?.accountIds?.length) {
      res.status(200).json({ skipped: true, reason: 'No bank connected.' })
      return
    }

    const found = []
    for (const accountId of config.accountIds) {
      const { booked = [] } = await getAccountTransactions(accountId)
      for (const t of booked) found.push(normalize(t, false))
    }

    const candidateIds = found.map((t) => t.id).filter(Boolean)
    const newIds = new Set(await filterNewIds(candidateIds))
    const newItems = found.filter((t) => t.id && newIds.has(t.id))

    if (newItems.length > 0) {
      await appendPending(newItems)
      await markSeen(newItems.map((t) => t.id))
    }

    res.status(200).json({ checked: found.length, queued: newItems.length })
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message })
  }
}
