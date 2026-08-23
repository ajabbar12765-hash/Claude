import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { signInWithPasskey } from '../lib/webauthn.js'

export default function Login({ onSignedIn }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [passkeysEnabled, setPasskeysEnabled] = useState(null) // null = checking

  useEffect(() => {
    api.passkeyStatus().then((r) => setPasskeysEnabled(r.enabled)).catch(() => setPasskeysEnabled(false))
  }, [])

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

  async function submitPasskey() {
    setError('')
    setBusy(true)
    try {
      await signInWithPasskey()
      onSignedIn()
    } catch (err) {
      setError(err.name === 'NotAllowedError' ? 'Cancelled or this device is not registered.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={passkeysEnabled ? (e) => e.preventDefault() : submit}>
        <div className="login-mark" aria-hidden="true">
          <img src="/icon.svg" alt="" width={56} height={56} />
        </div>
        <h1>Mi Coach</h1>
        <p className="login-sub">Your Smart Band 9 data, with an AI coach built in.</p>

        {passkeysEnabled === null ? null : passkeysEnabled ? (
          <>
            {error && <div className="login-error">{error}</div>}
            <button type="button" onClick={submitPasskey} disabled={busy}>
              {busy ? 'Waiting…' : '🔒 Sign in with this device'}
            </button>
            <p className="login-hint">
              This app only accepts sign-ins from devices you've explicitly added — Face ID, Touch ID,
              fingerprint, or Windows Hello, depending on your device.
            </p>
          </>
        ) : (
          <>
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
              Set with the <code>APP_PASSWORD</code> environment variable on the server. Once you add a
              device passkey (Import tab, after signing in), password sign-in turns off for good.
            </p>
          </>
        )}
      </form>
    </div>
  )
}
