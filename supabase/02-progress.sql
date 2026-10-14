-- Chess Campaign: each player's saved progress (campaign rounds won, game mode trophies).
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run.

-- One row per account. `data` holds the same progress the game keeps in the browser.
create table public.progress (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Players may only see and change their own progress.
alter table public.progress enable row level security;
grant select, insert, update on public.progress to authenticated;
create policy "Players see their own progress" on public.progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Players add their own progress" on public.progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Players change their own progress" on public.progress
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
