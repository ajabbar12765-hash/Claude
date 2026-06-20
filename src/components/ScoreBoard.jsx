import React from 'react'

const SURFACE_COLOR = {
  'Grass':        '#22c55e',
  'Clay':         '#f97316',
  'Hard':         '#3b82f6',
  'Hard (Indoor)': '#8b5cf6',
}

function surfaceBadge(surface) {
  const color = SURFACE_COLOR[surface] || '#6b7280'
  return <span className="surface-badge" style={{ background: color }}>{surface}</span>
}

function flagEmoji(code) {
  if (!code || code.length !== 2) return ''
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
}

function SetScore({ sets, tiebreaks, winner, live }) {
  if (!sets || sets.length === 0) return <span className="no-score">—</span>
  return (
    <div className="set-scores">
      {sets.map(([h, a], i) => {
        const isTB = tiebreaks && tiebreaks[i] != null
        const winningSet = !live && (i === sets.length - 1 ? winner === 'home' ? h > a : a > h : true)
        return (
          <span key={i} className={`set-block ${isTB ? 'tiebreak' : ''}`}>
            <span className={sets[i][0] > sets[i][1] ? 'set-win' : ''}>{h}</span>
            {isTB && <sup className="tb-score">{tiebreaks[i]}</sup>}
            <span className="set-divider">-</span>
            <span className={sets[i][1] > sets[i][0] ? 'set-win' : ''}>{a}</span>
          </span>
        )
      })}
    </div>
  )
}

export function MatchCard({ match, onClick, favoriteId }) {
  const { players, score, tournament, round, date, status } = match
  const isLive = status === 'live'
  const isUpcoming = status === 'scheduled'
  const homeWon = score?.winner === 'home'
  const awayWon = score?.winner === 'away'

  const matchDate = new Date(date)
  const dateStr = matchDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  const timeStr = matchDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`match-card ${isLive ? 'live-card' : ''} ${isUpcoming ? 'upcoming-card' : ''}`} onClick={() => onClick && onClick(match)}>
      {isLive && <div className="live-banner">🔴 LIVE</div>}
      <div className="match-meta">
        <span className="tournament-name">{tournament.name}</span>
        {surfaceBadge(tournament.surface)}
        <span className="round-badge">{round}</span>
      </div>

      <div className="match-players">
        <div className={`player-row ${homeWon ? 'winner-row' : ''}`}>
          <span className="player-flag">{flagEmoji(players.home.country)}</span>
          <span className={`player-name ${players.home.isFavorite ? 'favorite' : ''}`}>
            {players.home.name}
            {players.home.isFavorite && <span className="fav-star">★</span>}
          </span>
          {players.home.rank && <span className="player-rank">#{players.home.rank}</span>}
          <div className="score-cell">
            {isLive
              ? <SetScore sets={score.sets} live={true} />
              : isUpcoming
              ? null
              : <SetScore sets={score.sets} tiebreaks={score.tiebreaks} winner={homeWon ? 'home' : null} />
            }
          </div>
          {isLive && score.server === 'home' && <span className="serve-dot" />}
        </div>

        <div className="match-divider-row">
          <span className="vs-text">vs</span>
          {isLive && (
            <span className="game-score-inline">
              {score.currentGame?.home} — {score.currentGame?.away}
            </span>
          )}
          {isUpcoming && (
            <span className="match-time">{dateStr} · {timeStr}</span>
          )}
        </div>

        <div className={`player-row ${awayWon ? 'winner-row' : ''}`}>
          <span className="player-flag">{flagEmoji(players.away.country)}</span>
          <span className={`player-name ${players.away.isFavorite ? 'favorite' : ''}`}>
            {players.away.name}
            {players.away.isFavorite && <span className="fav-star">★</span>}
          </span>
          {players.away.rank && <span className="player-rank">#{players.away.rank}</span>}
          <div className="score-cell">
            {isLive
              ? <SetScore sets={score.sets.map(([h, a]) => [a, h])} live={true} />
              : isUpcoming
              ? null
              : <SetScore sets={score.sets.map(([h, a]) => [a, h])} tiebreaks={score.tiebreaks} winner={awayWon ? 'home' : null} />
            }
          </div>
          {isLive && score.server === 'away' && <span className="serve-dot" />}
        </div>
      </div>

      {status === 'finished' && (
        <div className="match-footer">
          <span className="match-date">{dateStr}</span>
          <span className="tap-detail">Tap for stats →</span>
        </div>
      )}
    </div>
  )
}

