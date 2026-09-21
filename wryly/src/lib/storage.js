const CHATS_KEY = 'wryly:chats'
const SETTINGS_KEY = 'wryly:settings'
const ACTIVE_KEY = 'wryly:active'

export const DEFAULT_SETTINGS = {
  fun: true,
  snark: 60,
  think: false,
  search: false,
  voiceOut: false,
}

function safeParse(raw, fallback) {
  if (!raw) return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function loadChats() {
  const chats = safeParse(localStorage.getItem(CHATS_KEY), [])
  return Array.isArray(chats) ? chats : []
}

export function saveChats(chats) {
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats))
  } catch {
    // storage full or unavailable — the session still works, just won't persist
  }
}

export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...safeParse(localStorage.getItem(SETTINGS_KEY), {}) }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // ignore
  }
}

export function loadActiveId() {
  return localStorage.getItem(ACTIVE_KEY) || null
}

export function saveActiveId(id) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id)
  } catch {
    // ignore
  }
}

export function newChat() {
  const now = Date.now()
  return { id: uid(), title: 'New chat', createdAt: now, updatedAt: now, messages: [] }
}

export function titleFromFirstMessage(text) {
  const clean = text.trim().replace(/\s+/g, ' ')
  return clean.length > 40 ? clean.slice(0, 40) + '…' : clean || 'New chat'
}

export function chatToMarkdown(chat) {
  const lines = [`# ${chat.title}`, '']
  for (const m of chat.messages) {
    const who = m.role === 'user' ? '**You**' : '**Wryly**'
    lines.push(`${who}: ${m.content}`, '')
  }
  return lines.join('\n')
}
