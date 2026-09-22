import { TasksPanel } from './TasksPanel.jsx'

export function Sidebar({
  chats,
  activeChatId,
  onSelect,
  onNew,
  onDelete,
  onExport,
  onOpenSettings,
  open,
  onCloseMobile,
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onOpenAutomations,
  pendingAutomationCount,
}) {
  return (
    <>
      {open && <div className="sidebar-scrim" onClick={onCloseMobile} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">W</div>
          <div>
            <div className="brand-name">Wryly</div>
            <div className="brand-tag">sharp tongue, sharp answers</div>
          </div>
        </div>

        <button className="new-chat-btn" onClick={onNew}>
          + New chat
        </button>

        <div className="chat-list">
          {chats.length === 0 && <div className="chat-list-empty">No chats yet.</div>}
          {chats.map((chat) => (
            <div key={chat.id} className={`chat-item ${chat.id === activeChatId ? 'active' : ''}`}>
              <button className="chat-item-title" onClick={() => onSelect(chat.id)}>
                {chat.title}
              </button>
              <div className="chat-item-actions">
                <button title="Export as Markdown" onClick={() => onExport(chat.id)}>
                  ⇩
                </button>
                <button title="Delete" onClick={() => onDelete(chat.id)}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        <TasksPanel tasks={tasks} onAdd={onAddTask} onToggle={onToggleTask} onDelete={onDeleteTask} />

        <button className="settings-btn" onClick={onOpenAutomations}>
          🤖 Automations{pendingAutomationCount > 0 ? ` (${pendingAutomationCount})` : ''}
        </button>

        <button className="settings-btn" onClick={onOpenSettings}>
          ⚙ Settings
        </button>
      </aside>
    </>
  )
}
