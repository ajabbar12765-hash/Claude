import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api.js'
import { parseCSV, rowsToRecords, CSV_TEMPLATE } from '../lib/csv.js'
import { registerThisDevice } from '../lib/webauthn.js'

const JSON_EXAMPLE = `{
  "records": [
    {
      "date": "2026-08-21",
      "steps": 9820,
      "distanceKm": 7.1,
      "activeCalories": 412,
      "avgHr": 74,
      "restingHr": 58,
      "spo2Avg": 97,
      "stressAvg": 28,
      "weightKg": 71.4,
      "sleep": { "totalMin": 430, "deepMin": 88, "remMin": 64, "lightMin": 210, "awakeMin": 12 },
      "workouts": [
        { "type": "Run", "start": "2026-08-21T07:00:00Z", "end": "2026-08-21T07:31:00Z", "calories": 260, "distanceKm": 5.0, "avgHr": 141 }
      ]
    }
  ]
}`

export default function Import() {
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [xiaomiResult, setXiaomiResult] = useState(null)
  const [xiaomiError, setXiaomiError] = useState('')
  const [xiaomiBusy, setXiaomiBusy] = useState(false)
  const [devices, setDevices] = useState(null)
  const [deviceName, setDeviceName] = useState('')
  const [deviceBusy, setDeviceBusy] = useState(false)
  const [deviceError, setDeviceError] = useState('')
  const fileRef = useRef(null)
  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/ingest` : '/api/ingest'

  useEffect(() => {
    api.passkeyList().then((r) => setDevices(r.devices)).catch(() => setDevices([]))
  }, [])

  async function addDevice() {
    setDeviceError('')
    setDeviceBusy(true)
    try {
      await registerThisDevice(deviceName.trim() || 'Unnamed device')
      setDeviceName('')
      const r = await api.passkeyList()
      setDevices(r.devices)
    } catch (err) {
      setDeviceError(err.name === 'InvalidStateError' ? 'This device is already registered.' : err.message)
    } finally {
      setDeviceBusy(false)
    }
  }

  async function removeDevice(id) {
    setDeviceError('')
    try {
      await api.passkeyRemove(id)
      setDevices((d) => d.filter((x) => x.id !== id))
    } catch (err) {
      setDeviceError(err.message)
    }
  }

  async function syncXiaomi() {
    setXiaomiError('')
    setXiaomiResult(null)
    setXiaomiBusy(true)
    try {
      const res = await api.xiaomiSync()
      setXiaomiResult(res)
    } catch (err) {
      setXiaomiError(err.message)
    } finally {
      setXiaomiBusy(false)
    }
  }

  async function handleFile(file) {
    setError('')
    setResult(null)
    setBusy(true)
    try {
      const text = await file.text()
      let payload
      if (file.name.toLowerCase().endsWith('.json')) {
        payload = JSON.parse(text)
      } else {
        const records = rowsToRecords(parseCSV(text))
        if (!records.length) throw new Error('No rows found in that CSV.')
        payload = { records }
      }
      const res = await api.ingest(payload)
      setResult(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mi-coach-template.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="import-page">
      <h1>Import your data</h1>
      <p className="import-intro">
        Xiaomi doesn't offer a public Mi Fitness API, so data gets in one of the ways below —
        all work on iPad, iPhone, and Android. This is also where you lock the app down to your own devices.
      </p>

      <section className="panel">
        <h2>1. Automatic sync</h2>
        <p>
          On <strong>iOS</strong>, Mi Fitness already writes steps, heart rate, sleep, and workouts into
          Apple Health. Install the free app <strong>Health Auto Export</strong>, create an Automation with
          type <em>REST API</em>, and point it at:
        </p>
        <code className="code-block">{webhookUrl}</code>
        <p>
          Method <strong>POST</strong>, with header <code>Authorization: Bearer YOUR_INGEST_SECRET</code> —
          use the value you set for <code>INGEST_SECRET</code> in the server's environment variables.
          Schedule it hourly or daily and your dashboard updates itself.
        </p>
        <p>
          On <strong>Android</strong>, Mi Fitness doesn't reliably sync to Google Fit / Health Connect, so
          the most reliable automatic route is an automation app (HTTP Shortcuts, Tasker, MacroDroid) that
          POSTs the same JSON shape shown below to the URL above with the same header. Otherwise, use manual
          import — it works identically on every platform since it's just a file upload in this browser.
        </p>
      </section>

      <section className="panel">
        <h2>2. Trusted devices (passkey lock)</h2>
        <p>
          Add this device below to lock the app down to devices you've explicitly approved — once you add
          your first one, the password sign-in screen turns off for good, and only devices below (unlocked
          with Face ID, Touch ID, fingerprint, or Windows Hello) can sign in from then on.
        </p>
        <div className="import-actions">
          <input
            type="text"
            placeholder="Name this device (e.g. My iPhone)"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            className="device-name-input"
          />
          <button className="btn-primary" onClick={addDevice} disabled={deviceBusy}>
            {deviceBusy ? 'Adding…' : '🔒 Add this device'}
          </button>
        </div>
        {deviceError && <div className="import-error">{deviceError}</div>}
        {devices === null ? null : devices.length === 0 ? (
          <p className="dashboard-sub" style={{ marginTop: 12 }}>No devices added yet — password sign-in is still active.</p>
        ) : (
          <ul className="device-list">
            {devices.map((d) => (
              <li key={d.id} className="device-item">
                <div>
                  <div className="device-item-name">{d.deviceName}</div>
                  <div className="device-item-when">Added {new Date(d.createdAt).toLocaleDateString()}</div>
                </div>
                <button className="link-btn" onClick={() => removeDevice(d.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>3. Xiaomi account sync (workouts only)</h2>
        <p>
          If you've set <code>XIAOMI_USER</code> and <code>XIAOMI_PASSWORD</code> in the server's environment
          variables, a daily automatic sync pulls your logged workouts (runs, walks, rides — distance,
          calories, duration, heart rate) from your Xiaomi account. This uses Xiaomi's unofficial cloud API,
          so it can break without notice, and it does not cover passive all-day steps, resting heart rate,
          or sleep — no working endpoint for that exists yet. Use the button below to run it right now instead
          of waiting for the next scheduled run.
        </p>
        <div className="import-actions">
          <button className="btn-secondary" onClick={syncXiaomi} disabled={xiaomiBusy}>
            {xiaomiBusy ? 'Syncing…' : 'Sync Xiaomi workouts now'}
          </button>
        </div>
        {xiaomiResult && (
          <div className="import-result">
            ✓ Synced. {xiaomiResult.workoutsFound} workout(s) found · {xiaomiResult.daysUpdated} day(s) updated.
          </div>
        )}
        {xiaomiError && <div className="import-error">{xiaomiError}</div>}
      </section>

      <section className="panel">
        <h2>4. Manual import</h2>
        <p>Upload a CSV or JSON export any time — from Mi Fitness's own data export, Apple Health, or Health Connect.</p>
        <div className="import-actions">
          <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? 'Importing…' : 'Choose file (.csv or .json)'}
          </button>
          <button className="btn-secondary" onClick={downloadTemplate}>Download CSV template</button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.json,application/json,text/csv"
          hidden
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {result && (
          <div className="import-result">
            ✓ Imported. {result.daysUpdated} day(s) updated · {result.totalDaysLogged} total day(s) logged.
          </div>
        )}
        {error && <div className="import-error">{error}</div>}
      </section>

      <section className="panel">
        <h2>Generic JSON schema</h2>
        <p>For a custom script (e.g. a Tasker/HTTP Shortcuts task on Android), POST this shape:</p>
        <pre className="code-block code-block-pre">{JSON_EXAMPLE}</pre>
      </section>
    </div>
  )
}
