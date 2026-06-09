import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

type ReminderRow = {
  id:       string
  text:     string
  due_date: string
  due_time: string | null
  reminder: number
  email:    string
}

type PushSubRow = {
  id:       string
  user_id:  string
  endpoint: string
  p256dh:   string
  auth:     string
}

type ExpoTokenRow = {
  id:      string
  user_id: string
  token:   string
}

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function GET(req: NextRequest) {
  const cronSecret  = process.env.CRON_SECRET
  const authHeader  = req.headers.get('authorization')
  const customHeader = req.headers.get('x-cron-secret')
  if (authHeader !== `Bearer ${cronSecret}` && customHeader !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: reminders, error } = await supabase.rpc('get_due_reminders')
  if (error) {
    console.error('get_due_reminders error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (reminders ?? []) as ReminderRow[]
  if (rows.length === 0) return NextResponse.json({ sent: 0 })

  // Fetch push subscriptions for todos that have due reminders
  const todoIds = rows.map((r) => r.id)
  const { data: todoRows } = await supabase
    .from('todos')
    .select('id, user_id')
    .in('id', todoIds)

  const todoUserMap = Object.fromEntries((todoRows ?? []).map((t) => [t.id, t.user_id]))
  const userIds = [...new Set(Object.values(todoUserMap))]

  const { data: pushSubs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds)

  const subsByUser: Record<string, PushSubRow[]> = {}
  for (const sub of (pushSubs ?? []) as PushSubRow[]) {
    ;(subsByUser[sub.user_id] ??= []).push(sub)
  }

  const { data: expoTokenRows } = await supabase
    .from('expo_push_tokens')
    .select('*')
    .in('user_id', userIds)

  const expoTokensByUser: Record<string, string[]> = {}
  for (const row of (expoTokenRows ?? []) as ExpoTokenRow[]) {
    ;(expoTokensByUser[row.user_id] ??= []).push(row.token)
  }

  const resendKey = process.env.RESEND_API_KEY!
  const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev'

  let sent = 0
  for (const r of rows) {
    const timeLabel = r.due_time
      ? new Date(`${r.due_date}T${r.due_time}`).toLocaleTimeString('en-US', {
          hour: 'numeric', minute: '2-digit',
        })
      : ''
    const dateLabel = new Date(`${r.due_date}T12:00:00`).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    })
    const whenLabel =
      r.reminder === 0     ? 'right now'     :
      r.reminder === 5     ? 'in 5 minutes'  :
      r.reminder === 10    ? 'in 10 minutes' :
      r.reminder === 15    ? 'in 15 minutes' :
      r.reminder === 30    ? 'in 30 minutes' :
      r.reminder === 60    ? 'in 1 hour'     :
      r.reminder === 120   ? 'in 2 hours'    :
      r.reminder === 1440  ? 'tomorrow'      :
      r.reminder === 2880  ? 'in 2 days'     :
      r.reminder === 10080 ? 'in a week'     : 'soon'

    // ── Email ──────────────────────────────────────────────────────────────
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to:   r.email,
          subject: `Reminder: ${r.text}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
              <p style="font-size:28px;margin:0 0 4px">⏰</p>
              <h2 style="margin:0 0 12px;font-size:20px;color:#111">Task Reminder</h2>
              <p style="margin:0 0 16px;font-size:16px;color:#111;font-weight:600">${r.text}</p>
              <p style="margin:0;font-size:14px;color:#555">
                Due ${dateLabel}${timeLabel ? ` at ${timeLabel}` : ''} — ${whenLabel}.
              </p>
            </div>
          `,
        }),
      })
      if (res.ok) {
        await supabase.from('todos').update({ reminder_sent: true }).eq('id', r.id)
        sent++
      } else {
        console.error('Resend error for', r.id, await res.text())
      }
    } catch (err) {
      console.error('Email failed for', r.id, err)
    }

    // ── Web Push ───────────────────────────────────────────────────────────
    const userId = todoUserMap[r.id]
    const subs   = userId ? (subsByUser[userId] ?? []) : []

    const pushPayload = JSON.stringify({
      title: 'Task Reminder — My Tasks',
      body:  `"${r.text}" is due ${whenLabel}.`,
      tag:   r.id,
    })

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          pushPayload
        )
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 410 || status === 404) {
          // Subscription expired — remove it
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        } else {
          console.error('Push failed for sub', sub.id, err)
        }
      }
    }

    // ── Expo Push ──────────────────────────────────────────────────────────
    const expoTokens = userId ? (expoTokensByUser[userId] ?? []) : []
    if (expoTokens.length > 0) {
      const expoMessages = expoTokens.map((token) => ({
        to:        token,
        title:     'Task Reminder — My Tasks',
        body:      `"${r.text}" is due ${whenLabel}.`,
        data:      { todoId: r.id },
        sound:     'default' as const,
        channelId: 'reminders',
      }))
      try {
        const expoRes  = await fetch('https://exp.host/--/api/v2/push/send', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body:    JSON.stringify(expoMessages),
        })
        const expoBody = await expoRes.json()
        console.log('Expo push response:', JSON.stringify(expoBody))
      } catch (err) {
        console.error('Expo push failed for user', userId, err)
      }
    }
  }

  return NextResponse.json({ sent, total: rows.length })
}
