-- ============================================================
-- Run this entire file in the Supabase SQL Editor once.
-- Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- 1. Todos table
create table if not exists public.todos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  text        text not null,
  completed   boolean not null default false,
  created_at  timestamptz not null default now(),
  priority    text check (priority in ('low', 'medium', 'high')),
  due_date    date,
  due_time    time,
  reminder    integer,          -- minutes before due; null = no reminder
  tags        text[] not null default '{}',
  sort_order  integer not null default 0
);

-- Index so fetches for a user are fast
create index if not exists todos_user_id_idx on public.todos (user_id, sort_order);

-- 2. Row Level Security — users can only touch their own rows
alter table public.todos enable row level security;

create policy "select own todos"
  on public.todos for select
  using (auth.uid() = user_id);

create policy "insert own todos"
  on public.todos for insert
  with check (auth.uid() = user_id);

create policy "update own todos"
  on public.todos for update
  using (auth.uid() = user_id);

create policy "delete own todos"
  on public.todos for delete
  using (auth.uid() = user_id);

-- 3. Bulk reorder helper — called after drag-and-drop
--    Accepts an array of {id, sort_order} JSON objects and applies them
--    in a single round-trip.
-- 4. assigned_to column on todos
alter table public.todos add column if not exists assigned_to text;

-- 5. Task comments
create table if not exists public.task_comments (
  id         uuid primary key default gen_random_uuid(),
  todo_id    uuid not null references public.todos(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now()
);

create index if not exists task_comments_todo_id_idx on public.task_comments (todo_id, created_at);

alter table public.task_comments enable row level security;

create policy "select own task comments"
  on public.task_comments for select
  using (auth.uid() = user_id);

create policy "insert own task comments"
  on public.task_comments for insert
  with check (auth.uid() = user_id);

create policy "delete own task comments"
  on public.task_comments for delete
  using (auth.uid() = user_id);

-- 6. Push subscriptions — one row per browser/device per user
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "manage own push subscriptions"
  on public.push_subscriptions
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 7. Bulk reorder helper — called after drag-and-drop
--    Accepts an array of {id, sort_order} JSON objects and applies them
--    in a single round-trip.
create or replace function public.reorder_todos(updates jsonb)
returns void
language plpgsql
security definer          -- runs as postgres, but we check user_id inside
as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(updates)
  loop
    update public.todos
    set sort_order = (item->>'sort_order')::integer
    where id       = (item->>'id')::uuid
      and user_id  = auth.uid();
  end loop;
end;
$$;

-- 8. Notes
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null default '',
  text       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_id_idx on public.notes (user_id, updated_at desc);

alter table public.notes enable row level security;

create policy "select own notes"
  on public.notes for select
  using (auth.uid() = user_id);

create policy "insert own notes"
  on public.notes for insert
  with check (auth.uid() = user_id);

create policy "update own notes"
  on public.notes for update
  using (auth.uid() = user_id);

create policy "delete own notes"
  on public.notes for delete
  using (auth.uid() = user_id);

-- 9. Note <-> Task links (many-to-many)
create table if not exists public.note_links (
  id         uuid primary key default gen_random_uuid(),
  note_id    uuid not null references public.notes(id) on delete cascade,
  todo_id    uuid not null references public.todos(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (note_id, todo_id)
);

create index if not exists note_links_note_id_idx on public.note_links (note_id);
create index if not exists note_links_todo_id_idx on public.note_links (todo_id);

alter table public.note_links enable row level security;

create policy "manage own note links"
  on public.note_links
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
