import { useEffect, useState } from 'react'
import { getVault, saveVault } from '../lib/api.js'
import { deriveKey, encryptVault, decryptVault, DEFAULT_ITERATIONS } from '../lib/vaultCrypto.js'

function blankEntry() {
  return { id: crypto.randomUUID(), title: '', username: '', password: '', url: '', notes: '' }
}

export default function PasswordVault() {
  const [hasVault, setHasVault] = useState(null)
  const [masterPassword, setMasterPassword] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [entries, setEntries] = useState([])
  const [vaultKey, setVaultKey] = useState(null)
  const [saltB64, setSaltB64] = useState(null)
  const [iterations, setIterations] = useState(DEFAULT_ITERATIONS)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [revealed, setRevealed] = useState({})
  const [draft, setDraft] = useState(blankEntry())

  useEffect(() => {
    getVault()
      .then((data) => setHasVault(!!data.blob))
      .catch((err) => setError(err.message))
  }, [])

  async function persist(key, salt, iters, nextEntries) {
    setSaving(true)
    try {
      const { iv, ciphertext } = await encryptVault(key, nextEntries)
      await saveVault({ salt, iterations: iters, iv, ciphertext })
    } finally {
      setSaving(false)
    }
  }

  async function handleUnlock(e) {
    e.preventDefault()
    if (!masterPassword) return
    setLoading(true)
    setError('')
    try {
      const data = await getVault()
      if (data.blob) {
        const { key } = await deriveKey(masterPassword, data.blob.salt, data.blob.iterations)
        let decrypted
        try {
          decrypted = await decryptVault(key, data.blob.iv, data.blob.ciphertext)
        } catch {
          throw new Error('Wrong master password')
        }
        setVaultKey(key)
        setSaltB64(data.blob.salt)
        setIterations(data.blob.iterations)
        setEntries(decrypted)
        setUnlocked(true)
      } else {
        const { key, saltB64: salt } = await deriveKey(masterPassword)
        setVaultKey(key)
        setSaltB64(salt)
        setIterations(DEFAULT_ITERATIONS)
        setEntries([])
        setUnlocked(true)
        setHasVault(true)
        await persist(key, salt, DEFAULT_ITERATIONS, [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setMasterPassword('')
    }
  }

  function handleLock() {
    setUnlocked(false)
    setVaultKey(null)
    setEntries([])
    setRevealed({})
    setDraft(blankEntry())
  }

  async function handleAddEntry(e) {
    e.preventDefault()
    if (!draft.title || !draft.password) return
    const next = [...entries, draft]
    setEntries(next)
    setDraft(blankEntry())
    await persist(vaultKey, saltB64, iterations, next)
  }

  async function handleDelete(id) {
    const next = entries.filter((e) => e.id !== id)
    setEntries(next)
    await persist(vaultKey, saltB64, iterations, next)
  }

  function toggleReveal(id) {
    setRevealed((r) => ({ ...r, [id]: !r[id] }))
  }

  async function copyPassword(password) {
    try {
      await navigator.clipboard.writeText(password)
    } catch {
      // clipboard permission denied -- user can still reveal and select manually
    }
  }

  if (hasVault === null) return <p className="empty">Loading…</p>

  if (!unlocked) {
    return (
      <div className="vault">
        <p className="lede-text">
          {hasVault
            ? 'Enter your master password to unlock the vault.'
            : "No vault yet -- pick a master password to create one. There's no recovery if you forget it: entries are encrypted with a key only this password can derive."}
        </p>
        <form onSubmit={handleUnlock}>
          <input
            type="password"
            placeholder="Master password"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
          />
          <button type="submit" disabled={loading || !masterPassword}>
            {loading ? 'Unlocking…' : hasVault ? 'Unlock' : 'Create vault'}
          </button>
        </form>
        {error && <p className="scan-error">{error}</p>}
      </div>
    )
  }

  return (
    <div className="vault">
      <div className="vault-header">
        <p className="lede-text">{entries.length} saved {entries.length === 1 ? 'entry' : 'entries'}{saving ? ' — saving…' : ''}</p>
        <button className="button-secondary" onClick={handleLock}>
          Lock
        </button>
      </div>

      <ul className="vault-list">
        {entries.map((entry) => (
          <li key={entry.id}>
            <div className="vault-entry-main">
              <div className="vault-entry-title">{entry.title}</div>
              <div className="vault-entry-meta">
                {entry.username && <span>{entry.username}</span>}
                {entry.url && (
                  <a href={entry.url} target="_blank" rel="noreferrer">
                    {entry.url}
                  </a>
                )}
              </div>
              <div className="vault-entry-password">
                {revealed[entry.id] ? entry.password : '••••••••'}
              </div>
            </div>
            <div className="vault-entry-actions">
              <button className="button-secondary" onClick={() => toggleReveal(entry.id)}>
                {revealed[entry.id] ? 'Hide' : 'Show'}
              </button>
              <button className="button-secondary" onClick={() => copyPassword(entry.password)}>
                Copy
              </button>
              <button className="button-secondary" onClick={() => handleDelete(entry.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
        {entries.length === 0 && <li className="empty">No entries yet -- add one below.</li>}
      </ul>

      <form className="vault-add-form" onSubmit={handleAddEntry}>
        <input
          type="text"
          placeholder="Title (e.g. GitHub)"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <input
          type="text"
          placeholder="Username / email"
          value={draft.username}
          onChange={(e) => setDraft({ ...draft, username: e.target.value })}
        />
        <input
          type="password"
          placeholder="Password"
          value={draft.password}
          onChange={(e) => setDraft({ ...draft, password: e.target.value })}
        />
        <input
          type="text"
          placeholder="URL (optional)"
          value={draft.url}
          onChange={(e) => setDraft({ ...draft, url: e.target.value })}
        />
        <button type="submit" disabled={!draft.title || !draft.password}>
          Add entry
        </button>
      </form>
    </div>
  )
}
