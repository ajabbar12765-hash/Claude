import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useProgress } from './hooks/useProgress.js'
import { useTheme } from './hooks/useTheme.js'
import TopBar from './components/TopBar.jsx'
import Mascot from './components/Mascot.jsx'
import Landing from './screens/Landing.jsx'
import Home from './screens/Home.jsx'
import Lesson from './screens/Lesson.jsx'
import Scenario from './screens/Scenario.jsx'
import Profile from './screens/Profile.jsx'
import VoiceCall from './screens/VoiceCall.jsx'

const SEEN_LANDING_KEY = 'pronto:seenLanding:v1'

function Splash() {
  return (
    <motion.div className="splash" exit={{ opacity: 0, transition: { duration: 0.35 } }}>
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16 }}
      >
        <Mascot expression="happy" size={92} />
      </motion.div>
      <motion.span
        className="splash-word"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
      >
        Pronto
      </motion.span>
    </motion.div>
  )
}

function hasSeenLanding() {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(SEEN_LANDING_KEY) === '1'
  } catch {
    return true
  }
}

export default function App() {
  const progress = useProgress()
  const theme = useTheme()
  const [screen, setScreen] = useState(() => (hasSeenLanding() ? 'home' : 'landing')) // 'landing' | 'home' | 'profile' | 'lesson' | 'call'
  const [activeLesson, setActiveLesson] = useState(null)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 1100)
    return () => clearTimeout(t)
  }, [])

  function openLesson(lesson) {
    setActiveLesson(lesson)
    setScreen('lesson')
  }

  function returnHome() {
    setActiveLesson(null)
    setScreen('home')
  }

  function startFromLanding() {
    try {
      window.localStorage.setItem(SEEN_LANDING_KEY, '1')
    } catch {
      // localStorage unavailable — landing will just show again next visit
    }
    setScreen('home')
  }

  if (screen === 'landing') {
    return <Landing onStart={startFromLanding} />
  }

  const showChrome = screen === 'home' || screen === 'profile'

  return (
    <div className="app-shell">
      <AnimatePresence>{booting && <Splash key="splash" />}</AnimatePresence>

      {showChrome && (
        <TopBar
          streak={progress.streak.count}
          xp={progress.xp}
          active={screen}
          onProfileClick={() => setScreen(screen === 'profile' ? 'home' : 'profile')}
        />
      )}
      <main className="app-main">
        {screen === 'home' && <Home progress={progress} onOpenLesson={openLesson} onOpenProfile={() => setScreen('profile')} onOpenCall={() => setScreen('call')} />}
        {screen === 'profile' && <Profile progress={progress} theme={theme} onShowLanding={() => setScreen('landing')} />}
        {screen === 'call' && <VoiceCall onExit={returnHome} />}
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
