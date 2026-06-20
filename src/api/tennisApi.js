import { mockLiveMatch, mockUpcoming, mockRecentMatches, mockTournaments, mockRankings, mockPlayer, SINNER_ID } from './mockData.js'

const BASE_URL = 'https://v1.tennis.api-sports.io'

async function apiFetch(endpoint, apiKey) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'x-apisports-key': apiKey },
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data = await res.json()
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(Object.values(data.errors)[0])
  }
  return data.response
}

export async function searchPlayer(name, apiKey) {
  if (!apiKey) return [mockPlayer]
  try {
    return await apiFetch(`/players?search=${encodeURIComponent(name)}`, apiKey)
  } catch {
    return [mockPlayer]
  }
}

export async function getPlayerFixtures(playerId, season, apiKey) {
  if (!apiKey) {
    const today = new Date()
    return {
      live: mockLiveMatch,
      upcoming: mockUpcoming,
      recent: mockRecentMatches,
    }
  }
  try {
    const all = await apiFetch(`/fixtures?player=${playerId}&season=${season}&timezone=UTC`, apiKey)
    const now = Date.now()
    const live = all.find(f => f.status?.short === 'INPROGRESS') || null
    const upcoming = all
      .filter(f => new Date(f.date) > now && f.status?.short === 'NS')
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5)
      .map(normalizeFixture)
    const recent = all
      .filter(f => f.status?.short === 'FT' || f.status?.short === 'AOT')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10)
      .map(normalizeFixture)
    return { live: live ? normalizeLive(live) : null, upcoming, recent }
  } catch {
    return { live: mockLiveMatch, upcoming: mockUpcoming, recent: mockRecentMatches }
  }
}

export async function getLiveFixtures(apiKey) {
  if (!apiKey) return [mockLiveMatch]
  try {
    const all = await apiFetch('/fixtures/live', apiKey)
    return all.map(normalizeLive)
  } catch {
    return [mockLiveMatch]
  }
}

export async function getMatchStats(fixtureId, apiKey) {
  if (!apiKey) return mockRecentMatches[0]?.stats || null
  try {
    const res = await apiFetch(`/fixtures/statistics?fixture=${fixtureId}`, apiKey)
    return normalizeStats(res)
  } catch {
    return null
  }
}

export async function getLeagues(apiKey) {
  if (!apiKey) return mockTournaments
  try {
    const leagues = await apiFetch('/leagues?type=Singles&current=true', apiKey)
    return leagues.map(l => ({
      id: l.id,
      name: l.name,
      category: l.type,
      surface: l.surface || 'N/A',
      city: l.country?.name || '',
      country: l.country?.code || '',
      status: 'upcoming',
      prize: null,
    }))
  } catch {
    return mockTournaments
  }
}

export async function getRankings(apiKey) {
  if (!apiKey) return mockRankings
  try {
    const data = await apiFetch('/players/rankings?type=atp', apiKey)
    return data.slice(0, 10).map((r, i) => ({
      rank: i + 1,
      name: r.player?.name || r.name,
      country: r.player?.country?.code || '',
      points: r.points,
      isFavorite: r.player?.name?.toLowerCase().includes('sinner'),
    }))
  } catch {
    return mockRankings
  }
}

function normalizeFixture(f) {
  return {
    id: f.id,
    status: 'finished',
    tournament: {
      name: f.tournament?.name,
      category: f.league?.name,
      surface: f.tournament?.surface,
      city: f.tournament?.city,
      country: f.tournament?.country,
    },
    round: f.round,
    date: f.date,
    players: {
      home: { name: f.players?.home?.name, rank: null, country: f.players?.home?.country?.code },
      away: { name: f.players?.away?.name, rank: null, country: f.players?.away?.country?.code },
    },
    score: { sets: parseApiSets(f.scores), winner: f.winner },
  }
}

function normalizeLive(f) {
  return {
    id: f.id,
    status: 'live',
    tournament: {
      name: f.tournament?.name,
      category: f.league?.name,
      surface: f.tournament?.surface,
    },
    round: f.round,
    date: f.date,
    players: {
      home: { name: f.players?.home?.name, rank: null, country: f.players?.home?.country?.code, isFavorite: f.players?.home?.name?.toLowerCase().includes('sinner') },
      away: { name: f.players?.away?.name, rank: null, country: f.players?.away?.country?.code, isFavorite: f.players?.away?.name?.toLowerCase().includes('sinner') },
    },
    score: { sets: parseApiSets(f.scores), currentGame: f.game, server: null },
  }
}

function normalizeStats(res) {
  if (!res || !res[0]) return null
  const h = res[0]
  const a = res[1] || {}
  return {
    aces:           [h.aces ?? 0, a.aces ?? 0],
    doubleFaults:   [h.double_faults ?? 0, a.double_faults ?? 0],
    winners:        [h.winners ?? 0, a.winners ?? 0],
    unforcedErrors: [h.unforced_errors ?? 0, a.unforced_errors ?? 0],
    firstServeIn:   [h.first_serve_percentage ?? '—', a.first_serve_percentage ?? '—'],
    firstServeWon:  [h.first_serve_points_won ?? '—', a.first_serve_points_won ?? '—'],
    secondServeWon: [h.second_serve_points_won ?? '—', a.second_serve_points_won ?? '—'],
    breakPointsConverted: [h.break_points_converted ?? '—', a.break_points_converted ?? '—'],
    totalPointsWon: [h.total_points_won ?? 0, a.total_points_won ?? 0],
  }
}

function parseApiSets(scores) {
  if (!scores) return []
  return Object.values(scores)
    .filter(s => s && (s.home !== null || s.away !== null))
    .map(s => [s.home ?? 0, s.away ?? 0])
}
