-- Chess Campaign: bug reports and feature ideas from players (the 🐞 and 💡 forms), read by the
-- admins on the admin page.
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run.

create table public.feedback (
  id bigint generated always as identity primary key,
  author uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('bug', 'idea')),
  message text not null check (char_length(message) between 1 and 1000),
  context text check (char_length(context) <= 500),  -- bugs: where the player was, and their browser
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now()
);
create index feedback_kind_status on public.feedback (kind, status, created_at desc);

-- Players can send feedback (as themselves), but only admins can read it and mark it done.
alter table public.feedback enable row level security;
grant insert (author, kind, message, context) on public.feedback to authenticated;
grant select, update (status) on public.feedback to authenticated;
create policy "Players send feedback as themselves" on public.feedback
  for insert to authenticated with check ((select auth.uid()) = author);
create policy "Admins read feedback" on public.feedback
  for select to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin));
create policy "Admins mark feedback done" on public.feedback
  for update to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin));

-- Against spam: at most 5 messages an hour from one player.
create function public.feedback_limit() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.feedback where author = new.author and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'You have sent a lot of feedback this hour. Please try again later.';
  end if;
  return new;
end;
$$;
create trigger feedback_limit
  before insert on public.feedback
  for each row execute procedure public.feedback_limit();
