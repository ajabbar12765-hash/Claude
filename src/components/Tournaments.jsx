import React, { useState } from 'react'

const CATEGORY_ORDER = ['Grand Slam', 'ATP Finals', 'Masters 1000', 'ATP 500', 'ATP 250']

const SURFACE_COLOR = {
  'Grass':         '#22c55e',
  'Clay':          '#f97316',
  'Hard':          '#3b82f6',
  'Hard (Indoor)': '#8b5cf6',
}

const CATEGORY_ICON = {
  'Grand Slam':   '🏆',
  'ATP Finals':   '👑',
  'Masters 1000': '🥇',
  'ATP 500':      '🥈',
  'ATP 250':      '🥉',
}

function flagEmoji(code) {
  if (!code || code.length !== 2) return ''
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
}

function StatusBadge({ status }) {
  if (status === 'live')     return <span className="status-badge live-badge">LIVE NOW</span>
  if (status === 'upcoming') return <span className="status-badge upcoming-badge">Upcoming</span>
  return <span className="status-badge finished-badge">Finished</span>
}

function TournamentCard({ t }) {
  const surfaceColor = SURFACE_COLOR[t.surface] || '#6b7280'
  return (
    <div className={`tournament-card ${t.status}`}>
      <div className="tournament-card-header">
        <div>
          <div className="tournament-card-name">{flagEmoji(t.country)} {t.name}</div>
          <div className="tournament-card-location">{t.city}</div>
        </div>
        <StatusBadge status={t.status} />
      </div>
      <div className="tournament-card-meta">
        <span className="surface-pill" style={{ borderColor: surfaceColor, color: surfaceColor }}>
          {t.surface}
        </span>
        <span className="tournament-dates">{t.dates}</span>
      </div>
      {t.prize && <div className="tournament-prize">Prize: {t.prize}</div>}
      {t.winner && (
        <div className="tournament-winner">
          🏆 Winner: <span className={t.winner === 'Jannik Sinner' ? 'favorite' : ''}>{t.winner}</span>
        </div>
      )}
    </div>
  )
}

export default function Tournaments({ tournaments }) {
  const [filter, setFilter] = useState('all')

  const statusFilters = ['all', 'live', 'upcoming', 'finished']

  const filtered = filter === 'all'
    ? tournaments
    : tournaments.filter(t => t.status === filter)

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const items = filtered.filter(t => t.category === cat)
    if (items.length) acc[cat] = items
    return acc
  }, {})

  const sinnerWins = tournaments.filter(t => t.winner === 'Jannik Sinner').length

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">🏆 ATP Events 2026</h1>
      </div>

      <div className="sinner-season-bar">
        <div className="season-stat">
          <span className="season-stat-num">{sinnerWins}</span>
          <span className="season-stat-label">Sinner Titles</span>
        </div>
        <div className="season-stat">
          <span className="season-stat-num">
            {tournaments.filter(t => t.status === 'finished').length}
          </span>
          <span className="season-stat-label">Completed</span>
        </div>
        <div className="season-stat">
          <span className="season-stat-num">
            {tournaments.filter(t => t.status === 'upcoming' || t.status === 'live').length}
          </span>
          <span className="season-stat-label">Remaining</span>
        </div>
      </div>

      <div className="filter-row">
        {statusFilters.map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {Object.entries(grouped).map(([cat, items]) => (
        <section key={cat} className="section">
          <h2 className="section-title">
            {CATEGORY_ICON[cat] || '🎾'} {cat}
          </h2>
          {items.map(t => <TournamentCard key={t.id} t={t} />)}
        </section>
      ))}

      {Object.keys(grouped).length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-text">No events match this filter</div>
        </div>
      )}
    </div>
  )
}
