import React from 'react'

function flagEmoji(code) {
  if (!code || code.length !== 2) return ''
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
}

const RANK_COLORS = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' }

export default function Rankings({ rankings }) {
  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">📊 ATP Rankings</h1>
        <span className="screen-sub">Live Race 2026</span>
      </div>

      <div className="rankings-list">
        {rankings.map((p, i) => (
          <div key={p.rank} className={`rank-row ${p.isFavorite ? 'rank-row-fav' : ''}`}>
            <div
              className="rank-num"
              style={{ color: RANK_COLORS[p.rank] || '#8888aa' }}
            >
              {p.rank <= 3
                ? ['🥇', '🥈', '🥉'][p.rank - 1]
                : `#${p.rank}`}
            </div>
            <span className="rank-flag">{flagEmoji(p.country)}</span>
            <div className="rank-player-info">
              <span className={`rank-name ${p.isFavorite ? 'favorite' : ''}`}>
                {p.name}
                {p.isFavorite && ' ⭐'}
              </span>
              <span className="rank-country">{p.country}</span>
            </div>
            <div className="rank-points">
              <span className="rank-pts-num">{p.points.toLocaleString()}</span>
              <span className="rank-pts-label">pts</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rankings-note">
        Source: API-Sports · Updated daily
      </div>
    </div>
  )
}
