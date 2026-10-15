import { supabase } from './supabase.js'
import { PUBLIC_PROFILE, playerCard } from './friends.js'

// Games between players (tables `game_invites` and `games`, see supabase/10-online-games.sql).
// Invites carry the game's settings; accepting one starts a game. Moves, resigning, draws and
// timeouts go through the server's functions, which keep the clocks. Nothing here throws:
// problems come back as messages for the screen to show.

// Invites older than this have expired (the server agrees).
const INVITE_MINUTES = 10

// ---------- Invites ----------

// Sends an invite. `settings` is { mode, variant, timed, minutes, increment, color } (color
// is the sender's: 'w', 'b' or 'random').
export async function sendInvite(myId, otherId, settings) {
  const { data, error } = await supabase
    .from('game_invites')
    .insert({ sender: myId, receiver: otherId, ...settings, minutes: settings.minutes ?? 10 })
    .select('id')
    .single()
  if (error?.code === '23505') return { error: 'You have already invited this player. Wait for their answer.' }
  if (error) return { error: error.message }
  return { id: data.id }
}

export async function cancelInvite(id) {
  const { error } = await supabase.rpc('cancel_invite', { invite_id: id })
  return error?.message ?? null
}

// Accepts (returns { gameId }) or declines an invite.
export async function answerInvite(id, accept) {
  const { data, error } = await supabase.rpc('answer_invite', { invite_id: id, accept })
  if (error) return { error: error.message }
  return { gameId: data }
}

// My open invites, both ways: { incoming: [...], outgoing: [...] }. Each is
// { id, settings, player } (player is the other player's card).
export async function loadInvites(myId) {
  const since = new Date(Date.now() - INVITE_MINUTES * 60000).toISOString()
  const { data, error } = await supabase
    .from('game_invites')
    .select(`id, mode, variant, timed, minutes, increment, color, sender:sender (${PUBLIC_PROFILE}), receiver:receiver (${PUBLIC_PROFILE})`)
    .eq('status', 'pending')
    .gt('created_at', since)
    .order('created_at')
  if (error) return { error: error.message }
  const invites = { incoming: [], outgoing: [] }
  for (const row of data) {
    const mine = row.sender.id === myId
    const { mode, variant, timed, minutes, increment, color } = row
    invites[mine ? 'outgoing' : 'incoming'].push({
      id: row.id,
      settings: { mode, variant, timed, minutes, increment, color },
      player: playerCard(mine ? row.receiver : row.sender),
    })
  }
  return { invites }
}

// Calls `onChange(row)` whenever one of my invites is sent, answered or cancelled.
export function watchInvites(myId, onChange) {
  const channel = supabase
    .channel(`invites-${myId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_invites' }, ({ new: row }) => onChange(row))
    .subscribe()
  return () => supabase.removeChannel(channel)
}

// ---------- Games ----------

const GAME_FIELDS = `id, mode, variant, timed, base_ms, increment_ms, seed, moves, white_ms, black_ms,
  turn_started_at, status, result, draw_offer, white:white (${PUBLIC_PROFILE}), black:black (${PUBLIC_PROFILE})`

// A game as the game screen uses it, from my side: { id, mode, variant, timed, minutes,
// increment, seed, moves, clock: { w, b, turnStart }, status, result, drawOffer, myColor,
// opponent }.
function fromRow(row, myId) {
  const myColor = row.white.id === myId ? 'w' : 'b'
  return {
    id: row.id,
    mode: row.mode,
    variant: row.variant,
    timed: row.timed,
    minutes: row.base_ms / 60000,
    increment: row.increment_ms / 1000,
    seed: Number(row.seed),
    moves: row.moves,
    clock: { w: row.white_ms, b: row.black_ms, turnStart: Date.parse(row.turn_started_at) },
    status: row.status,
    result: row.result,
    drawOffer: row.draw_offer,
    myColor,
    opponent: playerCard(myColor === 'w' ? row.black : row.white),
  }
}

export async function loadGame(id, myId) {
  const { data, error } = await supabase.from('games').select(GAME_FIELDS).eq('id', id).maybeSingle()
  if (error) return { error: error.message }
  if (!data) return { error: 'This game was not found.' }
  return { game: fromRow(data, myId) }
}

// My games still going (to rejoin them), newest first.
export async function loadActiveGames(myId) {
  const { data, error } = await supabase
    .from('games')
    .select(GAME_FIELDS)
    .eq('status', 'active')
    .or(`white.eq.${myId},black.eq.${myId}`)
    .order('created_at', { ascending: false })
  if (error) return { error: error.message }
  return { games: data.map((row) => fromRow(row, myId)) }
}

// Calls `onChange()` whenever the game changes (a move, a draw offer, the end).
export function watchGame(id, onChange) {
  const channel = supabase
    .channel(`game-${id}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${id}` }, () => onChange())
    .subscribe()
  return () => supabase.removeChannel(channel)
}

const call = async (name, args) => (await supabase.rpc(name, args)).error?.message ?? null

// `ply` is how many moves were played before this one; `result` ({ winner, reason }) is
// set when the move ends the game.
export const playMove = (id, ply, move, result = null) => call('play_move', { game_id: id, ply, move, result })
export const claimTimeout = (id, result) => call('claim_timeout', { game_id: id, result })
export const resignGame = (id) => call('resign_game', { game_id: id })
export const offerDraw = (id) => call('offer_draw', { game_id: id })
export const answerDraw = (id, accept) => call('answer_draw', { game_id: id, accept })
