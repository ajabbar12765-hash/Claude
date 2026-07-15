/*
 * Music catalog — Apple's public iTunes Search API (no key required).
 * It covers essentially the same catalog as Spotify and returns 30-second
 * high-quality previews plus artwork. Primary transport is fetch (the API is
 * CORS-enabled); if a network/CORS hiccup occurs we fall back to JSONP, which
 * the API also supports.
 */

const BASE = 'https://itunes.apple.com';

let jsonpCounter = 0;
function jsonp(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const cb = `__orbit_jsonp_${Date.now()}_${jsonpCounter++}`;
    const script = document.createElement('script');
    const timer = setTimeout(() => { cleanup(); reject(new Error('JSONP timeout')); }, timeoutMs);
    function cleanup() {
      clearTimeout(timer);
      delete window[cb];
      script.remove();
    }
    window[cb] = (data) => { cleanup(); resolve(data); };
    script.onerror = () => { cleanup(); reject(new Error('JSONP failed')); };
    script.src = `${url}${url.includes('?') ? '&' : '?'}callback=${cb}`;
    document.head.appendChild(script);
  });
}

async function get(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return jsonp(url);
  }
}

function normalize(r) {
  if (!r || !r.previewUrl) return null;
  return {
    id: `it-${r.trackId}`,
    title: r.trackName,
    artist: r.artistName,
    album: r.collectionName || '',
    artwork: (r.artworkUrl100 || '').replace('100x100', '600x600'),
    artworkSmall: r.artworkUrl100 || '',
    previewUrl: r.previewUrl,
    durationMs: 30000, // previews are ~30s regardless of trackTimeMillis
    fullDurationMs: r.trackTimeMillis || 0,
    genre: r.primaryGenreName || '',
    source: 'itunes',
  };
}

export async function searchSongs(term, limit = 30) {
  const url = `${BASE}/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=${limit}`;
  const data = await get(url);
  return (data.results || []).map(normalize).filter(Boolean);
}

export async function lookupSongs(ids) {
  if (!ids.length) return [];
  const url = `${BASE}/lookup?id=${ids.join(',')}&entity=song`;
  const data = await get(url);
  return (data.results || []).map(normalize).filter(Boolean);
}

/* Top charts via Apple's marketing RSS feed; falls back to a search. */
export async function topSongs(limit = 20, country = 'us') {
  try {
    const res = await fetch(`https://rss.applemarketingtools.com/api/v2/${country}/music/most-played/${limit}/songs.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const feed = await res.json();
    const ids = (feed.feed?.results || []).map((r) => r.id).filter(Boolean);
    const tracks = await lookupSongs(ids);
    if (tracks.length) return tracks;
    throw new Error('empty chart');
  } catch {
    return searchSongs('top hits', limit);
  }
}
