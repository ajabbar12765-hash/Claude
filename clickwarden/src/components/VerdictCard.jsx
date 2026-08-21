const COLORS = {
  malicious: '#dc2626',
  suspicious: '#d97706',
  safe: '#16a34a',
  unknown: '#6b7280',
}

const LABELS = {
  malicious: 'Malicious — do not open',
  suspicious: 'Suspicious — proceed with caution',
  safe: 'Looks safe',
  unknown: 'Unknown — not enough data',
}

export default function VerdictCard({ result }) {
  if (!result) return null
  const color = COLORS[result.verdict] || COLORS.unknown

  return (
    <div className="verdict-card" style={{ borderColor: color }}>
      <div className="verdict-badge" style={{ background: color }}>
        {LABELS[result.verdict] || result.verdict}
      </div>
      <div className="verdict-target">{result.target || result.filename || result.sha256}</div>

      {result.warning && <p className="verdict-warning">{result.warning}</p>}

      {result.sources?.length > 0 && (
        <ul className="verdict-sources">
          {result.sources.map((s) => (
            <li key={s.name}>
              <strong>{s.name}:</strong> {s.status}
              {s.detail ? ` — ${s.detail}` : ''}
              {s.permalink && (
                <>
                  {' '}
                  <a href={s.permalink} target="_blank" rel="noreferrer">
                    details
                  </a>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {result.cached && <p className="verdict-meta">Cached result from the last 30 minutes.</p>}
    </div>
  )
}
