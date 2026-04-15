import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type ReminderRow = {
  id:       string
  text:     string
  due_date: string
  due_time: string | null
  reminder: number
  email:    string
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Fetch todos whose reminder is due within a 90-second window.
  // The get_due_reminders() function joins auth.users for the email.
  const { data: reminders, error } = await supabase.rpc('get_due_reminders')

  if (error) {
    console.error('get_due_reminders error:', error.message)
    return new Response(error.message, { status: 500 })
  }

  const rows = (reminders ?? []) as ReminderRow[]
  if (rows.length === 0) return new Response('no reminders due', { status: 200 })

  const resendKey = Deno.env.get('RESEND_API_KEY')!
  const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'reminders@resend.dev'

  const results = await Promise.allSettled(
    rows.map(async (r) => {
      const timeLabel = r.due_time
        ? new Date(`${r.due_date}T${r.due_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : ''
      const dateLabel = new Date(r.due_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

      const reminderLabel =
        r.reminder === 0    ? 'right now'     :
        r.reminder === 15   ? 'in 15 minutes' :
        r.reminder === 60   ? 'in 1 hour'     :
        r.reminder === 1440 ? 'tomorrow'      : 'soon'

      await fetch('https://api.resend.com/emails', {
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
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="margin:0 0 8px;font-size:20px">⏰ Task Reminder</h2>
              <p style="margin:0 0 16px;font-size:16px;color:#111"><strong>${r.text}</strong></p>
              <p style="margin:0;font-size:14px;color:#555">
                Due ${dateLabel}${timeLabel ? ` at ${timeLabel}` : ''} — ${reminderLabel}.
              </p>
            </div>
          `,
        }),
      })

      // Mark as sent so we don't re-send
      await supabase.from('todos').update({ reminder_sent: true }).eq('id', r.id)
    })
  )

  const failed = results.filter((r) => r.status === 'rejected').length
  return new Response(
    JSON.stringify({ sent: rows.length - failed, failed }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
