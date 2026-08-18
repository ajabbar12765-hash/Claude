import McqExercise from './McqExercise.jsx'
import BuildExercise from './BuildExercise.jsx'
import TypeExercise from './TypeExercise.jsx'
import ListenExercise from './ListenExercise.jsx'
import MatchExercise from './MatchExercise.jsx'

const RENDERERS = {
  mcq: McqExercise,
  build: BuildExercise,
  type: TypeExercise,
  listen: ListenExercise,
  match: MatchExercise,
}

export default function ExerciseRunner({ exercise, onAnswered, onContinue }) {
  const Renderer = RENDERERS[exercise.type]
  if (!Renderer) return null
  return <Renderer key={exercise.id} exercise={exercise} onAnswered={onAnswered} onContinue={onContinue} />
}
