-- Chess Campaign: Play online. Rated games against other players (an Elo rating for each game
-- mode, starting at 1200), and matchmaking that pairs players with the closest ratings.
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run.

-- ---------- Ratings ----------
-- One row per player and game mode (a mode without a row means 1200 and no games yet).
-- Everyone may see ratings; only the server changes them, when a rated game ends.
create table public.ratings (
  player uuid not null references public.profiles (id) on delete cascade,
  mode text not null check (char_length(mode) <= 40),
  rating integer not null default 1200,
  games integer not null default 0,
  primary key (player, mode)
);
alter table public.ratings enable row level security;
grant select on public.ratings to anon, authenticated;
create policy "Ratings are public" on public.ratings for select using (true);

-- Games from Play online are rated; they remember both ratings before the game and the change.
alter table public.games
  add column rated boolean not null default false,
  add column white_rating integer,
  add column black_rating integer,
  add column white_change integer,
  add column black_change integer;

-- How much a rating can move in one game: a lot in a player's first games in a mode (while
-- their real level is still being found): ±100 against an equal opponent in the first game,
-- then quickly less (±59, ±36, ±23 …), and ±8 (K = 16) from the 10th game on.
create function public.rating_k(games integer) returns numeric
language sql immutable set search_path = ''
as $$
  select 16 + 184 * power(0.55, games);
$$;

-- When a rated game ends (not aborted), both ratings change (Elo: the expected score against
-- that opponent decides how many points a win, draw or loss is worth).
create function public.rate_game() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  w public.ratings;
  b public.ratings;
  expected_w numeric;
  score_w numeric;
begin
  if not new.rated or old.status <> 'active' or new.status <> 'finished' or new.result ->> 'reason' = 'aborted' then
    return new;
  end if;
  insert into public.ratings (player, mode) values (new.white, new.mode), (new.black, new.mode) on conflict do nothing;
  select * into w from public.ratings where player = new.white and mode = new.mode for update;
  select * into b from public.ratings where player = new.black and mode = new.mode for update;
  expected_w := 1 / (1 + power(10, (b.rating - w.rating) / 400.0));
  score_w := case new.result ->> 'winner' when 'w' then 1 when 'b' then 0 else 0.5 end;
  new.white_rating := w.rating;
  new.black_rating := b.rating;
  new.white_change := round(public.rating_k(w.games) * (score_w - expected_w));
  new.black_change := round(public.rating_k(b.games) * ((1 - score_w) - (1 - expected_w)));
  update public.ratings set rating = rating + new.white_change, games = games + 1 where player = new.white and mode = new.mode;
  update public.ratings set rating = rating + new.black_change, games = games + 1 where player = new.black and mode = new.mode;
  return new;
end;
$$;
create trigger rate_game
  before update on public.games
  for each row execute procedure public.rate_game();

-- Before move 2, either player can call a game off (for example if White never moves). An
-- aborted game doesn't change any rating.
create function public.abort_game(game_id bigint) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  g public.games;
begin
  select * into g from public.games where id = game_id for update;
  if not found or g.status <> 'active' then return; end if;
  perform public.my_color(g);
  if jsonb_array_length(g.moves) >= 2 then raise exception 'The game has started; you can resign instead.'; end if;
  update public.games set status = 'finished', result = jsonb_build_object('winner', null, 'reason', 'aborted')
  where id = game_id;
end;
$$;

-- ---------- Matchmaking ----------
-- Players looking for a game. A search keeps itself alive by asking again every few seconds;
-- searches not renewed for 15 seconds are dropped.
create table public.seeks (
  player uuid primary key references public.profiles (id) on delete cascade,
  mode text not null,
  variant text,
  timed boolean not null,
  minutes integer not null,
  increment integer not null default 0,
  rating integer not null,
  started_at timestamptz not null default now(),   -- when this search began
  renewed_at timestamptz not null default now(),   -- the last time the player asked again
  game_id bigint references public.games (id) on delete set null  -- set when someone matched them
);
alter table public.seeks enable row level security;
-- Players never touch the table directly; find_game and stop_searching do it for them.

-- Looks for an opponent (and keeps the search going). Returns the new game's id once matched,
-- otherwise null (ask again in a few seconds). The opponent is the player searching the same
-- mode and clock with the closest rating; the allowed difference grows the longer the
-- player has been waiting (100 points at first, up to 800).
create function public.find_game(mode text, variant text, timed boolean, minutes integer, increment integer) returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  mine public.seeks;
  my_rating integer;
  allowed integer;
  other public.seeks;
  me_white boolean;
  new_game bigint;
begin
  if me is null then raise exception 'Log in to play online.'; end if;
  delete from public.seeks where renewed_at < now() - interval '15 seconds' and game_id is null;

  -- Someone already matched me: hand over the game.
  select * into mine from public.seeks where player = me;
  if found and mine.game_id is not null then
    delete from public.seeks where player = me;
    return mine.game_id;
  end if;

  select coalesce((select rating from public.ratings r where r.player = me and r.mode = find_game.mode), 1200) into my_rating;
  -- Start (or renew) my search, keeping when it began if the settings are the same.
  insert into public.seeks (player, mode, variant, timed, minutes, increment, rating)
  values (me, find_game.mode, find_game.variant, find_game.timed, find_game.minutes, find_game.increment, my_rating)
  on conflict (player) do update set
    started_at = case
      when seeks.mode = excluded.mode and seeks.variant is not distinct from excluded.variant and seeks.timed = excluded.timed
        and seeks.minutes = excluded.minutes and seeks.increment = excluded.increment then seeks.started_at
      else now() end,
    mode = excluded.mode, variant = excluded.variant, timed = excluded.timed, minutes = excluded.minutes,
    increment = excluded.increment, rating = excluded.rating, renewed_at = now(), game_id = null
  returning * into mine;

  allowed := least(800, 100 + 20 * extract(epoch from now() - mine.started_at)::integer);
  select * into other from public.seeks s
    where s.player <> me and s.game_id is null
      and s.mode = mine.mode and s.variant is not distinct from mine.variant and s.timed = mine.timed
      and s.minutes = mine.minutes and s.increment = mine.increment
      and abs(s.rating - my_rating) <= allowed
      and not public.blocked_with(s.player)
    order by abs(s.rating - my_rating), s.started_at
    limit 1
    for update skip locked;
  if not found then return null; end if;

  me_white := random() < 0.5;
  insert into public.games (white, black, mode, variant, timed, base_ms, increment_ms, seed, white_ms, black_ms, rated)
  values (
    case when me_white then me else other.player end,
    case when me_white then other.player else me end,
    mine.mode, mine.variant, mine.timed, mine.minutes * 60000, mine.increment * 1000,
    floor(random() * 2147483647)::bigint, mine.minutes * 60000, mine.minutes * 60000, true
  )
  returning id into new_game;
  -- The opponent finds out the next time they ask (within a few seconds).
  update public.seeks set game_id = new_game where player = other.player;
  delete from public.seeks where player = me;
  return new_game;
end;
$$;

create function public.stop_searching() returns void
language sql security definer set search_path = ''
as $$
  delete from public.seeks where player = auth.uid() and game_id is null;
$$;

revoke execute on function public.abort_game(bigint) from public, anon;
revoke execute on function public.find_game(text, text, boolean, integer, integer) from public, anon;
revoke execute on function public.stop_searching() from public, anon;
grant execute on function public.abort_game(bigint) to authenticated;
grant execute on function public.find_game(text, text, boolean, integer, integer) to authenticated;
grant execute on function public.stop_searching() to authenticated;
