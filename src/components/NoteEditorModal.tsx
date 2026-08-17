'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { Trash2, X, Check, Pin, Palette, FileText, Lock, EyeOff, Briefcase, Home, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import TaskLinkPicker from '@/components/TaskLinkPicker'
import type { Note, NoteColor, NoteScope } from '@/hooks/useNotes'
import type { Todo } from '@/components/TodoItem'
import { NOTE_COLOR_CONFIG, getReadingTime } from '@/components/NoteCard'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type NoteEditorModalProps = {
  open: boolean
  onClose: () => void
  /** The note being edited, or null to compose a new one. */
  note: Note | null
  allTodos: Todo[]
  linkedIds: string[]
  onCreate: (title: string, text: string, color?: NoteColor, pinned?: boolean, scope?: NoteScope, isPrivate?: boolean) => void
  onUpdate: (id: string, fields: { title?: string; text?: string; color?: NoteColor; scope?: NoteScope; pinned?: boolean; isPrivate?: boolean }) => void
  onDelete: (id: string) => void
  onToggleLink: (noteId: string, todoId: string) => void
  onCreateTask: (noteId: string, text: string) => Promise<void>
}

export default function NoteEditorModal({
  open, onClose, note, allTodos, linkedIds,
  onCreate, onUpdate, onDelete, onToggleLink, onCreateTask,
}: NoteEditorModalProps) {
  const [mounted, setMounted] = useState(false)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [color, setColor] = useState<NoteColor>('default')
  const [scope, setScope] = useState<NoteScope>('general')
  const [pinned, setPinned] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)

  const isNew = note === null

  useEffect(() => setMounted(true), [])

  // Seed local state whenever the modal opens (or the note changes).
  useEffect(() => {
    if (!open) return
    setTitle(note?.title ?? '')
    setText(note?.text ?? '')
    setColor(note?.color ?? 'default')
    setScope(note?.scope ?? 'general')
    setPinned(Boolean(note?.pinned))
    setIsPrivate(Boolean(note?.isPrivate))
  }, [open, note])

  // Latest values for commit-on-close without re-running the effect each keystroke.
  const latest = useRef({ title, text, color, scope, pinned, isPrivate })
  latest.current = { title, text, color, scope, pinned, isPrivate }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // ── existing note: persist changes ──
  function commit() {
    if (isNew || !note) return
    const t = latest.current.title.trim()
    const b = latest.current.text
    const c = latest.current.color
    const s = latest.current.scope
    const p = latest.current.pinned
    const prv = latest.current.isPrivate

    const fields: { title?: string; text?: string; color?: NoteColor; scope?: NoteScope; pinned?: boolean; isPrivate?: boolean } = {}
    if (t !== note.title) fields.title = t
    if (b !== note.text) fields.text = b
    if (c !== note.color) fields.color = c
    if (s !== note.scope) fields.scope = s
    if (p !== note.pinned) fields.pinned = p
    if (prv !== note.isPrivate) fields.isPrivate = prv

    if (Object.keys(fields).length > 0) onUpdate(note.id, fields)
  }

  function handleClose() {
    commit()
    onClose()
  }

  function handleCreate() {
    if (!title.trim() && !text.trim()) { onClose(); return }
    onCreate(title.trim(), text, color, pinned, scope, isPrivate)
    onClose()
  }

  const readingStats = useMemo(() => getReadingTime(text), [text])
  const colorCfg = NOTE_COLOR_CONFIG[color]

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
        >
          <button aria-label="Close" onClick={handleClose} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

          <motion.div
            role="dialog" aria-modal="true" aria-label={isNew ? 'New note' : 'Edit note'}
            initial={{ y: '4%', opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '4%', opacity: 0.4 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className={cn(
              'relative flex max-h-[92vh] w-full flex-col rounded-t-3xl border shadow-2xl sm:max-h-[85vh] sm:max-w-2xl sm:rounded-2xl transition-colors',
              colorCfg.card
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {isNew ? 'New Note' : note && `Updated ${formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}`}
                </span>
                <span className="text-xs text-muted-foreground/40">•</span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  {readingStats}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Private / Hide Toggle */}
                <button
                  onClick={() => {
                    const next = !isPrivate
                    setIsPrivate(next)
                    if (!isNew && note) onUpdate(note.id, { isPrivate: next })
                  }}
                  className={cn(
                    'flex h-7 px-2 items-center gap-1 rounded-lg text-xs font-medium transition-colors',
                    isPrivate
                      ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  title={isPrivate ? 'Private / Hidden Note' : 'Make Private'}
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>{isPrivate ? 'Private' : 'Public'}</span>
                </button>

                {/* Pin Toggle */}
                <button
                  onClick={() => {
                    setPinned(!pinned)
                    if (!isNew && note) onUpdate(note.id, { pinned: !pinned })
                  }}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                    pinned
                      ? 'text-amber-500 bg-amber-500/10'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  title={pinned ? 'Unpin note' : 'Pin note'}
                >
                  <Pin className={cn('h-3.5 w-3.5', pinned && 'fill-current')} />
                </button>

                {/* Color Selector */}
                <Popover>
                  <PopoverTrigger
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title="Change theme color"
                  >
                    <Palette className="h-3.5 w-3.5" />
                  </PopoverTrigger>
                  <PopoverContent className="w-44 p-1.5" align="end">
                    <div className="grid grid-cols-3 gap-1">
                      {(Object.keys(NOTE_COLOR_CONFIG) as NoteColor[]).map((c) => {
                        const cfg = NOTE_COLOR_CONFIG[c]
                        return (
                          <button
                            key={c}
                            onClick={() => {
                              setColor(c)
                              if (!isNew && note) onUpdate(note.id, { color: c })
                            }}
                            className={cn(
                              'flex h-7 w-full items-center justify-center rounded-lg border text-[10px] font-medium transition-transform hover:scale-105',
                              cfg.card,
                              color === c && 'ring-2 ring-primary/40'
                            )}
                            title={cfg.label}
                          >
                            <span className={cn('h-2 w-2 rounded-full', cfg.border)} />
                          </button>
                        )
                      })}
                    </div>
                  </PopoverContent>
                </Popover>

                <button onClick={handleClose} aria-label="Close"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scope / Context Selector Row */}
            <div className="flex items-center gap-1.5 px-4 pt-2.5">
              <span className="text-[11px] font-medium text-muted-foreground">Scope:</span>
              <button
                onClick={() => {
                  setScope('general')
                  if (!isNew && note) onUpdate(note.id, { scope: 'general' })
                }}
                className={cn(
                  'flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border transition-colors',
                  scope === 'general'
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                <Globe className="h-3 w-3" /> General
              </button>
              <button
                onClick={() => {
                  setScope('work')
                  if (!isNew && note) onUpdate(note.id, { scope: 'work' })
                }}
                className={cn(
                  'flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border transition-colors',
                  scope === 'work'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                <Briefcase className="h-3 w-3" /> Work 💼
              </button>
              <button
                onClick={() => {
                  setScope('personal')
                  if (!isNew && note) onUpdate(note.id, { scope: 'personal' })
                }}
                className={cn(
                  'flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border transition-colors',
                  scope === 'personal'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                <Home className="h-3 w-3" /> Personal 🏠
              </button>
            </div>

            {/* Body */}
            <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pt-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={commit}
                placeholder="Title"
                className="w-full bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground/50"
              />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={commit}
                placeholder="Write your note thoughts, ideas, or links…"
                autoFocus={isNew}
                className="scroll-clean min-h-[40vh] flex-1 resize-none overflow-y-auto bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Linked tasks (existing notes only) */}
            {!isNew && note && (
              <div className="border-t border-border/60 px-4 py-2.5">
                <TaskLinkPicker
                  allTodos={allTodos}
                  linkedIds={linkedIds}
                  onToggle={(todoId) => onToggleLink(note.id, todoId)}
                  onCreateTask={(text) => onCreateTask(note.id, text)}
                />
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 border-t border-border/60 px-4 py-3">
              {isNew ? (
                <>
                  <Button variant="ghost" size="sm" className="rounded-lg" onClick={onClose}>Cancel</Button>
                  <Button size="sm" className="rounded-lg" onClick={handleCreate} disabled={!title.trim() && !text.trim()}>
                    <Check className="mr-1 h-4 w-4" />
                    Create note
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost" size="sm"
                    className="rounded-lg text-muted-foreground hover:text-destructive"
                    onClick={() => { if (note) onDelete(note.id); onClose() }}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                  </Button>
                  <Button size="sm" className="rounded-lg" onClick={handleClose}>Done</Button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
