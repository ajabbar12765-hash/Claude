import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import TopBar from './components/TopBar.jsx'
import FilterPanel from './components/FilterPanel.jsx'
import DealGrid from './components/DealGrid.jsx'
import AlertsDrawer from './components/AlertsDrawer.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import Toasts from './components/Toasts.jsx'

import { DEFAULT_FILTERS, buildDeals } from './lib/filters.js'
import { findNewAlerts, alertText, MAX_ALERTS } from './lib/alerts.js'
import { runScan } from './lib/provider.js'
import { bookingLinks } from './lib/deeplinks.js'
import { money as fmtMoney, toISODate, addDays } from './lib/format.js'
import * as notify from './lib/notify.js'
import { load, save } from './lib/storage.js'

const SCAN_INTERVALS = [
  { id: 15, label: 'Every 15s' },
  { id: 30, label: 'Every 30s' },
  { id: 60, label: 'Every minute' },
  { id: 300, label: 'Every 5 min' },
  { id: 900, label: 'Every 15 min' },
]

function defaultTrip() {
  const checkIn = addDays(toISODate(new Date()), 30)
  return { checkIn, checkOut: addDays(checkIn, 3), adults: 2, rooms: 1 }
}

const DEFAULT_SETTINGS = {
  currency: 'EUR',
  provider: 'simulated',
  scanSeconds: 30,
  notifyBrowser: true,
  notifySound: true,
  theme: 'dark',
  providerConfig: {},
}