function StatBar({ label, home, away, homeVal, awayVal, total }) {
  const hNum = typeof homeVal === 'number' ? homeVal : parseInt(home) || 0
  const aNum = typeof awayVal === 'number' ? awayVal : parseInt(away) || 0
  const sum = total || hNum + aNum || 1
  const hPct = Math.round((hNum / sum) * 100)
  const aPct = 100 - hPct

  return (
    <div className="stat-row">
      <span className="stat-val home">{home}</span>
      <div className="stat-bar-wrap">
        <div className="stat-bar">
          <div className="stat-fill home-fill" style={{ width: `${hPct}%` }} />
          <div className="stat-fill away-fill" style={{ width: `${aPct}%` }} />
        </div>
        <span className="stat-label">{label}</span>
      </div>
      <span className="stat-val away">{away}</span>
    </div>
  )
}

export function StatsPanel({ stats, homePlayer, awayPlayer }) {
  if (!stats) return <div className="no-stats">No stats available</div>

  return (
    <div className="stats-panel">
      <div className="stats-header">
        <span className={`stats-player-name ${homePlayer?.isFavorite ? 'favorite' : ''}`}>{homePlayer?.name}</span>
        <span className="stats-vs">Stats</span>
        <span className="stats-player-name">{awayPlayer?.name}</span>
      </div>

      <div className="stats-section">
        <div className="stats-section-title">Service</div>
        <StatBar label="Aces" home={stats.aces[0]} away={stats.aces[1]} />
        <StatBar label="Double Faults" home={stats.doubleFaults[0]} away={stats.doubleFaults[1]} />
        <StatBar label="1st Serve In" home={stats.firstServeIn[0]} away={stats.firstServeIn[1]}
          homeVal={parseInt(stats.firstServeIn[0])} awayVal={parseInt(stats.firstServeIn[1])} total={200} />
        <StatBar label="1st Serve Won" home={stats.firstServeWon[0]} away={stats.firstServeWon[1]}
          homeVal={parseInt(stats.firstServeWon[0])} awayVal={parseInt(stats.firstServeWon[1])} total={200} />
        <StatBar label="2nd Serve Won" home={stats.secondServeWon[0]} away={stats.secondServeWon[1]}
          homeVal={parseInt(stats.secondServeWon[0])} awayVal={parseInt(stats.secondServeWon[1])} total={200} />
      </div>

      <div className="stats-section">
        <div className="stats-section-title">Points</div>
        <StatBar label="Winners" home={stats.winners[0]} away={stats.winners[1]} />
        <StatBar label="Unforced Errors" home={stats.unforcedErrors[0]} away={stats.unforcedErrors[1]} />
        <StatBar label="Break Points" home={stats.breakPointsConverted[0]} away={stats.breakPointsConverted[1]}
          homeVal={parseInt(stats.breakPointsConverted[0])}
          awayVal={parseInt(stats.breakPointsConverted[1])}
          total={parseInt(stats.breakPointsConverted[0]) + parseInt(stats.breakPointsConverted[1]) || 1} />
        <StatBar label="Total Points Won" home={stats.totalPointsWon[0]} away={stats.totalPointsWon[1]} />
      </div>

      {stats.netApproaches && (
        <div className="stats-section">
          <div className="stats-section-title">Net</div>
          <StatBar label="Net Approaches Won" home={stats.netApproaches[0]} away={stats.netApproaches[1]}
            homeVal={parseInt(stats.netApproaches[0])} awayVal={parseInt(stats.netApproaches[1])} total={20} />
        </div>
      )}
    </div>
  )
}
