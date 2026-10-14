-- Chess Campaign: player profiles (for now just the username).
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run.

-- One row per account. Usernames: 3–20 letters, digits, _ or -, and no two the same
-- (Tobias and tobias count as the same name).
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text check (username ~ '^[A-Za-z0-9_-]{3,20}$'),
  created_at timestamptz not null default now()
);
create unique index profiles_username_unique on public.profiles (lower(username));

-- Who may do what: everyone may see usernames; players may only add and change their own.
alter table public.profiles enable row level security;
grant select on public.profiles to anon, authenticated;
grant insert (id, username), update (username) on public.profiles to authenticated;
create policy "Usernames are public" on public.profiles
  for select using (true);
create policy "Players add their own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "Players change their own username" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- A new account gets its profile row straight away, with the username from the sign-up form.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username) values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- The sign-up form asks this before creating the account: is the name already taken?
create function public.username_taken(name text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles where lower(username) = lower(name));
$$;
grant execute on function public.username_taken(text) to anon, authenticated;
