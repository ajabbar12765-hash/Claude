import { useEffect, useState } from 'react'
import { api } from './lib/api.js'
import Login from './components/Login.jsx'
import Nav from './components/Nav.jsx'
import Home from './components/Home.jsx'
import Activity from './components/Activity.jsx'
import Health from './components/Health.jsx'
import Sleep from './components/Sleep.jsx'
import Import from './components/Import.jsx'
import Coach from './components/Coach.jsx'

export default function App() {
  const [authState, setAuthState] = useState('checking') // checking | out | in
  const [tab, setTab] = useState('home')

  useEffect(() => {
    api
      .me()
      .then((r) => setAuthState(r.authenticated ? 'in' : 'out'))
      .catch(() => setAuthState('out'))
  }, [])

  if (authState === 'checking') {
    return (
      <div className="boot-screen">
        <div className="boot-pulse" />
      </div>
    )
  }

  if (authState === 'out') {
    return <Login onSignedIn={() => setAuthState('in')} />
  }

  return (
    <div className="app-shell">
      <Nav
        tab={tab}
        onTab={setTab}
        onLogout={async () => {
          await api.logout().catch(() => {})
          setAuthState('out')
        }}
      />
      <main className="app-main">
        {tab === 'home' && <Home onGoToImport={() => setTab('import')} onGoToCoach={() => setTab('coach')} />}
        {tab === 'activity' && <Activity />}
        {tab === 'health' && <Health />}
        {tab === 'sleep' && <Sleep />}
        {tab === 'import' && <Import />}
        {tab === 'coach' && <Coach />}
      </main>
    </div>
  )
}
