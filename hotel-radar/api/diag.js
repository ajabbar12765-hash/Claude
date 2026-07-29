// Temporary diagnostic endpoint.
//
// The price proxy was getting a 404 from Hotellook and the cause was not
// obvious from the outside — wrong host, wrong path, wrong parameter shape
// and a rejected token all look alike from the browser. This tries several
// request shapes in one go and reports the status and a snippet of each
// body, so the real cause can be read off rather than guessed at.
//
// It never returns the token itself, only whether one is present.
// Delete this file once the adapter is fixed.

const HOST = 'https://engine.hotellook.com'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')

  const token = process.env.TRAVELPAYOUTS_TOKEN
  const marker = process.env.TRAVELPAYOUTS_MARKER

  const variants = [
    {
      name: 'static/countries (host reachability, no params)',
      url: `${HOST}/api/v2/static/countries.json`,
    },
    {
      name: 'cache.json city only, no token',
      url: `${HOST}/api/v2/cache.json?location=Milan&currency=EUR&limit=5`,
    },
    {
      name: 'cache.json city only, with token',
      url: `${HOST}/api/v2/cache.json?location=Milan&currency=EUR&limit=5&token=${token || ''}`,
    },
    {
      name: 'cache.json with dates (current adapter shape)',
      url: `${HOST}/api/v2/cache.json?location=${encodeURIComponent('Milan, Italy')}&currency=EUR&limit=5&checkIn=2026-08-28&checkOut=2026-08-31&adults=2&token=${token || ''}`,
    },
    {
      name: 'cache.json city + dates, no comma in location',
      url: `${HOST}/api/v2/cache.json?location=Milan&currency=EUR&limit=5&checkIn=2026-08-28&checkOut=2026-08-31&adults=2&token=${token || ''}`,
    },
    {
      name: 'lookup.json (location resolver)',
      url: `${HOST}/api/v2/lookup.json?query=Milan&lang=en&lookFor=both&limit=3&token=${token || ''}`,
    },
  ]

  const results = []
  for (const v of variants) {
    const started = Date.now()
    try {
      const r = await fetch(v.url, { headers: { Accept: 'application/json' } })
      const body = await r.text()
      results.push({
        name: v.name,
        status: r.status,
        contentType: r.headers.get('content-type'),
        ms: Date.now() - started,
        // Redact the token if it is echoed back in an error message.
        snippet: (token ? body.split(token).join('<TOKEN>') : body).slice(0, 240),
      })
    } catch (err) {
      results.push({ name: v.name, status: 'fetch threw', error: String(err).slice(0, 200) })
    }
  }

  return res.status(200).json({
    tokenPresent: Boolean(token),
    tokenLength: token ? token.length : 0,
    markerPresent: Boolean(marker),
    results,
  })
}
