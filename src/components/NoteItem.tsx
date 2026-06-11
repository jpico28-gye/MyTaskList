'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import TaskLinkPicker from '@/components/TaskLinkPicker'
import { cn } from '@/lib/utils'
import type { Note } from '@/hooks/useNotes'
import type { Todo } from '@/components/TodoItem'

type NoteItemProps = {
  note: Note
  allTodos: Todo[]
  linkedIds: string[]
  onUpdate: (id: string, fields: { title?: string; text?: string }) => void
  onDelete: (id: string) => void
  onToggleLink: (noteId: string, todoId: string) => void
  onCreateTask: (noteId: string, text: string) => Promise<void>
}

export default function NoteItem({ note, allTodos, linkedIds, onUpdate, onDelete, onToggleLink, onCreateTask }: NoteItemProps) {
  const [title, setTitle] = useState(note.title)
  const [text,  setText]  = useState(note.text)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const textRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { setTitle(note.title) }, [note.title])
  useEffect(() => { setText(note.text) }, [note.text])

  useEffect(() => {
    if (isEditingTitle) { titleRef.current?.focus(); titleRef.current?.select() }
  }, [isEditingTitle])

  // auto-resize the textarea to fit its content
  useEffect(() => {
    const el = textRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [text])

  function commitTitle() {
    const trimmed = title.trim()
    if (trimmed !== note.title) onUpdate(note.id, { title: trimmed })
    setTitle(trimmed)
    setIsEditingTitle(false)
  }

  function commitText() {
    if (text !== note.text) onUpdate(note.id, { text })
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="group rounded-xl border border-border bg-card p-3 shadow-sm space-y-2"
    >
      {/* ── Title row ── */}
      <div className="flex items-start gap-2">
        {isEditingTitle ? (
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitle()
              if (e.key === 'Escape') { setTitle(note.title); setIsEditingTitle(false) }
            }}
            placeholder="Untitled note"
            className="h-7 flex-1 rounded-lg border border-border bg-background px-2 text-sm font-semibold outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          />
        ) : (
          <h3
            onClick={() => setIsEditingTitle(true)}
            title="Click to edit title"
            className={cn(
              'flex-1 cursor-text break-words rounded-lg text-sm font-semibold leading-snug transition-colors hover:bg-muted/50',
              !note.title && 'text-muted-foreground/60 italic'
            )}
          >
            {note.title || 'Untitled note'}
          </h3>
        )}

        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 group-focus-within:opacity-100"
          onClick={() => onDelete(note.id)}
          aria-label="Delete note"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* ── Body ── */}
      <textarea
        ref={textRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commitText}
        placeholder="Write a note…"
        rows={2}
        className="w-full resize-none break-words rounded-lg border-none bg-transparent text-sm leading-snug text-foreground outline-none placeholder:text-muted-foreground/50"
      />

      {/* ── Linked tasks ── */}
      <TaskLinkPicker
        allTodos={allTodos}
        linkedIds={linkedIds}
        onToggle={(todoId) => onToggleLink(note.id, todoId)}
        onCreateTask={(text) => onCreateTask(note.id, text)}
      />

      {/* ── Timestamp ── */}
      <p className="text-[10px] text-muted-foreground">
        Updated {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
      </p>
    </motion.li>
  )
}
