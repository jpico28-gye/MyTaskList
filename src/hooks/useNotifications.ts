'use client'

import { useState, useEffect, useRef } from 'react'
import type { Todo } from '@/components/TodoItem'
export { REMINDER_OPTIONS, type ReminderMinutes } from '@/lib/reminders'

/** Build a Date from a todo's dueDate + optional dueTime (defaults to 09:00). */
function dueDatetime(todo: Todo): Date | null {
  if (!todo.dueDate) return null
  const [y, m, d] = todo.dueDate.split('-').map(Number)
  if (todo.dueTime) {
    const [h, min] = todo.dueTime.split(':').map(Number)
    return new Date(y, m - 1, d, h, min)
  }
  return new Date(y, m - 1, d, 9, 0) // 9 AM default
}

function reminderBody(todo: Todo): string {
  if (todo.reminder === 0)    return `"${todo.text}" is due now!`
  if (todo.reminder === 15)   return `"${todo.text}" is due in 15 minutes.`
  if (todo.reminder === 60)   return `"${todo.text}" is due in 1 hour.`
  if (todo.reminder === 1440) return `"${todo.text}" is due tomorrow.`
  return `"${todo.text}" is due soon.`
}

export function useNotifications(todos: Todo[]) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Read current permission on mount
  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission)
  }, [])

  // Schedule / reschedule timers whenever todos or permission change
  useEffect(() => {
    if (permission !== 'granted') return

    // Clear old timers
    timers.current.forEach(clearTimeout)
    timers.current.clear()

    const now = Date.now()
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000

    for (const todo of todos) {
      if (todo.completed || todo.reminder === null || todo.reminder === undefined) continue

      const due = dueDatetime(todo)
      if (!due) continue

      const fireAt = due.getTime() - (todo.reminder ?? 0) * 60_000
      const delay  = fireAt - now

      // Only schedule if in the future and within the next 7 days
      if (delay > 0 && delay < WEEK_MS) {
        timers.current.set(
          todo.id,
          setTimeout(() => {
            new Notification('Task Reminder — My Tasks', {
              body: reminderBody(todo),
              icon: '/favicon.ico',
              tag: todo.id, // prevents duplicate toasts
            })
          }, delay)
        )
      }
    }

    return () => {
      timers.current.forEach(clearTimeout)
      timers.current.clear()
    }
  }, [todos, permission])

  async function requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) return 'denied'
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }

  return { permission, requestPermission }
}
