// Minimal cookie helpers shared by the auth edge functions. No dependency —
// Vercel's edge runtime doesn't ship one, and this is a handful of lines.

export function parseCookies(req) {
  const header = req.headers.get('cookie') || ''
  const out = {}
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const key = part.slice(0, eq).trim()
    const value = part.slice(eq + 1).trim()
    if (key) out[key] = decodeURIComponent(value)
  }
  return out
}

export function serializeCookie(name, value, { maxAge, httpOnly = true, path = '/' } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, 'Secure', 'SameSite=Lax']
  if (httpOnly) parts.push('HttpOnly')
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`)
  return parts.join('; ')
}

export function clearCookie(name, path = '/') {
  return serializeCookie(name, '', { maxAge: 0, path })
}
