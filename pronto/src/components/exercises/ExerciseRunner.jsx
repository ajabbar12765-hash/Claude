import McqExercise from './McqExercise.jsx'
import BuildExercise from './BuildExercise.jsx'
import TypeExercise from './TypeExercise.jsx'
import ListenExercise from './ListenExercise.jsx'
import MatchExercise from './MatchExercise.jsx'
import ExplainExercise from './ExplainExercise.jsx'
import SpeakExercise from './SpeakExercise.jsx'
import DictationExercise from './DictationExercise.jsx'
import ReorderExercise from './ReorderExercise.jsx'
import RespondExercise from './RespondExercise.jsx'
import ShadowExercise from './ShadowExercise.jsx'

const RENDERERS = {
  mcq: McqExercise,
  build: BuildExercise,
  type: TypeExercise,
  listen: ListenExercise,
  match: MatchExercise,
  explain: ExplainExercise,
  speak: SpeakExercise,
  dictation: DictationExercise,
  reorder: ReorderExercise,
  respond: RespondExercise,
  shadow: ShadowExercise,
}

export default function ExerciseRunner({ exercise, onAnswered, onContinue, distractorPool }) {
  const Renderer = RENDERERS[exercise.type]
  if (!Renderer) return null
  return <Renderer key={exercise.id} exercise={exercise} onAnswered={onAnswered} onContinue={onContinue} distractorPool={distractorPool} />
}
