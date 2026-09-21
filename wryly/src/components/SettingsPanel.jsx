export function SettingsPanel({ settings, onChange, onClose }) {
  function set(patch) {
    onChange({ ...settings, ...patch })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Fun Mode</div>
            <div className="setting-desc">Jokes, riffs, real opinions. Off = straight to the point.</div>
          </div>
          <label className="switch">
            <input type="checkbox" checked={settings.fun} onChange={(e) => set({ fun: e.target.checked })} />
            <span className="slider-track" />
          </label>
        </div>

        <div className="setting-row column">
          <div>
            <div className="setting-label">Snark level — {settings.snark}%</div>
            <div className="setting-desc">How much attitude comes through in replies.</div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.snark}
            onChange={(e) => set({ snark: Number(e.target.value) })}
          />
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Think Mode</div>
            <div className="setting-desc">Shows step-by-step reasoning before the final answer.</div>
          </div>
          <label className="switch">
            <input type="checkbox" checked={settings.think} onChange={(e) => set({ think: e.target.checked })} />
            <span className="slider-track" />
          </label>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Real-time search</div>
            <div className="setting-desc">Looks the web up before answering, like Grok's live knowledge.</div>
          </div>
          <label className="switch">
            <input type="checkbox" checked={settings.search} onChange={(e) => set({ search: e.target.checked })} />
            <span className="slider-track" />
          </label>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-label">Read replies aloud</div>
            <div className="setting-desc">Speaks every new answer automatically.</div>
          </div>
          <label className="switch">
            <input type="checkbox" checked={settings.voiceOut} onChange={(e) => set({ voiceOut: e.target.checked })} />
            <span className="slider-track" />
          </label>
        </div>

        <div className="settings-footer">
          Running on whatever model your deployment is configured with — set <code>OPENAI_API_KEY</code> (a free
          OpenRouter key works) or <code>ANTHROPIC_API_KEY</code> in your environment variables.
        </div>
      </div>
    </div>
  )
}
