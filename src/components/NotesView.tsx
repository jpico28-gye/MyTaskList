'use client'

import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { PlusCircle, Search, X, ListTodo, Sparkles, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import NoteCard from '@/components/NoteCard'
import NoteEditorModal from '@/components/NoteEditorModal'
import AiNoteModal from '@/components/AiNoteModal'
import EmptyState from '@/components/EmptyState'
import type { Note } from '@/hooks/useNotes'
import type { Todo } from '@/components/TodoItem'
import type { NewTodoInput } from '@/hooks/useTodos'

type NotesViewProps = {
  notes: Note[]
  links: Record<string, string[]>
  todos: Todo[]
  filterTodoId: string | null
  onClearFilter: () => void
  addNote: (title: string, text: string) => void
  updateNote: (id: string, fields: { title?: string; text?: string }) => void
  deleteNote: (id: string) => void
  linkTodo: (noteId: string, todoId: string) => void
  unlinkTodo: (noteId: string, todoId: string) => void
  addTodo: (input: NewTodoInput) => Promise<string | null>
}

export default function NotesView({
  notes, links, todos, filterTodoId, onClearFilter,
  addNote, updateNote, deleteNote, linkTodo, unlinkTodo, addTodo,
}: NotesViewProps) {
  const [aiOpen,   setAiOpen]   = useState(false)
  // Editor: null = closed, 'new' = compose, otherwise a note id being edited.
  const [editing,  setEditing]  = useState<'new' | string | null>(null)
  const [search,   setSearch]   = useState('')

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

  const editingNote = typeof editing === 'string' ? notes.find((n) => n.id === editing) ?? null : null

  const filtered = useMemo(() => {
    let result = notes

    if (filterTodoId) {
      result = result.filter((n) => links[n.id]?.includes(filterTodoId))
    }

    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter((n) => n.title.toLowerCase().includes(q) || n.text.toLowerCase().includes(q))
    }

    return result
  }, [notes, links, filterTodoId, search])

  function emptyVariant() {
    if (search.trim() || filterTodoId) return 'no-note-match' as const
    return 'no-notes' as const
  }

  // Group notes into time-based "shelves": Recent (last 7 days), then by month.
  // While searching/filtering, collapse into a single flat results shelf.
  const groups = useMemo(() => {
    const isFiltering = !!(search.trim() || filterTodoId)
    if (isFiltering) return [{ key: 'results', label: 'Results', notes: filtered }]

    const now = Date.now()
    const WEEK = 7 * 86_400_000
    const order: string[] = []
    const map = new Map<string, { label: string; notes: Note[] }>()
    for (const n of filtered) {
      const recent = now - n.updatedAt < WEEK
      const d = new Date(n.updatedAt)
      const key = recent ? '__recent' : `${d.getFullYear()}-${d.getMonth()}`
      const label = recent ? 'Recent' : format(d, 'MMMM yyyy')
      if (!map.has(key)) { map.set(key, { label, notes: [] }); order.push(key) }
      map.get(key)!.notes.push(n)
    }
    return order.map((k) => ({ key: k, label: map.get(k)!.label, notes: map.get(k)!.notes }))
  }, [filtered, search, filterTodoId])

  return (
    <div className="space-y-4">
      {/* ── New note actions ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}
        className="flex gap-2"
      >
        <Button onClick={() => setEditing('new')} className="h-10 flex-1 rounded-xl">
          <PlusCircle className="mr-1.5 h-4 w-4" />
          New note
        </Button>
        <Button
          variant="outline"
          onClick={() => setAiOpen(true)}
          className="h-10 rounded-xl px-3"
          title="Compose a note with AI"
        >
          <Sparkles className="mr-1.5 h-4 w-4 text-primary" />
          AI note
        </Button>
      </motion.div>

      {/* ── Search bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}
        className="relative"
      >
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
      </motion.div>

      {/* ── Task filter chip ── */}
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

      {/* ── Notes shelves (horizontal cards, grouped by recency) ── */}
      {filtered.length === 0 ? (
        <EmptyState variant={emptyVariant()} />
      ) : (
        <div className="space-y-4">
          {groups.map((g, gi) => (
            <details key={g.key} open={gi === 0} className="group/shelf">
              <summary className="flex cursor-pointer select-none list-none items-center gap-1.5 [&::-webkit-details-marker]:hidden">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open/shelf:rotate-90" />
                <span className="text-xs font-semibold text-foreground">{g.label}</span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {g.notes.length}
                </span>
              </summary>
              <ul className="mt-2 flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
                <AnimatePresence initial={false} mode="popLayout">
                  {g.notes.map((note) => (
                    <NoteCard
                      key={note.id}
                      className="w-[16rem] shrink-0 snap-start"
                      note={note}
                      linkedCount={links[note.id]?.length ?? 0}
                      onOpen={() => setEditing(note.id)}
                      onDelete={() => deleteNote(note.id)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </details>
          ))}
        </div>
      )}

      {/* Note editor (view / edit / compose) */}
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
