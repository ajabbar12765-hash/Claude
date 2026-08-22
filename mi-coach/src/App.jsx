import { useEffect, useState } from 'react'
import { api } from './lib/api.js'
import Login from './components/Login.jsx'
import Nav from './components/Nav.jsx'
import Dashboard from './components/Dashboard.jsx'
import Import from './components/Import.jsx'
import Coach from './components/Coach.jsx'

export default function App() {
  const [authState, setAuthState] = useState('checking') // checking | out | in
  const [tab, setTab] = useState('dashboard')

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
        {tab === 'dashboard' && <Dashboard onGoToImport={() => setTab('import')} onGoToCoach={() => setTab('coach')} />}
        {tab === 'import' && <Import />}
        {tab === 'coach' && <Coach />}
      </main>
    </div>
  )
}
