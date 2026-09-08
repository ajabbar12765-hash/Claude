import { useReveal } from '../lib/useReveal.js'
import PlaceLookup from './PlaceLookup.jsx'

const STEPS = [
  {
    n: '01',
    title: 'It watches, on a clock',
    body: 'Every 20 seconds the radar re-checks the expiry date on every code it holds — the starter set and anything you\'ve added — while this tab is open.',
  },
  {
    n: '02',
    title: 'Past its date, it\'s gone',
    body: 'The moment a code\'s expiry passes, it\'s pulled from the active list on its own — moved to the Archive with a toast and an Undo, so nothing dead lingers.',
  },
  {
    n: '03',
    title: 'You close the loop',
    body: 'Tap "It worked" or "Didn\'t work" on anything you actually try, and that code is retired too — most are one-time-use, so used means gone.',
  },
]

export default function Hero({ radarStatus, allItems, usedMap, onCopy, onWorked, onDidntWork, onAddPlace, onScrollToApp }) {
  return (
    <section className="hero">
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-inner">
        <span className="hero-kicker">Watching {radarStatus.activeCount} codes right now</span>
        <h1 className="hero-title">
          Never pay
          <br />
          full price <em>in Pakistan.</em>
        </h1>
        <div className="hero-stripe" aria-hidden="true"><span /><span /><span /></div>
        <p className="hero-sub">
          One radar for Daraz, Springs, Khaadi, Foodpanda, gift cards and flights to
          wherever you're headed next — it retires the dead ones so you never waste a trip to checkout.
        </p>

        <PlaceLookup
          items={allItems}
          usedMap={usedMap}
          onCopy={onCopy}
          onWorked={onWorked}
          onDidntWork={onDidntWork}
          onAddPlace={onAddPlace}
        />

        <button className="hero-scroll-cue" onClick={onScrollToApp} aria-label="Scroll to the deals">
          <span>Browse every deal</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 4v16M5 13l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      <div className="scan-steps">
        {STEPS.map((s) => (
          <Step key={s.n} step={s} />
        ))}
      </div>
      <div className="hero-fringe" aria-hidden="true" />
    </section>
  )
}

function Step({ step }) {
  const [ref, visible] = useReveal(0.4)
  return (
    <div ref={ref} className={`scan-step ${visible ? 'is-visible' : ''}`}>
      <span className="scan-step-n">{step.n}</span>
      <h3>{step.title}</h3>
      <p>{step.body}</p>
    </div>
  )
}
