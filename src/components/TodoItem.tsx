'use client'

import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Pencil, Trash2, Check, X, CalendarDays, GripVertical, Bell, BellOff } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { format, isPast, isToday, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { tagColorClass } from '@/lib/tags'
import { formatTime } from '@/lib/nlp'
import { REMINDER_OPTIONS, type ReminderMinutes } from '@/lib/reminders'

// ─── types ────────────────────────────────────────────────────────────────────

export type Priority = 'low' | 'medium' | 'high'

export type Todo = {
  id: string
  text: string
  completed: boolean
  createdAt: number
  priority: Priority | null
  dueDate: string | null   // "YYYY-MM-DD"
  dueTime: string | null   // "HH:MM" 24-h, optional
  reminder: number | null  // minutes before due; null = no reminder
  tags: string[]
}

export const PRIORITY_CONFIG: Record<
  Priority,
  {
    label: string
    dot: string
    border: string
    chip: string
    cardBg: string
    next: Priority | null
  }
> = {
  low: {
    label: 'Low',
    dot: 'bg-sky-400',
    border: 'border-l-sky-400',
    chip: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    cardBg: '',
    next: 'medium',
  },
  medium: {
    label: 'Med',
    dot: 'bg-amber-400',
    border: 'border-l-amber-400',
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    cardBg: 'bg-amber-50/60 dark:bg-amber-950/10',
    next: 'high',
  },
  high: {
    label: 'High',
    dot: 'bg-rose-500',
    border: 'border-l-rose-500',
    chip: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    cardBg: 'bg-rose-50/70 dark:bg-rose-950/20',
    next: null,
  },
}

// ─── confetti ─────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#a78bfa', '#f472b6']
const PARTICLES = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2
  const r = i % 2 === 0 ? 32 : 22
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r, color: CONFETTI_COLORS[i % CONFETTI_COLORS.length], size: i % 3 === 0 ? 5 : 4 }
})

function ConfettiBurst({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      {PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={{ x: p.x, y: p.y, scale: 0, opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * 0.012 }}
          className="absolute rounded-full"
          style={{ width: p.size, height: p.size, backgroundColor: p.color, marginLeft: -p.size / 2, marginTop: -p.size / 2 }}
        />
      ))}
    </div>
  )
}

// ─── component ────────────────────────────────────────────────────────────────

type TodoItemProps = {
  todo: Todo
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (id: string, text: string) => void
  onChangePriority: (id: string, priority: Priority | null) => void
  onRemoveTag: (id: string, tag: string) => void
  onChangeReminder: (id: string, reminder: ReminderMinutes) => void
  isDraggable?: boolean
}

