-- Chess Campaign: friends. A friendship starts as a request (pending) and becomes a
-- friendship (accepted) when the other player accepts it.
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run.

create table public.friendships (
  id bigint generated always as identity primary key,
  requester uuid not null references public.profiles (id) on delete cascade, -- who asked
  addressee uuid not null references public.profiles (id) on delete cascade, -- who was asked
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);

-- Two players can only have one friendship (or request) between them, whoever asked.
create unique index friendships_pair_unique
  on public.friendships (least(requester, addressee), greatest(requester, addressee));

-- Who may do what: players only see their own friendships and requests; they can ask
-- someone (as themselves), only the player who was asked can accept, and either player
-- can delete it (decline, cancel or remove the friend).
alter table public.friendships enable row level security;
grant select, delete on public.friendships to authenticated;
grant insert (requester, addressee), update (status) on public.friendships to authenticated;

create policy "Players see their own friendships" on public.friendships
  for select to authenticated using ((select auth.uid()) in (requester, addressee));
create policy "Players send requests as themselves" on public.friendships
  for insert to authenticated with check ((select auth.uid()) = requester and status = 'pending');
create policy "Only the player asked can accept" on public.friendships
  for update to authenticated
  using ((select auth.uid()) = addressee and status = 'pending')
  with check (status = 'accepted');
create policy "Either player can remove a friendship" on public.friendships
  for delete to authenticated using ((select auth.uid()) in (requester, addressee));

-- Live updates: the Friends screen hears about new requests and accepted ones at once.
alter publication supabase_realtime add table public.friendships;
