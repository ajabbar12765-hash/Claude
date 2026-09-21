// Keyless real-time web search (Vercel Edge Function).
//
// Grok's headline feature is knowing what's happening right now. There's no
// free, keyless "real" search API, but DuckDuckGo's lite HTML endpoint is
// static, unauthenticated, and built for exactly this kind of lightweight
// fetch — so we scrape its result list instead of requiring a search API key.
//
// GET /api/search?q=who won the game last night

export const config = { runtime: 'edge' }

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function stripTags(str) {
  return decodeEntities(str.replace(/<[^>]*>/g, '')).trim()
}

function parseResults(html, limit) {
  const results = []
  const linkRe = /<a[^>]*class="result-link"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
  const snippetRe = /<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/g

  const links = [...html.matchAll(linkRe)]
  const snippets = [...html.matchAll(snippetRe)]

  for (let i = 0; i < links.length && results.length < limit; i++) {
    const url = links[i][1]
    const title = stripTags(links[i][2])
    const snippet = snippets[i] ? stripTags(snippets[i][1]) : ''
    if (!title) continue
    results.push({ title, url, snippet })
  }
  return results
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const limit = Math.min(Number(searchParams.get('limit')) || 5, 8)

  if (!q) {
    return Response.json({ results: [], text: '' })
  }

  try {
    const upstream = await fetch('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': 'Mozilla/5.0 (compatible; WrylyBot/1.0)',
      },
      body: new URLSearchParams({ q }).toString(),
    })

    if (!upstream.ok) {
      throw new Error(`search upstream ${upstream.status}`)
    }

    const html = await upstream.text()
    const results = parseResults(html, limit)
    const text = results
      .map((r, i) => `${i + 1}. ${r.title} — ${r.snippet} (${r.url})`)
      .join('\n')

    return Response.json({ results, text })
  } catch (err) {
    return Response.json({ results: [], text: '', error: err.message }, { status: 200 })
  }
}
