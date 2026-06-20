import React, { useState, useEffect } from 'react'
import { MatchCard, StatsPanel } from './ScoreBoard.jsx'

function useCountdown(targetDate) {
  const [diff, setDiff] = useState(null)
  useEffect(() => {
    const tick = () => {
      const ms = new Date(targetDate) - Date.now()
      if (ms <= 0) { setDiff(null); return }
      const d = Math.floor(ms / 86400000)
      const h = Math.floor((ms % 86400000) / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      setDiff({ d, h, m, s })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetDate])
  return diff
}

function CountdownBlock({ label, value }) {
  return (
    <div className="countdown-block">
      <span className="countdown-num">{String(value).padStart(2, '0')}</span>
      <span className="countdown-label">{label}</span>
    </div>
  )
}

function NextMatchHero({ match }) {
  const countdown = useCountdown(match.date)
  const { players, tournament, round, date } = match
  const matchDate = new Date(date)
  const dateStr = matchDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = matchDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })

  return (
    <div className="hero-card">
      <div className="hero-label">⏭ Sinner's Next Match</div>
      <div className="hero-tournament">{tournament.name} · {round}</div>
      <div className="hero-surface">{tournament.surface} · {tournament.city}</div>

      <div className="hero-matchup">
        <div className="hero-player home">
          <span className="hero-flag">🇮🇹</span>
          <span className="hero-player-name favorite">J. Sinner</span>
          <span className="hero-rank">#1</span>
        </div>
        <div className="hero-vs">VS</div>
        <div className="hero-player away">
          <span className="hero-player-name">{players.away.name}</span>
          {players.away.rank && <span className="hero-rank">#{players.away.rank}</span>}
        </div>
      </div>

      <div className="hero-datetime">{dateStr} · {timeStr}</div>

      {countdown ? (
        <div className="countdown-row">
          <CountdownBlock label="Days"  value={countdown.d} />
          <span className="countdown-sep">:</span>
          <CountdownBlock label="Hours" value={countdown.h} />
          <span className="countdown-sep">:</span>
          <CountdownBlock label="Min"   value={countdown.m} />
          <span className="countdown-sep">:</span>
          <CountdownBlock label="Sec"   value={countdown.s} />
        </div>
      ) : (
        <div className="hero-starting">Match is starting now!</div>
      )}
    </div>
  )
}

function LiveHeroBanner({ match, onView }) {
  return (
    <div className="live-hero-banner" onClick={onView}>
      <div className="live-pulse">🔴 SINNER IS LIVE</div>
      <div className="live-hero-tournament">{match.tournament.name} · {match.round}</div>
      <div className="live-hero-score">
        <span className="live-hero-player favorite">Sinner</span>
        <span className="live-hero-sets">
          {match.score.sets.map(([h, a], i) => (
            <span key={i} className="live-set">
              <b>{h}</b>-{a}
            </span>
          ))}
        </span>
        <span className="live-hero-vs">vs</span>
        <span className="live-hero-sets">
          {match.score.sets.map(([h, a], i) => (
            <span key={i} className="live-set">
              {h}-<b>{a}</b>
            </span>
          ))}
        </span>
        <span className="live-hero-player">{match.players.away.name.split(' ').slice(-1)[0]}</span>
      </div>
      <div className="live-hero-game">
        Game: {match.score.currentGame.home} – {match.score.currentGame.away}
      </div>
      <div className="live-hero-tap">Tap to view full stats →</div>
    </div>
  )
}

export default function Home({ data, onViewMatch }) {
  const { live, upcoming, recent } = data

  const hasSinnerLive = live && (live.players.home.isFavorite || live.players.away.isFavorite)

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">🎾 Sinner Tracker</h1>
        <span className="atp-rank-badge">#1 ATP</span>
      </div>

      {hasSinnerLive && (
        <LiveHeroBanner match={live} onView={() => onViewMatch(live)} />
      )}

      {!hasSinnerLive && upcoming.length > 0 && (
        <NextMatchHero match={upcoming[0]} />
      )}

      {upcoming.length > 1 && (
        <section className="section">
          <h2 className="section-title">Upcoming Matches</h2>
          {upcoming.slice(hasSinnerLive ? 0 : 1).map(m => (
            <MatchCard key={m.id} match={m} onClick={onViewMatch} />
          ))}
        </section>
      )}

      {recent.length > 0 && (
        <section className="section">
          <h2 className="section-title">Recent Results</h2>
          {recent.map(m => (
            <MatchCard key={m.id} match={m} onClick={onViewMatch} />
          ))}
        </section>
      )}
    </div>
  )
}
