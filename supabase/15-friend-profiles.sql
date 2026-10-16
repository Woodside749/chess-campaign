-- Chess Campaign: friends' profiles. Clicking a friend shows their profile: their title and
-- stars, achievements and game mode trophies (from their saved progress), their online
-- ratings (already public) and their friends. Progress and friend lists stay private
-- otherwise: only the player's friends can see them, through this function.
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run.

-- A friend's profile as { since, progress, friends: [{ id, username, avatar, avatar_color,
-- country }] }. Fails unless `friend` is my friend. Their friends leave out anyone I have
-- blocked or who has blocked me.
create function public.friend_profile(friend uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'Log in to see profiles.'; end if;
  if not exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester = me and f.addressee = friend) or (f.requester = friend and f.addressee = me))
  ) then
    raise exception 'Only friends can see this profile.';
  end if;
  return jsonb_build_object(
    'since', (select p.created_at from public.profiles p where p.id = friend),
    'progress', coalesce((select pr.data from public.progress pr where pr.user_id = friend), '{}'::jsonb),
    'friends', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', p.id, 'username', p.username, 'avatar', p.avatar, 'avatar_color', p.avatar_color, 'country', p.country)
        order by lower(p.username)
      )
      from public.friendships f
      join public.profiles p on p.id = case when f.requester = friend then f.addressee else f.requester end
      where f.status = 'accepted' and friend in (f.requester, f.addressee) and not public.blocked_with(p.id)
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.friend_profile(uuid) from public, anon;
grant execute on function public.friend_profile(uuid) to authenticated;
