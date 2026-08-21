// Google Safe Browsing v4: the same phishing/malware blocklist Chrome itself
// uses. Free API key from Google Cloud Console -- see SETUP.md.
export async function checkSafeBrowsing(url) {
  const key = process.env.SAFE_BROWSING_API_KEY
  if (!key) return null

  const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client: { clientId: 'clickwarden', clientVersion: '1.0.0' },
      threatInfo: {
        threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: [{ url }],
      },
    }),
  })

  if (!res.ok) return { status: 'error', detail: `Safe Browsing error ${res.status}` }

  const data = await res.json()
  const matches = data.matches || []
  if (matches.length === 0) return { status: 'clean', detail: null, matches: [] }
  return {
    status: 'malicious',
    detail: [...new Set(matches.map((m) => m.threatType))].join(', '),
    matches,
  }
}
