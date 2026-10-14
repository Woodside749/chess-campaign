-- Chess Campaign: the profile page's avatar colour and country.
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run.

alter table public.profiles
  add column avatar_color text check (avatar_color ~ '^#[0-9a-fA-F]{6}$'),
  add column country text check (country ~ '^[A-Z]{2}$');

-- Players may set these on their own profile (the rules from 01-profiles.sql still apply:
-- only their own row).
grant insert (avatar_color, country), update (avatar_color, country) on public.profiles to authenticated;
