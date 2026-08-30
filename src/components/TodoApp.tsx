'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import Sidebar, { type SmartView } from '@/components/Sidebar'
import AmbientBackground, { type BackgroundPreset } from '@/components/AmbientBackground'
import UnifiedComposer from '@/components/UnifiedComposer'
import UnifiedFeed from '@/components/UnifiedFeed'
import NoteEditorModal from '@/components/NoteEditorModal'
import AiNoteModal from '@/components/AiNoteModal'
import AiTaskModal from '@/components/AiTaskModal'
import { useTodos } from '@/hooks/useTodos'
import { useNotes } from '@/hooks/useNotes'
import { useDarkMode } from '@/hooks/useDarkMode'
import { useNotifications } from '@/hooks/useNotifications'
import { useAuth, type AuthState } from '@/hooks/useAuth'

type TodoAppProps = {
  auth?: AuthState
}

function pad2(n: number) { return String(n).padStart(2, '0') }
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function TodoApp({ auth: propAuth }: TodoAppProps) {
  const internalAuth = useAuth()
  const auth = propAuth ?? internalAuth
  const {
    todos, loading: todosLoading,
    addTodo, toggleTodo, deleteTodo, editTodo, changePriority, changeReminder, updateSchedule, removeTag, updateTags, assignTodo, clearCompleted, reorderTodos,
  } = useTodos(auth.user)

  const {
    notes, links: noteLinks, loading: notesLoading,
    addNote, updateNote, togglePinNote, togglePrivateNote, deleteNote, linkTodo, unlinkTodo,
  } = useNotes(auth.user)

  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [smartView,   setSmartView]   = useState<SmartView>('all')

  // Modals
  const [editingNoteId,   setEditingNoteId]   = useState<'new' | string | null>(null)
  const [aiNoteModalOpen, setAiNoteModalOpen] = useState(false)
  const [aiTaskModalOpen, setAiTaskModalOpen] = useState(false)

  // Sidebar states
  const [sidebarCollapsed,  setSidebarCollapsed]  = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [bgPreset,          setBgPreset]          = useState<BackgroundPreset>('aurora')

  const { dark, toggle: toggleDark } = useDarkMode()
  const { permission, requestPermission } = useNotifications(todos, auth.user?.id ?? null)

  const todayStr = useMemo(() => toDateStr(new Date()), [])

  // Keyboard shortcut Cmd+B / Ctrl+B for sidebar toggle
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        setSidebarCollapsed((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    todos.forEach((t) => t.tags.forEach((g) => set.add(g)))
    return [...set].sort()
  }, [todos])

  const handleSelectSmartView = useCallback(
    (sv: SmartView) => {
      setSmartView(sv)
      if (sv === 'today') {
        setSelectedDay(parseDateStr(todayStr))
      } else {
        setSelectedDay(null)
      }
    },
    [todayStr]
  )

  const editingNote = typeof editingNoteId === 'string' ? notes.find((n) => n.id === editingNoteId) ?? null : null

  if (!auth.user) return null

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground transition-colors selection:bg-primary/20 selection:text-primary">
      {/* Dynamic Ambient Background Orbs */}
      <AmbientBackground preset={bgPreset} />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header Bar */}
        <header className="border-b border-border/40 bg-card/40 backdrop-blur-md px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-sm text-foreground">MyTaskList</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground hidden sm:inline">{auth.user.email}</span>
            <button
              onClick={auth.signOut}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Workspace Body */}
        <div className="flex flex-1">
          {/* Collapsible Sidebar */}
          <Sidebar
            user={auth.user}
            todos={todos}
            notes={notes}
            currentView="tasks"
            smartView={smartView}
            selectedPriority={null}
            activeTags={[]}
            allTags={allTags}
            dark={dark}
            permission={permission}
            collapsed={sidebarCollapsed}
            mobileOpen={mobileSidebarOpen}
            bgPreset={bgPreset}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            onCloseMobile={() => setMobileSidebarOpen(false)}
            onSelectSmartView={handleSelectSmartView}
            onSelectPriority={() => {}}
            onToggleTag={() => {}}
            onClearTagFilters={() => {}}
            onToggleDark={toggleDark}
            onRequestNotification={requestPermission}
            onSignOut={auth.signOut}
            onOpenQuickTask={() => {}}
            onOpenAiTask={() => setAiTaskModalOpen(true)}
            onSelectBgPreset={setBgPreset}
          />

          {/* Main Content View Container */}
          <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full transition-all duration-300">
            {/* Top Toolbar toggle button for mobile */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileSidebarOpen(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-2xs hover:text-foreground md:hidden"
                  title="Open Navigation Menu"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="hidden md:flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-2xs hover:text-foreground"
                  title={sidebarCollapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
                >
                  {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </button>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-foreground">Workspace</h1>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    Tasks + Notes
                  </span>
                </div>
              </div>
            </div>

            {/* Main Unified Workspace */}
            <div className="space-y-6">
              {/* 1. Unified Creation Bar ("Choose as I Go") */}
              <UnifiedComposer
                selectedDay={selectedDay}
                existingTags={allTags}
                permission={permission}
                onRequestPermission={requestPermission}
                onAddTodo={addTodo}
                onAddNote={addNote}
                onOpenAiNoteModal={() => setAiNoteModalOpen(true)}
                onOpenAiTaskModal={() => setAiTaskModalOpen(true)}
                onOpenFullNoteEditor={() => setEditingNoteId('new')}
              />

              {/* 2. Unified Feed & Stream */}
              <UnifiedFeed
                todos={todos}
                notes={notes}
                links={noteLinks}
                allTags={allTags}
                userId={auth.user.id}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                onToggleTodo={toggleTodo}
                onDeleteTodo={deleteTodo}
                onEditTodo={editTodo}
                onChangePriority={changePriority}
                onChangeReminder={changeReminder}
                onUpdateSchedule={updateSchedule}
                onRemoveTag={removeTag}
                onUpdateTags={updateTags}
                onAssignTodo={assignTodo}
                onReorderTodos={reorderTodos}
                onOpenNote={(id) => setEditingNoteId(id)}
                onDeleteNote={deleteNote}
                onTogglePinNote={togglePinNote}
                onTogglePrivateNote={togglePrivateNote}
                onChangeNoteColor={(id, c) => updateNote(id, { color: c })}
                onChangeNoteScope={(id, s) => updateNote(id, { scope: s })}
                onViewNotesForTodo={() => {}}
              />
            </div>
          </main>
        </div>

        {/* Note Editor Modal */}
        <NoteEditorModal
          open={editingNoteId !== null}
          onClose={() => setEditingNoteId(null)}
          note={editingNote}
          allTodos={todos}
          linkedIds={editingNote ? (noteLinks[editingNote.id] ?? []) : []}
          onCreate={addNote}
          onUpdate={updateNote}
          onDelete={deleteNote}
          onToggleLink={(nId, tId) => {
            if (noteLinks[nId]?.includes(tId)) unlinkTodo(nId, tId)
            else linkTodo(nId, tId)
          }}
          onCreateTask={async (nId, txt) => {
            const tId = await addTodo({
              text: txt,
              priority: null,
              dueDate: null,
              dueTime: null,
              reminder: null,
              tags: [],
              assignedTo: null,
            })
            if (tId) linkTodo(nId, tId)
          }}
        />

        {/* AI Note Modal */}
        <AiNoteModal
          open={aiNoteModalOpen}
          onClose={() => setAiNoteModalOpen(false)}
          addNote={addNote}
        />

        {/* AI Task Modal */}
        <AiTaskModal
          open={aiTaskModalOpen}
          onClose={() => setAiTaskModalOpen(false)}
          knownTags={allTags}
          addTodo={addTodo}
        />
      </div>
    </div>
  )
}
