function formatArgs(args) {
  if (!args || Object.keys(args).length === 0) return null
  return Object.entries(args).map(([key, value]) => (
    <div key={key} className="tool-arg">
      <span className="tool-arg-key">{key}</span>
      <span className="tool-arg-value">{typeof value === 'string' ? value : JSON.stringify(value)}</span>
    </div>
  ))
}

export function ToolApproval({ toolCalls, decisions, onDecide }) {
  return (
    <div className="tool-approval">
      <div className="tool-approval-header">Wryly wants to run, via Zapier:</div>
      {toolCalls.map((call) => {
        const decision = decisions?.[call.id]
        return (
          <div key={call.id} className={`tool-call-card ${decision ? decision : ''}`}>
            <div className="tool-call-name">{call.name}</div>
            <div className="tool-call-args">{formatArgs(call.args)}</div>
            {decision ? (
              <div className="tool-call-decided">{decision === 'approve' ? '✅ Approved' : '🚫 Denied'}</div>
            ) : (
              <div className="tool-call-actions">
                <button className="approve" onClick={() => onDecide(call.id, 'approve')}>
                  Approve
                </button>
                <button className="deny" onClick={() => onDecide(call.id, 'deny')}>
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
