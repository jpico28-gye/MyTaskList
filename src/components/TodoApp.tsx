'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  PlusCircle, CalendarDays, X, ArrowUpDown, GripVertical,
  Moon, Sun, Bell, BellOff, Sparkles, Search, LogOut, Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import TodoItem, { type Todo, type Priority, PRIORITY_CONFIG } from '@/components/TodoItem'
import WeekView from '@/components/WeekView'
import EmptyState, { type EmptyVariant } from '@/components/EmptyState'
import TagPicker from '@/components/TagPicker'
import AuthGate from '@/components/AuthGate'
import { cn } from '@/lib/utils'
import { tagColorClass, parseTagsFromText } from '@/lib/tags'
import { parseNaturalInput, toTimeStr, formatTime } from '@/lib/nlp'
import { useDarkMode } from '@/hooks/useDarkMode'
import { useNotifications, REMINDER_OPTIONS, type ReminderMinutes } from '@/hooks/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import { useTodos } from '@/hooks/useTodos'

// ─── types ───────────────────────────────────────────────────────────────────

type Filter   = 'all' | 'active' | 'completed'
type SortMode = 'manual' | 'smart'

const PRIORITY_WEIGHT: Record<string, number> = { high: 0, medium: 1, low: 2 }

function smartSort(a: Todo, b: Todo): number {
  const pw = (PRIORITY_WEIGHT[a.priority ?? ''] ?? 3) - (PRIORITY_WEIGHT[b.priority ?? ''] ?? 3)
  if (pw !== 0) return pw
  if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
  if (a.dueDate) return -1
  if (b.dueDate) return 1
  return b.createdAt - a.createdAt
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── component ───────────────────────────────────────────────────────────────

export default function TodoApp() {
  const auth  = useAuth()
  const {
    todos, loading,
    addTodo, toggleTodo, deleteTodo, editTodo, changePriority, changeReminder, removeTag, clearCompleted, reorderTodos,
  } = useTodos(auth.user)

  const [input,       setInput]       = useState('')
  const [search,      setSearch]      = useState('')
  const [filter,      setFilter]      = useState<Filter>('all')
  const [sortMode,    setSortMode]    = useState<SortMode>('manual')
  const [activeTags,  setActiveTags]  = useState<string[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [mounted,     setMounted]     = useState(false)
  const [activeId,    setActiveId]    = useState<string | null>(null)

  // new-task extras
  const [pendingPriority, setPendingPriority] = useState<Priority | null>(null)
  const [pendingDate,     setPendingDate]     = useState<Date | undefined>(undefined)
  const [pendingTime,     setPendingTime]     = useState<string | null>(null)
  const [pendingReminder, setPendingReminder] = useState<ReminderMinutes>(null)
  const [pendingTags,     setPendingTags]     = useState<string[]>([])
  const [datePickerOpen,  setDatePickerOpen]  = useState(false)
  const [reminderOpen,    setReminderOpen]    = useState(false)

  const { dark, toggle: toggleDark } = useDarkMode()
  const { permission, requestPermission } = useNotifications(todos)

  useEffect(() => { setMounted(true) }, [])

  // ── NLP: parse the input in real-time ─────────────────────────────────────

  const nlp = useMemo(() => {
    const raw = input.trim()
    if (!raw || pendingDate) return null
    const result = parseNaturalInput(raw)
    return result.date ? result : null
  }, [input, pendingDate])

  // ── add task ──────────────────────────────────────────────────────────────

  const handleAddTodo = useCallback(() => {
    const raw = input.trim()
    if (!raw) return

    const resolvedDate = pendingDate ?? nlp?.date ?? (selectedDay ?? undefined)
    const resolvedTime = pendingTime ?? (nlp?.hasTime && nlp.date ? toTimeStr(nlp.date) : null)

    const textAfterNlp = nlp?.date ? nlp.text : raw
    const { text, tags: typedTags } = parseTagsFromText(textAfterNlp)
    if (!text) return
    const mergedTags = [...new Set([...pendingTags, ...typedTags])]

    addTodo({
      text,
      priority:  pendingPriority,
      dueDate:   resolvedDate ? toDateStr(resolvedDate) : null,
      dueTime:   resolvedTime,
      reminder:  pendingReminder,
      tags:      mergedTags,
    })

    setInput('')
    setPendingPriority(null)
    setPendingDate(undefined)
    setPendingTime(null)
    setPendingReminder(null)
    setPendingTags([])
  }, [input, pendingPriority, pendingDate, pendingTime, pendingReminder, pendingTags, nlp, selectedDay, addTodo])

  // ── DnD ───────────────────────────────────────────────────────────────────

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function handleDragStart(e: DragStartEvent) { setActiveId(e.active.id as string) }
  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return
    const fromIdx = todos.findIndex((t) => t.id === active.id)
    const toIdx   = todos.findIndex((t) => t.id === over.id)
    reorderTodos(arrayMove(todos, fromIdx, toIdx))
  }

  // ── derived data ──────────────────────────────────────────────────────────

  const allTags = useMemo(() => {
    const set = new Set<string>()
    todos.forEach((t) => t.tags.forEach((g) => set.add(g)))
    return [...set].sort()
  }, [todos])

  const toggleActiveTag = (tag: string) =>
    setActiveTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag])

  const selectedDayStr = selectedDay ? toDateStr(selectedDay) : null

  const filtered = useMemo(() => {
    let list = todos.filter((t) => {
      if (filter === 'active')    return !t.completed
      if (filter === 'completed') return t.completed
      return true
    })
    if (selectedDayStr) list = list.filter((t) => t.dueDate === selectedDayStr)
    if (activeTags.length > 0) list = list.filter((t) => activeTags.some((tag) => t.tags.includes(tag)))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((t) =>
        t.text.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
      )
    }
    if (sortMode === 'smart') list = [...list].sort(smartSort)
    return list
  }, [todos, filter, selectedDayStr, activeTags, search, sortMode])

  const activeCount    = todos.filter((t) => !t.completed).length
  const completedCount = todos.filter((t) => t.completed).length
  const activeItem     = activeId ? todos.find((t) => t.id === activeId) : null
  const isDraggable    = sortMode === 'manual'
  const priorities: Priority[] = ['low', 'medium', 'high']

  function emptyVariant(): EmptyVariant {
    if (search.trim() || activeTags.length > 0 || selectedDayStr) return 'no-tag-match'
    if (filter === 'completed') return 'no-completed'
    if (todos.length === 0) return 'no-tasks'
    if (activeCount === 0) return filter === 'active' ? 'no-active' : 'all-caught-up'
    return 'no-tasks'
  }

  const nlpPreviewLabel = nlp?.date
    ? `${format(nlp.date, 'MMM d')}${nlp.hasTime ? ` · ${formatTime(toTimeStr(nlp.date))}` : ''}`
    : null

  const datePillLabel = pendingDate
    ? `${format(pendingDate, 'MMM d')}${pendingTime ? ` · ${formatTime(pendingTime)}` : ''}`
    : selectedDay
    ? `${format(selectedDay, 'MMM d')} (selected)`
    : null

  // ── auth loading / gate ───────────────────────────────────────────────────

  if (!mounted || auth.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!auth.user) {
    return <AuthGate auth={auth} />
  }

  // ── main UI ───────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-background to-muted/40 px-4 py-12 sm:py-16">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="relative mb-8 w-full max-w-lg text-center"
      >
        {/* Dark mode toggle — top-right */}
        <button
          onClick={toggleDark}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={dark ? 'sun' : 'moon'} initial={{ rotate: -30, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 30, opacity: 0 }} transition={{ duration: 0.15 }}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </motion.span>
          </AnimatePresence>
        </button>

        {/* Notifications toggle — top-left */}
        <button
          onClick={async () => { if (permission !== 'granted') await requestPermission() }}
          aria-label={permission === 'granted' ? 'Notifications enabled' : 'Enable notifications'}
          title={permission === 'denied' ? 'Notifications blocked — check browser settings' : permission === 'granted' ? 'Notifications enabled' : 'Enable notifications'}
          className={cn(
            'absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm transition-colors',
            permission === 'granted'
              ? 'border-violet-300 bg-violet-50 text-violet-600 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-400'
              : 'border-border bg-background text-muted-foreground hover:text-foreground'
          )}
        >
          {permission === 'granted' ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </button>

        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">My Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeCount === 0 ? 'All done!' : `${activeCount} task${activeCount !== 1 ? 's' : ''} remaining`}
        </p>

        {/* Sign out — below subtitle */}
        <button
          onClick={auth.signOut}
          title={`Signed in as ${auth.user.email}`}
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-3 w-3" />
          Sign out
        </button>
      </motion.div>

      <div className="w-full max-w-lg space-y-4">

        {/* ── Week view ── */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
          <WeekView todos={todos} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
        </motion.div>

        {/* ── Add task card ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.12 }}
          className="rounded-2xl border border-border bg-card p-3 shadow-sm space-y-2"
        >
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
              placeholder={
                selectedDay
                  ? `Add task for ${format(selectedDay, 'EEE MMM d')}…`
                  : 'Try "Submit report tomorrow at 2pm #work"'
              }
              className="h-10 flex-1 rounded-xl text-sm"
              aria-label="New task"
            />
            <Button onClick={handleAddTodo} disabled={!input.trim()} className="h-10 rounded-xl px-4 shrink-0">
              <PlusCircle className="mr-1.5 h-4 w-4" />
              Add
            </Button>
          </div>

          {/* NLP preview */}
          <AnimatePresence>
            {nlpPreviewLabel && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-1.5 rounded-lg bg-primary/8 px-2.5 py-1.5 text-[11px] text-primary dark:bg-primary/15">
                  <Sparkles className="h-3 w-3 shrink-0" />
                  <span>Detected: <strong>{nlpPreviewLabel}</strong></span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tag picker row */}
          <TagPicker existingTags={allTags} selected={pendingTags} onChange={setPendingTags} />

          {/* Priority + date + reminder pickers */}
          <div className="flex flex-wrap items-center gap-2">
            {priorities.map((p) => {
              const cfg = PRIORITY_CONFIG[p]
              const active = pendingPriority === p
              return (
                <button key={p} onClick={() => setPendingPriority(active ? null : p)}
                  className={cn('flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all',
                    active ? cn(cfg.chip, 'border-transparent') : 'border-border text-muted-foreground hover:border-muted-foreground/50')}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                  {cfg.label}
                </button>
              )
            })}

            {/* Date picker */}
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger
                className={cn('flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all',
                  (pendingDate || selectedDay)
                    ? 'border-transparent bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-muted-foreground/50')}>
                <CalendarDays className="h-3 w-3" />
                {datePillLabel ?? 'Due date'}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={pendingDate}
                  onSelect={(d) => { setPendingDate(d); setDatePickerOpen(false) }} initialFocus />
              </PopoverContent>
            </Popover>

            {pendingDate && (
              <button onClick={() => { setPendingDate(undefined); setPendingTime(null) }}
                className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            )}

            {/* Reminder picker */}
            {(pendingDate || nlp?.date || selectedDay) && permission === 'granted' && (
              <Popover open={reminderOpen} onOpenChange={setReminderOpen}>
                <PopoverTrigger
                  className={cn('flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all',
                    pendingReminder !== null
                      ? 'border-transparent bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                      : 'border-border text-muted-foreground hover:border-muted-foreground/50')}>
                  <Bell className="h-3 w-3" />
                  {pendingReminder !== null
                    ? REMINDER_OPTIONS.find((o) => o.value === pendingReminder)?.label ?? 'Remind'
                    : 'Remind'}
                </PopoverTrigger>
                <PopoverContent className="w-44 p-1.5" align="start">
                  <div className="space-y-0.5">
                    {REMINDER_OPTIONS.map((opt) => (
                      <button key={String(opt.value)} onClick={() => { setPendingReminder(opt.value as ReminderMinutes); setReminderOpen(false) }}
                        className={cn('w-full rounded-lg px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted',
                          pendingReminder === opt.value && 'bg-muted font-medium')}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Nudge to enable notifications */}
            {permission === 'default' && (pendingDate || nlp?.date) && (
              <button onClick={requestPermission}
                className="flex items-center gap-1 rounded-full border border-dashed border-violet-300 px-2.5 py-0.5 text-[11px] font-medium text-violet-500 transition-colors hover:border-violet-400 dark:border-violet-700 dark:text-violet-400">
                <Bell className="h-3 w-3" />
                Enable reminders
              </button>
            )}
          </div>
        </motion.div>

        {/* ── Search bar ── */}
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.18 }}
          className="relative"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks and tags…"
            className="h-10 rounded-xl pl-9 pr-9 text-sm"
            aria-label="Search tasks"
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

        {/* ── Controls: filter tabs + sort ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.2 }}
          className="flex items-center gap-2">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="flex-1">
            <TabsList className="grid w-full grid-cols-3 rounded-xl">
              <TabsTrigger value="all" className="rounded-lg text-xs sm:text-sm">
                All
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{todos.length}</span>
              </TabsTrigger>
              <TabsTrigger value="active" className="rounded-lg text-xs sm:text-sm">
                Active
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{activeCount}</span>
              </TabsTrigger>
              <TabsTrigger value="completed" className="rounded-lg text-xs sm:text-sm">
                Done
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{completedCount}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <button onClick={() => setSortMode((m) => m === 'manual' ? 'smart' : 'manual')}
            aria-label="Toggle smart sort"
            className={cn('flex shrink-0 h-9 w-9 items-center justify-center rounded-xl border transition-all',
              sortMode === 'smart' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:text-foreground')}>
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        </motion.div>

        {/* ── Tag filter strip ── */}
        <AnimatePresence>
          {allTags.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="flex flex-wrap gap-1.5 pb-1">
                {allTags.map((tag) => {
                  const on = activeTags.includes(tag)
                  return (
                    <button key={tag} onClick={() => toggleActiveTag(tag)}
                      className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all border',
                        on ? cn(tagColorClass(tag), 'border-transparent ring-2 ring-offset-1 ring-primary/30') : cn(tagColorClass(tag), 'opacity-50 border-transparent hover:opacity-80'))}>
                      #{tag}
                    </button>
                  )
                })}
                {activeTags.length > 0 && (
                  <button onClick={() => setActiveTags([])}
                    className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                    Clear filter
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Smart sort hint ── */}
        <AnimatePresence>
          {sortMode === 'smart' && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }} className="text-[11px] text-muted-foreground overflow-hidden">
              Sorted by priority → due date. Drag-to-reorder is paused.
            </motion.p>
          )}
        </AnimatePresence>

        {/* ── Task list ── */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={filtered.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              <AnimatePresence initial={false} mode="popLayout">
                {!loading && filtered.length === 0 && (
                  <motion.li key="empty" className="list-none">
                    <EmptyState variant={emptyVariant()} />
                  </motion.li>
                )}
                {filtered.map((todo) => (
                  <TodoItem key={todo.id} todo={todo}
                    onToggle={toggleTodo} onDelete={deleteTodo} onEdit={editTodo}
                    onChangePriority={changePriority} onChangeReminder={changeReminder}
                    onRemoveTag={removeTag} isDraggable={isDraggable} />
                ))}
              </AnimatePresence>
            </ul>
          </SortableContext>

          <DragOverlay>
            {activeItem && (
              <div className={cn('flex items-center gap-3 rounded-xl border-l-4 border border-border bg-card px-3 py-3 shadow-2xl opacity-95',
                activeItem.priority ? PRIORITY_CONFIG[activeItem.priority].border : 'border-l-border')}>
                <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                <span className="text-sm">{activeItem.text}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* ── Clear completed ── */}
        <AnimatePresence>
          {completedCount > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }} className="flex justify-end overflow-hidden">
              <Button variant="ghost" size="sm" onClick={clearCompleted}
                className="h-7 rounded-lg text-xs text-muted-foreground hover:text-destructive">
                Clear completed ({completedCount})
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
