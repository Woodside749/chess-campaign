-- Chess Campaign: the global chat on the main menu.
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run.
-- (Supabase warns about "destructive operations": that is the report reasons being replaced
-- by a list with "chat" added, at the bottom. No data is lost.)

-- Messages: short, no links, and only for logged-in players. Players only ever see the last
-- hour; older messages are deleted whenever someone writes.
create table public.chat_messages (
  id bigint generated always as identity primary key,
  author uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 200),
  created_at timestamptz not null default now(),
  -- No links: web addresses, "www." and names like something.com are refused.
  check (body !~* '(https?://|www\.|[a-z0-9-]*[a-z][a-z0-9-]*\.(com|net|org|io|gg|me|co|dk|no|se|de|uk|ly|app|xyz|ru|info|tv|be|nl|fr|es|it|link|site|online|club|live|ai)(\M|/))')
);
create index chat_messages_created_at on public.chat_messages (created_at);

alter table public.chat_messages enable row level security;
grant select, delete on public.chat_messages to authenticated;
grant insert (author, body) on public.chat_messages to authenticated;

-- Players see the last hour of messages, except from players they blocked or who blocked them.
create policy "Players read the last hour" on public.chat_messages
  for select to authenticated
  using (created_at > now() - interval '1 hour' and not public.blocked_with(author));
create policy "Players write as themselves" on public.chat_messages
  for insert to authenticated with check ((select auth.uid()) = author);
-- Admins can delete any message (the 🗑 next to it).
create policy "Admins delete messages" on public.chat_messages
  for delete to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin));

-- Before each new message: delete messages older than an hour, and refuse a player's message
-- if their last one was less than 2 seconds ago (against spam).
create function public.chat_before_insert() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.chat_messages where created_at < now() - interval '1 hour';
  if exists (
    select 1 from public.chat_messages where author = new.author and created_at > now() - interval '2 seconds'
  ) then
    raise exception 'Slow down a little: one message every 2 seconds.';
  end if;
  new.body := btrim(new.body);
  return new;
end;
$$;
create trigger chat_before_insert
  before insert on public.chat_messages
  for each row execute procedure public.chat_before_insert();

-- Live: new messages appear for everyone at once.
alter publication supabase_realtime add table public.chat_messages;

-- Reports can be about a chat message too (the message is copied into the report's details,
-- since the message itself is deleted after an hour).
alter table public.reports drop constraint reports_reason_check;
alter table public.reports add constraint reports_reason_check
  check (reason in ('username', 'chat', 'harassment', 'cheating', 'other'));
