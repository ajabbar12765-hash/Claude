// Browser notifications.
//
// Permission is only requested from a user gesture — browsers reject or
// permanently block automatic prompts. Delivery prefers the service worker
// registration (which works when the tab is backgrounded, and on Android)
// and falls back to the plain Notification constructor.

const ICON = `${import.meta.env.BASE_URL}icon.svg`

export function supported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function permission() {
  return supported() ? Notification.permission : 'unsupported'
}

export async function requestPermission() {
  if (!supported()) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

let soundCtx = null

/** Short two-tone chime, generated so there is no audio asset to load. */
export function chime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    soundCtx = soundCtx || new Ctx()
    if (soundCtx.state === 'suspended') soundCtx.resume()
    const now = soundCtx.currentTime
    for (const [i, freq] of [880, 1320].entries()) {
      const osc = soundCtx.createOscillator()
      const gain = soundCtx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + i * 0.12)
      gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.12 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.28)
      osc.connect(gain).connect(soundCtx.destination)
      osc.start(now + i * 0.12)
      osc.stop(now + i * 0.12 + 0.3)
    }
  } catch {
    /* audio is a nicety, never a failure path */
  }
}

/**
 * @param {{title: string, body: string, tag?: string, url?: string}} message
 */
export async function push(message) {
  if (!supported() || Notification.permission !== 'granted') return false
  const options = {
    body: message.body,
    tag: message.tag,
    renotify: false,
    badge: ICON,
    icon: ICON,
    data: { url: message.url },
    requireInteraction: false,
  }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        await reg.showNotification(message.title, options)
        return true
      }
    }
    const n = new Notification(message.title, options)
    if (message.url) {
      n.onclick = () => {
        window.open(message.url, '_blank', 'noopener')
        n.close()
      }
    }
    return true
  } catch {
    return false
  }
}
