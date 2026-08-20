import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useProgress } from './hooks/useProgress.js'
import { useTheme } from './hooks/useTheme.js'
import { useNotifications } from './hooks/useNotifications.js'
import TopBar from './components/TopBar.jsx'
import Mascot from './components/Mascot.jsx'
import Confetti from './components/Confetti.jsx'
import Landing from './screens/Landing.jsx'
import Onboarding from './screens/Onboarding.jsx'
import Home from './screens/Home.jsx'
import Lesson from './screens/Lesson.jsx'
import Scenario from './screens/Scenario.jsx'
import Profile from './screens/Profile.jsx'
import VoiceCall from './screens/VoiceCall.jsx'

const SEEN_LANDING_KEY = 'pronto:seenLanding:v1'
const ONBOARDED_KEY = 'pronto:onboarded:v1'

function readLaunchAction() {
  if (typeof window === 'undefined') return null
  const action = new URLSearchParams(window.location.search).get('action')
  if (action === 'continue' || action === 'call') {
    window.history.replaceState({}, '', window.location.pathname)
    return action
  }
  return null
}

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

function hasOnboarded() {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(ONBOARDED_KEY) === '1'
  } catch {
    return true
  }
}

export default function App() {
  const progress = useProgress()
  const theme = useTheme()
  const notifications = useNotifications()
  const launchAction = useRef(readLaunchAction())
  const [screen, setScreen] = useState(() => {
    if (launchAction.current) return launchAction.current === 'call' ? 'call' : 'home'
    if (!hasSeenLanding()) return 'landing'
    if (!hasOnboarded()) return 'onboarding'
    return 'home'
  })
  const [activeLesson, setActiveLesson] = useState(null)
  const [booting, setBooting] = useState(true)
  const [celebrate, setCelebrate] = useState(false)
  const prevCompletedCount = useRef(progress.completedCount)
  const prevStreak = useRef(progress.streak.count)
  const prevGoalMet = useRef(progress.dailyGoalMet)

  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 1100)
    return () => clearTimeout(t)
  }, [])

  // A shortcut launch ("Continue Lesson" from the home-screen icon) always
  // skips the landing page and jumps straight to whatever's next.
  useEffect(() => {
    if (launchAction.current === 'continue' && progress.nextLesson) {
      setActiveLesson(progress.nextLesson.lesson)
      setScreen('lesson')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keeps the installed app icon's badge in sync with the streak, and fires
  // a real OS notification for streak/goal milestones when the app is
  // backgrounded (foreground completions already show their own screen).
  useEffect(() => {
    if (navigator.setAppBadge) {
      if (progress.streak.count > 0) navigator.setAppBadge(progress.streak.count).catch(() => {})
      else navigator.clearAppBadge?.().catch(() => {})
    }

    const backgrounded = document.hidden
    if (progress.streak.count > prevStreak.current && backgrounded) {
      notifications.notify('🔥 Streak alive!', { body: `${progress.streak.count} day${progress.streak.count === 1 ? '' : 's'} in a row. Keep it going.` })
    }
    if (progress.dailyGoalMet && !prevGoalMet.current && backgrounded) {
      notifications.notify('Daily goal complete! 🎉', { body: 'Anything more today is a bonus.' })
    }
    prevStreak.current = progress.streak.count
    prevGoalMet.current = progress.dailyGoalMet
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress.streak.count, progress.dailyGoalMet])

  // Fires the confetti burst whenever a lesson/scenario/checkpoint completes.
  useEffect(() => {
    if (progress.completedCount > prevCompletedCount.current) {
      setCelebrate(true)
      const t = setTimeout(() => setCelebrate(false), 1000)
      prevCompletedCount.current = progress.completedCount
      return () => clearTimeout(t)
    }
    prevCompletedCount.current = progress.completedCount
  }, [progress.completedCount])

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
    setScreen(hasOnboarded() ? 'home' : 'onboarding')
  }

  function finishOnboarding(answers) {
    progress.setOnboardingAnswers(answers)
    try {
      window.localStorage.setItem(ONBOARDED_KEY, '1')
    } catch {
      // localStorage unavailable — onboarding will just show again next visit
    }
    setScreen('home')
  }

  if (screen === 'landing') {
    return <Landing onStart={startFromLanding} />
  }

  if (screen === 'onboarding') {
    return <Onboarding onDone={finishOnboarding} />
  }

  const showChrome = screen === 'home' || screen === 'profile'

  return (
    <div className="app-shell">
      <AnimatePresence>{booting && <Splash key="splash" />}</AnimatePresence>
      <Confetti active={celebrate} />

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
        {screen === 'profile' && <Profile progress={progress} theme={theme} notifications={notifications} onShowLanding={() => setScreen('landing')} />}
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
