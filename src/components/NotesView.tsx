'use client'

import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  PlusCircle, Search, X, ListTodo, Sparkles, ChevronRight,
  LayoutGrid, List, Pin, Palette, Check, FileText, CornerDownLeft
} from 'lucide-react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import NoteCard, { NOTE_COLOR_CONFIG } from '@/components/NoteCard'
import NoteEditorModal from '@/components/NoteEditorModal'
import AiNoteModal from '@/components/AiNoteModal'
import EmptyState from '@/components/EmptyState'
import type { Note, NoteColor } from '@/hooks/useNotes'
import type { Todo } from '@/components/TodoItem'
import type { NewTodoInput } from '@/hooks/useTodos'
import { cn } from '@/lib/utils'

type NotesViewProps = {
  notes: Note[]
  links: Record<string, string[]>
  todos: Todo[]
  filterTodoId: string | null
  onClearFilter: () => void
  addNote: (title: string, text: string, color?: NoteColor, pinned?: boolean) => void
  updateNote: (id: string, fields: { title?: string; text?: string; color?: NoteColor; pinned?: boolean }) => void
  togglePinNote?: (id: string) => void
  deleteNote: (id: string) => void
  linkTodo: (noteId: string, todoId: string) => void
  unlinkTodo: (noteId: string, todoId: string) => void
  addTodo: (input: NewTodoInput) => Promise<string | null>
}

