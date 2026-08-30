'use client'

import { useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ListTodo, FileText, Sparkles, PlusCircle, Calendar, Clock, Bell, Check, Palette, Lock, Briefcase, Home, X
} from 'lucide-react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import TagPicker from '@/components/TagPicker'
import DueDatePicker from '@/components/DueDatePicker'
import MicButton from '@/components/MicButton'
import { NOTE_COLOR_CONFIG } from '@/components/NoteCard'
import { PRIORITY_CONFIG } from '@/components/TodoItem'
import { REMINDER_OPTIONS } from '@/lib/reminders'
import type { Priority, ReminderMinutes } from '@/hooks/useTodos'
import type { NoteColor, NoteScope } from '@/hooks/useNotes'
import type { NewTodoInput } from '@/hooks/useTodos'
import { parseNaturalInput, toTimeStr } from '@/lib/nlp'
import { cn } from '@/lib/utils'

function pad2(n: number) { return String(n).padStart(2, '0') }
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
function parseTagsFromText(raw: string): { text: string; tags: string[] } {
  const tags: string[] = []
  const text = raw.replace(/#([\w-]+)/g, (_, tag) => {
    tags.push(tag.toLowerCase())
    return ''
  }).replace(/\s+/g, ' ').trim()
  return { text: text || raw.trim(), tags }
}

type UnifiedComposerProps = {
  selectedDay: Date | null
  existingTags: string[]
  permission: NotificationPermission
  onRequestPermission: () => void
  onAddTodo: (input: NewTodoInput) => Promise<string | null>
  onAddNote: (title: string, text: string, color?: NoteColor, pinned?: boolean, scope?: NoteScope, isPrivate?: boolean) => void
  onOpenAiNoteModal: () => void
  onOpenAiTaskModal: () => void
  onOpenFullNoteEditor: () => void
}

