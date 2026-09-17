import { useMemo } from 'react'

// Original, lightweight animated backdrop for the current-conditions card.
// Loosely inspired by the idea of "living" weather scenes (the kind of thing
// Samsung Weather popularized) but built from scratch with simple shapes —
// no copied art, and only a handful of scenes rather than a full cast.

function rand(min, max) {
  return min + Math.random() * (max - min)
}

function Clouds({ count, dense }) {
  const clouds = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        top: rand(6, dense ? 55 : 38),
        scale: rand(0.7, dense ? 1.5 : 1.15),
        duration: rand(34, 60),
        delay: -rand(0, 40),
        opacity: dense ? rand(0.55, 0.85) : rand(0.35, 0.6),
        reverse: i % 2 === 1,
      })),
    [count, dense]
  )

  return (
    <div className="scene-clouds">
      {clouds.map((c, i) => (
        <div
          key={i}
          className={`scene-cloud${c.reverse ? ' reverse' : ''}`}
          style={{
            top: `${c.top}%`,
            opacity: c.opacity,
            '--scale': c.scale,
            '--duration': `${c.duration}s`,
            '--delay': `${c.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

function Stars({ count = 34 }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }).map(() => ({
        top: rand(2, 60),
        left: rand(0, 100),
        size: rand(1, 2.6),
        delay: -rand(0, 6),
        duration: rand(2.5, 5),
      })),
    [count]
  )
  return (
    <div className="scene-stars">
      {stars.map((s, i) => (
        <span
          key={i}
          className="scene-star"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            '--delay': `${s.delay}s`,
            '--duration': `${s.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

function Rain({ count = 46 }) {
  const drops = useMemo(
    () =>
      Array.from({ length: count }).map(() => ({
        left: rand(0, 100),
        duration: rand(0.5, 0.95),
        delay: -rand(0, 1),
        height: rand(14, 26),
      })),
    [count]
  )
  return (
    <div className="scene-rain">
      {drops.map((d, i) => (
        <span
          key={i}
          className="scene-raindrop"
          style={{
            left: `${d.left}%`,
            height: d.height,
            '--duration': `${d.duration}s`,
            '--delay': `${d.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

function Snow({ count = 34 }) {
  const flakes = useMemo(
    () =>
      Array.from({ length: count }).map(() => ({
        left: rand(0, 100),
        size: rand(2.5, 5.5),
        duration: rand(6, 12),
        delay: -rand(0, 12),
        sway: rand(10, 28),
      })),
    [count]
  )
  return (
    <div className="scene-snow">
      {flakes.map((f, i) => (
        <span
          key={i}
          className="scene-snowflake"
          style={{
            left: `${f.left}%`,
            width: f.size,
            height: f.size,
            '--duration': `${f.duration}s`,
            '--delay': `${f.delay}s`,
            '--sway': `${f.sway}px`,
          }}
        />
      ))}
    </div>
  )
}

function Fog() {
  return (
    <div className="scene-fog">
      <span className="scene-fog-band" style={{ top: '20%', '--duration': '26s' }} />
      <span className="scene-fog-band" style={{ top: '45%', '--duration': '34s', '--delay': '-8s' }} />
      <span className="scene-fog-band" style={{ top: '68%', '--duration': '30s', '--delay': '-16s' }} />
    </div>
  )
}

function Lightning() {
  return (
    <div className="scene-lightning">
      <span className="scene-flash" style={{ '--delay': '0s' }} />
      <span className="scene-flash" style={{ '--delay': '-3.4s' }} />
    </div>
  )
}

// A small original silhouette that strolls across the scene and pauses
// twice per lap to look up, shading its eyes — a nod to the "figure enjoying
// the weather" idea without reproducing anyone's specific character art.
function Walker() {
  return (
    <div className="scene-walker-track">
      <div className="scene-walker">
        <svg viewBox="0 0 24 40" width="32" height="54">
          <g className="walker-head-group">
            <circle className="walker-head" cx="12" cy="6" r="4" />
            <path className="walker-arm-shade" d="M12 6 l6 -3" />
          </g>
          <path className="walker-torso" d="M12 10 L12 24" />
          <path className="walker-arm-back" d="M12 13 L7 20" />
          <path className="walker-leg walker-leg-a" d="M12 24 L8 36" />
          <path className="walker-leg walker-leg-b" d="M12 24 L16 36" />
        </svg>
      </div>
    </div>
  )
}

const SKY_VISIBLE = new Set(['clear', 'partly-cloudy'])

export default function WeatherScene({ category, isDay }) {
  const skyVisible = SKY_VISIBLE.has(category)
  return (
    <div className={`scene scene-${category} ${isDay ? 'scene-day' : 'scene-night'}`} aria-hidden="true">
      {skyVisible && (isDay ? <div className="scene-sun" /> : <div className="scene-moon" />)}
      {skyVisible && !isDay && <Stars />}

      {category === 'partly-cloudy' && <Clouds count={2} />}
      {category === 'cloudy' && <Clouds count={4} dense />}
      {category === 'rain' && <Clouds count={3} dense />}
      {category === 'snow' && <Clouds count={2} dense />}
      {category === 'storm' && <Clouds count={4} dense />}

      {category === 'fog' && <Fog />}
      {category === 'rain' && <Rain />}
      {category === 'snow' && <Snow />}
      {category === 'storm' && (
        <>
          <Rain count={30} />
          <Lightning />
        </>
      )}

      {category === 'clear' && isDay && <Walker />}

      <div className="scene-ground" />
    </div>
  )
}
