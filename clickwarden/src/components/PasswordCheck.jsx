import { useState } from 'react'
import { checkPasswordBreach } from '../lib/api.js'

export default function PasswordCheck() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [count, setCount] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setError('')
    setCount(null)
    try {
      setCount(await checkPasswordBreach(password))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="password-check">
      <p className="lede-text">
        Checks a password against known breach dumps. Only a 5-character hash prefix ever leaves your browser --
        the password itself is never sent anywhere, including to ClickWarden's own server.
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Paste a password to check"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setCount(null)
          }}
        />
        <button type="submit" disabled={loading || !password}>
          {loading ? 'Checking…' : 'Check password'}
        </button>
      </form>
      {error && <p className="scan-error">{error}</p>}
      {count !== null && (
        <div className={`breach-result ${count > 0 ? 'breach-bad' : 'breach-good'}`}>
          {count > 0
            ? `Found in ${count.toLocaleString()} known breach${count === 1 ? '' : 'es'} -- stop using this password.`
            : 'Not found in any known breach.'}
        </div>
      )}
    </div>
  )
}
