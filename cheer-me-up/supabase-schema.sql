-- Run this file in the Supabase SQL Editor.
-- Then enable Anonymous Sign-Ins under Authentication > Providers.

create extension if not exists pgcrypto;

create table if not exists public.moods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  mood smallint not null check (mood between 1 and 5),
  note text not null default '' check (char_length(note) <= 180),
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  type text not null check (type in ('quote', 'advice', 'cat', 'dog')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.moods enable row level security;
alter table public.favorites enable row level security;

create policy "Users can view their own moods"
on public.moods for select
using (auth.uid() = user_id);

create policy "Users can add their own moods"
on public.moods for insert
with check (auth.uid() = user_id);

create policy "Users can delete their own moods"
on public.moods for delete
using (auth.uid() = user_id);

create policy "Users can view their own favorites"
on public.favorites for select
using (auth.uid() = user_id);

create policy "Users can add their own favorites"
on public.favorites for insert
with check (auth.uid() = user_id);

create policy "Users can delete their own favorites"
on public.favorites for delete
using (auth.uid() = user_id);

create index if not exists moods_user_created_idx
on public.moods (user_id, created_at desc);

create index if not exists favorites_user_created_idx
on public.favorites (user_id, created_at desc);
