import React, { useState, useEffect, useCallback } from 'react'
import NavBar from './components/NavBar.jsx'
import Home from './components/Home.jsx'
import Live from './components/Live.jsx'
import Tournaments from './components/Tournaments.jsx'
import Rankings from './components/Rankings.jsx'
import Settings from './components/Settings.jsx'
import MatchDetail from './components/MatchDetail.jsx'
import { getPlayerFixtures, getLeagues, getRankings } from './api/tennisApi.js'
import { mockTournaments, mockRankings, SINNER_ID } from './api/mockData.js'

const SEASON = 2026

export default function App() {
  const [tab, setTab] = useState('home')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('tennis_api_key') || '')
  const [selectedMatch, setSelectedMatch] = useState(null)

  const [homeData, setHomeData] = useState({ live: null, upcoming: [], recent: [] })
  const [tournaments, setTournaments] = useState(mockTournaments)
  const [rankings, setRankings] = useState(mockRankings)
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [playerData, tData, rData] = await Promise.all([
        getPlayerFixtures(SINNER_ID, SEASON, apiKey),
        getLeagues(apiKey),
        getRankings(apiKey),
      ])
      setHomeData(playerData)
      setTournaments(tData)
      setRankings(rData)
    } finally {
      setLoading(false)
    }
  }, [apiKey])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleSaveKey = (key) => {
    localStorage.setItem('tennis_api_key', key)
    setApiKey(key)
  }

  const handleViewMatch = (match) => {
    setSelectedMatch(match)
  }

  const handleBack = () => {
    setSelectedMatch(null)
  }

  const hasLive = !!homeData.live
  const usingMock = !apiKey

  if (selectedMatch) {
    return (
      <div className="app">
        <div className="content">
          <MatchDetail match={selectedMatch} onBack={handleBack} />
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="content">
        {loading && tab === 'home' && (
          <div className="loading-overlay">
            <div className="loading-spinner">🎾</div>
            <div className="loading-text">Loading match data…</div>
          </div>
        )}

        {tab === 'home' && !loading && (
          <Home data={homeData} onViewMatch={handleViewMatch} />
        )}
        {tab === 'live' && (
          <Live apiKey={apiKey} onViewMatch={handleViewMatch} initialLive={homeData.live} />
        )}
        {tab === 'tournaments' && (
          <Tournaments tournaments={tournaments} />
        )}
        {tab === 'rankings' && (
          <Rankings rankings={rankings} />
        )}
        {tab === 'settings' && (
          <Settings apiKey={apiKey} onSaveKey={handleSaveKey} usingMock={usingMock} />
        )}
      </div>
      <NavBar active={tab} onChange={setTab} hasLive={hasLive} />
    </div>
  )
}
