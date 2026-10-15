-- Chess Campaign: online clocks start with White's first move (for every online game, and so
-- a simul host doesn't lose time while friends accept their boards).
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run.
-- (This replaces two functions from 10-online-games.sql; no data is changed.)

create or replace function public.play_move(game_id bigint, ply integer, move jsonb, result jsonb default null) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  g public.games;
  me text;
  mover text;
  left_ms integer;
begin
  select * into g from public.games where id = game_id for update;
  if not found or g.status <> 'active' then raise exception 'This game is over.'; end if;
  me := public.my_color(g);
  if jsonb_array_length(g.moves) <> ply then raise exception 'Out of sync with the game.'; end if;
  mover := case when ply % 2 = 0 then 'w' else 'b' end;
  if mover <> me then raise exception 'It is not your turn.'; end if;
  left_ms := case when mover = 'w' then g.white_ms else g.black_ms end;
  -- The clocks start with White's first move (ply 0 is free), so nobody loses time while
  -- waiting for the game to begin (like in a simul, where the host starts boards one by one).
  if g.timed and ply > 0 then
    left_ms := left_ms - (extract(epoch from now() - g.turn_started_at) * 1000)::integer;
    -- A little leeway for the move's trip over the internet.
    if left_ms < -1500 then raise exception 'Your time ran out.'; end if;
    left_ms := greatest(left_ms, 0) + g.increment_ms;
  end if;
  update public.games set
    moves = g.moves || jsonb_build_array(move),
    white_ms = case when mover = 'w' then left_ms else g.white_ms end,
    black_ms = case when mover = 'b' then left_ms else g.black_ms end,
    turn_started_at = now(),
    draw_offer = null,
    status = case when play_move.result is null then 'active' else 'finished' end,
    result = play_move.result
  where id = play_move.game_id;
end;
$$;

create or replace function public.claim_timeout(game_id bigint, result jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  g public.games;
  mover text;
  left_ms integer;
begin
  select * into g from public.games where id = game_id for update;
  -- No timeouts before White's first move: the clocks haven't started yet.
  if not found or g.status <> 'active' or not g.timed or jsonb_array_length(g.moves) = 0 then return; end if;
  perform public.my_color(g);
  mover := case when jsonb_array_length(g.moves) % 2 = 0 then 'w' else 'b' end;
  left_ms := (case when mover = 'w' then g.white_ms else g.black_ms end)
    - (extract(epoch from now() - g.turn_started_at) * 1000)::integer;
  if left_ms > 500 then raise exception 'There is still time left.'; end if;
  update public.games set
    white_ms = case when mover = 'w' then 0 else g.white_ms end,
    black_ms = case when mover = 'b' then 0 else g.black_ms end,
    status = 'finished',
    result = claim_timeout.result
  where id = game_id;
end;
$$;
