import { supabase } from './supabase.js'
import { flagOf, countryName } from './countries.js'
import { PLAYER } from './player.js'

// Friends, saved in Supabase (table `friendships`, see supabase/07-friends.sql). A friendship
// starts as a request from one player (`requester`) to another (`addressee`) and becomes a
// friendship when the addressee accepts it. Nothing here throws: problems come back as
// messages for the screen to show.

// What we read about other players: only what everyone may see.
const PUBLIC_PROFILE = 'id, username, avatar, avatar_color, country'

// Another player in the form the Avatar component expects (like a bot).
export function playerCard(profile) {
  return {
    id: profile.id,
    name: profile.username ?? 'Player',
    color: profile.avatar_color ?? PLAYER.color,
    flag: flagOf(profile.country),
    country: countryName(profile.country),
    character: profile.avatar ?? null,
  }
}

// All of my friendships and requests, sorted into
// { friends: [{ id, player }], incoming: [...], outgoing: [...] }
// (`id` is the friendship's, `player` the other player's card).
export async function loadFriendships(myId) {
  const { data, error } = await supabase
    .from('friendships')
    .select(`id, status, requester:requester (${PUBLIC_PROFILE}), addressee:addressee (${PUBLIC_PROFILE})`)
    .order('created_at', { ascending: false })
  if (error) return { error: error.message }
  const lists = { friends: [], incoming: [], outgoing: [] }
  for (const row of data) {
    const iAsked = row.requester.id === myId
    const other = playerCard(iAsked ? row.addressee : row.requester)
    const list = row.status === 'accepted' ? 'friends' : iAsked ? 'outgoing' : 'incoming'
    lists[list].push({ id: row.id, player: other })
  }
  lists.friends.sort((a, b) => a.player.name.localeCompare(b.player.name))
  return { lists }
}

// Players whose username contains `text` (not me), at most 10.
export async function searchPlayers(text, myId) {
  // % and _ are wildcards in a search, so they are searched for as plain characters.
  const escaped = text.replace(/[\\%_]/g, (c) => '\\' + c)
  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE)
    .ilike('username', `%${escaped}%`)
    .neq('id', myId)
    .order('username')
    .limit(10)
  if (error) return { error: error.message }
  return { players: data.filter((profile) => profile.username).map(playerCard) }
}

export async function sendRequest(myId, otherId) {
  const { error } = await supabase.from('friendships').insert({ requester: myId, addressee: otherId })
  // The database refuses a second request between the same two players.
  if (error?.code === '23505') return 'You already have a friend request with this player.'
  return error?.message ?? null
}

export async function acceptRequest(friendshipId) {
  const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
  return error?.message ?? null
}

// Declines or cancels a request, or removes a friend.
export async function removeFriendship(friendshipId) {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
  return error?.message ?? null
}

// Calls `onChange` whenever one of my friendships changes (a new request, an accepted one,
// a removed friend). Returns a function that stops listening.
export function watchFriendships(myId, onChange) {
  const channel = supabase
    .channel(`friendships-${myId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, onChange)
    .subscribe()
  return () => supabase.removeChannel(channel)
}
