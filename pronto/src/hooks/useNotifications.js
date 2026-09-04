import { useCallback, useEffect, useState } from 'react'

const ENABLED_KEY = 'pronto:notifsEnabled:v1'

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

async function showNotification(title, options) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      reg.showNotification(title, options)
    } else {
      new Notification(title, options)
    }
  } catch {
    // notification delivery best-effort — never break the app over it
  }
}

export function useNotifications() {
  const [permission, setPermission] = useState(() => (notificationsSupported() ? Notification.permission : 'unsupported'))
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(ENABLED_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0')
    } catch {
      // ignore — preference just won't persist
    }
  }, [enabled])

  const requestPermission = useCallback(async () => {
    if (!notificationsSupported()) return 'unsupported'
    const result = await Notification.requestPermission()
    setPermission(result)
    setEnabled(result === 'granted')
    return result
  }, [])

  const disable = useCallback(() => setEnabled(false), [])

  const notify = useCallback(
    (title, options) => {
      if (!enabled || permission !== 'granted') return
      showNotification(title, { icon: '/pwa-192.png', badge: '/pwa-192.png', ...options })
    },
    [enabled, permission],
  )

  return {
    supported: notificationsSupported(),
    permission,
    enabled: enabled && permission === 'granted',
    requestPermission,
    disable,
    notify,
  }
}
