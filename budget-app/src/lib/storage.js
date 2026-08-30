// localStorage persistence with a version prefix, so a schema change never
// crashes into old data and a corrupt entry can never blank the app.

const PREFIX = 'budgetapp.v1.'

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw == null) return fallback
    const parsed = JSON.parse(raw)
    return parsed == null ? fallback : parsed
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Quota or private-mode failure: the app stays usable, just not persistent.
  }
}
