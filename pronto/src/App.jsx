import { useState } from 'react'
import { useProgress } from './hooks/useProgress.js'
import TopBar from './components/TopBar.jsx'
import Home from './screens/Home.jsx'
import Lesson from './screens/Lesson.jsx'
import Scenario from './screens/Scenario.jsx'
import Profile from './screens/Profile.jsx'

export default function App() {
  const progress = useProgress()
  const [screen, setScreen] = useState('home') // 'home' | 'profile' | 'lesson'
  const [activeLesson, setActiveLesson] = useState(null)

  function openLesson(lesson) {
    setActiveLesson(lesson)
    setScreen('lesson')
  }

  function returnHome() {
    setActiveLesson(null)
    setScreen('home')
  }

  const showChrome = screen === 'home' || screen === 'profile'

  return (
    <div className="app-shell">
      {showChrome && (
        <TopBar
          streak={progress.streak.count}
          xp={progress.xp}
          active={screen}
          onProfileClick={() => setScreen(screen === 'profile' ? 'home' : 'profile')}
        />
      )}
      <main className="app-main">
        {screen === 'home' && <Home progress={progress} onOpenLesson={openLesson} onOpenProfile={() => setScreen('profile')} />}
        {screen === 'profile' && <Profile progress={progress} />}
        {screen === 'lesson' && activeLesson?.type === 'lesson' && (
          <Lesson lesson={activeLesson} progress={progress} onExit={returnHome} onFinished={returnHome} />
        )}
        {screen === 'lesson' && activeLesson?.type === 'scenario' && (
          <Scenario scenario={activeLesson} progress={progress} onExit={returnHome} onFinished={returnHome} />
        )}
      </main>
    </div>
  )
}
