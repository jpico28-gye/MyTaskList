-- ============================================================
-- Run this in the Supabase SQL Editor.
-- Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- 1. Table of approved emails (you manage this manually)
create table if not exists public.allowed_emails (
  email text primary key
);

-- Only the service role can insert/update/delete (you via the dashboard)
alter table public.allowed_emails enable row level security;

create policy "service role only"
  on public.allowed_emails
  using (false);   -- blocks all direct client access

-- 2. Function the frontend calls to check eligibility.
--    Runs as postgres (security definer) so it can read allowed_emails
--    even though RLS blocks direct client reads.
create or replace function public.is_email_allowed(check_email text)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.allowed_emails
    where lower(email) = lower(check_email)
  );
$$;

-- Allow anonymous callers (unauthenticated sign-up page) to call it
grant execute on function public.is_email_allowed(text) to anon;

-- 3. Trigger: server-side backstop — deletes the new user immediately
--    if their email is not in the allowlist, even if the frontend check
--    was bypassed.
create or replace function public.enforce_email_allowlist()
returns trigger
language plpgsql
security definer
as $$
begin
  if not exists (
    select 1 from public.allowed_emails
    where lower(email) = lower(new.email)
  ) then
    -- Delete the just-created user and abort
    delete from auth.users where id = new.id;
    raise exception 'Email not authorized to sign up.';
  end if;
  return new;
end;
$$;

create or replace trigger enforce_email_allowlist_trigger
  after insert on auth.users
  for each row execute function public.enforce_email_allowlist();

-- 4. Add your own email so you can still sign in
-- Replace with your actual email:
-- insert into public.allowed_emails (email) values ('you@example.com');
