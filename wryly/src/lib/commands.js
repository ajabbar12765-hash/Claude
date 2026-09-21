// Slash commands: small shortcuts that expand into a full instruction before
// the message ever reaches the model, so the model doesn't need any special
// handling — it just sees a normal, well-phrased request.

const EXPANSIONS = {
  roast: (arg) =>
    `Roast ${arg || 'me'}. Be savage, quick, and genuinely clever — but good-natured, not actually cruel. No slurs, no real cruelty, just sharp wit.`,
  eli5: (arg) => `Explain like I'm five years old: ${arg || 'the last thing we were talking about'}`,
  debate: (arg) => `Take a strong, well-argued position on this and defend it like you mean it, then briefly steelman the other side: ${arg}`,
  fact: (arg) => `Give me one genuinely surprising, true fact about: ${arg || 'anything interesting'}. Keep it short.`,
  joke: (arg) => `Tell me one genuinely funny, original joke${arg ? ' about ' + arg : ''}. Just the joke, no preamble.`,
}

export const SLASH_COMMANDS = [
  { cmd: '/roast', hint: 'get playfully roasted' },
  { cmd: '/eli5', hint: "explain like I'm 5" },
  { cmd: '/debate', hint: 'argue a strong position' },
  { cmd: '/fact', hint: 'one surprising true fact' },
  { cmd: '/joke', hint: 'tell a joke' },
  { cmd: '/image', hint: 'generate an image' },
  { cmd: '/help', hint: 'list commands' },
]

// Returns { type: 'image', prompt } | { type: 'help' } | { type: 'chat', text, label? }
export function expandCommand(raw) {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('/')) return { type: 'chat', text: raw }

  const spaceIdx = trimmed.indexOf(' ')
  const cmd = (spaceIdx === -1 ? trimmed.slice(1) : trimmed.slice(1, spaceIdx)).toLowerCase()
  const arg = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim()

  if (cmd === 'image' || cmd === 'img') return { type: 'image', prompt: arg }
  if (cmd === 'help') return { type: 'help' }
  if (EXPANSIONS[cmd]) return { type: 'chat', text: EXPANSIONS[cmd](arg), label: raw }
  return { type: 'chat', text: raw }
}
