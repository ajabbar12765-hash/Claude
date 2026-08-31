// Shared server-side helper for the GoCardless Bank Account Data API
// (https://bankaccountdata.gocardless.com). Never import this from client
// code — it reads GOCARDLESS_SECRET_ID / GOCARDLESS_SECRET_KEY, which must
// only ever exist as server-side Vercel environment variables.
//
// Files under api/_lib/ are not deployed as routes by Vercel (the leading
// underscore excludes them), so this module is safe to keep server-only.

const BASE = 'https://bankaccountdata.gocardless.com/api/v2'

function assertConfigured() {
  if (!process.env.GOCARDLESS_SECRET_ID || !process.env.GOCARDLESS_SECRET_KEY) {
    const err = new Error(
      'GoCardless is not configured: set GOCARDLESS_SECRET_ID and GOCARDLESS_SECRET_KEY in the Vercel project environment variables.'
    )
    err.statusCode = 501
    throw err
  }
}

async function gcFetch(path, options = {}, token) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(body?.detail || body?.summary || `GoCardless request failed (${res.status})`)
    err.statusCode = res.status
    err.body = body
    throw err
  }
  return body
}

// Access tokens last 24h; each serverless invocation is stateless so we just
// fetch a fresh one per request. Fine at personal-use call volumes.
export async function getAccessToken() {
  assertConfigured()
  const { access } = await gcFetch('/token/new/', {
    method: 'POST',
    body: JSON.stringify({
      secret_id: process.env.GOCARDLESS_SECRET_ID,
      secret_key: process.env.GOCARDLESS_SECRET_KEY,
    }),
  })
  return access
}

export async function findInstitution(countryCode) {
  const token = await getAccessToken()
  const list = await gcFetch(`/institutions/?country=${encodeURIComponent(countryCode)}`, {}, token)
  const revolut = (Array.isArray(list) ? list : []).find((i) => /revolut/i.test(i.name))
  if (!revolut) {
    const err = new Error(`Revolut is not listed by GoCardless for country "${countryCode}".`)
    err.statusCode = 404
    throw err
  }
  return revolut
}

export async function createRequisition({ institutionId, redirectUrl, reference }) {
  const token = await getAccessToken()
  const agreement = await gcFetch(
    '/agreements/enduser/',
    {
      method: 'POST',
      body: JSON.stringify({
        institution_id: institutionId,
        max_historical_days: 90,
        access_valid_for_days: 90,
        access_scope: ['balances', 'details', 'transactions'],
      }),
    },
    token
  )
  const requisition = await gcFetch(
    '/requisitions/',
    {
      method: 'POST',
      body: JSON.stringify({
        redirect: redirectUrl,
        institution_id: institutionId,
        reference,
        agreement: agreement.id,
        user_language: 'EN',
      }),
    },
    token
  )
  return requisition
}

export async function getRequisition(requisitionId) {
  const token = await getAccessToken()
  return gcFetch(`/requisitions/${encodeURIComponent(requisitionId)}/`, {}, token)
}

export async function deleteRequisition(requisitionId) {
  const token = await getAccessToken()
  return gcFetch(`/requisitions/${encodeURIComponent(requisitionId)}/`, { method: 'DELETE' }, token)
}

export async function getAccountDetails(accountId) {
  const token = await getAccessToken()
  return gcFetch(`/accounts/${encodeURIComponent(accountId)}/details/`, {}, token)
}

export async function getAccountTransactions(accountId) {
  const token = await getAccessToken()
  const data = await gcFetch(`/accounts/${encodeURIComponent(accountId)}/transactions/`, {}, token)
  return data?.transactions || { booked: [], pending: [] }
}
