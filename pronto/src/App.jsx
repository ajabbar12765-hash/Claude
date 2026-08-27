import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useProgress } from './hooks/useProgress.js'
import { UNITS } from './data/curriculum.js'
import { useTheme } from './hooks/useTheme.js'
import { useNotifications } from './hooks/useNotifications.js'
import TopBar from './components/TopBar.jsx'
import BottomTabs from './components/BottomTabs.jsx'
import Mascot from './components/Mascot.jsx'
import Icon from './components/Icon.jsx'
import Confetti from './components/Confetti.jsx'
import { playLevelUp, playAchievement } from './lib/sound.js'
import Onboarding from './screens/Onboarding.jsx'
import Home from './screens/Home.jsx'
import Lesson from './screens/Lesson.jsx'
import Scenario from './screens/Scenario.jsx'
import Profile from './screens/Profile.jsx'
import VoiceCall from './screens/VoiceCall.jsx'
import Dictionary from './screens/Dictionary.jsx'
import LevelCheck from './screens/LevelCheck.jsx'

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
    if (!hasOnboarded()) return 'onboarding'
    return 'home'
  })
  const [activeLesson, setActiveLesson] = useState(null)
  const [booting, setBooting] = useState(true)
  const [celebrate, setCelebrate] = useState(false)
  const prevCompletedCount = useRef(progress.completedCount)
  const prevStreak = useRef(progress.streak.count)
  const prevGoalMet = useRef(progress.dailyGoalMet)
  const prevLevel = useRef(progress.level)
  const prevUnlockedIds = useRef(new Set(progress.achievementStatuses.filter((a) => a.unlocked).map((a) => a.id)))
  const [levelUpToast, setLevelUpToast] = useState(null)
  const [achievementToast, setAchievementToast] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 1100)
    return () => clearTimeout(t)
  }, [])

  // A shortcut launch ("Continue Lesson" from the home-screen icon) jumps
  // straight to whatever's next.
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

  // Pushes the streak to the tiny server-side store the Scriptable
  // home-screen widget reads from — the widget runs outside the browser
  // and has no way to see localStorage otherwise. Fire-and-forget: the
  // widget just shows slightly stale data if this fails, nothing breaks.
  useEffect(() => {
    fetch('/api/streak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streak: progress.streak.count }),
    }).catch(() => {})
  }, [progress.streak.count])

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

  // Level-up toast + sound whenever total XP crosses a level boundary.
  useEffect(() => {
    if (progress.level > prevLevel.current) {
      setLevelUpToast({ level: progress.level })
      setCelebrate(true)
      playLevelUp()
      const t1 = setTimeout(() => setCelebrate(false), 1000)
      const t2 = setTimeout(() => setLevelUpToast(null), 2600)
      prevLevel.current = progress.level
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    }
    prevLevel.current = progress.level
  }, [progress.level])

  // Achievement-unlock toast + sound the moment a badge newly qualifies.
  useEffect(() => {
    const unlockedNow = progress.achievementStatuses.filter((a) => a.unlocked)
    const newlyUnlocked = unlockedNow.filter((a) => !prevUnlockedIds.current.has(a.id))
    prevUnlockedIds.current = new Set(unlockedNow.map((a) => a.id))
    if (newlyUnlocked.length > 0) {
      setAchievementToast(newlyUnlocked[0])
      playAchievement()
      const t = setTimeout(() => setAchievementToast(null), 2800)
      return () => clearTimeout(t)
    }
  }, [progress.achievementStatuses])

  function openLesson(lesson) {
    setActiveLesson(lesson)
    setScreen('lesson')
  }

  function returnHome() {
    setActiveLesson(null)
    setScreen('home')
  }

  function finishOnboarding(answers) {
    progress.setOnboardingAnswers(answers)
    if (answers.skipAhead) {
      progress.markLessonsComplete(UNITS[0].lessons.map((l) => l.id))
    }
    try {
      window.localStorage.setItem(ONBOARDED_KEY, '1')
    } catch {
      // localStorage unavailable — onboarding will just show again next visit
    }
    setScreen('home')
  }

  if (screen === 'onboarding') {
    return <Onboarding onDone={finishOnboarding} />
  }

  const showChrome = screen === 'home' || screen === 'profile' || screen === 'dictionary'

  return (
    <div className="app-shell">
      <AnimatePresence>{booting && <Splash key="splash" />}</AnimatePresence>
      <Confetti active={celebrate} />

      <div className="global-toast-zone">
        <AnimatePresence>
          {levelUpToast && (
            <motion.div
              key="level-up"
              className="global-toast level-up-toast"
              initial={{ opacity: 0, y: -16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            >
              <Icon name="trophy" size={18} strokeWidth={2.2} />
              Level {levelUpToast.level}!
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {achievementToast && (
            <motion.div
              key={achievementToast.id}
              className="global-toast achievement-toast"
              initial={{ opacity: 0, y: -16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            >
              <Icon name={achievementToast.icon} size={18} strokeWidth={2.2} />
              <span>
                Achievement unlocked <strong>{achievementToast.label}</strong>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showChrome && <TopBar streak={progress.streak.count} xp={progress.xp} />}
      <main className="app-main">
        {screen === 'home' && (
          <Home progress={progress} onOpenLesson={openLesson} onOpenProfile={() => setScreen('profile')} onOpenLevelCheck={() => setScreen('level-check')} />
        )}
        {screen === 'profile' && (
          <Profile progress={progress} theme={theme} notifications={notifications} onOpenLevelCheck={() => setScreen('level-check')} />
        )}
        {screen === 'call' && <VoiceCall onExit={returnHome} progress={progress} />}
        {screen === 'dictionary' && <Dictionary onExit={returnHome} progress={progress} />}
        {screen === 'level-check' && <LevelCheck progress={progress} onExit={() => setScreen('home')} />}
        {screen === 'lesson' && activeLesson?.type === 'lesson' && (
          <Lesson lesson={activeLesson} progress={progress} onExit={returnHome} onFinished={returnHome} />
        )}
        {screen === 'lesson' && activeLesson?.type === 'scenario' && (
          <Scenario scenario={activeLesson} progress={progress} onExit={returnHome} onFinished={returnHome} />
        )}
      </main>
      {showChrome && <BottomTabs active={screen} onChange={setScreen} />}
    </div>
  )
}
