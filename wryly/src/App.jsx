import { useEffect, useMemo, useRef, useState } from 'react'
import { Sidebar } from './components/Sidebar.jsx'
import { ChatWindow } from './components/ChatWindow.jsx'
import { Composer } from './components/Composer.jsx'
import { SettingsPanel } from './components/SettingsPanel.jsx'
import { AutomationsPanel } from './components/AutomationsPanel.jsx'
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
  loadTasks,
  saveTasks,
  uid,
} from './lib/storage'
import { expandCommand, SLASH_COMMANDS } from './lib/commands'
import { buildImageUrl } from './lib/image'
import {
  streamChat,
  fetchSearch,
  fetchGmail,
  fetchGmailStatus,
  disconnectGmail,
  fetchMcpStatus,
  runMcpChat,
  fetchPendingAutomations,
} from './lib/api'
import { speak } from './lib/speech'
import { AGENTS_BY_ID } from './lib/agents'
import { routeAgent } from './lib/router'

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
  const [tasks, setTasks] = useState(() => loadTasks())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [automationsOpen, setAutomationsOpen] = useState(false)
  const [pendingAutomationCount, setPendingAutomationCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [gmail, setGmail] = useState({ connected: false, configured: false })
  const [mcp, setMcp] = useState({ configured: false, connected: false, toolCount: 0 })
  const abortRef = useRef(null)

  useEffect(() => saveChats(chats), [chats])
  useEffect(() => saveSettings(settings), [settings])
  useEffect(() => saveTasks(tasks), [tasks])
  useEffect(() => {
    if (activeChatId) saveActiveId(activeChatId)
  }, [activeChatId])

  useEffect(() => {
    fetchGmailStatus().then(setGmail)
    fetchMcpStatus().then(setMcp)

    const params = new URLSearchParams(window.location.search)
    const gmailResult = params.get('gmail')
    if (gmailResult) {
      window.history.replaceState({}, '', window.location.pathname)
      if (gmailResult === 'connected') setSettingsOpen(true)
    }
  }, [])

  useEffect(() => {
    function refreshPendingCount() {
      fetchPendingAutomations().then((r) => setPendingAutomationCount((r.pending || []).length))
    }
    refreshPendingCount()
    const interval = setInterval(refreshPendingCount, 30000)
    return () => clearInterval(interval)
  }, [])

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

  function handleAddTask(text) {
    setTasks((prev) => [...prev, { id: uid(), text, done: false, createdAt: Date.now() }])
  }

  function handleToggleTask(id) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  function handleDeleteTask(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  function tasksListText() {
    const open = tasks.filter((t) => !t.done)
    if (open.length === 0) return "Nothing on your list. Look at you, thriving."
    return ["Here's what's still open:", '', ...open.map((t, i) => `${i + 1}. ${t.text}`)].join('\n')
  }

  function handleConnectGmail() {
    window.location.href = '/api/auth/google/start'
  }

  async function handleDisconnectGmail() {
    await disconnectGmail()
    setGmail((g) => ({ ...g, connected: false }))
    setSettings((s) => ({ ...s, gmail: false }))
  }

  // One round of the Zapier tool-calling loop. Reuses the same assistant
  // message across rounds — a fresh call ends either in a final answer or a
  // pending approval; approving/denying that resumes with the same
  // messageId until the model is actually done.
  async function runZapierLoop(chatId, messageId, payload) {
    setStreaming(true)
    const res = await runMcpChat(payload)

    if (res.needsApproval) {
      patchMessage(chatId, messageId, {
        streaming: false,
        pendingApproval: { toolCalls: res.toolCalls, assistantMessage: res.assistantMessage, decisions: {} },
        zapierContext: { messages: payload.messages, settings: payload.settings, agentId: payload.agentId },
      })
    } else {
      patchMessage(chatId, messageId, { content: res.content, streaming: false, pendingApproval: null })
      if (settings.voiceOut && res.content?.trim()) speak(res.content.trim())
    }
    setStreaming(false)
  }

  function handleToolDecide(messageId, callId, decision) {
    if (!activeChat) return
    const chatId = activeChat.id
    const message = activeChat.messages.find((m) => m.id === messageId)
    if (!message?.pendingApproval) return

    const decisions = { ...message.pendingApproval.decisions, [callId]: decision }
    const allDecided = message.pendingApproval.toolCalls.every((c) => decisions[c.id])

    patchMessage(chatId, messageId, {
      pendingApproval: { ...message.pendingApproval, decisions },
      streaming: allDecided,
    })

    if (allDecided) {
      runZapierLoop(chatId, messageId, {
        messages: message.zapierContext.messages,
        settings: message.zapierContext.settings,
        agentId: message.zapierContext.agentId,
        pendingApproval: { assistantMessage: message.pendingApproval.assistantMessage, decisions },
      })
    }
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

    if (parsed.type === 'task-add') {
      appendMessage(chatId, { id: uid(), role: 'user', content: raw })
      handleAddTask(parsed.text)
      appendMessage(chatId, {
        id: uid(),
        role: 'assistant',
        content: `Added to your list: "${parsed.text}". Now go do it.`,
        agentId: 'keeper',
      })
      return
    }

    if (parsed.type === 'task-list') {
      appendMessage(chatId, { id: uid(), role: 'user', content: raw })
      appendMessage(chatId, { id: uid(), role: 'assistant', content: tasksListText(), agentId: 'keeper' })
      return
    }

    appendMessage(chatId, { id: uid(), role: 'user', content: raw })

    const agentId = settings.agent !== 'auto' ? settings.agent : routeAgent(parsed.text)
    const agent = agentId ? AGENTS_BY_ID[agentId] : null

    if (settings.zapier) {
      const assistantId = uid()
      appendMessage(chatId, { id: assistantId, role: 'assistant', content: '', streaming: true, agentId })
      const historyMessages = [...chat.messages, { role: 'user', content: parsed.text }].map((m) => ({
        role: m.role,
        content: m.image ? `[generated an image for: ${m.image.prompt}]` : m.content,
      }))
      await runZapierLoop(chatId, assistantId, { messages: historyMessages, settings, agentId })
      return
    }

    const effectiveSettings = {
      ...settings,
      search: settings.search || Boolean(agent?.forceSearch),
      think: settings.think || Boolean(agent?.forceThink),
    }

    let searchContext = ''
    if (effectiveSettings.search) {
      const { text } = await fetchSearch(parsed.text)
      searchContext = text
    }

    let gmailContext = ''
    if (gmail.connected && (settings.gmail || parsed.forceGmail)) {
      const { text } = await fetchGmail(parsed.text)
      gmailContext = text
    }

    const assistantId = uid()
    appendMessage(chatId, { id: assistantId, role: 'assistant', content: '', streaming: true, agentId })
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
        settings: effectiveSettings,
        searchContext,
        gmailContext,
        agentId,
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
        tasks={tasks}
        onAddTask={handleAddTask}
        onToggleTask={handleToggleTask}
        onDeleteTask={handleDeleteTask}
        onOpenAutomations={() => setAutomationsOpen(true)}
        pendingAutomationCount={pendingAutomationCount}
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
            {gmail.connected && settings.gmail && <span className="pill">Gmail</span>}
            {mcp.connected && settings.zapier && <span className="pill">Zap</span>}
            {settings.fun && <span className="pill">Fun</span>}
          </div>
        </div>

        <ChatWindow messages={activeChat?.messages ?? []} onToolDecide={handleToolDecide} />

        <Composer
          onSubmit={handleSend}
          disabled={streaming}
          onStop={handleStop}
          agent={settings.agent}
          onAgentChange={(agent) => setSettings((s) => ({ ...s, agent }))}
        />
      </main>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
          gmail={gmail}
          onConnectGmail={handleConnectGmail}
          onDisconnectGmail={handleDisconnectGmail}
          mcp={mcp}
        />
      )}

      {automationsOpen && (
        <AutomationsPanel
          onClose={() => setAutomationsOpen(false)}
          onPendingCountChange={setPendingAutomationCount}
        />
      )}
    </div>
  )
}
