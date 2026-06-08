'use client'

import { useState, useEffect, useRef } from 'react'
import type { Todo } from '@/components/TodoItem'
import { supabase } from '@/lib/supabase'
export { REMINDER_OPTIONS, type ReminderMinutes } from '@/lib/reminders'

/** Build a Date from a todo's dueDate + optional dueTime (defaults to 09:00). */
function dueDatetime(todo: Todo): Date | null {
  if (!todo.dueDate) return null
  const [y, m, d] = todo.dueDate.split('-').map(Number)
  if (todo.dueTime) {
    const [h, min] = todo.dueTime.split(':').map(Number)
    return new Date(y, m - 1, d, h, min)
  }
  return new Date(y, m - 1, d, 9, 0)
}

function reminderBody(todo: Todo): string {
  if (todo.reminder === 0)    return `"${todo.text}" is due now!`
  if (todo.reminder === 15)   return `"${todo.text}" is due in 15 minutes.`
  if (todo.reminder === 60)   return `"${todo.text}" is due in 1 hour.`
  if (todo.reminder === 1440) return `"${todo.text}" is due tomorrow.`
  return `"${todo.text}" is due soon.`
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buf = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return buf
}

async function savePushSubscription(userId: string, sub: PushSubscription) {
  const json = sub.toJSON()
  const endpoint = json.endpoint!
  const p256dh   = json.keys?.['p256dh']
  const auth     = json.keys?.['auth']
  if (!p256dh || !auth) return
  await supabase.from('push_subscriptions').upsert(
    { user_id: userId, endpoint, p256dh, auth },
    { onConflict: 'user_id,endpoint' }
  )
}

async function registerPush(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!publicKey) return

  try {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
    }
    await savePushSubscription(userId, sub)
  } catch (err) {
    console.error('Push subscription failed:', err)
  }
}

export function useNotifications(todos: Todo[], userId: string | null) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Register service worker on mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error)
    }
    if ('Notification' in window) setPermission(Notification.permission)
  }, [])

  // Subscribe to push once permission is granted and userId is available
  useEffect(() => {
    if (permission === 'granted' && userId) registerPush(userId)
  }, [permission, userId])

  // Schedule client-side timers as a fallback while the app is open
  useEffect(() => {
    if (permission !== 'granted') return

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

      if (delay > 0 && delay < WEEK_MS) {
        timers.current.set(
          todo.id,
          setTimeout(() => {
            new Notification('Task Reminder — My Tasks', {
              body: reminderBody(todo),
              icon: '/favicon.ico',
              tag:  todo.id,
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
