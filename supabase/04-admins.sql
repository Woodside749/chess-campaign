-- Chess Campaign: admins (they see the developer menu and the auto-win buttons).
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run.

-- Players can't change this themselves: they may only change the columns granted in
-- 01-profiles.sql and 03-profile-look.sql (username, avatar colour, country).
alter table public.profiles add column is_admin boolean not null default false;

-- Tobias is an admin. (To add another admin later, run this line with their email.)
update public.profiles set is_admin = true
  where id = (select id from auth.users where email = 'admin@example.com');
