import React, { useState } from 'react'
import { searchPlayer } from '../api/tennisApi.js'

export default function Settings({ apiKey, onSaveKey, usingMock }) {
  const [draft, setDraft] = useState(apiKey || '')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const handleTest = async () => {
    if (!draft.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      const results = await searchPlayer('Sinner', draft.trim())
      if (results && results.length > 0) {
        setTestResult({ ok: true, msg: `✅ Connected! Found ${results.length} result(s) for "Sinner"` })
      } else {
        setTestResult({ ok: false, msg: '⚠️ Connected but no players found — check your key permissions' })
      }
    } catch (e) {
      setTestResult({ ok: false, msg: `❌ Error: ${e.message}` })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = () => {
    onSaveKey(draft.trim())
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">⚙️ Settings</h1>
      </div>

      <section className="section settings-section">
        <h2 className="section-title">API Connection</h2>

        {usingMock && (
          <div className="mock-banner">
            <div className="mock-banner-title">📦 Demo Mode Active</div>
            <div className="mock-banner-body">
              You're viewing sample data. Add an API key below to get live ATP scores, real schedules, and actual match stats.
            </div>
          </div>
        )}

        <div className="settings-card">
          <div className="settings-label">API-Sports Tennis Key</div>
          <div className="settings-hint">
            Free at <strong>api-sports.io</strong> → select Tennis → copy your API key.
            Gives 100 requests/day — more than enough for daily tracking.
          </div>
          <input
            className="api-input"
            type="password"
            placeholder="Paste your key here…"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <div className="settings-actions">
            <button
              className="btn-secondary"
              onClick={handleTest}
              disabled={testing || !draft.trim()}
            >
              {testing ? 'Testing…' : 'Test Connection'}
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={!draft.trim()}
            >
              Save Key
            </button>
          </div>
          {testResult && (
            <div className={`test-result ${testResult.ok ? 'ok' : 'error'}`}>
              {testResult.msg}
            </div>
          )}
        </div>

        <div className="settings-card">
          <div className="settings-label">How to get a free API key</div>
          <ol className="setup-steps">
            <li>Go to <strong>api-sports.io</strong> and create a free account</li>
            <li>Navigate to the <strong>Tennis</strong> section</li>
            <li>Click <strong>Subscribe</strong> on the Free plan (100 req/day)</li>
            <li>Copy your <strong>API Key</strong> from the dashboard</li>
            <li>Paste it in the field above and hit <strong>Save Key</strong></li>
          </ol>
        </div>
      </section>

      <section className="section settings-section">
        <h2 className="section-title">Tracked Player</h2>
        <div className="settings-card player-badge-card">
          <div className="player-badge">
            <span className="player-badge-flag">🇮🇹</span>
            <div className="player-badge-info">
              <div className="player-badge-name">Jannik Sinner</div>
              <div className="player-badge-rank">ATP World #1</div>
            </div>
            <span className="player-badge-star">⭐</span>
          </div>
          <div className="settings-hint">Support for multiple tracked players coming soon.</div>
        </div>
      </section>

      <section className="section settings-section">
        <h2 className="section-title">About</h2>
        <div className="settings-card about-card">
          <div className="about-line">🎾 Tennis Tracker — Sinner Edition</div>
          <div className="about-line">Tracks all ATP events · Point-by-point stats</div>
          <div className="about-line about-dim">Data via API-Sports · Not affiliated with ATP</div>
        </div>
      </section>
    </div>
  )
}
