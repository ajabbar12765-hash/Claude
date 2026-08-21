// URLhaus (abuse.ch): community-sourced feed of confirmed malware
// distribution URLs. Free Auth-Key from https://auth.abuse.ch/ -- see SETUP.md.
export async function checkUrlhaus(url) {
  const key = process.env.URLHAUS_AUTH_KEY
  if (!key) return null

  const res = await fetch('https://urlhaus-api.abuse.ch/v1/url/', {
    method: 'POST',
    headers: { 'Auth-Key': key, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ url }),
  })
  if (!res.ok) return { status: 'error', detail: `URLhaus error ${res.status}` }

  const data = await res.json()
  if (data.query_status === 'ok') {
    return {
      status: 'malicious',
      detail: data.threat,
      tags: data.tags || [],
      permalink: data.urlhaus_reference,
    }
  }
  // 'no_results' only means URLhaus hasn't logged it -- not proof of safety,
  // so this never resolves a verdict to "safe" on its own (see verdict.js).
  return { status: 'unknown', detail: null }
}
