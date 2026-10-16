import { supabase } from './supabase.js'
import { flagOf, countryName } from './countries.js'
import { PLAYER } from './player.js'

// Friends, saved in Supabase (table `friendships`, see supabase/07-friends.sql). A friendship
// starts as a request from one player (`requester`) to another (`addressee`) and becomes a
// friendship when the addressee accepts it. Nothing here throws: problems come back as
// messages for the screen to show.

// What we read about other players: only what everyone may see.
export const PUBLIC_PROFILE = 'id, username, avatar, avatar_color, country'

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

// Players whose username contains `text`, at most 10: never me, and never anyone I have
// blocked or who has blocked me (Supabase's search_players, see 08-block-report.sql).
export async function searchPlayers(text) {
  const { data, error } = await supabase.rpc('search_players', { query: text })
  if (error) return { error: error.message }
  return { players: data.map(playerCard) }
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

// ---------- Blocking and reporting (see supabase/08-block-report.sql) ----------

// The players I have blocked, as [{ player }], newest first.
export async function loadBlocked() {
  const { data, error } = await supabase
    .from('blocks')
    .select(`created_at, blocked:blocked (${PUBLIC_PROFILE})`)
    .order('created_at', { ascending: false })
  if (error) return { error: error.message }
  return { blocked: data.map((row) => ({ player: playerCard(row.blocked) })) }
}

// Blocks a player (any friendship or request between us ends).
export async function blockPlayer(myId, otherId) {
  const { error } = await supabase.from('blocks').insert({ blocker: myId, blocked: otherId })
  // Blocking someone already blocked is fine.
  if (error?.code === '23505') return null
  return error?.message ?? null
}

export async function unblockPlayer(myId, otherId) {
  const { error } = await supabase.from('blocks').delete().eq('blocker', myId).eq('blocked', otherId)
  return error?.message ?? null
}

// Why a player can be reported (the database only accepts these).
export const REPORT_REASONS = [
  ['username', 'Offensive username'],
  ['chat', 'Inappropriate chat message'],
  ['harassment', 'Harassment or bullying'],
  ['cheating', 'Cheating'],
  ['other', 'Something else'],
]

// Sends a report to the admins. `details` is optional (at most 500 characters).
export async function reportPlayer(myId, otherId, reason, details) {
  const { error } = await supabase
    .from('reports')
    .insert({ reporter: myId, reported: otherId, reason, details: details.trim().slice(0, 500) || null })
  return error?.message ?? null
}

// ---------- Friends' profiles (see supabase/15-friend-profiles.sql) ----------

// A friend's profile: { since (a Date), progress (like progress.js), friends: [player cards] }.
// Only works for my friends.
export async function loadFriendProfile(friendId) {
  const { data, error } = await supabase.rpc('friend_profile', { friend: friendId })
  if (error) return { error: error.message }
  return {
    profile: {
      since: new Date(data.since),
      progress: { tournaments: {}, modeWins: {}, ...data.progress },
      friends: data.friends.map(playerCard),
    },
  }
}
