import { useEffect, useState } from 'react'
import {
  fetchAutomations,
  createAutomationRule,
  deleteAutomationRule,
  setAutomationMode,
  fetchPendingAutomations,
  decidePendingAutomation,
  fetchAutomationLog,
} from '../lib/api'

function timeAgo(ts) {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const KIND_ICON = { queued: '⏳', executed: '✅', declined: '🚫', info: '💬', error: '⚠️' }

function PendingCard({ item, onResolved }) {
  const [decisions, setDecisions] = useState({})
  const [submitting, setSubmitting] = useState(false)

  async function decide(callId, decision) {
    const next = { ...decisions, [callId]: decision }
    setDecisions(next)
    const allDecided = item.toolCalls.every((c) => next[c.id])
    if (allDecided) {
      setSubmitting(true)
      await decidePendingAutomation(item.id, next)
      onResolved()
    }
  }

  return (
    <div className="automation-pending-card">
      <div className="automation-pending-source">{item.automationName}</div>
      {item.toolCalls.map((call) => {
        const decision = decisions[call.id]
        return (
          <div key={call.id} className={`tool-call-card ${decision || ''}`}>
            <div className="tool-call-name">{call.name}</div>
            <div className="tool-call-args">
              {Object.entries(call.args || {}).map(([k, v]) => (
                <div key={k} className="tool-arg">
                  <span className="tool-arg-key">{k}</span>
                  <span className="tool-arg-value">{typeof v === 'string' ? v : JSON.stringify(v)}</span>
                </div>
              ))}
            </div>
            {decision ? (
              <div className="tool-call-decided">{decision === 'approve' ? '✅ Approved' : '🚫 Denied'}</div>
            ) : (
              <div className="tool-call-actions">
                <button className="approve" disabled={submitting} onClick={() => decide(call.id, 'approve')}>
                  Approve
                </button>
                <button className="deny" disabled={submitting} onClick={() => decide(call.id, 'deny')}>
                  Deny
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function AutomationsPanel({ onClose, onPendingCountChange }) {
  const [configured, setConfigured] = useState(true)
  const [automations, setAutomations] = useState([])
  const [pending, setPending] = useState([])
  const [activity, setActivity] = useState([])
  const [name, setName] = useState('')
  const [instruction, setInstruction] = useState('')
  const [approvalMode, setApprovalMode] = useState('ask')
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  async function refresh() {
    const [a, p, l] = await Promise.all([fetchAutomations(), fetchPendingAutomations(), fetchAutomationLog()])
    setConfigured(a.configured)
    setAutomations(a.automations || [])
    setPending(p.pending || [])
    setActivity(l.activity || [])
    onPendingCountChange?.((p.pending || []).length)
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim() || !instruction.trim()) return
    setCreating(true)
    try {
      await createAutomationRule({ name: name.trim(), instruction: instruction.trim(), approvalMode })
      setName('')
      setInstruction('')
      setApprovalMode('ask')
      await refresh()
    } catch (err) {
      alert(err.message || 'Could not create automation.')
    }
    setCreating(false)
  }

  async function handleDelete(id) {
    await deleteAutomationRule(id)
    await refresh()
  }

  async function handleModeChange(id, mode) {
    await setAutomationMode(id, mode)
    await refresh()
  }

  function copyWebhook(automation) {
    navigator.clipboard?.writeText(automation.webhookUrl).then(() => {
      setCopiedId(automation.id)
      setTimeout(() => setCopiedId(null), 1500)
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal automations-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Automations</h2>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {!configured ? (
          <div className="settings-footer">
            Not set up on this deployment yet — connect Upstash for Redis from the Vercel Storage tab, then
            redeploy.
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="automation-section">
                <div className="automation-section-title">Waiting on you ({pending.length})</div>
                {pending.map((item) => (
                  <PendingCard key={item.id} item={item} onResolved={refresh} />
                ))}
              </div>
            )}

            <div className="automation-section">
              <div className="automation-section-title">Your automations</div>
              {automations.length === 0 && <div className="chat-list-empty">None yet — create one below.</div>}
              {automations.map((a) => (
                <div key={a.id} className="automation-row">
                  <div className="automation-row-main">
                    <div className="automation-row-name">{a.name}</div>
                    <div className="automation-row-instruction">{a.instruction}</div>
                    <button className="automation-webhook" onClick={() => copyWebhook(a)}>
                      {copiedId === a.id ? 'Copied!' : 'Copy webhook URL'}
                    </button>
                  </div>
                  <div className="automation-row-controls">
                    <select value={a.approvalMode} onChange={(e) => handleModeChange(a.id, e.target.value)}>
                      <option value="ask">Ask first</option>
                      <option value="auto">Auto-send</option>
                    </select>
                    <button className="automation-delete" onClick={() => handleDelete(a.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form className="automation-section automation-form" onSubmit={handleCreate}>
              <div className="automation-section-title">New automation</div>
              <input placeholder="Name (e.g. Auto-reply to Baba on WhatsApp)" value={name} onChange={(e) => setName(e.target.value)} />
              <textarea
                placeholder="Instruction — what should Wryly do when this fires?"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                rows={3}
              />
              <div className="automation-form-row">
                <select value={approvalMode} onChange={(e) => setApprovalMode(e.target.value)}>
                  <option value="ask">Ask first</option>
                  <option value="auto">Auto-send</option>
                </select>
                <button type="submit" disabled={creating || !name.trim() || !instruction.trim()}>
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
              <div className="setting-desc">
                After creating, copy its webhook URL into a "Webhooks by Zapier → POST" step in your Zap, with a
                JSON body like <code>{'{"from": "...", "message": "..."}'}</code>.
              </div>
            </form>

            {activity.length > 0 && (
              <div className="automation-section">
                <div className="automation-section-title">Recent activity</div>
                <div className="automation-log">
                  {activity.slice(0, 10).map((entry) => (
                    <div key={entry.id} className="automation-log-row">
                      <span className="automation-log-icon">{KIND_ICON[entry.kind] || '•'}</span>
                      <span className="automation-log-summary">
                        <strong>{entry.automationName}</strong> — {entry.summary}
                      </span>
                      <span className="automation-log-time">{timeAgo(entry.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
