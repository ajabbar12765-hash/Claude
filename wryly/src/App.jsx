import { useEffect, useMemo, useRef, useState } from 'react'
import { Sidebar } from './components/Sidebar.jsx'
import { ChatWindow } from './components/ChatWindow.jsx'
import { Composer } from './components/Composer.jsx'
import { SettingsPanel } from './components/SettingsPanel.jsx'
import {
  loadChats,
  saveChats,
  loadSettings,
  saveSettings,
  loadActiveId,
  saveActiveId,
  newChat,
  titleFromFirstMessage,
  chatToMarkdown,
  uid,
} from './lib/storage'
import { expandCommand, SLASH_COMMANDS } from './lib/commands'
import { buildImageUrl } from './lib/image'
import { streamChat, fetchSearch } from './lib/api'
import { speak } from './lib/speech'

const HELP_TEXT = [
  "Here's what I can do beyond plain chat:",
  '',
  ...SLASH_COMMANDS.map((c) => `**${c.cmd}** — ${c.hint}`),
  '',
  'You can also flip on Real-time search, Think Mode, or Fun Mode from Settings.',
].join('\n')

export default function App() {
  const [chats, setChats] = useState(() => loadChats())
  const [activeChatId, setActiveChatId] = useState(() => loadActiveId())
  const [settings, setSettings] = useState(() => loadSettings())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef(null)

  useEffect(() => saveChats(chats), [chats])
  useEffect(() => saveSettings(settings), [settings])
  useEffect(() => {
    if (activeChatId) saveActiveId(activeChatId)
  }, [activeChatId])

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) ?? null,
    [chats, activeChatId]
  )

  function updateChat(id, updater) {
    setChats((prev) => prev.map((c) => (c.id === id ? updater(c) : c)))
  }

  function ensureActiveChat() {
    if (activeChat) return activeChat
    const chat = newChat()
    setChats((prev) => [chat, ...prev])
    setActiveChatId(chat.id)
    return chat
  }

  function handleNewChat() {
    const chat = newChat()
    setChats((prev) => [chat, ...prev])
    setActiveChatId(chat.id)
    setSidebarOpen(false)
  }

  function handleDeleteChat(id) {
    setChats((prev) => prev.filter((c) => c.id !== id))
    if (activeChatId === id) setActiveChatId(null)
  }

  function handleExportChat(id) {
    const chat = chats.find((c) => c.id === id)
    if (!chat) return
    const blob = new Blob([chatToMarkdown(chat)], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${chat.title.replace(/[^\w -]/g, '').slice(0, 40) || 'wryly-chat'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  function appendMessage(chatId, message) {
    updateChat(chatId, (c) => ({
      ...c,
      messages: [...c.messages, message],
      updatedAt: Date.now(),
      title: c.messages.length === 0 && message.role === 'user' ? titleFromFirstMessage(message.content) : c.title,
    }))
  }

  function patchMessage(chatId, messageId, patch) {
    updateChat(chatId, (c) => ({
      ...c,
      messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
    }))
  }

  async function handleSend(raw) {
    const chat = ensureActiveChat()
    const chatId = chat.id
    const parsed = expandCommand(raw)

    if (parsed.type === 'image') {
      appendMessage(chatId, { id: uid(), role: 'user', content: raw })
      const url = buildImageUrl(parsed.prompt)
      appendMessage(chatId, { id: uid(), role: 'assistant', content: '', image: { url, prompt: parsed.prompt || 'a surprise' } })
      return
    }

    if (parsed.type === 'help') {
      appendMessage(chatId, { id: uid(), role: 'user', content: raw })
      appendMessage(chatId, { id: uid(), role: 'assistant', content: HELP_TEXT })
      return
    }

    appendMessage(chatId, { id: uid(), role: 'user', content: raw })

    let searchContext = ''
    if (settings.search) {
      const { text } = await fetchSearch(parsed.text)
      searchContext = text
    }

    const assistantId = uid()
    appendMessage(chatId, { id: assistantId, role: 'assistant', content: '', streaming: true })
    setStreaming(true)

    const historyMessages = [...chat.messages, { role: 'user', content: parsed.text }].map((m) => ({
      role: m.role,
      content: m.image ? `[generated an image for: ${m.image.prompt}]` : m.content,
    }))

    const controller = new AbortController()
    abortRef.current = controller

    let full = ''
    try {
      await streamChat({
        messages: historyMessages,
        settings,
        searchContext,
        signal: controller.signal,
        onDelta: (delta) => {
          full += delta
          patchMessage(chatId, assistantId, { content: full })
        },
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        full += `\n\n⚠️ ${err.message || 'Something went wrong talking to the model.'}`
        patchMessage(chatId, assistantId, { content: full })
      }
    }

    if (!full.trim()) {
      full = '⚠️ No response came back from the model. Check your provider setup in Settings.'
      patchMessage(chatId, assistantId, { content: full })
    }

    patchMessage(chatId, assistantId, { streaming: false })
    setStreaming(false)
    abortRef.current = null
    if (settings.voiceOut) {
      const answer = full.split('</thinking>').pop().trim()
      if (answer) speak(answer)
    }
  }

  function handleStop() {
    abortRef.current?.abort()
  }

  return (
    <div className="app">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelect={(id) => {
          setActiveChatId(id)
          setSidebarOpen(false)
        }}
        onNew={handleNewChat}
        onDelete={handleDeleteChat}
        onExport={handleExportChat}
        onOpenSettings={() => setSettingsOpen(true)}
        open={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      <main className="main">
        <div className="topbar">
          <button className="icon-btn hamburger" onClick={() => setSidebarOpen((o) => !o)}>
            ☰
          </button>
          <div className="topbar-title">{activeChat?.title ?? 'Wryly'}</div>
          <div className="topbar-pills">
            {settings.think && <span className="pill">Think</span>}
            {settings.search && <span className="pill">Search</span>}
            {settings.fun && <span className="pill">Fun</span>}
          </div>
        </div>

        <ChatWindow messages={activeChat?.messages ?? []} />

        <Composer onSubmit={handleSend} disabled={streaming} onStop={handleStop} />
      </main>

      {settingsOpen && (
        <SettingsPanel settings={settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  )
}
