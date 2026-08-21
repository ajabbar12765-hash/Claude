import PlacementQuiz from '../components/PlacementQuiz.jsx'
import { levelFromScore } from '../data/placementQuiz.js'

// The same quick check from onboarding, surfaced again in Profile — for
// anyone who onboarded before this quiz existed, or whose Italian has
// moved on since they last took it. The score sets italianLevel, which
// tunes how simple or natural Volpe's Italian is during voice calls.
export default function LevelCheck({ progress, onExit }) {
  function save(score) {
    progress.setItalianLevel(levelFromScore(score))
    onExit()
  }

  return (
    <div className="screen screen-onboarding">
      <button type="button" className="onboarding-skip" onClick={onExit}>
        Close
      </button>
      <PlacementQuiz onFinish={save} confirmLabel="Save" confirmIcon="check" />
    </div>
  )
}
