const DOT = {
  malicious: '#dc2626',
  suspicious: '#d97706',
  safe: '#16a34a',
  unknown: '#6b7280',
}

export default function HistoryList({ entries }) {
  if (!entries?.length) {
    return <p className="empty">No scans yet -- check a link or file above.</p>
  }
  return (
    <ul className="history-list">
      {entries.map((e, i) => (
        <li key={i}>
          <span className="dot" style={{ background: DOT[e.verdict] || DOT.unknown }} />
          <span className="history-target">{e.target}</span>
          <span className="history-verdict">{e.verdict}</span>
          <span className="history-time">{new Date(e.checkedAt).toLocaleString()}</span>
        </li>
      ))}
    </ul>
  )
}
