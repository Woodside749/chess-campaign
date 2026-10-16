-- Chess Campaign: ratings settle faster. Only needed if you already ran 13-play-online.sql
-- before this change (13 now has this version itself).
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run.

-- How much a rating can move in one game: a lot in a player's first games in a mode (while
-- their real level is still being found): ±100 against an equal opponent in the first game,
-- then quickly less (±59, ±36, ±23 …), and ±8 (K = 16) from the 10th game on.
create or replace function public.rating_k(games integer) returns numeric
language sql immutable set search_path = ''
as $$
  select 16 + 184 * power(0.55, games);
$$;
