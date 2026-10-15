-- Chess Campaign: games between players (invites, live moves, clocks kept by the server).
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run.

-- ---------- Games ----------
-- One row per game. Players never change it directly: moves, resigning, draws and timeouts
-- go through the functions below, which check that it is really that player's turn and keep
-- the clocks with the server's own time (so nobody can cheat the clock).
create table public.games (
  id bigint generated always as identity primary key,
  white uuid not null references public.profiles (id) on delete cascade,
  black uuid not null references public.profiles (id) on delete cascade,
  mode text not null check (char_length(mode) <= 40),       -- the game mode, like 'fog'
  variant text check (char_length(variant) <= 40),           -- its rules (null = normal chess)
  timed boolean not null,
  base_ms integer not null check (base_ms between 0 and 3600000),
  increment_ms integer not null default 0 check (increment_ms between 0 and 60000),
  seed bigint not null,                    -- shared random numbers (Fischer Random, Chaos, dice)
  moves jsonb not null default '[]'::jsonb,  -- every move, like { from, to, promotion, duck }
  white_ms integer not null,               -- time left when the current turn began
  black_ms integer not null,
  turn_started_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'finished')),
  result jsonb,                            -- { winner: 'w', 'b' or null, reason }
  draw_offer text check (draw_offer in ('w', 'b')),  -- who offered a draw
  created_at timestamptz not null default now(),
  check (white <> black)
);
create index games_white on public.games (white, status);
create index games_black on public.games (black, status);

alter table public.games enable row level security;
grant select on public.games to authenticated;
create policy "Players see their own games" on public.games
  for select to authenticated using ((select auth.uid()) in (white, black));

-- ---------- Invites ----------
create table public.game_invites (
  id bigint generated always as identity primary key,
  sender uuid not null references public.profiles (id) on delete cascade,
  receiver uuid not null references public.profiles (id) on delete cascade,
  mode text not null check (char_length(mode) <= 40),
  variant text check (char_length(variant) <= 40),
  timed boolean not null default true,
  minutes integer not null default 10 check (minutes between 1 and 60),
  increment integer not null default 0 check (increment between 0 and 30),
  color text not null default 'random' check (color in ('w', 'b', 'random')),  -- the sender's colour
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  game_id bigint references public.games (id) on delete set null,
  created_at timestamptz not null default now(),
  check (sender <> receiver)
);
-- One open invite at a time from one player to another.
create unique index game_invites_one_pending on public.game_invites (sender, receiver) where status = 'pending';

alter table public.game_invites enable row level security;
grant select on public.game_invites to authenticated;
grant insert (sender, receiver, mode, variant, timed, minutes, increment, color) on public.game_invites to authenticated;
create policy "Players see their own invites" on public.game_invites
  for select to authenticated using ((select auth.uid()) in (sender, receiver));
create policy "Players invite as themselves" on public.game_invites
  for insert to authenticated
  with check ((select auth.uid()) = sender and status = 'pending' and not public.blocked_with(receiver));

-- An unanswered invite expires after 10 minutes. Before a new invite to the same player, the
-- sender's expired ones are closed, so they don't block it.
create function public.close_expired_invites() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.game_invites set status = 'cancelled'
  where sender = new.sender and receiver = new.receiver and status = 'pending'
    and created_at < now() - interval '10 minutes';
  return new;
end;
$$;
create trigger close_expired_invites
  before insert on public.game_invites
  for each row execute procedure public.close_expired_invites();

-- ---------- Functions the game calls ----------

-- Accepting (or declining) an invite. Accepting starts the game and returns its id.
-- Invites older than 10 minutes have expired.
create function public.answer_invite(invite_id bigint, accept boolean) returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  inv public.game_invites;
  sender_white boolean;
  new_game bigint;
begin
  select * into inv from public.game_invites
    where id = invite_id and receiver = auth.uid() and status = 'pending' for update;
  if not found then raise exception 'This invite is no longer open.'; end if;
  if not accept then
    update public.game_invites set status = 'declined' where id = invite_id;
    return null;
  end if;
  if inv.created_at < now() - interval '10 minutes' then
    update public.game_invites set status = 'cancelled' where id = invite_id;
    raise exception 'This invite has expired.';
  end if;
  sender_white := case inv.color when 'w' then true when 'b' then false else random() < 0.5 end;
  insert into public.games (white, black, mode, variant, timed, base_ms, increment_ms, seed, white_ms, black_ms)
  values (
    case when sender_white then inv.sender else inv.receiver end,
    case when sender_white then inv.receiver else inv.sender end,
    inv.mode, inv.variant, inv.timed, inv.minutes * 60000, inv.increment * 1000,
    floor(random() * 2147483647)::bigint, inv.minutes * 60000, inv.minutes * 60000
  )
  returning id into new_game;
  update public.game_invites set status = 'accepted', game_id = new_game where id = invite_id;
  return new_game;
