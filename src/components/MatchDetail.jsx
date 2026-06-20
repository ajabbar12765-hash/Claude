import React from 'react'
import { StatsPanel } from './ScoreBoard.jsx'

function flagEmoji(code) {
  if (!code || code.length !== 2) return ''
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
}

function SetGrid({ sets, tiebreaks, winner }) {
  if (!sets?.length) return null
  const labels = sets.map((_, i) => `S${i + 1}`)

  return (
    <div className="set-grid">
      <div className="set-grid-header">
        <span />
        {labels.map((l, i) => <span key={i} className="set-grid-label">{l}</span>)}
      </div>

      {['home', 'away'].map(side => {
        const isHome = side === 'home'
        return (
          <div key={side} className="set-grid-row">
            <span className={`set-grid-player ${isHome && winner === 'home' ? 'winner' : ''} ${isHome && sets[0][0] !== undefined ? '' : ''}`}>
              {isHome ? '▶' : '◀'}
            </span>
            {sets.map(([h, a], i) => {
              const mine = isHome ? h : a
              const theirs = isHome ? a : h
              const wonSet = mine > theirs
              const isTB = tiebreaks && tiebreaks[i] != null
              return (
                <span key={i} className={`set-grid-score ${wonSet ? 'set-won' : 'set-lost'}`}>
                  {mine}
                  {isTB && <sup className="tb-sup">{isHome ? tiebreaks[i] : ''}</sup>}
                </span>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function PointLogTable({ log }) {
  if (!log?.length) return null
  return (
    <div className="stats-section">
      <div className="stats-section-title">Recent Points</div>
      <div className="point-log">
        {log.map((p, i) => (
          <div key={i} className={`point-row ${p.winner === 'home' ? 'point-home' : 'point-away'}`}>
            <span className="point-score">{p.score}</span>
            <span className={`point-type ${p.type}`}>{formatType(p.type)}</span>
            <span className="point-shot">{p.shot}</span>
            <span className="point-winner-icon">{p.winner === 'home' ? '★' : '☆'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatType(type) {
  switch (type) {
    case 'ace':           return '🎯 Ace'
    case 'winner':        return '💥 Winner'
    case 'unforcedError': return '❌ UE'
    case 'doubleFault':   return '⚡ DF'
    default:              return type
  }
}

export default function MatchDetail({ match, onBack }) {
  if (!match) return null
  const { players, score, tournament, round, date, stats, status, pointLog } = match
  const isLive = status === 'live'
  const matchDate = new Date(date)
  const dateStr = matchDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="screen detail-screen">
      <div className="detail-back-row">
        <button className="back-btn" onClick={onBack}>← Back</button>
        {isLive && <span className="live-chip">🔴 LIVE</span>}
      </div>

      <div className="detail-header">
        <div className="detail-tournament">{tournament.name}</div>
        <div className="detail-meta">
          {round} · {tournament.surface} · {tournament.city}
        </div>
        <div className="detail-date">{dateStr}</div>
      </div>

      <div className="detail-scoreboard">
        <div className={`detail-player ${score?.winner === 'home' ? 'detail-winner' : ''}`}>
          <span className="detail-flag">{flagEmoji(players.home.country)}</span>
          <div className="detail-player-info">
            <span className={`detail-name ${players.home.isFavorite ? 'favorite' : ''}`}>
              {players.home.name} {players.home.isFavorite && '⭐'}
            </span>
            {players.home.rank && <span className="detail-rank">ATP #{players.home.rank}</span>}
          </div>
          {score?.winner === 'home' && <span className="winner-cup">🏆</span>}
          {isLive && score?.server === 'home' && <span className="serve-indicator">●</span>}
        </div>

        {score && (
          <SetGrid
            sets={score.sets}
            tiebreaks={score.tiebreaks}
            winner={score.winner}
          />
        )}

        <div className={`detail-player ${score?.winner === 'away' ? 'detail-winner' : ''}`}>
          <span className="detail-flag">{flagEmoji(players.away.country)}</span>
          <div className="detail-player-info">
            <span className={`detail-name ${players.away.isFavorite ? 'favorite' : ''}`}>
              {players.away.name} {players.away.isFavorite && '⭐'}
            </span>
            {players.away.rank && <span className="detail-rank">ATP #{players.away.rank}</span>}
          </div>
          {score?.winner === 'away' && <span className="winner-cup">🏆</span>}
          {isLive && score?.server === 'away' && <span className="serve-indicator">●</span>}
        </div>

        {isLive && score?.currentGame && (
          <div className="detail-live-game">
            <div className="detail-game-label">Current Game</div>
            <div className="detail-game-score">
              <span className="game-point home-point">{score.currentGame.home}</span>
              <span className="game-dash">–</span>
              <span className="game-point away-point">{score.currentGame.away}</span>
            </div>
          </div>
        )}
      </div>

      {stats && (
        <StatsPanel
          stats={stats}
          homePlayer={players.home}
          awayPlayer={players.away}
        />
      )}

      {pointLog && <PointLogTable log={pointLog} />}

      {!stats && !pointLog && (
        <div className="no-stats">
          <div className="empty-icon">📈</div>
          <p>Detailed stats will appear here once available from the API</p>
        </div>
      )}
    </div>
  )
}
