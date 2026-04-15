'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  addDays,
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isToday,
  isPast,
  format,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Todo, PRIORITY_CONFIG } from '@/components/TodoItem'

// ─── helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function priorityDot(p: Todo['priority']): string {
  if (!p) return 'bg-muted-foreground/40'
  return PRIORITY_CONFIG[p].dot
}

// ─── component ────────────────────────────────────────────────────────────────

type WeekViewProps = {
  todos: Todo[]
  selectedDay: Date | null
  onSelectDay: (day: Date | null) => void
}

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function WeekView({ todos, selectedDay, onSelectDay }: WeekViewProps) {
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  function goToToday() {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
    onSelectDay(new Date())
  }

  function shiftWeek(delta: 1 | -1) {
    setWeekStart((w) => (delta === 1 ? addWeeks(w, 1) : subWeeks(w, 1)))
    // keep selectedDay if still in new week, otherwise clear
    if (selectedDay) {
      const newStart = delta === 1 ? addWeeks(weekStart, 1) : subWeeks(weekStart, 1)
      const newEnd = endOfWeek(newStart, { weekStartsOn: 1 })
      const inRange = selectedDay >= newStart && selectedDay <= newEnd
      if (!inRange) onSelectDay(null)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-1">
          <button
            onClick={() => shiftWeek(-1)}
            aria-label="Previous week"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => shiftWeek(1)}
            aria-label="Next week"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Week label */}
        <AnimatePresence mode="wait">
          <motion.span
            key={weekStart.toISOString()}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="text-sm font-semibold text-foreground tabular-nums"
          >
            {format(weekStart, 'MMM d')}
            {' – '}
            {format(weekEnd, weekStart.getMonth() === weekEnd.getMonth() ? 'd' : 'MMM d')}
            {', '}
            {format(weekEnd, 'yyyy')}
          </motion.span>
        </AnimatePresence>

        <button
          onClick={goToToday}
          className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Today
        </button>
      </div>

      {/* ── Day columns ── */}
      <div className="grid grid-cols-7 divide-x divide-border">
        {days.map((day, i) => {
          const dateStr = toDateStr(day)
          const dayTodos = todos.filter((t) => t.dueDate === dateStr)
          const activeTodos = dayTodos.filter((t) => !t.completed)
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
          const isToday_ = isToday(day)
          const isPast_ = isPast(day) && !isToday_

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDay(isSelected ? null : day)}
              aria-label={`${format(day, 'EEEE, MMMM d')} — ${activeTodos.length} task${activeTodos.length !== 1 ? 's' : ''}`}
              className={cn(
                'group flex flex-col items-center gap-1.5 py-3 transition-colors',
                isSelected
                  ? 'bg-primary/8 dark:bg-primary/12'
                  : 'hover:bg-muted/60'
              )}
            >
              {/* Day letter */}
              <span
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wide',
                  isToday_ ? 'text-primary' : isPast_ ? 'text-muted-foreground/50' : 'text-muted-foreground'
                )}
              >
                {DAY_LETTERS[i]}
              </span>

              {/* Date circle */}
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold transition-colors',
                  isToday_ && isSelected
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1'
                    : isToday_
                    ? 'bg-primary text-primary-foreground'
                    : isSelected
                    ? 'bg-foreground text-background'
                    : isPast_
                    ? 'text-muted-foreground/50'
                    : 'text-foreground group-hover:bg-muted'
                )}
              >
                {format(day, 'd')}
              </span>

              {/* Task dot strip */}
              <div className="flex h-2 items-center justify-center gap-[2px]">
                {activeTodos.length === 0 && dayTodos.length > 0 && (
                  // all done — faint dot
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/25" />
                )}
                {activeTodos.slice(0, 3).map((t) => (
                  <span
                    key={t.id}
                    className={cn('h-1.5 w-1.5 rounded-full', priorityDot(t.priority))}
                  />
                ))}
                {activeTodos.length > 3 && (
                  <span className="text-[8px] font-bold leading-none text-muted-foreground">
                    +{activeTodos.length - 3}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Selected day label ── */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-[11px] font-semibold text-primary">
                {isToday(selectedDay) ? 'Today' : format(selectedDay, 'EEEE, MMMM d')}
                {' · '}
                <span className="font-normal text-muted-foreground">
                  {todos.filter((t) => t.dueDate === toDateStr(selectedDay) && !t.completed).length} active
                </span>
              </span>
              <button
                onClick={() => onSelectDay(null)}
                className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline transition-colors"
              >
                Show all
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
