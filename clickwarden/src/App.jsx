import { useEffect, useState } from 'react'
import ScanBox from './components/ScanBox.jsx'
import VerdictCard from './components/VerdictCard.jsx'
import HistoryList from './components/HistoryList.jsx'
import GmailPanel from './components/GmailPanel.jsx'
import PasswordCheck from './components/PasswordCheck.jsx'
import PasswordVault from './components/PasswordVault.jsx'
import { getToken, setToken as saveToken, getHistory } from './lib/api.js'

export default function App() {
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [tokenInput, setTokenInput] = useState(getToken())
  const [showSettings, setShowSettings] = useState(!getToken())

  async function refreshHistory() {
    try {
      const data = await getHistory()
      setHistory(data.entries || [])
    } catch {
      // history is a nice-to-have; a scan failure banner already covers real errors
    }
  }

  useEffect(() => {
    refreshHistory()
  }, [])

  function handleResult(r) {
    setResult(r)
    refreshHistory()
  }

  function handleSaveToken(e) {
    e.preventDefault()
    saveToken(tokenInput.trim())
    setShowSettings(false)
  }

  return (
    <div className="app">
      <header>
        <h1>ClickWarden</h1>
        <p className="tagline">Know before you click.</p>
        <button className="link-button" onClick={() => setShowSettings((s) => !s)}>
          {showSettings ? 'Hide settings' : 'Settings'}
        </button>
      </header>

      {showSettings && (
        <form className="settings-panel" onSubmit={handleSaveToken}>
          <label>
            API token (must match CLICKWARDEN_API_TOKEN on the server)
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="paste your CLICKWARDEN_API_TOKEN"
            />
          </label>
          <button type="submit">Save</button>
        </form>
      )}

      <main>
        <section>
          <ScanBox onResult={handleResult} />
          <VerdictCard result={result} />
        </section>

        <section>
          <h2>Gmail auto-scan</h2>
          <GmailPanel />
        </section>

        <section>
          <h2>Recent scans</h2>
          <HistoryList entries={history} />
        </section>

        <section>
          <h2>Password breach check</h2>
          <PasswordCheck />
        </section>

        <section>
          <h2>Password manager</h2>
          <PasswordVault />
        </section>
      </main>

      <footer>
        <p>
          Backed by VirusTotal, Google Safe Browsing, and URLhaus. Not a replacement for OS-level antivirus --
          see the README for what this tool does and doesn't cover.
        </p>
      </footer>
    </div>
  )
}
