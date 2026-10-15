-- Chess Campaign: blocking and reporting players.
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run.

-- ---------- Blocking ----------
-- A block hides two players from each other: no search results, no friend requests (and the
-- friendship between them ends), and later no chat messages.
create table public.blocks (
  blocker uuid not null references public.profiles (id) on delete cascade, -- who blocked
  blocked uuid not null references public.profiles (id) on delete cascade, -- who was blocked
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

-- Players only see, add and remove their own blocks.
alter table public.blocks enable row level security;
grant select, delete on public.blocks to authenticated;
grant insert (blocker, blocked) on public.blocks to authenticated;
create policy "Players see their own blocks" on public.blocks
  for select to authenticated using ((select auth.uid()) = blocker);
create policy "Players block as themselves" on public.blocks
  for insert to authenticated with check ((select auth.uid()) = blocker);
create policy "Players remove their own blocks" on public.blocks
  for delete to authenticated using ((select auth.uid()) = blocker);

-- True if the logged-in player and `other` have blocked each other (either way). It can
-- see blocks the player can't (being blocked is not shown to anyone), but only answers about
-- the logged-in player.
create function public.blocked_with(other uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker = auth.uid() and blocked = other) or (blocker = other and blocked = auth.uid())
  );
$$;
revoke execute on function public.blocked_with(uuid) from public, anon;
grant execute on function public.blocked_with(uuid) to authenticated;

-- Blocking ends any friendship or request between the two players.
create function public.end_friendship_on_block() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.friendships
  where (requester = new.blocker and addressee = new.blocked) or (requester = new.blocked and addressee = new.blocker);
  return new;
end;
$$;
create trigger end_friendship_on_block
  after insert on public.blocks
  for each row execute procedure public.end_friendship_on_block();

-- No friend requests between players who have blocked each other.
drop policy "Players send requests as themselves" on public.friendships;
create policy "Players send requests as themselves" on public.friendships
  for insert to authenticated
  with check ((select auth.uid()) = requester and status = 'pending' and not public.blocked_with(addressee));

-- Searching players by username (the Friends screen): never yourself, and never anyone you
-- have blocked or who has blocked you. Exact matches come first.
create function public.search_players(query text)
returns table (id uuid, username text, avatar jsonb, avatar_color text, country text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.username, p.avatar, p.avatar_color, p.country
  from public.profiles p
  where length(query) >= 2
    and p.username is not null
    and p.id <> auth.uid()
    and position(lower(query) in lower(p.username)) > 0
    and not public.blocked_with(p.id)
  order by lower(p.username) = lower(query) desc, p.username
  limit 10;
$$;
revoke execute on function public.search_players(text) from public, anon;
grant execute on function public.search_players(text) to authenticated;

-- ---------- Reporting ----------
-- Reports go to the admins (Supabase → Table Editor → reports). Players can send them, but
-- can't read anyone's reports, not even their own.
create table public.reports (
  id bigint generated always as identity primary key,
  reporter uuid not null references public.profiles (id) on delete cascade,
  reported uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('username', 'character', 'harassment', 'cheating', 'other')),
  details text check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now(),
  check (reporter <> reported)
);

alter table public.reports enable row level security;
grant insert (reporter, reported, reason, details) on public.reports to authenticated;
grant select, update (status) on public.reports to authenticated;
create policy "Players report as themselves" on public.reports
  for insert to authenticated with check ((select auth.uid()) = reporter);
create policy "Admins read reports" on public.reports
  for select to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin));
create policy "Admins mark reports done" on public.reports
  for update to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin));
