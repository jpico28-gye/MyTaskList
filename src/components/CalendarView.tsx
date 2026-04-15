'use client'

import { useState, useMemo } from 'react'
import { format, parseISO, isToday } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, ClipboardList } from 'lucide-react'
import { Calendar, CalendarDayButton } from '@/components/ui/calendar'
import TodoItem, { type Todo, type Priority, PRIORITY_CONFIG } from '@/components/TodoItem'
import { cn } from '@/lib/utils'
import type { DayButton } from 'react-day-picker'

// ─── helpers ────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// ─── custom day button with task dots ───────────────────────────────────────

type DotDayButtonProps = React.ComponentProps<typeof DayButton> & {
  todosByDate: Record<string, Todo[]>
}

function DotDayButton({ day, modifiers, todosByDate, ...props }: DotDayButtonProps) {
  const dateStr = toDateStr(day.date)
  const dayTodos = todosByDate[dateStr] ?? []
  const activeTodos = dayTodos.filter((t) => !t.completed)

  return (
    <div className="relative flex flex-col items-center">
      <CalendarDayButton day={day} modifiers={modifiers} {...props} />
      {activeTodos.length > 0 && (
        <div className="absolute bottom-0.5 flex items-center gap-[2px]">
          {activeTodos.slice(0, 3).map((t) => {
            const dot = t.priority ? PRIORITY_CONFIG[t.priority].dot : 'bg-muted-foreground/50'
            return <span key={t.id} className={cn('h-1 w-1 rounded-full', dot)} />
          })}
          {activeTodos.length > 3 && (
            <span className="text-[8px] leading-none text-muted-foreground">+</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

import type { ReminderMinutes } from '@/lib/reminders'

type CalendarViewProps = {
  todos: Todo[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (id: string, text: string) => void
  onChangePriority: (id: string, priority: Priority | null) => void
  onChangeReminder: (id: string, reminder: ReminderMinutes) => void
  onRemoveTag: (id: string, tag: string) => void
}

export default function CalendarView({
  todos,
  onToggle,
  onDelete,
  onEdit,
  onChangePriority,
  onChangeReminder,
  onRemoveTag,
}: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  // Group todos by dueDate string for fast lookup
  const todosByDate = useMemo(() => {
    const map: Record<string, Todo[]> = {}
    for (const t of todos) {
      if (t.dueDate) {
        ;(map[t.dueDate] ??= []).push(t)
      }
    }
    return map
  }, [todos])

  const selectedDateStr = selectedDate ? toDateStr(selectedDate) : null
  const selectedTodos = selectedDateStr ? (todosByDate[selectedDateStr] ?? []) : []
  const unscheduled = todos.filter((t) => !t.dueDate)

  // Highlight days that have active tasks
  const daysWithTasks: Date[] = useMemo(
    () =>
      Object.keys(todosByDate)
        .filter((k) => todosByDate[k].some((t) => !t.completed))
        .map(parseDate),
    [todosByDate]
  )

  return (
    <div className="space-y-6">
      {/* Calendar card */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          modifiers={{ hasTasks: daysWithTasks }}
          className="w-full p-4 [--cell-size:--spacing(9)]"
          components={{
            DayButton: (props) => (
              <DotDayButton {...props} todosByDate={todosByDate} />
            ),
          }}
        />
      </div>

      {/* Selected day tasks */}
      {selectedDate && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              {isToday(selectedDate)
                ? 'Today'
                : format(selectedDate, 'EEEE, MMMM d')}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {selectedTodos.length > 0
                  ? `${selectedTodos.filter((t) => !t.completed).length} active`
                  : 'no tasks'}
              </span>
            </h2>
          </div>

          <ul className="space-y-2">
            <AnimatePresence initial={false} mode="popLayout">
              {selectedTodos.length === 0 && (
                <motion.li
                  key="empty"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-muted-foreground"
                >
                  <ClipboardList className="h-7 w-7 opacity-40" />
                  <p className="text-sm">No tasks for this day.</p>
                </motion.li>
              )}
              {selectedTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onChangePriority={onChangePriority}
                  onChangeReminder={onChangeReminder}
                  onRemoveTag={onRemoveTag}
                />
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}

      {/* Unscheduled tasks */}
      {unscheduled.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            Unscheduled ({unscheduled.length})
          </h2>
          <ul className="space-y-2">
            <AnimatePresence initial={false} mode="popLayout">
              {unscheduled.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onChangePriority={onChangePriority}
                  onChangeReminder={onChangeReminder}
                  onRemoveTag={onRemoveTag}
                />
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}
    </div>
  )
}