export default function UnifiedComposer({
  selectedDay,
  existingTags,
  permission,
  onRequestPermission,
  onAddTodo,
  onAddNote,
  onOpenAiNoteModal,
  onOpenAiTaskModal,
  onOpenFullNoteEditor,
}: UnifiedComposerProps) {
  // Mode: 'task' vs 'note'
  const [mode, setMode] = useState<'task' | 'note'>('task')

  // Common input string
  const [textInput, setTextInput] = useState('')

  // Task extras
  const [pendingPriority, setPendingPriority] = useState<Priority | null>(null)
  const [pendingDate,     setPendingDate]     = useState<Date | undefined>(undefined)
  const [pendingTime,     setPendingTime]     = useState<string | null>(null)
  const [pendingReminder, setPendingReminder] = useState<ReminderMinutes>(null)
  const [pendingTags,     setPendingTags]     = useState<string[]>([])
  const [dueOpen,         setDueOpen]         = useState(false)
  const [reminderOpen,    setReminderOpen]    = useState(false)

  // Note extras
  const [noteTitle,   setNoteTitle]   = useState('')
  const [noteColor,   setNoteColor]   = useState<NoteColor>('default')
  const [noteScope,   setNoteScope]   = useState<NoteScope>('general')
  const [notePrivate, setNotePrivate] = useState(false)

  const taskInputRef = useRef<HTMLInputElement>(null)

  // NLP parsing for task mode
  const nlp = useMemo(() => {
    const raw = textInput.trim()
    if (!raw || pendingDate || mode !== 'task') return null
    const result = parseNaturalInput(raw)
    return result.date ? result : null
  }, [textInput, pendingDate, mode])

  const nlpPreviewLabel = useMemo(() => {
    if (!nlp || !nlp.date) return null
    return format(nlp.date, nlp.hasTime ? 'EEE MMM d, h:mm a' : 'EEE MMM d')
  }, [nlp])

  const handleCreateTask = async () => {
    const raw = textInput.trim()
    if (!raw) return

    const resolvedDate = pendingDate ?? nlp?.date ?? (selectedDay ?? undefined)
    const resolvedTime = pendingTime ?? (nlp?.hasTime && nlp.date ? toTimeStr(nlp.date) : null)

    const textAfterNlp = nlp?.date ? nlp.text : raw
    const { text, tags: typedTags } = parseTagsFromText(textAfterNlp)
    if (!text) return
    const mergedTags = [...new Set([...pendingTags, ...typedTags])]

    await onAddTodo({
      text,
      priority:   pendingPriority,
      dueDate:    resolvedDate ? toDateStr(resolvedDate) : null,
      dueTime:    resolvedTime,
      reminder:   pendingReminder,
      tags:       mergedTags,
      assignedTo: null,
    })

    setTextInput('')
    setPendingPriority(null)
    setPendingDate(undefined)
    setPendingTime(null)
    setPendingReminder(null)
    setPendingTags([])
  }

  const handleCreateNote = () => {
    if (!noteTitle.trim() && !textInput.trim()) return
    onAddNote(
      noteTitle.trim() || 'Untitled Note',
      textInput.trim(),
      noteColor,
      false,
      noteScope,
      notePrivate
    )

    setNoteTitle('')
    setTextInput('')
    setNoteColor('default')
    setNoteScope('general')
    setNotePrivate(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-border bg-card p-3.5 shadow-sm space-y-3 transition-all focus-within:shadow-md"
    >
      {/* Top Header Row: Mode Switcher + AI Generator Trigger */}
      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
        {/* Mode Selector Pill */}
        <div className="flex items-center rounded-xl bg-muted/60 p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setMode('task')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all duration-200',
              mode === 'task'
                ? 'bg-primary text-primary-foreground shadow-xs scale-102'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ListTodo className="h-3.5 w-3.5" />
            <span>Task 📋</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('note')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all duration-200',
              mode === 'note'
                ? 'bg-primary text-primary-foreground shadow-xs scale-102'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Note 📝</span>
          </button>
        </div>

        {/* Quick Action Extras */}
        <div className="flex items-center gap-1.5">
          {mode === 'task' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenAiTaskModal}
              className="h-8 rounded-xl px-2.5 text-xs"
              title="Create tasks with AI"
            >
              <Sparkles className="mr-1 h-3.5 w-3.5 text-primary" />
              AI Tasks
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenAiNoteModal}
                className="h-8 rounded-xl px-2.5 text-xs"
                title="Compose note with AI"
              >
                <Sparkles className="mr-1 h-3.5 w-3.5 text-primary" />
                AI Note
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenFullNoteEditor}
                className="h-8 rounded-xl px-2.5 text-xs"
                title="Open full editor modal"
              >
                <PlusCircle className="mr-1 h-3.5 w-3.5" />
                Full Editor
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Input Area */}
      <AnimatePresence mode="wait">
        {mode === 'task' ? (
          <motion.div
            key="task-inputs"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="space-y-2.5"
          >
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  ref={taskInputRef}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                  placeholder={
                    selectedDay
                      ? `Add task for ${format(selectedDay, 'EEE MMM d')}…`
                      : 'Try "Submit report tomorrow at 2pm #work"'
                  }
                  className="h-10 w-full rounded-xl pr-10 text-sm font-medium"
                  aria-label="New task input"
                />
                <MicButton
                  onTranscript={(t) => setTextInput((prev) => (prev ? `${prev.trimEnd()} ${t}` : t))}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2"
                />
              </div>

              <Button
                onClick={handleCreateTask}
                disabled={!textInput.trim()}
                className="h-10 rounded-xl px-4 shrink-0 font-semibold"
              >
                <PlusCircle className="mr-1.5 h-4 w-4" />
                Add Task
              </Button>
            </div>

            {/* NLP preview */}
            <AnimatePresence>
              {nlpPreviewLabel && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] text-primary dark:bg-primary/20">
                    <Sparkles className="h-3 w-3 shrink-0" />
                    <span>Detected: <strong>{nlpPreviewLabel}</strong></span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tag picker */}
            <TagPicker existingTags={existingTags} selected={pendingTags} onChange={setPendingTags} />

            {/* Priority + date + reminder pickers */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Priority Popover */}
              <Popover>
                <PopoverTrigger className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground transition-colors">
                  <span className={cn('h-2 w-2 rounded-full', pendingPriority ? PRIORITY_CONFIG[pendingPriority].dot : 'bg-muted-foreground/40')} />
                  <span>{pendingPriority ? PRIORITY_CONFIG[pendingPriority].label : 'Priority'}</span>
                </PopoverTrigger>
                <PopoverContent className="w-36 p-1.5" align="start">
                  <div className="flex flex-col gap-1">
                    <button type="button" onClick={() => setPendingPriority(null)} className="rounded-lg px-2 py-1 text-left text-xs hover:bg-muted font-medium">None</button>
                    <button type="button" onClick={() => setPendingPriority('low')} className="rounded-lg px-2 py-1 text-left text-xs hover:bg-muted flex items-center gap-2 font-medium"><span className="h-2 w-2 rounded-full bg-sky-400"/>Low</button>
                    <button type="button" onClick={() => setPendingPriority('medium')} className="rounded-lg px-2 py-1 text-left text-xs hover:bg-muted flex items-center gap-2 font-medium"><span className="h-2 w-2 rounded-full bg-amber-400"/>Medium</button>
                    <button type="button" onClick={() => setPendingPriority('high')} className="rounded-lg px-2 py-1 text-left text-xs hover:bg-muted flex items-center gap-2 font-medium"><span className="h-2 w-2 rounded-full bg-rose-500"/>High</button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Due date picker button */}
              <button
                type="button"
                onClick={() => setDueOpen(true)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  pendingDate
                    ? 'border-primary/50 bg-primary/10 text-primary font-semibold'
                    : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
                )}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {pendingDate
                    ? `${format(pendingDate, 'MMM d')}${pendingTime ? ` ${pendingTime}` : ''}`
                    : selectedDay
                      ? format(selectedDay, 'EEE MMM d')
                      : 'Due date'}
                </span>
                {pendingDate && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      setPendingDate(undefined)
                      setPendingTime(null)
                    }}
                    className="ml-0.5 rounded-full hover:bg-primary/20"
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </button>

              {/* Reminder Popover */}
              <Popover>
                <PopoverTrigger
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    pendingReminder !== null
                      ? 'border-violet-400 bg-violet-500/10 text-violet-600 dark:text-violet-300 font-semibold'
                      : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
                  )}
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span>{pendingReminder !== null ? `Remind ${pendingReminder}m before` : 'Reminder'}</span>
                  {pendingReminder !== null && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation()
                        setPendingReminder(null)
                      }}
                      className="ml-0.5 rounded-full hover:bg-violet-500/20"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  )}
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1.5" align="start">
                  <div className="flex flex-col gap-1">
                    <button type="button" onClick={() => setPendingReminder(null)} className="rounded-lg px-2 py-1 text-left text-xs hover:bg-muted font-medium">No reminder</button>
                    {REMINDER_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPendingReminder(opt.value)}
                        className="rounded-lg px-2 py-1 text-left text-xs hover:bg-muted font-medium"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Enable notifications nudge */}
              {permission === 'default' && (pendingDate || nlp?.date) && (
                <button
                  type="button"
                  onClick={onRequestPermission}
                  className="flex items-center gap-1 rounded-full border border-dashed border-violet-300 px-2.5 py-0.5 text-[11px] font-medium text-violet-500 transition-colors hover:border-violet-400 dark:border-violet-700 dark:text-violet-400"
                >
                  <Bell className="h-3 w-3" />
                  Enable notifications
                </button>
              )}
            </div>

            {/* Modal Pickers */}
            <DueDatePicker
              open={dueOpen}
              onClose={() => setDueOpen(false)}
              dueDate={pendingDate ? toDateStr(pendingDate) : null}
              dueTime={pendingTime}
              onChange={(d, t) => {
                setPendingDate(d ? new Date(`${d}T00:00:00`) : undefined)
                setPendingTime(t)
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="note-inputs"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="space-y-2.5"
          >
            <Input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Title (optional)"
              className="h-9 font-semibold text-xs border-transparent bg-muted/30 focus-visible:ring-1 focus-visible:ring-primary/40 rounded-lg px-2.5"
            />

            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Take a quick note or paste markdown links…"
              rows={3}
              className="w-full resize-none bg-transparent px-2 text-xs leading-relaxed outline-none placeholder:text-muted-foreground/50 font-normal"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-border/40">
              <div className="flex flex-wrap items-center gap-2">
                {/* Scope selector */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setNoteScope('work')}
                    className={cn(
                      'flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors',
                      noteScope === 'work'
                        ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    💼 Work
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoteScope('personal')}
                    className={cn(
                      'flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors',
                      noteScope === 'personal'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold'
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    🏠 Personal
                  </button>
                </div>

                {/* Color Theme Selector */}
                <Popover>
                  <PopoverTrigger
                    className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title="Choose Note Theme Color"
                  >
                    <Palette className="h-3 w-3" />
                    <span>{NOTE_COLOR_CONFIG[noteColor].name}</span>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2 rounded-2xl shadow-xl border border-border bg-card" align="start">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">Note Theme</div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {(Object.keys(NOTE_COLOR_CONFIG) as NoteColor[]).map((c) => {
                        const cfg = NOTE_COLOR_CONFIG[c]
                        const selected = noteColor === c
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNoteColor(c)}
                            className={cn(
                              'flex h-6 w-6 items-center justify-center rounded-full transition-all hover:scale-110 focus:outline-none',
                              cfg.dot,
                              selected ? 'ring-2 ring-offset-2 ring-primary scale-110 shadow-xs' : 'opacity-85 hover:opacity-100'
                            )}
                            title={cfg.label}
                          >
                            {selected && <Check className="h-3 w-3 text-white stroke-[3]" />}
                          </button>
                        )
                      })}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Private toggle */}
                <button
                  type="button"
                  onClick={() => setNotePrivate(!notePrivate)}
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors',
                    notePrivate
                      ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 font-semibold'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                  title="Mark as Private"
                >
                  <Lock className="h-3 w-3" /> Private
                </button>
              </div>

              <Button
                size="sm"
                onClick={handleCreateNote}
                disabled={!noteTitle.trim() && !textInput.trim()}
                className="h-8 rounded-xl text-xs px-3 font-semibold"
              >
                <Check className="mr-1 h-3.5 w-3.5" />
                Save Note
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
