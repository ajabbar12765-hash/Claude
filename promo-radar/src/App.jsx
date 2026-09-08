import { useEffect, useMemo, useRef, useState } from 'react'
import { CATALOG, CATEGORIES } from './lib/catalog.js'
import * as storage from './lib/storage.js'
import { scan, SCAN_INTERVAL_MS } from './lib/radar.js'
import { fetchLiveCodes } from './lib/liveCodes.js'

import Hero from './components/Hero.jsx'
import TopBar from './components/TopBar.jsx'
import CategoryTabs from './components/CategoryTabs.jsx'
import SearchBar from './components/SearchBar.jsx'
import TravelPanel from './components/TravelPanel.jsx'
import CodeCard from './components/CodeCard.jsx'
import CodeDetailModal from './components/CodeDetailModal.jsx'
import ArchiveDrawer from './components/ArchiveDrawer.jsx'
import AddCodeModal from './components/AddCodeModal.jsx'
import Toasts from './components/Toasts.jsx'

let toastSeq = 0

export default function App() {
  const [persisted, setPersisted] = useState(() => storage.load())
  const [mode, setMode] = useState('deals')
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [travelCountry, setTravelCountry] = useState('UAE')
  const [viewing, setViewing] = useState(null)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addPrefill, setAddPrefill] = useState('')
  const [toasts, setToasts] = useState([])
  const [liveCodes, setLiveCodes] = useState([])
  const [liveStatus, setLiveStatus] = useState('idle') // idle | scanning | live | off
  const stateRef = useRef(persisted)
  const mainRef = useRef(null)
  stateRef.current = persisted

  useEffect(() => storage.save(persisted), [persisted])

  // Real live scanning: /api/codes runs an Apify crawl against official
  // store pages server-side (see api/codes.js). Off by default until
  // APIFY_TOKEN is configured in Vercel — see README. Fails silently (no
  // /api routes in local `npm run dev`) and the app just runs on the
  // starter catalogue.
  useEffect(() => {
    let cancelled = false
    setLiveStatus('scanning')
    fetchLiveCodes().then((result) => {
      if (cancelled) return
      if (result.live) {
        setLiveCodes(result.items)
        setLiveStatus('live')
      } else {
        setLiveStatus('off')
      }
    })
    return () => { cancelled = true }
  }, [])

  function toast(message, kind = 'info', action) {
    const id = ++toastSeq
    setToasts((t) => [...t, { id, message, kind, action }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000)
  }
  function dismissToast(id) {
    setToasts((t) => t.filter((x) => x.id !== id))
  }

  const allItems = useMemo(() => [...CATALOG, ...liveCodes, ...persisted.custom], [liveCodes, persisted.custom])
  const removedIds = useMemo(() => new Set(Object.keys(persisted.removed)), [persisted.removed])
  const activeItems = useMemo(() => allItems.filter((i) => !removedIds.has(i.id)), [allItems, removedIds])

  // The radar: runs on a timer, auto-retires anything past its expiry date,
  // and keeps "last scan" honest. See lib/radar.js for why this — not a live
  // scraper — is what "constantly looks for" means here.
  useEffect(() => {
    function runScan() {
      const current = stateRef.current
      const currentRemoved = new Set(Object.keys(current.removed))
      const currentActive = allItems.filter((i) => !currentRemoved.has(i.id))
      const result = scan(currentActive, currentRemoved)

      setPersisted((prev) => {
        let next = { ...prev, lastScanAt: result.at }
        for (const item of result.autoExpired) {
          next = storage.markRemoved(next, item.id, 'auto-expired')
        }
        return next
      })

      for (const item of result.autoExpired) {
        toast(`🗑 ${item.store} ${item.code} expired and was auto-retired`, 'warn', {
          label: 'Undo',
          onClick: () => setPersisted((prev) => storage.restore(prev, item.id)),
        })
      }
    }
    runScan()
    const t = setInterval(runScan, SCAN_INTERVAL_MS)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allItems])

  const expiringSoonCount = useMemo(() => {
    const cutoff = Date.now() + 3 * 24 * 60 * 60 * 1000
    return activeItems.filter((i) => {
      const t = new Date(i.expiresAt).getTime()
      return t > Date.now() && t <= cutoff
    }).length
  }, [activeItems])

  const dealsPool = useMemo(() => activeItems.filter((i) => i.category !== 'travel'), [activeItems])
  const travelPool = useMemo(() => activeItems.filter((i) => i.category === 'travel'), [activeItems])
  const giftcardsAnywhere = useMemo(() => activeItems.filter((i) => i.category === 'giftcard'), [activeItems])

  const categoryCounts = useMemo(() => {
    const counts = { all: dealsPool.length }
    for (const c of CATEGORIES) {
      if (c.id === 'travel') continue
      counts[c.id] = dealsPool.filter((i) => i.category === c.id).length
    }
    return counts
  }, [dealsPool])

  const countryCounts = useMemo(() => {
    const counts = {}
    for (const i of travelPool) counts[i.country] = (counts[i.country] || 0) + 1
    return counts
  }, [travelPool])

  function matchesQuery(item, q) {
    if (!q) return true
    const hay = `${item.store} ${item.code} ${item.title} ${item.category}`.toLowerCase()
    return hay.includes(q.toLowerCase())
  }

  const dealsFiltered = useMemo(() => {
    return dealsPool
      .filter((i) => category === 'all' || i.category === category)
      .filter((i) => matchesQuery(i, query))
  }, [dealsPool, category, query])

  const travelFiltered = useMemo(() => {
    const byCountry = travelPool.filter((i) => i.country === travelCountry)
    const extras = giftcardsAnywhere.filter((i) => matchesQuery(i, query))
    return [...byCountry.filter((i) => matchesQuery(i, query)), ...extras]
  }, [travelPool, giftcardsAnywhere, travelCountry, query])

  const visibleItems = mode === 'deals' ? dealsFiltered : travelFiltered

  function handleCopy(item) {
    navigator.clipboard?.writeText(item.code).catch(() => {})
    toast(`Copied "${item.code}"`, 'info')
  }

  function handleWorked(item) {
    setPersisted((prev) => storage.markRemoved(storage.markUsed(prev, item.id), item.id, 'worked-once'))
    setViewing(null)
    toast(`✅ ${item.store} marked used — moved to Archive`, 'success', {
      label: 'Undo',
      onClick: () => setPersisted((prev) => storage.restore(prev, item.id)),
    })
  }

  function handleDidntWork(item) {
    setPersisted((prev) => storage.markRemoved(prev, item.id, 'expired'))
    setViewing(null)
    toast(`❌ ${item.store} ${item.code} removed from your list`, 'warn', {
      label: 'Undo',
      onClick: () => setPersisted((prev) => storage.restore(prev, item.id)),
    })
  }

  function handleAddCode(entry) {
    setPersisted((prev) => storage.addCustom(prev, entry))
    toast(`Added ${entry.store} ${entry.code} — the radar is now watching it`, 'success')
  }

  const archiveList = useMemo(() => {
    return Object.entries(persisted.removed)
      .map(([id, meta]) => {
        const item = allItems.find((i) => i.id === id)
        return item ? { item, ...meta } : null
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.at) - new Date(a.at))
  }, [persisted.removed, allItems])

  function openAddFor(placeName) {
    setAddPrefill(placeName)
    setAddOpen(true)
  }

  return (
    <div className="app">
      <Hero
        radarStatus={{ activeCount: activeItems.length, expiringSoonCount, lastScanAt: persisted.lastScanAt, liveStatus }}
        allItems={activeItems}
        usedMap={persisted.used}
        onCopy={handleCopy}
        onWorked={handleWorked}
        onDidntWork={handleDidntWork}
        onAddPlace={openAddFor}
        onScrollToApp={() => mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      />

      <TopBar
        mode={mode}
        setMode={setMode}
        radarStatus={{ activeCount: activeItems.length, expiringSoonCount, lastScanAt: persisted.lastScanAt, liveStatus }}
        onAddCode={() => openAddFor('')}
        onOpenArchive={() => setArchiveOpen(true)}
        archiveCount={archiveList.length}
      />

      <main ref={mainRef} id="app-main">
        <SearchBar value={query} onChange={setQuery} />

        {mode === 'deals' ? (
          <CategoryTabs active={category} onChange={setCategory} counts={categoryCounts} />
        ) : (
          <TravelPanel country={travelCountry} setCountry={setTravelCountry} counts={countryCounts} />
        )}

        {visibleItems.length === 0 ? (
          <div className="empty-state">
            <p>No codes here yet.</p>
            <button className="btn-primary" onClick={() => openAddFor('')}>+ Add one you found</button>
          </div>
        ) : (
          <div className="code-grid">
            {visibleItems.map((item) => (
              <CodeCard
                key={item.id}
                item={item}
                isUsed={!!persisted.used[item.id]}
                onView={setViewing}
                onCopy={handleCopy}
                onWorked={handleWorked}
                onDidntWork={handleDidntWork}
              />
            ))}
          </div>
        )}
      </main>

      <CodeDetailModal item={viewing} onClose={() => setViewing(null)} onCopy={handleCopy} onWorked={handleWorked} onDidntWork={handleDidntWork} />
      <ArchiveDrawer
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        items={archiveList}
        onRestore={(id) => setPersisted((prev) => storage.restore(prev, id))}
      />
      <AddCodeModal open={addOpen} onClose={() => setAddOpen(false)} onSave={handleAddCode} initialStore={addPrefill} />
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
