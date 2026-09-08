// All state lives in localStorage — no account, no backend. Marking a code
// "used" or "expired" only affects your own browser, same as hotel-radar's
// saved deals/settings.

const KEY = 'promoRadar:v1'

function empty() {
  return {
    used: {},       // id -> { at }
    removed: {},     // id -> { at, reason: 'worked-once' | 'expired' | 'auto-expired' }
    custom: [],       // user-added code objects (same shape as catalog entries)
    lastScanAt: null,
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw)
    return { ...empty(), ...parsed }
  } catch {
    return empty()
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // storage full or unavailable — state just won't persist this session
  }
}

export function markUsed(state, id) {
  return { ...state, used: { ...state.used, [id]: { at: new Date().toISOString() } } }
}

export function markRemoved(state, id, reason) {
  const { [id]: _dropped, ...restUsed } = state.used
  return {
    ...state,
    removed: { ...state.removed, [id]: { at: new Date().toISOString(), reason } },
  }
}

export function restore(state, id) {
  const { [id]: _dropped, ...rest } = state.removed
  return { ...state, removed: rest }
}

export function addCustom(state, entry) {
  return { ...state, custom: [entry, ...state.custom] }
}

export function removeCustom(state, id) {
  return { ...state, custom: state.custom.filter((c) => c.id !== id) }
}
