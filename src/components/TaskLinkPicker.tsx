'use client'

import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link2, X, Check, ListTodo, PlusCircle } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { Todo } from '@/components/TodoItem'

type TaskLinkPickerProps = {
  /** All of the user's tasks, available to link. */
  allTodos: Todo[]
  /** Ids of tasks currently linked to this note. */
  linkedIds: string[]
  onToggle: (todoId: string) => void
  /** Create a new task with this text and link it to the note. */
  onCreateTask?: (text: string) => Promise<void>
}

export default function TaskLinkPicker({ allTodos, linkedIds, onToggle, onCreateTask }: TaskLinkPickerProps) {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [creating, setCreating] = useState(false)
  const inputRef              = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else setQuery('')
  }, [open])

  const linkedTodos = allTodos.filter((t) => linkedIds.includes(t.id))

  const q = query.trim().toLowerCase()
  const candidates = allTodos.filter((t) => t.text.toLowerCase().includes(q))
  const exactMatch = allTodos.some((t) => t.text.toLowerCase() === q)

  async function handleCreateTask() {
    const text = query.trim()
    if (!text || !onCreateTask || creating) return
    setCreating(true)
    try {
      await onCreateTask(text)
      setQuery('')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {/* Linked task chips */}
      <AnimatePresence initial={false}>
        {linkedTodos.map((todo) => (
          <motion.span
            key={todo.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.12 }}
            className="inline-flex max-w-[12rem] items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
            title={todo.text}
          >
            <ListTodo className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{todo.text}</span>
            <button
              onClick={() => onToggle(todo.id)}
              aria-label={`Unlink "${todo.text}"`}
              className="ml-0.5 shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>

      {/* Picker trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            'flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all',
            linkedTodos.length > 0
              ? 'border-transparent bg-muted text-foreground'
              : 'border-border text-muted-foreground hover:border-muted-foreground/50'
          )}
          aria-label="Link tasks"
        >
          <Link2 className="h-3 w-3" />
          {linkedTodos.length === 0 ? 'Link task' : 'Link more'}
        </PopoverTrigger>

        <PopoverContent align="start" className="w-64 p-2 space-y-2">
          <div className="relative">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={onCreateTask ? 'Search or create a task…' : 'Search tasks…'}
              onKeyDown={(e) => { if (e.key === 'Enter' && q && candidates.length === 0) handleCreateTask() }}
              className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            />
          </div>

          {candidates.length > 0 ? (
            <div className="max-h-56 space-y-0.5 overflow-y-auto">
              {candidates.map((todo) => {
                const linked = linkedIds.includes(todo.id)
                return (
                  <button
                    key={todo.id}
                    onClick={() => onToggle(todo.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-muted transition-colors"
                  >
                    <span className={cn('truncate', todo.completed && 'text-muted-foreground line-through')}>
                      {todo.text}
                    </span>
                    {linked && <Check className="h-3 w-3 shrink-0 text-primary" />}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="px-2 py-2 text-center text-xs text-muted-foreground">
              {q ? 'No matching tasks.' : 'No tasks yet.'}
            </p>
          )}

          {/* Create-on-the-fly */}
          {onCreateTask && q && !exactMatch && (
            <button
              onClick={handleCreateTask}
              disabled={creating}
              className="flex w-full items-center gap-1.5 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-left text-xs text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
            >
              <PlusCircle className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {creating ? 'Creating…' : `Create task "${query.trim()}"`}
              </span>
            </button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