export default function TodoItem({
  todo,
  onToggle,
  onDelete,
  onEdit,
  onChangePriority,
  onRemoveTag,
  onChangeReminder,
  isDraggable = false,
}: TodoItemProps) {
  const [isEditing,     setIsEditing]     = useState(false)
  const [editValue,     setEditValue]     = useState(todo.text)
  const [showConfetti,  setShowConfetti]  = useState(false)
  const [reminderOpen,  setReminderOpen]  = useState(false)
  const prevCompleted = useRef(todo.completed)
  const inputRef = useRef<HTMLInputElement>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.id, disabled: !isDraggable })

  const dndStyle = { transform: CSS.Transform.toString(transform), transition }

  useEffect(() => {
    if (!prevCompleted.current && todo.completed) {
      setShowConfetti(true)
      const t = setTimeout(() => setShowConfetti(false), 650)
      return () => clearTimeout(t)
    }
    prevCompleted.current = todo.completed
  }, [todo.completed])

  useEffect(() => { if (isEditing) { inputRef.current?.focus(); inputRef.current?.select() } }, [isEditing])
  useEffect(() => { setEditValue(todo.text) }, [todo.text])

  function commitEdit() {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== todo.text) onEdit(todo.id, trimmed)
    else setEditValue(todo.text)
    setIsEditing(false)
  }

  function cancelEdit() { setEditValue(todo.text); setIsEditing(false) }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') cancelEdit()
  }

  function cyclePriority() {
    if (!todo.priority) onChangePriority(todo.id, 'low')
    else onChangePriority(todo.id, PRIORITY_CONFIG[todo.priority].next)
  }

  const cfg = todo.priority ? PRIORITY_CONFIG[todo.priority] : null

  const dueDateLabel = (() => {
    if (!todo.dueDate) return null
    const d = parseISO(todo.dueDate)
    const timeStr = todo.dueTime ? ` · ${formatTime(todo.dueTime)}` : ''
    if (isToday(d)) return { text: `Today${timeStr}`, overdue: false }
    if (!todo.completed && isPast(d)) return { text: `Overdue · ${format(d, 'MMM d')}${timeStr}`, overdue: true }
    return { text: `${format(d, 'MMM d')}${timeStr}`, overdue: false }
  })()

  return (
    <motion.li
      ref={setNodeRef}
      style={dndStyle}
      {...attributes}
      layout
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: isDragging ? 0.4 : 1, y: 0, scale: isDragging ? 1.02 : 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl border border-border shadow-sm',
        'border-l-4 pl-2 pr-4 py-3 transition-colors duration-300',
        cfg ? cfg.border : 'border-l-border',
        cfg ? cfg.cardBg : 'bg-card',
        todo.completed && 'opacity-70',
        isDragging && 'z-50 shadow-xl ring-2 ring-primary/20'
      )}
    >
      <ConfettiBurst show={showConfetti} />

      {isDraggable && (
        <button {...listeners} aria-label="Drag to reorder"
          className="touch-none cursor-grab active:cursor-grabbing shrink-0 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100">
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      <button onClick={cyclePriority}
        aria-label={`Priority: ${todo.priority ?? 'none'}. Click to cycle.`}
        title={`Priority: ${todo.priority ?? 'none'} — click to change`}
        className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-110',
          cfg ? cfg.dot : 'border border-dashed border-muted-foreground/40 bg-transparent')} />

      <motion.button onClick={() => onToggle(todo.id)}
        aria-label={todo.completed ? 'Mark incomplete' : 'Mark complete'}
        whileTap={{ scale: 0.85 }}
        className={cn('relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200',
          todo.completed ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40 hover:border-primary')}>
        <AnimatePresence>
          {todo.completed && (
            <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
              <Check className="h-3 w-3" strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {isEditing ? (
        <div className="flex flex-1 items-center gap-2">
          <Input ref={inputRef} value={editValue} onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown} onBlur={commitEdit} className="h-8 flex-1 text-sm" />
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={commitEdit} aria-label="Save">
            <Check className="h-4 w-4 text-primary" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={cancelEdit} aria-label="Cancel">
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-1 flex-col gap-1 min-w-0">
            <span className="relative inline-block">
              <span className={cn('break-words text-sm leading-snug transition-colors duration-300',
                todo.completed ? 'text-muted-foreground' : 'text-foreground')}
                onDoubleClick={() => !todo.completed && setIsEditing(true)}>
                {todo.text}
              </span>
              <AnimatePresence>
                {todo.completed && (
                  <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} exit={{ scaleX: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="pointer-events-none absolute left-0 top-[52%] h-[1.5px] w-full origin-left -translate-y-1/2 rounded-full bg-muted-foreground/50" />
                )}
              </AnimatePresence>
            </span>

            {(todo.tags.length > 0 || dueDateLabel || (todo.reminder !== null && todo.reminder !== undefined)) && (
              <div className="flex flex-wrap items-center gap-1">
                {todo.tags.map((tag) => (
                  <span key={tag}
                    className={cn('group/tag inline-flex items-center gap-0.5 rounded-full px-1.5 py-0 text-[10px] font-medium cursor-pointer select-none', tagColorClass(tag))}
                    onClick={() => onRemoveTag(todo.id, tag)} title={`Remove #${tag}`}>
                    #{tag}
                    <X className="h-2 w-2 opacity-0 group-hover/tag:opacity-100 transition-opacity" />
                  </span>
                ))}

                {dueDateLabel && (
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0 text-[10px] font-medium',
                    dueDateLabel.overdue ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-muted text-muted-foreground')}>
                    <CalendarDays className="h-2.5 w-2.5" />
                    {dueDateLabel.text}
                  </span>
                )}

                {todo.reminder !== null && todo.reminder !== undefined && todo.dueDate && !todo.completed && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-1.5 py-0 text-[10px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                    <Bell className="h-2.5 w-2.5" />
                    {todo.reminder === 0 ? 'On time' : todo.reminder === 60 ? '1h' : todo.reminder === 1440 ? '1d' : `${todo.reminder}m`}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            {!todo.completed && todo.dueDate && (
              <Popover open={reminderOpen} onOpenChange={setReminderOpen}>
                <PopoverTrigger
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-accent',
                    todo.reminder !== null
                      ? 'text-violet-500 dark:text-violet-400'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  aria-label="Set reminder"
                >
                  {todo.reminder !== null
                    ? <Bell className="h-3.5 w-3.5" />
                    : <BellOff className="h-3.5 w-3.5" />}
                </PopoverTrigger>
                <PopoverContent className="w-44 p-1.5" align="end">
                  <div className="space-y-0.5">
                    {REMINDER_OPTIONS.map((opt) => (
                      <button
                        key={String(opt.value)}
                        onClick={() => { onChangeReminder(todo.id, opt.value as ReminderMinutes); setReminderOpen(false) }}
                        className={cn(
                          'w-full rounded-lg px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted',
                          todo.reminder === opt.value && 'bg-muted font-medium'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            {!todo.completed && (
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setIsEditing(true)} aria-label="Edit task">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(todo.id)} aria-label="Delete task">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </>
      )}
    </motion.li>
  )
}
