import { useEffect } from 'react'
import { PROVIDER_LIST } from '../lib/provider.js'
import { CURRENCIES } from '../lib/format.js'
import ConnectionTest from './ConnectionTest.jsx'

export default function SettingsModal({
  open,
  settings,
  intervals,
  notificationState,
  onEnableNotifications,
  onChange,
  onClose,
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const active = PROVIDER_LIST.find((p) => p.id === settings.provider) || PROVIDER_LIST[0]
  const config = settings.providerConfig?.[settings.provider] || {}

  const setConfig = (field, value) =>
    onChange({
      providerConfig: {
        ...settings.providerConfig,
        [settings.provider]: { ...config, [field]: value },
      },
    })

  return (
    <div className="modalWrap" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="scrim is-open" onClick={onClose} aria-hidden="true" />
      <div className="modal">
        <header className="modal__head">
          <h2>Settings</h2>
          <button className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </header>

        <div className="modal__body">
          {/* ---- scanning ---- */}
          <section className="field">
            <label className="field__label" htmlFor="interval">
              Scan frequency
            </label>
            <select
              id="interval"
              className="select"
              value={settings.scanSeconds}
              onChange={(e) => onChange({ scanSeconds: +e.target.value })}
            >
              {intervals.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </select>
            <p className="field__hint">
              The radar only runs while this tab is open. Install it to your home screen to
              keep it handy.
            </p>
          </section>

          {/* ---- alerts ---- */}
          <section className="field">
            <label className="field__label">Alerts</label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.notifyBrowser}
                onChange={(e) => onChange({ notifyBrowser: e.target.checked })}
              />
              <span>Browser notifications</span>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.notifySound}
                onChange={(e) => onChange({ notifySound: e.target.checked })}
              />
              <span>Sound on a new deal</span>
            </label>

            {notificationState === 'default' && (
              <button className="btn btn--primary btn--wide" onClick={onEnableNotifications}>
                Grant notification permission
              </button>
            )}
            {notificationState === 'granted' && (
              <p className="note note--ok">
                <span aria-hidden="true">✓</span> Notifications are enabled.
              </p>
            )}
            {notificationState === 'denied' && (
              <p className="note note--warn">
                <span aria-hidden="true">⚠</span> Blocked by the browser. Alerts still appear
                in Messages.
              </p>
            )}
          </section>

          {/* ---- currency ---- */}
          <section className="field">
            <label className="field__label" htmlFor="currency">
              Display currency
            </label>
            <select
              id="currency"
              className="select"
              value={settings.currency}
              onChange={(e) => onChange({ currency: e.target.value })}
            >
              {Object.entries(CURRENCIES).map(([code, c]) => (
                <option key={code} value={code}>
                  {code} — {c.name}
                </option>
              ))}
            </select>
            <p className="field__hint">
              Rates are held in EUR and converted at a fixed reference rate, so treat the
              figure as a guide. The booking site charges in its own currency and its number
              is the one that counts.
            </p>
          </section>

          {/* ---- data source ---- */}
          <section className="field">
            <label className="field__label" htmlFor="provider">
              Data source
            </label>
            <select
              id="provider"
              className="select"
              value={settings.provider}
              onChange={(e) => onChange({ provider: e.target.value })}
            >
              {PROVIDER_LIST.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <p className="field__hint">{active.description}</p>

            {active.fields?.map((f) => (
              <label className="mini mini--wide" key={f.id}>
                <span>{f.label}</span>
                <input
                  type={f.type}
                  value={config[f.id] || ''}
                  placeholder={`Your ${f.label.toLowerCase()}`}
                  autoComplete="off"
                  onChange={(e) => setConfig(f.id, e.target.value)}
                />
              </label>
            ))}

            {active.quotaNote && (
              <p className="note note--ok">
                <span aria-hidden="true">✓</span> {active.quotaNote}
              </p>
            )}

            {active.serverKey && (
              <p className="note">
                <span aria-hidden="true">ⓘ</span> This provider reads its token from a server
                environment variable, so nothing secret is stored in your browser. Set it in
                Vercel under Settings → Environment Variables.
              </p>
            )}

            {active.needsKey && (
              <p className="note note--warn">
                <span aria-hidden="true">⚠</span> Keys entered here are stored in this browser
                and travel with the request. For anything public, prefer a provider that keeps
                its key on the server.
              </p>
            )}

            <p className="field__hint">
              If a live scan fails, the app falls back to the built-in engine and says so in a
              banner rather than going blank.
            </p>

            {active.id !== 'simulated' && <ConnectionTest provider={active.id} />}
          </section>

          <section className="field">
            <p className="fineprint">
              Hotel Radar links out to Booking.com, Expedia, Hotels.com, Trivago and Google
              Hotels for the actual reservation. Prices shown in-app are indicative; the
              booking site is always the source of truth for the final price and availability.
            </p>
          </section>
        </div>

        <footer className="modal__foot">
          <button className="btn btn--primary" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  )
}
