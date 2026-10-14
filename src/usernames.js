import { supabase } from './supabase.js'

// Usernames: 3–20 letters, digits, _ or -. No two players may have the same one (the
// database checks too, ignoring upper and lower case; see supabase/01-profiles.sql).
export const USERNAME = /^[A-Za-z0-9_-]{3,20}$/
export const USERNAME_RULE = '3 to 20 letters or digits (and _ or -), no spaces.'

// Checks a username; returns an error message, or null when it is fine and free.
export async function usernameProblem(username) {
  if (!USERNAME.test(username)) return `The username needs ${USERNAME_RULE.toLowerCase()}`
  const { data: taken, error } = await supabase.rpc('username_taken', { name: username })
  if (error) return error.message
  return taken ? `${username} is already taken. Try another one.` : null
}
