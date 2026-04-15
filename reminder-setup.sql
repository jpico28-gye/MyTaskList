-- ============================================================
-- Run this in the Supabase SQL Editor after schema.sql.
-- Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- 1. Add reminder_sent column to track whether the email was sent
alter table public.todos
  add column if not exists reminder_sent boolean not null default false;

-- 2. Helper function used by the Edge Function.
--    Returns todos whose reminder email is due right now (±90 second window).
--    Joins auth.users so the Edge Function gets the recipient email in one call.
create or replace function public.get_due_reminders()
returns table (
  id        uuid,
  text      text,
  due_date  text,
  due_time  text,
  reminder  integer,
  email     text
)
language sql
security definer
as $$
  select
    t.id,
    t.text,
    t.due_date::text,
    t.due_time::text,
    t.reminder,
    u.email
  from public.todos t
  join auth.users u on u.id = t.user_id
  where
    t.completed      = false
    and t.reminder   is not null
    and t.reminder_sent = false
    and t.due_date   is not null
    and (
      case
        when t.due_time is not null then
          (t.due_date::timestamp + t.due_time::time)
          - (t.reminder || ' minutes')::interval
        else
          -- No specific time: default to 9 AM on due day
          (t.due_date::timestamp + interval '9 hours')
          - (t.reminder || ' minutes')::interval
      end
    ) between now() - interval '90 seconds'
          and now() + interval '30 seconds';
$$;
