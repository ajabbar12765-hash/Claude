import { useState } from 'react'
import { api } from '../lib/api.js'

export default function Login({ onSignedIn }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api.login(password)
      onSignedIn()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-mark" aria-hidden="true">
          <img src="/icon.svg" alt="" width={56} height={56} />
        </div>
        <h1>Mi Coach</h1>
        <p className="login-sub">Your Smart Band 9 data, with an AI coach built in.</p>
        <input
          type="password"
          inputMode="text"
          autoFocus
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <div className="login-error">{error}</div>}
        <button type="submit" disabled={busy || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="login-hint">
          Set with the <code>APP_PASSWORD</code> environment variable on the server.
        </p>
      </form>
    </div>
  )
}
