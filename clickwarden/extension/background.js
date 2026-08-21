const DEFAULTS = { enabled: true, backendUrl: '', apiToken: '' }
const CACHE_TTL_MS = 10 * 60 * 1000

// Anti-tracker: tracker-rules.json (declarativeNetRequest static ruleset,
// registered in manifest.json) blocks known third-party tracker/analytics/
// fingerprinting/cryptomining domains on its own -- no code needed to make
// the blocking itself work. This just shows how many were blocked per tab,
// via Chrome's own action-badge counter instead of hand-rolled bookkeeping.
chrome.declarativeNetRequest.setExtensionActionOptions({ displayActionCountAsBadgeText: true }).catch(() => {})

async function getSettings() {
  return chrome.storage.sync.get(DEFAULTS)
}

async function getCached(url) {
  const key = `cache:${url}`
  const stored = await chrome.storage.session.get(key)
  const entry = stored[key]
  if (entry && Date.now() - entry.at < CACHE_TTL_MS) return entry.verdict
  return null
}

async function setCached(url, verdict) {
  await chrome.storage.session.set({ [`cache:${url}`]: { verdict, at: Date.now() } })
}

async function checkUrl(url) {
  const cached = await getCached(url)
  if (cached) return cached

  const { backendUrl, apiToken } = await getSettings()
  if (!backendUrl) return null

  try {
    const res = await fetch(`${backendUrl.replace(/\/$/, '')}/api/scan-url`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-clickwarden-token': apiToken },
      body: JSON.stringify({ url }),
    })
    if (!res.ok) return null
    const data = await res.json()
    await setCached(url, data.verdict)
    return data.verdict
  } catch {
    return null
  }
}

function isCheckable(url) {
  return !!url && /^https?:\/\//i.test(url)
}

async function recordActivity(entry) {
  const { activity = [] } = await chrome.storage.local.get('activity')
  activity.unshift({ ...entry, at: new Date().toISOString() })
  await chrome.storage.local.set({ activity: activity.slice(0, 50) })
}

function notify(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: `ClickWarden: ${title}`,
    message,
  })
}

// Gmail auto-scan runs by polling, not push notifications -- a real-time
// Pub/Sub subscription needs a Google Cloud billing account (a credit card)
// even to stay within its free tier, which this project deliberately avoids.
// So: poll roughly once a minute while the browser is open (1 minute is
// Chrome's alarm-period floor) as the near-real-time path, backed by a
// once-daily server-side cron as a catch-up if the browser was closed.
chrome.alarms.create('gmail-poll', { periodInMinutes: 1 })

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'gmail-poll') return
  const { backendUrl, apiToken } = await getSettings()
  if (!backendUrl) return
  try {
    const res = await fetch(`${backendUrl.replace(/\/$/, '')}/api/gmail/poll`, {
      method: 'POST',
      headers: { 'x-clickwarden-token': apiToken },
    })
    if (!res.ok) return
    const data = await res.json()
    if (data.flagged > 0) {
      notify(
        'Flagged an email',
        `${data.flagged} of ${data.scanned} new email(s) had a suspicious/malicious link or attachment -- open the dashboard for details`
      )
    }
  } catch {
    // next alarm will retry
  }
})

// Navigation guard. MV3 removed blocking webRequest for most extensions, so
// this cannot stop a page from starting to load -- it races a reputation
// check against the page load and, if the verdict comes back
// malicious/suspicious, redirects the tab to a warning page. That happens
// within roughly a second for a fresh lookup (instantly for a cached one),
// which is well before most pages finish rendering, but it is a best-effort
// redirect, not a guaranteed pre-load block.
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return
  const { enabled, backendUrl } = await getSettings()
  if (!enabled || !backendUrl || !isCheckable(details.url)) return
  if (details.url.startsWith(backendUrl)) return // don't check our own dashboard/API calls

  const verdict = await checkUrl(details.url)
  if (!verdict) return
  recordActivity({ type: 'link', target: details.url, verdict })

  if (verdict === 'malicious' || verdict === 'suspicious') {
    const target = chrome.runtime.getURL(`blocked.html?url=${encodeURIComponent(details.url)}&verdict=${verdict}`)
    chrome.tabs.update(details.tabId, { url: target }).catch(() => {})
    notify(verdict === 'malicious' ? 'Blocked a malicious link' : 'Flagged a suspicious link', details.url)
  }
})

// Download guard. onCreated fires as soon as Chrome starts the transfer, so
// cancelling here stops it within about a second of starting -- well before
// the file is usable, though a few KB may already be on disk; removeFile
// cleans that up.
chrome.downloads.onCreated.addListener(async (item) => {
  const { enabled, backendUrl } = await getSettings()
  const url = item.finalUrl || item.url
  if (!enabled || !backendUrl || !isCheckable(url)) return

  const verdict = await checkUrl(url)
  if (!verdict) return
  recordActivity({ type: 'download', target: item.filename || url, verdict })

  if (verdict === 'malicious' || verdict === 'suspicious') {
    try {
      await chrome.downloads.cancel(item.id)
      await chrome.downloads.removeFile(item.id)
    } catch {
      // best-effort cleanup -- cancel() alone already stops the transfer
    }
    notify(
      verdict === 'malicious' ? 'Blocked a malicious download' : 'Cancelled a suspicious download',
      item.filename || url
    )
  }
})
