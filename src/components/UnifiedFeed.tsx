'use client'

import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search, X, LayoutGrid, List, Globe, Briefcase, Home, Eye, EyeOff,
  Sparkles, Pin, CheckCircle2, FileText
} from 'lucide-react'
import {
  DndContext, DragOverlay, closestCenter, useSensor, useSensors, PointerSensor, DragStartEvent, DragEndEvent
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { Input } from '@/components/ui/input'
import TodoItem, { type Todo, type Priority } from '@/components/TodoItem'
import NoteCard, { NOTE_COLOR_CONFIG } from '@/components/NoteCard'
import WeekView from '@/components/WeekView'
import EmptyState, { type EmptyVariant } from '@/components/EmptyState'
import type { Note, NoteColor, NoteScope } from '@/hooks/useNotes'
import type { ReminderMinutes } from '@/hooks/useTodos'
import { cn } from '@/lib/utils'

export type StreamFilterMode = 'all' | 'tasks' | 'notes'

type UnifiedFeedProps = {
  todos: Todo[]
  notes: Note[]
  links: Record<string, string[]>
  allTags: string[]
  userId: string | null
  selectedDay: Date | null
  onSelectDay: (d: Date | null) => void
  onToggleTodo: (id: string) => void
  onDeleteTodo: (id: string) => void
  onEditTodo: (id: string, text: string) => void
  onChangePriority: (id: string, priority: Priority | null) => void
  onChangeReminder: (id: string, reminder: ReminderMinutes) => void
  onUpdateSchedule: (id: string, dueDate: string | null, dueTime: string | null) => void
  onRemoveTag: (id: string, tag: string) => void
  onUpdateTags: (id: string, tags: string[]) => void
  onAssignTodo: (id: string, assignee: string | null) => void
  onReorderTodos: (todos: Todo[]) => void
  onOpenNote: (id: string) => void
  onDeleteNote: (id: string) => void
  onTogglePinNote?: (id: string) => void
  onTogglePrivateNote?: (id: string) => void
  onChangeNoteColor?: (id: string, color: NoteColor) => void
  onChangeNoteScope?: (id: string, scope: NoteScope) => void
  onViewNotesForTodo: (todoId: string) => void
}

export default function UnifiedFeed({
  todos,
  notes,
  links,
  allTags,
  userId,
  selectedDay,
  onSelectDay,
  onToggleTodo,
  onDeleteTodo,
  onEditTodo,
  onChangePriority,
  onChangeReminder,
  onUpdateSchedule,
  onRemoveTag,
  onUpdateTags,
  onAssignTodo,
  onReorderTodos,
  onOpenNote,
  onDeleteNote,
  onTogglePinNote,
  onTogglePrivateNote,
  onChangeNoteColor,
  onChangeNoteScope,
  onViewNotesForTodo,
}: UnifiedFeedProps) {
  // Main Stream Filter Mode: 'all' | 'tasks' | 'notes'
  const [streamMode, setStreamMode] = useState<StreamFilterMode>('all')

  // Search query
  const [search, setSearch] = useState('')

  // Scope Filter: 'all' | 'work' | 'personal'
  const [scopeFilter, setScopeFilter] = useState<'all' | 'work' | 'personal'>('all')

  // Hide / Show Private Notes
  const [showPrivate, setShowPrivate] = useState(false)

  // Layout Mode: 'grid' | 'list'
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid')

  // Drag and Drop active item
  const [activeTodoId, setActiveTodoId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function handleDragStart(e: DragStartEvent) {
    setActiveTodoId(e.active.id as string)
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveTodoId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return
    const fromIdx = todos.findIndex((t) => t.id === active.id)
    const toIdx   = todos.findIndex((t) => t.id === over.id)
    if (fromIdx !== -1 && toIdx !== -1) {
      onReorderTodos(arrayMove(todos, fromIdx, toIdx))
    }
  }

  // Derived filtered tasks
  const filteredTodos = useMemo(() => {
    let list = todos.filter((t) => !t.completed)

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((t) => t.text.toLowerCase().includes(q) || t.tags.some((tag) => tag.toLowerCase().includes(q)))
    }

    if (selectedDay) {
      const dayStr = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, '0')}-${String(selectedDay.getDate()).padStart(2, '0')}`
      list = list.filter((t) => t.dueDate === dayStr)
    }

    return list
  }, [todos, search, selectedDay])

  // Derived filtered notes
  const filteredNotes = useMemo(() => {
    let list = notes

    // Scope filter
    if (scopeFilter !== 'all') {
      list = list.filter((n) => (n.scope ?? 'general') === scopeFilter)
    }

    // Private notes hiding
    if (!showPrivate) {
      list = list.filter((n) => !n.isPrivate)
    }

    // Search query
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((n) => n.title.toLowerCase().includes(q) || n.text.toLowerCase().includes(q))
    }

    return list
  }, [notes, scopeFilter, showPrivate, search])

  // Private note count
  const privateCount = useMemo(() => notes.filter((n) => n.isPrivate).length, [notes])

  // Pinned vs Unpinned Notes
  const pinnedNotes = useMemo(() => filteredNotes.filter((n) => n.pinned), [filteredNotes])
  const unpinnedNotes = useMemo(() => filteredNotes.filter((n) => !n.pinned), [filteredNotes])

  const activeDragTodo = useMemo(() => todos.find((t) => t.id === activeTodoId) ?? null, [todos, activeTodoId])

  const emptyVariant = (): EmptyVariant => {
    if (search.trim()) return 'no-note-match'
    return 'no-tasks'
  }

  return (
    <div className="space-y-6">
      {/* ── Context Switcher: Work 💼 vs Personal 🏠 vs All ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-2 shadow-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScopeFilter('all')}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all',
              scopeFilter === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Globe className="h-3.5 w-3.5" />
            All Scope
          </button>
          <button
            onClick={() => setScopeFilter('work')}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all',
              scopeFilter === 'work'
                ? 'bg-blue-600 text-white shadow-xs dark:bg-blue-500'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Briefcase className="h-3.5 w-3.5" />
            Work 💼
          </button>
          <button
            onClick={() => setScopeFilter('personal')}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all',
              scopeFilter === 'personal'
                ? 'bg-emerald-600 text-white shadow-xs dark:bg-emerald-500'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Home className="h-3.5 w-3.5" />
            Personal 🏠
          </button>
        </div>

        {/* Private / Hide Notes Toggle Button */}
        <button
          onClick={() => setShowPrivate(!showPrivate)}
          className={cn(
            'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors border',
            showPrivate
              ? 'border-purple-300 bg-purple-100 text-purple-800 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
              : 'border-border bg-background text-muted-foreground hover:text-foreground'
          )}
          title={showPrivate ? 'Private notes are visible' : 'Private notes are hidden'}
        >
          {showPrivate ? <Eye className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" /> : <EyeOff className="h-3.5 w-3.5" />}
          <span>{showPrivate ? 'Private Visible' : 'Hide Private Notes'}</span>
          {privateCount > 0 && (
            <span className="rounded-full bg-purple-500/20 px-1.5 py-0.2 text-[10px] font-bold">
              {privateCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Toolbar: Search + Mode Tabs + Layout Mode Switcher ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Main Stream Filter Tabs */}
          <div className="flex items-center rounded-xl bg-muted/60 p-1 shadow-2xs">
            <button
              onClick={() => setStreamMode('all')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                streamMode === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Globe className="h-3.5 w-3.5" />
              All Items ({filteredTodos.length + filteredNotes.length})
            </button>
            <button
              onClick={() => setStreamMode('tasks')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                streamMode === 'tasks'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Tasks ({filteredTodos.length})
            </button>
            <button
              onClick={() => setStreamMode('notes')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                streamMode === 'notes'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              Notes ({filteredNotes.length})
            </button>
          </div>

          {/* Grid vs List View Switcher */}
          <div className="flex items-center rounded-xl border border-border bg-card p-0.5 shadow-xs">
            <button
              onClick={() => setLayoutMode('grid')}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200',
                layoutMode === 'grid' ? 'bg-primary text-primary-foreground font-semibold shadow-xs scale-105' : 'text-muted-foreground hover:text-foreground'
              )}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setLayoutMode('list')}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200',
                layoutMode === 'list' ? 'bg-primary text-primary-foreground font-semibold shadow-xs scale-105' : 'text-muted-foreground hover:text-foreground'
              )}
              title="List View"
              aria-label="List View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks, notes, and tags…"
            className="h-10 rounded-xl pl-9 pr-9 text-sm font-medium"
            aria-label="Search workspace"
          />
          <AnimatePresence>
            {search && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.12 }}
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Week View Calendar (Shown in 'all' or 'tasks' mode) ── */}
      {(streamMode === 'all' || streamMode === 'tasks') && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <WeekView todos={todos} selectedDay={selectedDay} onSelectDay={onSelectDay} />
        </motion.div>
      )}

      {/* ── PINNED NOTES SECTION ── */}
      {(streamMode === 'all' || streamMode === 'notes') && pinnedNotes.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Pin className="h-3.5 w-3.5 fill-current" />
            <span>Pinned Notes ({pinnedNotes.length})</span>
          </div>

          <ul
            className={cn(
              layoutMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
                : 'flex flex-col space-y-2'
            )}
          >
            <AnimatePresence initial={false}>
              {pinnedNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  layoutMode={layoutMode}
                  linkedCount={links[note.id]?.length ?? 0}
                  onOpen={() => onOpenNote(note.id)}
                  onDelete={() => onDeleteNote(note.id)}
                  onTogglePin={() => onTogglePinNote && onTogglePinNote(note.id)}
                  onTogglePrivate={() => onTogglePrivateNote && onTogglePrivateNote(note.id)}
                  onChangeColor={(c) => onChangeNoteColor && onChangeNoteColor(note.id, c)}
                  onChangeScope={(s) => onChangeNoteScope && onChangeNoteScope(note.id, s)}
                />
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}

      {/* ── UNIFIED STREAM SECTION ── */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`stream-${streamMode}-${layoutMode}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
          {/* 1. Tasks List */}
          {(streamMode === 'all' || streamMode === 'tasks') && filteredTodos.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground border-b border-border/40 pb-1">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <span>Active Tasks</span>
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {filteredTodos.length}
                </span>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <SortableContext items={filteredTodos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-2">
                    <AnimatePresence initial={false}>
                      {filteredTodos.map((todo) => (
                        <TodoItem
                          key={todo.id}
                          todo={todo}
                          allTags={allTags}
                          userId={userId}
                          noteCount={links[todo.id]?.length ?? 0}
                          onToggle={onToggleTodo}
                          onDelete={onDeleteTodo}
                          onEdit={onEditTodo}
                          onChangePriority={onChangePriority}
                          onChangeReminder={onChangeReminder}
                          onUpdateSchedule={onUpdateSchedule}
                          onRemoveTag={onRemoveTag}
                          onUpdateTags={onUpdateTags}
                          onAssign={onAssignTodo}
                          onViewNotes={onViewNotesForTodo}
                        />
                      ))}
                    </AnimatePresence>
                  </ul>
                </SortableContext>

                <DragOverlay>
                  {activeDragTodo ? (
                    <div className="rounded-xl border border-primary/40 bg-card p-3 shadow-lg opacity-90">
                      <p className="text-sm font-semibold">{activeDragTodo.text}</p>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          )}

          {/* 2. Notes List */}
          {(streamMode === 'all' || streamMode === 'notes') && unpinnedNotes.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground border-b border-border/40 pb-1">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span>Notes ({unpinnedNotes.length})</span>
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {unpinnedNotes.length}
                </span>
              </div>

              <ul
                className={cn(
                  layoutMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
                    : 'flex flex-col space-y-2'
                )}
              >
                <AnimatePresence initial={false}>
                  {unpinnedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      layoutMode={layoutMode}
                      linkedCount={links[note.id]?.length ?? 0}
                      onOpen={() => onOpenNote(note.id)}
                      onDelete={() => onDeleteNote(note.id)}
                      onTogglePin={() => onTogglePinNote && onTogglePinNote(note.id)}
                      onTogglePrivate={() => onTogglePrivateNote && onTogglePrivateNote(note.id)}
                      onChangeColor={(c) => onChangeNoteColor && onChangeNoteColor(note.id, c)}
                      onChangeScope={(s) => onChangeNoteScope && onChangeNoteScope(note.id, s)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          )}

          {/* Empty State */}
          {filteredTodos.length === 0 && filteredNotes.length === 0 && (
            <EmptyState variant={emptyVariant()} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