export default function NotesView({
  notes, links, todos, filterTodoId, onClearFilter,
  addNote, updateNote, togglePinNote, deleteNote, linkTodo, unlinkTodo, addTodo,
}: NotesViewProps) {
  const [aiOpen,         setAiOpen]         = useState(false)
  const [editing,        setEditing]        = useState<'new' | string | null>(null)
  const [search,         setSearch]         = useState('')
  const [layoutMode,     setLayoutMode]     = useState<'grid' | 'list'>('grid')
  const [colorFilter,    setColorFilter]    = useState<NoteColor | 'all'>('all')

  // Inline Quick Note State
  const [quickTitle, setQuickTitle] = useState('')
  const [quickText,  setQuickText]  = useState('')
  const [quickColor, setQuickColor] = useState<NoteColor>('default')

  const filterTodo = filterTodoId ? todos.find((t) => t.id === filterTodoId) ?? null : null

  function handleToggleLink(noteId: string, todoId: string) {
    const linked = links[noteId]?.includes(todoId)
    if (linked) unlinkTodo(noteId, todoId)
    else linkTodo(noteId, todoId)
  }

  async function handleCreateTask(noteId: string, text: string) {
    const todoId = await addTodo({
      text,
      priority:   null,
      dueDate:    null,
      dueTime:    null,
      reminder:   null,
      tags:       [],
      assignedTo: null,
    })
    if (todoId) linkTodo(noteId, todoId)
  }

  const handleQuickCreate = () => {
    if (!quickTitle.trim() && !quickText.trim()) return
    addNote(quickTitle.trim() || 'Quick Note', quickText.trim(), quickColor)
    setQuickTitle('')
    setQuickText('')
    setQuickColor('default')
  }

  const editingNote = typeof editing === 'string' ? notes.find((n) => n.id === editing) ?? null : null

  // Filtered Notes
  const filtered = useMemo(() => {
    let result = notes

    if (filterTodoId) {
      result = result.filter((n) => links[n.id]?.includes(filterTodoId))
    }

    if (colorFilter !== 'all') {
      result = result.filter((n) => (n.color ?? 'default') === colorFilter)
    }

    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter((n) => n.title.toLowerCase().includes(q) || n.text.toLowerCase().includes(q))
    }

    return result
  }, [notes, links, filterTodoId, colorFilter, search])

  // Pinned vs Regular Notes
  const { pinnedNotes, unpinnedNotes } = useMemo(() => {
    const pinned: Note[] = []
    const unpinned: Note[] = []
    filtered.forEach((n) => {
      if (n.pinned) pinned.push(n)
      else unpinned.push(n)
    })
    return { pinnedNotes: pinned, unpinnedNotes: unpinned }
  }, [filtered])

  function emptyVariant() {
    if (search.trim() || filterTodoId || colorFilter !== 'all') return 'no-note-match' as const
    return 'no-notes' as const
  }

  // Time-based shelves for unpinned notes
  const groups = useMemo(() => {
    const isFiltering = !!(search.trim() || filterTodoId || colorFilter !== 'all')
    if (isFiltering) return [{ key: 'results', label: 'All Matching Notes', notes: unpinnedNotes }]

    const now = Date.now()
    const WEEK = 7 * 86_400_000
    const order: string[] = []
    const map = new Map<string, { label: string; notes: Note[] }>()
    for (const n of unpinnedNotes) {
      const recent = now - n.updatedAt < WEEK
      const d = new Date(n.updatedAt)
      const key = recent ? '__recent' : `${d.getFullYear()}-${d.getMonth()}`
      const label = recent ? 'Recent Notes' : format(d, 'MMMM yyyy')
      if (!map.has(key)) { map.set(key, { label, notes: [] }); order.push(key) }
      map.get(key)!.notes.push(n)
    }
    return order.map((k) => ({ key: k, label: map.get(k)!.label, notes: map.get(k)!.notes }))
  }, [unpinnedNotes, search, filterTodoId, colorFilter])

  return (
    <div className="space-y-6">
      {/* ── Quick Inline Note Composer Card ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="rounded-2xl border border-border bg-card p-3.5 shadow-sm space-y-2.5 transition-all focus-within:shadow-md"
      >
        <div className="flex items-center gap-2">
          <Input
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Title (optional)"
            className="h-9 font-semibold text-xs border-transparent bg-transparent focus-visible:ring-0 focus-visible:bg-muted/40 rounded-lg px-2"
          />
          <div className="flex items-center gap-1 shrink-0">
            {/* AI Note Trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAiOpen(true)}
              className="h-8 rounded-xl px-2.5 text-xs"
              title="Compose note with AI"
            >
              <Sparkles className="mr-1 h-3.5 w-3.5 text-primary" />
              AI Note
            </Button>
            {/* Full Editor Modal Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing('new')}
              className="h-8 rounded-xl px-2.5 text-xs"
              title="Open full editor"
            >
              <PlusCircle className="mr-1 h-3.5 w-3.5" />
              Full Editor
            </Button>
          </div>
        </div>

        <textarea
          value={quickText}
          onChange={(e) => setQuickText(e.target.value)}
          placeholder="Take a quick note or paste links…"
          rows={2}
          className="w-full resize-none bg-transparent px-2 text-xs leading-relaxed outline-none placeholder:text-muted-foreground/50"
        />

        {(quickTitle.trim() || quickText.trim()) && (
          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            {/* Color accent selector for quick note */}
            <div className="flex items-center gap-1">
              {(Object.keys(NOTE_COLOR_CONFIG) as NoteColor[]).map((c) => {
                const cfg = NOTE_COLOR_CONFIG[c]
                return (
                  <button
                    key={c}
                    onClick={() => setQuickColor(c)}
                    className={cn(
                      'h-4 w-4 rounded-full border transition-transform hover:scale-110',
                      cfg.border,
                      quickColor === c && 'ring-2 ring-primary'
                    )}
                    title={cfg.label}
                  />
                )
              })}
            </div>

            <Button size="sm" onClick={handleQuickCreate} className="h-7 rounded-lg text-xs px-3">
              <Check className="mr-1 h-3.5 w-3.5" />
              Save Note
            </Button>
          </div>
        )}
      </motion.div>

      {/* ── Toolbar: Search + Layout Switcher + Category Filters ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes…"
              className="h-10 rounded-xl pl-9 pr-9 text-sm"
              aria-label="Search notes"
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

          {/* Grid vs List View Switcher */}
          <div className="flex items-center rounded-xl border border-border bg-card p-0.5 shadow-xs">
            <button
              onClick={() => setLayoutMode('grid')}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                layoutMode === 'grid' ? 'bg-primary text-primary-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setLayoutMode('list')}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                layoutMode === 'list' ? 'bg-primary text-primary-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
              title="List View"
              aria-label="List View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Color Theme Category Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setColorFilter('all')}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all border',
              colorFilter === 'all'
                ? 'border-primary bg-primary/10 text-primary font-semibold'
                : 'border-border text-muted-foreground hover:border-muted-foreground/50'
            )}
          >
            All Notes ({notes.length})
          </button>
          {(Object.keys(NOTE_COLOR_CONFIG) as NoteColor[]).filter(c => c !== 'default').map((c) => {
            const cfg = NOTE_COLOR_CONFIG[c]
            const active = colorFilter === c
            const count = notes.filter((n) => n.color === c).length
            if (count === 0 && !active) return null

            return (
              <button
                key={c}
                onClick={() => setColorFilter(active ? 'all' : c)}
                className={cn(
                  'flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all',
                  active ? cn(cfg.chip, 'border-transparent ring-2 ring-primary/30 font-semibold') : 'border-border text-muted-foreground hover:border-muted-foreground/50'
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', cfg.border)} />
                {cfg.label.split(' / ')[0]}
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            )
          })}
        </div>

        {/* Task filter chip indicator */}
        <AnimatePresence>
          {filterTodo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }} className="overflow-hidden"
            >
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary w-fit">
                <ListTodo className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[16rem]">Showing notes for: {filterTodo.text}</span>
                <button onClick={onClearFilter} aria-label="Clear task filter" className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── PINNED NOTES SECTION ── */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Pin className="h-3.5 w-3.5 fill-current" />
            <span>Pinned Notes ({pinnedNotes.length})</span>
          </div>

          <ul
            className={cn(
              layoutMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
                : 'space-y-2'
            )}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {pinnedNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  layoutMode={layoutMode}
                  linkedCount={links[note.id]?.length ?? 0}
                  onOpen={() => setEditing(note.id)}
                  onDelete={() => deleteNote(note.id)}
                  onTogglePin={() => (togglePinNote ? togglePinNote(note.id) : updateNote(note.id, { pinned: !note.pinned }))}
                  onChangeColor={(c) => updateNote(note.id, { color: c })}
                />
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}

      {/* ── MAIN NOTES SECTION ── */}
      {filtered.length === 0 ? (
        <EmptyState variant={emptyVariant()} />
      ) : (
        <div className="space-y-6">
          {groups.map((g, gi) => {
            if (g.notes.length === 0) return null
            return (
              <div key={g.key} className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground border-b border-border/40 pb-1">
                  <span>{g.label}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {g.notes.length}
                  </span>
                </div>

                <ul
                  className={cn(
                    layoutMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
                      : 'space-y-2'
                  )}
                >
                  <AnimatePresence initial={false} mode="popLayout">
                    {g.notes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        layoutMode={layoutMode}
                        linkedCount={links[note.id]?.length ?? 0}
                        onOpen={() => setEditing(note.id)}
                        onDelete={() => deleteNote(note.id)}
                        onTogglePin={() => (togglePinNote ? togglePinNote(note.id) : updateNote(note.id, { pinned: !note.pinned }))}
                        onChangeColor={(c) => updateNote(note.id, { color: c })}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              </div>
            )
          })}
        </div>
      )}

      {/* Note editor modal */}
      <NoteEditorModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        note={editingNote}
        allTodos={todos}
        linkedIds={editingNote ? (links[editingNote.id] ?? []) : []}
        onCreate={addNote}
        onUpdate={updateNote}
        onDelete={deleteNote}
        onToggleLink={handleToggleLink}
        onCreateTask={handleCreateTask}
      />

      {/* AI note composer */}
      <AiNoteModal open={aiOpen} onClose={() => setAiOpen(false)} addNote={addNote} />
    </div>
  )
}
