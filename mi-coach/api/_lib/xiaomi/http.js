// Minimal cookie jar + manual-redirect-following fetch, standing in for
// Python's `requests.Session`. Node's built-in fetch follows redirects
// automatically but only exposes the *final* response's headers, which
// loses Set-Cookie values set on intermediate hops — and Xiaomi's login
// sets its serviceToken cookie partway through a redirect chain. So every
// hop is followed manually here, accumulating cookies as we go.

const USER_AGENT = 'MiFitness/6.5.0 (iPhone; iOS 17.0; Scale/3.00)'

export class CookieJar {
  constructor(initial = {}) {
    this.cookies = new Map(Object.entries(initial))
  }

  setFromResponse(res) {
    const raw = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : res.headers.raw?.()['set-cookie'] || []
    for (const line of raw) {
      const first = line.split(';')[0]
      const eq = first.indexOf('=')
      if (eq === -1) continue
      const name = first.slice(0, eq).trim()
      const value = first.slice(eq + 1).trim()
      if (name) this.cookies.set(name, value)
    }
  }

  set(name, value) {
    this.cookies.set(name, value)
  }

  get(name) {
    return this.cookies.get(name)
  }

  header() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
  }
}

async function followRedirects(url, init, jar, maxHops = 8) {
  let currentUrl = url
  for (let hop = 0; hop < maxHops; hop++) {
    const res = await fetch(currentUrl, {
      ...init,
      redirect: 'manual',
      headers: { ...init.headers, Cookie: jar.header() },
    })
    jar.setFromResponse(res)
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      currentUrl = new URL(res.headers.get('location'), currentUrl).toString()
      init = { method: 'GET', headers: init.headers }
      continue
    }
    return res
  }
  throw new Error('Too many redirects while talking to Xiaomi.')
}

export async function jarGet(url, { params, headers = {}, jar } = {}) {
  const u = new URL(url)
  if (params) for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
  return followRedirects(u.toString(), { method: 'GET', headers: { 'User-Agent': USER_AGENT, ...headers } }, jar)
}

export async function jarPost(url, { form, headers = {}, jar } = {}) {
  const body = new URLSearchParams(form).toString()
  return followRedirects(
    url,
    {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded',
        ...headers,
      },
      body,
    },
    jar
  )
}

export async function readJsonWithSafePrefix(res) {
  const text = await res.text()
  const trimmed = text.trim()
  const withoutPrefix = trimmed.startsWith('&&&START&&&') ? trimmed.slice('&&&START&&&'.length) : trimmed
  return JSON.parse(withoutPrefix)
}
