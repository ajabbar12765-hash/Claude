async function call(path, options) {
  const res = await fetch(path, options)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`)
  return body
}

export function startConnect(country) {
  return call('/api/gocardless/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ country }),
  })
}

export function getStatus(requisitionId) {
  return call(`/api/gocardless/status?requisitionId=${encodeURIComponent(requisitionId)}`)
}

export function fetchTransactions(accountIds) {
  return call(`/api/gocardless/transactions?accountIds=${encodeURIComponent(accountIds.join(','))}`)
}

export function disconnect(requisitionId) {
  return call('/api/gocardless/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requisitionId }),
  })
}

// --- background sync (server-side, for the cron job) ---

export function saveSyncConfig({ requisitionId, accountIds, institutionName, importedIds }) {
  return call('/api/sync/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requisitionId, accountIds, institutionName, importedIds }),
  })
}

export function clearSyncConfig() {
  return call('/api/sync/config', { method: 'DELETE' })
}

export function getPendingSync() {
  return call('/api/sync/pending')
}

export function ackPendingSync(ids) {
  return call('/api/sync/ack', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
}
