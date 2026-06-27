import React, { useState } from 'react'
import { searchPlayer } from '../api/tennisApi.js'

const STEPS = [
  { num: '1', text: 'Go to', link: 'rapidapi.com', bold: null },
  { num: '2', text: 'Sign up free (or log in)', link: null, bold: null },
  { num: '3', text: 'Search for', link: null, bold: '"API-Tennis"' },
  { num: '4', text: 'Click', link: null, bold: '"Subscribe to Test"' },
  { num: '5', text: 'Pick the', link: null, bold: 'Basic / Free plan' },
  { num: '6', text: 'Go to', link: null, bold: '"Apps" → copy your key' },
]

export default function Settings({ apiKey, onSaveKey, usingMock }) {
  const [draft, setDraft]       = useState(apiKey || '')
  const [testing, setTesting]   = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [showSteps, setShowSteps]   = useState(!apiKey)

  const handleTest = async () => {
    if (!draft.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      const results = await searchPlayer('Sinner', draft.trim())
      if (results && results.length > 0) {
        setTestResult({ ok: true, msg: `✅ Connected! Live ATP data is now active.` })
      } else {
        setTestResult({ ok: false, msg: '⚠️ Key accepted but no data returned — double-check you subscribed to API-Tennis on RapidAPI.' })
      }
    } catch (e) {
      setTestResult({ ok: false, msg: `❌ ${e.message} — make sure the key is from RapidAPI → API-Tennis.` })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = () => {
    onSaveKey(draft.trim())
    setTestResult(null)
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">⚙️ Settings</h1>
      </div>

      <section className="section settings-section">
        <h2 className="section-title">Live Data API</h2>

        {usingMock && (
          <div className="mock-banner">
            <div className="mock-banner-title">📦 Demo Mode</div>
            <div className="mock-banner-body">
              You're seeing sample data. Add a free API key below to get real ATP scores, Sinner's actual schedule, and live match stats.
            </div>
          </div>
        )}

        <div className="settings-card">
          <div className="settings-label">RapidAPI Key</div>
          <div className="settings-hint">
            Free · 500 requests/month · No credit card needed
          </div>
          <input
            className="api-input"
            type="password"
            placeholder="Paste your RapidAPI key here…"
            value={draft}
            onChange={e => { setDraft(e.target.value); setTestResult(null) }}
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
              {testing ? 'Testing…' : 'Test Key'}
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={!draft.trim()}
            >
              Save
            </button>
          </div>
          {testResult && (
            <div className={`test-result ${testResult.ok ? 'ok' : 'error'}`}>
              {testResult.msg}
            </div>
          )}
        </div>

        <button
          className="steps-toggle"
          onClick={() => setShowSteps(s => !s)}
        >
          {showSteps ? '▲ Hide' : '▼ How to get a free key'}
        </button>

        {showSteps && (
          <div className="settings-card steps-card">
            <div className="steps-title">Get your free key in 2 minutes</div>
            {STEPS.map(s => (
              <div key={s.num} className="step-row">
                <span className="step-num">{s.num}</span>
                <span className="step-text">
                  {s.text}{' '}
                  {s.link && <span className="step-link">{s.link}</span>}
                  {s.bold && <strong className="step-bold">{s.bold}</strong>}
                </span>
              </div>
            ))}
            <div className="step-note">
              The key looks like: <code className="key-preview">a1b2c3d4e5f6…</code>
            </div>
          </div>
        )}
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
        </div>
      </section>

      <section className="section settings-section">
        <h2 className="section-title">About</h2>
        <div className="settings-card about-card">
          <div className="about-line">🎾 Tennis Tracker — Sinner Edition</div>
          <div className="about-line">All ATP events · Live scores · Point-by-point stats</div>
          <div className="about-line about-dim">Data via RapidAPI · Not affiliated with ATP</div>
        </div>
      </section>
    </div>
  )
}
