import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type ReminderRow = {
  id:       string
  text:     string
  due_date: string
  due_time: string | null
  reminder: number
  email:    string
}

export async function GET(req: NextRequest) {
  // Protect the endpoint so only your cron service can call it
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch todos whose reminder is due right now
  const { data: reminders, error } = await supabase.rpc('get_due_reminders')
  if (error) {
    console.error('get_due_reminders error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (reminders ?? []) as ReminderRow[]
  if (rows.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const resendKey = process.env.RESEND_API_KEY!
  const fromEmail = process.env.FROM_EMAIL ?? 'onboarding@resend.dev'

  let sent = 0
  for (const r of rows) {
    try {
      const timeLabel = r.due_time
        ? new Date(`${r.due_date}T${r.due_time}`).toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit',
          })
        : ''
      const dateLabel = new Date(`${r.due_date}T12:00:00`).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
      })
      const whenLabel =
        r.reminder === 0    ? 'right now'     :
        r.reminder === 15   ? 'in 15 minutes' :
        r.reminder === 60   ? 'in 1 hour'     :
        r.reminder === 1440 ? 'tomorrow'      : 'soon'

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
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
      console.error('Failed to send reminder for', r.id, err)
    }
  }

  return NextResponse.json({ sent, total: rows.length })
}
