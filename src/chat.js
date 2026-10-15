import { supabase } from './supabase.js'
import { PUBLIC_PROFILE, playerCard } from './friends.js'

// The global chat (table `chat_messages`, see supabase/09-chat.sql): logged-in players only,
// at most 200 characters, no links, and only the last hour is kept. Supabase enforces all of
// that too; the checks here just explain it before sending. Nothing here throws: problems
// come back as messages for the screen to show.

export const MAX_LENGTH = 200
const HOUR_MS = 60 * 60 * 1000

// Web addresses, "www." and names like something.com (the same rule as in the database).
const LINK =
  /(https?:\/\/|www\.|[a-z0-9-]*[a-z][a-z0-9-]*\.(com|net|org|io|gg|me|co|dk|no|se|de|uk|ly|app|xyz|ru|info|tv|be|nl|fr|es|it|link|site|online|club|live|ai)(\b|\/))/i

export const hasLink = (text) => LINK.test(text)

// A message as the chat shows it: { id, text, time, author } (author is a player card).
const toMessage = (row, author) => ({ id: row.id, text: row.body, time: new Date(row.created_at), author })

// The messages of the last hour, oldest first (at most the newest 100).
export async function loadMessages() {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(`id, body, created_at, author:author (${PUBLIC_PROFILE})`)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return { error: error.message }
  return { messages: data.reverse().map((row) => toMessage(row, playerCard(row.author))) }
}

export async function sendMessage(myId, text) {
  const body = text.trim()
  if (!body) return null
  if (hasLink(body)) return "Links aren't allowed in the chat."
  if (body.length > MAX_LENGTH) return `Messages can be at most ${MAX_LENGTH} characters.`
  const { error } = await supabase.from('chat_messages').insert({ author: myId, body })
  if (!error) return null
  // The database's own explanation for slow mode, or a plain one for the other rules.
  if (error.message.includes('Slow down')) return 'Slow down a little: one message every 2 seconds.'
  if (error.code === '23514') return "That message isn't allowed (no links, at most 200 characters)."
  return error.message
}

// Admins only: deletes a message for everyone.
export async function deleteMessage(id) {
  const { error } = await supabase.from('chat_messages').delete().eq('id', id)
  return error?.message ?? null
}

// Player cards of message authors, so a new message only fetches its author once.
const authors = new Map()
async function authorOf(id) {
  if (!authors.has(id)) {
    const { data } = await supabase.from('profiles').select(PUBLIC_PROFILE).eq('id', id).maybeSingle()
    authors.set(id, playerCard(data ?? { id }))
  }
  return authors.get(id)
}

// Listens for new and deleted messages: `onMessage(message)` and `onDelete(id)`. Returns a
// function that stops listening.
export function watchChat(onMessage, onDelete) {
  const channel = supabase
    .channel('global-chat')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async ({ new: row }) =>
      onMessage(toMessage(row, await authorOf(row.author))),
    )
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, ({ old }) => onDelete(old.id))
    .subscribe()
  return () => supabase.removeChannel(channel)
}

// True for a message more than an hour old (the chat drops those as time passes).
export const tooOld = (message, now = Date.now()) => now - message.time.getTime() > HOUR_MS
