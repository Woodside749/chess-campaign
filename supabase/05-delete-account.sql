-- Chess Campaign: players can delete their own account (the button on the profile page).
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run.

-- Deletes the logged-in player's account. Their profile and saved progress go with it
-- (they are linked to the account with "on delete cascade").
create function public.delete_my_account() returns void
language sql security definer set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

-- Only logged-in players may call it (and it only ever deletes their own account).
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
