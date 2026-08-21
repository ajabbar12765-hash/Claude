import { useState } from 'react'
import { scanUrl, scanFile, sha256File, arrayBufferToBase64 } from '../lib/api.js'

// Base64 adds ~33% overhead and Vercel functions hard-cap request bodies at
// 4.5MB, so the raw file must stay well under that for the upload-consent path.
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024

export default function ScanBox({ onResult }) {
  const [mode, setMode] = useState('url')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleUrlSubmit(e) {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setError('')
    try {
      onResult(await scanUrl(url.trim()))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleFileSubmit(e) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const sha256 = await sha256File(file)
      const payload = { sha256, filename: file.name }
      if (consent) {
        if (file.size > MAX_UPLOAD_BYTES) {
          throw new Error(`File is over the ${MAX_UPLOAD_BYTES / 1024 / 1024}MB limit for full-scan upload -- hash lookup still works above.`)
        }
        payload.uploadConsent = true
        payload.fileBase64 = arrayBufferToBase64(await file.arrayBuffer())
      }
      onResult(await scanFile(payload))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="scan-box">
      <div className="scan-tabs">
        <button className={mode === 'url' ? 'active' : ''} onClick={() => setMode('url')}>
          Check a link
        </button>
        <button className={mode === 'file' ? 'active' : ''} onClick={() => setMode('file')}>
          Check a file
        </button>
      </div>

      {mode === 'url' ? (
        <form onSubmit={handleUrlSubmit}>
          <input
            type="text"
            placeholder="https://example.com/suspicious-link"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Checking…' : 'Check link'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleFileSubmit}>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <label className="consent-row">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            If this file's hash is unknown, upload it to VirusTotal for a full scan
            (makes the file visible to VirusTotal's other customers; max {MAX_UPLOAD_BYTES / 1024 / 1024}MB)
          </label>
          <button type="submit" disabled={loading || !file}>
            {loading ? 'Checking…' : 'Check file'}
          </button>
        </form>
      )}

      {error && <p className="scan-error">{error}</p>}
    </div>
  )
}