end;
$$;

-- The sender takes an invite back.
create function public.cancel_invite(invite_id bigint) returns void
language sql security definer set search_path = ''
as $$
  update public.game_invites set status = 'cancelled'
  where id = invite_id and sender = auth.uid() and status = 'pending';
$$;

-- The logged-in player's colour in a game ('w' or 'b'), or an error if it isn't their game.
create function public.my_color(g public.games) returns text
language plpgsql stable set search_path = ''
as $$
begin
  if auth.uid() = g.white then return 'w'; end if;
  if auth.uid() = g.black then return 'b'; end if;
  raise exception 'This is not your game.';
end;
$$;

-- Plays a move. `ply` is how many moves were played before it (so a move can't be played
-- twice, or against an old position). The clock of the player who moved loses the time since
-- their turn began (by the server's time) and gains the increment. `result` is set when the
-- move ends the game (checkmate and so on, worked out by the game).
create function public.play_move(game_id bigint, ply integer, move jsonb, result jsonb default null) returns void
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
  if g.timed then
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

-- Ends the game when the player to move has run out of time (checked with the server's time).
-- `result` comes from the game (a draw if the other side can't checkmate).
create function public.claim_timeout(game_id bigint, result jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  g public.games;
  mover text;
  left_ms integer;
begin
  select * into g from public.games where id = game_id for update;
  if not found or g.status <> 'active' or not g.timed then return; end if;
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

create function public.resign_game(game_id bigint) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  g public.games;
  me text;
begin
  select * into g from public.games where id = game_id for update;
  if not found or g.status <> 'active' then return; end if;
  me := public.my_color(g);
  update public.games set status = 'finished',
    result = jsonb_build_object('winner', case when me = 'w' then 'b' else 'w' end, 'reason', 'resigned')
  where id = game_id;
end;
$$;

-- Offering a draw, and answering the other player's offer.
create function public.offer_draw(game_id bigint) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  g public.games;
begin
  select * into g from public.games where id = game_id for update;
  if not found or g.status <> 'active' then return; end if;
  update public.games set draw_offer = public.my_color(g) where id = game_id;
end;
$$;

create function public.answer_draw(game_id bigint, accept boolean) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  g public.games;
  me text;
begin
  select * into g from public.games where id = game_id for update;
  if not found or g.status <> 'active' then return; end if;
  me := public.my_color(g);
  if g.draw_offer is null or g.draw_offer = me then return; end if;
  if accept then
    update public.games set status = 'finished', draw_offer = null,
      result = jsonb_build_object('winner', null, 'reason', 'agreed')
    where id = game_id;
  else
    update public.games set draw_offer = null where id = game_id;
  end if;
end;
$$;

-- Only logged-in players may call the functions (they check the rest themselves).
revoke execute on function public.answer_invite(bigint, boolean) from public, anon;
revoke execute on function public.cancel_invite(bigint) from public, anon;
revoke execute on function public.my_color(public.games) from public, anon;
revoke execute on function public.play_move(bigint, integer, jsonb, jsonb) from public, anon;
revoke execute on function public.claim_timeout(bigint, jsonb) from public, anon;
revoke execute on function public.resign_game(bigint) from public, anon;
revoke execute on function public.offer_draw(bigint) from public, anon;
revoke execute on function public.answer_draw(bigint, boolean) from public, anon;
grant execute on function public.answer_invite(bigint, boolean) to authenticated;
grant execute on function public.cancel_invite(bigint) to authenticated;
grant execute on function public.my_color(public.games) to authenticated;
grant execute on function public.play_move(bigint, integer, jsonb, jsonb) to authenticated;
grant execute on function public.claim_timeout(bigint, jsonb) to authenticated;
grant execute on function public.resign_game(bigint) to authenticated;
grant execute on function public.offer_draw(bigint) to authenticated;
grant execute on function public.answer_draw(bigint, boolean) to authenticated;

-- Live: moves, invites and answers reach the other player at once.
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_invites;
