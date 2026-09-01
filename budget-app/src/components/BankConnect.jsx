import { useState } from 'react'
import {
  startConnect,
  fetchTransactions,
  disconnect as disconnectApi,
  saveSyncConfig,
  clearSyncConfig,
} from '../lib/gocardless'
import { IconBanknote, IconAlertTriangle } from './icons'

const EU_COUNTRIES = [
  { code: 'IE', name: 'Ireland' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'PT', name: 'Portugal' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'PL', name: 'Poland' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'GB', name: 'United Kingdom' },
]

export default function BankConnect({ state, actions }) {
  const [country, setCountry] = useState('IE')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [syncMsg, setSyncMsg] = useState(null)
  const bank = state.bank

  const connect = async () => {
    setBusy(true)
    setError(null)
    try {
      const { link, requisitionId, institution } = await startConnect(country)
      actions.setBank({
        requisitionId,
        institutionName: institution.name,
        country,
        status: 'pending',
      })
      window.location.href = link
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  const sync = async () => {
    if (!bank?.accountIds?.length) return
    setBusy(true)
    setError(null)
    setSyncMsg(null)
    try {
      const { transactions } = await fetchTransactions(bank.accountIds)
      const imported = actions.importBankTransactions(transactions)
      setSyncMsg(imported > 0 ? `Imported ${imported} new transaction${imported === 1 ? '' : 's'}.` : 'Already up to date.')
      // Reconciles the server's dedupe set so the background cron job
      // doesn't re-surface transactions this manual sync already caught.
      saveSyncConfig({
        requisitionId: bank.requisitionId,
        accountIds: bank.accountIds,
        institutionName: bank.institutionName,
        importedIds: transactions.map((t) => t.id).filter(Boolean),
      }).catch(() => {})
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    if (!window.confirm('Disconnect Revolut? This revokes access; imported transactions stay in your history.')) return
    setBusy(true)
    setError(null)
    try {
      if (bank?.requisitionId) await disconnectApi(bank.requisitionId)
    } catch {
      // requisition may already be expired/gone server-side — clear locally regardless
    } finally {
      clearSyncConfig().catch(() => {})
      actions.clearBank()
      setBusy(false)
    }
  }

  return (
    <div className="bank-connect">
      {error && (
        <p className="bank-error">
          <IconAlertTriangle size={14} /> {error}
        </p>
      )}

      {bank?.status !== 'linked' ? (
        <>
          <p className="text-muted" style={{ marginBottom: 8 }}>
            Connects read-only via GoCardless Open Banking. Requires <code>GOCARDLESS_SECRET_ID</code> and{' '}
            <code>GOCARDLESS_SECRET_KEY</code> set in the deployment's environment variables.
          </p>
          <div className="inline-form">
            <select value={country} onChange={(e) => setCountry(e.target.value)} disabled={busy}>
              {EU_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn--primary" onClick={connect} disabled={busy}>
              <IconBanknote size={14} /> {busy ? 'Connecting…' : 'Connect Revolut'}
            </button>
          </div>
          {bank?.status === 'pending' && (
            <p className="empty-hint" style={{ marginTop: 8 }}>
              Waiting on consent for {bank.institutionName}. Finish it in the Revolut tab, then come back here.
            </p>
          )}
          {bank?.status === 'error' && bank.error && (
            <p className="bank-error" style={{ marginTop: 8 }}>
              <IconAlertTriangle size={14} /> {bank.error}
            </p>
          )}
        </>
      ) : (
        <>
          <div className="bank-status-row">
            <span className="pill pill--paid">{bank.institutionName || 'Revolut'} connected</span>
            {bank.lastSyncedAt && (
              <span className="text-muted">Last synced {new Date(bank.lastSyncedAt).toLocaleString()}</span>
            )}
          </div>
          {syncMsg && <p className="empty-hint">{syncMsg}</p>}
          <div className="inline-form" style={{ marginTop: 10 }}>
            <button type="button" className="btn btn--primary" onClick={sync} disabled={busy}>
              {busy ? 'Syncing…' : 'Sync transactions'}
            </button>
            <button type="button" className="btn btn--danger" onClick={disconnect} disabled={busy}>
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  )
}