export default function App() {
  const [filters, setFilters] = useState(() => ({ ...DEFAULT_FILTERS, ...load('filters', {}) }))
  const [trip, setTrip] = useState(() => ({ ...defaultTrip(), ...load('trip', {}) }))
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...load('settings', {}) }))
  const [alerts, setAlerts] = useState(() => load('alerts', []))
  const [saved, setSaved] = useState(() => load('saved', []))

  const [offers, setOffers] = useState([])
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState(null)
  const [scanCount, setScanCount] = useState(0)
  const [providerError, setProviderError] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Alert memory is a ref: it must not trigger a re-render or a re-scan.
  const seenRef = useRef(load('seen', {}))
  const firstScanRef = useRef(true)

  const money = useCallback(
    (eur, opts) => fmtMoney(eur, settings.currency, opts),
    [settings.currency]
  )

  // ---- persistence ------------------------------------------------------
  useEffect(() => save('filters', filters), [filters])
  useEffect(() => save('trip', trip), [trip])
  useEffect(() => save('settings', settings), [settings])
  useEffect(() => save('alerts', alerts.slice(0, MAX_ALERTS)), [alerts])
  useEffect(() => save('saved', saved), [saved])

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
  }, [settings.theme])

  // ---- derived deals ----------------------------------------------------
  const { deals, resolved } = useMemo(() => buildDeals(offers, filters), [offers, filters])

  const inBudget = useMemo(() => deals.filter((d) => d.withinBudget), [deals])
  const unread = useMemo(() => alerts.filter((a) => !a.read).length, [alerts])

  // Provider config travels by ref so that editing a filter does not restart
  // the scan timer — a live provider would fire a request on every keystroke.
  // Live providers read `filters` to scan only the destinations in view,
  // which is what keeps a free-tier quota alive.
  const scanConfigRef = useRef({})
  scanConfigRef.current = {
    ...(settings.providerConfig?.[settings.provider] || {}),
    filters: {
      cities: filters.cities,
      parsedCityId: resolved.parsed.city?.id ?? null,
      parsedLandmarkDestinationId: resolved.parsed.landmark?.destinationId ?? null,
    },
  }

  const pushToast = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((t) => [...t.slice(-3), { ...toast, id }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 9000)
  }, [])

  // ---- the scan loop ----------------------------------------------------
  const scan = useCallback(async () => {
    setScanning(true)
    try {
      const { offers: fresh, error } = await runScan(
        settings.provider,
        trip,
        scanConfigRef.current
      )
      setOffers(fresh)
      setProviderError(error)
      setLastScan(Date.now())
      setScanCount((n) => n + 1)
    } catch (err) {
      setProviderError(err?.message || 'Scan failed')
    } finally {
      setScanning(false)
    }
  }, [settings.provider, trip])

  // Kick off immediately, then on the chosen interval.
  useEffect(() => {
    scan()
    const ms = Math.max(5, settings.scanSeconds) * 1000
    const timer = setInterval(scan, ms)
    return () => clearInterval(timer)
  }, [scan, settings.scanSeconds])

  // ---- alert evaluation -------------------------------------------------
  // Runs whenever the deal list changes. The very first pass only seeds the
  // memory, otherwise opening the app would fire a notification per hotel.
  useEffect(() => {
    if (!deals.length) return

    const { alerts: fresh, seen } = findNewAlerts(deals, seenRef.current, {
      budget: resolved.effectiveBudget,
      basis: filters.budgetBasis,
    })
    seenRef.current = seen
    save('seen', seen)

    // The first pass after a new budget or query would otherwise fire one
    // message per hotel already in range. Seed silently, but still send the
    // single best current match so setting a budget gets an answer at once.
    let outgoing = fresh
    if (firstScanRef.current) {
      firstScanRef.current = false
      outgoing = fresh.slice(0, 1).map((a) => ({ ...a, initial: true }))
    }
    if (!outgoing.length) return

    setAlerts((prev) => [...outgoing, ...prev].slice(0, MAX_ALERTS))

    for (const alert of outgoing) {
      const text = alertText(alert, (v) => fmtMoney(v, settings.currency))
      pushToast({ ...text, alert })
      if (settings.notifyBrowser) {
        const hotel = deals.find((d) => d.hotelId === alert.hotelId)?.hotel
        notify.push({
          title: text.title,
          body: text.body,
          tag: `deal-${alert.hotelId}`,
          url: hotel ? bookingLinks(hotel, trip).booking : undefined,
        })
      }
    }
    if (settings.notifySound) notify.chime()
    // `deals` is the trigger; the rest are read-only inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals])

  // Reset the alert memory when the search itself changes — a new budget or
  // new destination is a new question, and should be allowed to alert afresh.
  const resetAlertMemory = useCallback(() => {
    seenRef.current = {}
    save('seen', {})
    firstScanRef.current = true
  }, [])

  const updateFilters = useCallback(
    (patch) => {
      setFilters((f) => {
        const next = typeof patch === 'function' ? patch(f) : { ...f, ...patch }
        if (
          next.budget !== f.budget ||
          next.query !== f.query ||
          next.budgetBasis !== f.budgetBasis
        ) {
          resetAlertMemory()
        }
        return next
      })
    },
    [resetAlertMemory]
  )

  const toggleSave = useCallback((hotelId) => {
    setSaved((s) => (s.includes(hotelId) ? s.filter((x) => x !== hotelId) : [...s, hotelId]))
  }, [])

  const enableNotifications = useCallback(async () => {
    const result = await notify.requestPermission()
    if (result === 'granted') {
      setSettings((s) => ({ ...s, notifyBrowser: true }))
      notify.push({
        title: 'Hotel Radar is watching',
        body: 'You will get a message the moment a stay drops into your budget.',
        tag: 'radar-armed',
      })
    }
    return result
  }, [])

  const markAllRead = useCallback(() => {
    setAlerts((a) => a.map((x) => ({ ...x, read: true })))
  }, [])

  const openAlert = useCallback((alert) => {
    setAlerts((a) => a.map((x) => (x.id === alert.id ? { ...x, read: true } : x)))
  }, [])

  return (
    <div className="app">
      <TopBar
        unread={unread}
        scanning={scanning}
        lastScan={lastScan}
        scanCount={scanCount}
        matchCount={inBudget.length}
        theme={settings.theme}
        onToggleTheme={() =>
          setSettings((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))
        }
        onOpenAlerts={() => setDrawerOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onScanNow={scan}
        onToggleFilters={() => setFiltersOpen((v) => !v)}
      />

      <main className="layout">
        <div
          className={`scrim scrim--panel ${filtersOpen ? 'is-open' : ''}`}
          onClick={() => setFiltersOpen(false)}
          aria-hidden="true"
        />

        <FilterPanel
          className={filtersOpen ? 'is-open' : ''}
          filters={filters}
          resolved={resolved}
          trip={trip}
          money={money}
          currency={settings.currency}
          dealCount={deals.length}
          matchCount={inBudget.length}
          notificationState={notify.permission()}
          onEnableNotifications={enableNotifications}
          onChange={updateFilters}
          onTripChange={setTrip}
          onClose={() => setFiltersOpen(false)}
        />

        <DealGrid
          deals={deals}
          resolved={resolved}
          trip={trip}
          money={money}
          saved={saved}
          scanning={scanning}
          scanCount={scanCount}
          providerError={providerError}
          onToggleSave={toggleSave}
          onChange={updateFilters}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </main>

      <AlertsDrawer
        open={drawerOpen}
        alerts={alerts}
        trip={trip}
        money={money}
        onClose={() => setDrawerOpen(false)}
        onOpenAlert={openAlert}
        onMarkAllRead={markAllRead}
        onClear={() => setAlerts([])}
      />

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        intervals={SCAN_INTERVALS}
        notificationState={notify.permission()}
        onEnableNotifications={enableNotifications}
        onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
        onClose={() => setSettingsOpen(false)}
      />

      <Toasts toasts={toasts} trip={trip} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  )
}
