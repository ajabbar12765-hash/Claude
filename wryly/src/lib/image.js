// Pollinations.ai serves generated images directly from a GET URL — no key,
// no server proxy needed. It's the one Grok-style feature we get for free.

export function buildImageUrl(prompt, { width = 1024, height = 1024, seed } = {}) {
  const encoded = encodeURIComponent(prompt.trim() || 'a surprise, something delightful')
  const params = new URLSearchParams({ width: String(width), height: String(height), nologo: 'true' })
  params.set('seed', String(seed ?? Math.floor(Math.random() * 1_000_000)))
  return `https://image.pollinations.ai/prompt/${encoded}?${params.toString()}`
}
