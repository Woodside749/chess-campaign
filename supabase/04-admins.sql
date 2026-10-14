-- Chess Campaign: admins (they see the developer menu and the auto-win buttons).
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run.

-- Players can't change this themselves: they may only change the columns granted in
-- 01-profiles.sql and 03-profile-look.sql (username, avatar colour, country).
alter table public.profiles add column is_admin boolean not null default false;

-- To make someone an admin, put their account's email in place of admin@example.com
-- and run these two lines. (Tobias is already an admin; his email is kept out of the code.)
update public.profiles set is_admin = true
  where id = (select id from auth.users where email = 'admin@example.com');
