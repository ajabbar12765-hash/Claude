// Combines however many threat-intel sources actually responded into one
// verdict. Only VirusTotal and Safe Browsing can ever resolve "safe" --
// URLhaus is a malicious-only blocklist, so its silence proves nothing.
export function aggregateVerdict({ virustotal, safeBrowsing, urlhaus }) {
  const sources = []
  if (virustotal) sources.push({ name: 'VirusTotal', ...virustotal })
  if (safeBrowsing) sources.push({ name: 'Google Safe Browsing', ...safeBrowsing })
  if (urlhaus) sources.push({ name: 'URLhaus', ...urlhaus })

  const malicious = sources.filter((s) => s.status === 'malicious')
  const suspicious = sources.filter((s) => s.status === 'suspicious')
  const clean = sources.filter((s) => s.status === 'clean')

  let verdict = 'unknown'
  if (malicious.length > 0) verdict = 'malicious'
  else if (suspicious.length > 0) verdict = 'suspicious'
  else if (clean.length > 0) verdict = 'safe'

  return { verdict, sources, checkedAt: new Date().toISOString() }
}
