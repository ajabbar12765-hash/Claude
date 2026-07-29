import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// The service worker exists so the app can be installed to a home screen and
// so notifications survive a backgrounded tab. Registration failing is not
// fatal — the app runs fine without it.
// The service worker exists so the app can be installed to a home screen and
// so notifications survive a backgrounded tab. It also used to be able to
// pin a device to an old build indefinitely: Safari does not check for a new
// worker on its own, so a fixed bug could stay invisible on the device while
// being live on the server. The registration below checks for an update on
// load and hourly, and reloads once when a new worker takes over.
if ('serviceWorker' in navigator) {
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Guard against the reload loop this pattern is prone to.
    if (reloading) return
    reloading = true
    window.location.reload()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((reg) => {
        reg.update().catch(() => {})
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000)
      })
      .catch(() => {})
  })
}
