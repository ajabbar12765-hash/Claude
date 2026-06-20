import React, { useState, useEffect } from 'react'
import { MatchCard } from './ScoreBoard.jsx'
import { getLiveFixtures } from '../api/tennisApi.js'

export default function Live({ apiKey, onViewMatch, initialLive }) {
  const [matches, setMatches] = useState(initialLive ? [initialLive] : [])
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  useEffect(() => {
    let cancelled = false
    const fetchLive = async () => {
      setLoading(true)
      try {
        const data = await getLiveFixtures(apiKey)
        if (!cancelled) {
          setMatches(data)
          setLastUpdate(new Date())
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchLive()
    const id = setInterval(fetchLive, 30000)
    return () => { cancelled = true; clearInterval(id) }
  }, [apiKey])

  const sinnerMatches = matches.filter(m => m.players.home.isFavorite || m.players.away.isFavorite)
  const otherMatches  = matches.filter(m => !m.players.home.isFavorite && !m.players.away.isFavorite)

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">📡 Live Scores</h1>
        <span className={`refresh-badge ${loading ? 'spinning' : ''}`}>
          {loading ? '↻' : '↻'} {lastUpdate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {matches.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon">😴</div>
          <div className="empty-text">No live matches right now</div>
          <div className="empty-sub">Check back during tournament days</div>
        </div>
      )}

      {sinnerMatches.length > 0 && (
        <section className="section">
          <h2 className="section-title favorite">⭐ Sinner Live</h2>
          {sinnerMatches.map(m => (
            <MatchCard key={m.id} match={m} onClick={onViewMatch} />
          ))}
        </section>
      )}

      {otherMatches.length > 0 && (
        <section className="section">
          <h2 className="section-title">All Live ATP Matches</h2>
          {otherMatches.map(m => (
            <MatchCard key={m.id} match={m} onClick={onViewMatch} />
          ))}
        </section>
      )}

      <div className="auto-refresh-note">Auto-refreshes every 30 seconds</div>
    </div>
  )
}
