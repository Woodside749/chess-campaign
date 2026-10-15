-- Chess Campaign: each player's own character from the character creator (profile page).
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run.

-- The character's parts (skin, hair, clothes …) as a small JSON object. Kept small, and the
-- game only ever draws values it knows (see cleanCharacter in src/portraits.js).
alter table public.profiles
  add column avatar jsonb check (avatar is null or (jsonb_typeof(avatar) = 'object' and pg_column_size(avatar) < 1000));

-- Players may set it on their own profile (the rules from 01-profiles.sql still apply).
grant insert (avatar), update (avatar) on public.profiles to authenticated;
