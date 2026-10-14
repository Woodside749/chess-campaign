import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

// Who is logged in: `user` is the Supabase user (with .email), or null when nobody is, and
// `profile` their row in the profiles table ({ username, avatar_color, country,
// created_at, is_admin }), or null until it has loaded. `recovering` is true after the player opens
// the "reset your password" link from the email, until they have chosen a new password.
export function useAccount() {
  const [user, setUser] = useState(null)
  // The loaded profile, with whose it is (so a previous player's never shows).
  const [loaded, setLoaded] = useState({ userId: null, profile: null })
  const [recovering, setRecovering] = useState(false)
  const userId = user?.id
  const profile = userId && loaded.userId === userId ? loaded.profile : null

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    supabase
      .from('profiles')
      .select('username, avatar_color, country, created_at, is_admin')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.warn('Could not load the profile:', error.message)
        if (!cancelled) setLoaded({ userId, profile: data ?? {} })
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  // Saves changes to the player's profile, like { avatar_color: '#d64545' }. Returns an
  // error message, or null when it worked.
  async function updateProfile(changes) {
    // Change the profile row (every account gets one when it is created). Only an account
    // from before profiles existed has none; then the row is added instead.
    const { data: changed, error } = await supabase.from('profiles').update(changes).eq('id', userId).select('id')
    if (error) return error.message
    if (changed.length === 0) {
      const { error: insertError } = await supabase.from('profiles').insert({ id: userId, ...changes })
      if (insertError) return insertError.message
    }
    // The username is also kept with the login, so it shows straight away on every device.
    if (changes.username) {
      const { error: metaError } = await supabase.auth.updateUser({ data: { username: changes.username } })
      if (metaError) return metaError.message
    }
    setLoaded((current) => ({ userId, profile: { ...current.profile, ...changes } }))
    return null
  }

  return { user, profile, recovering, updateProfile, doneRecovering: () => setRecovering(false) }
}

// The name shown for a logged-in player: their username, or (for an account made before
// usernames existed) the start of their email.
export function displayName(account) {
  const { user, profile } = account
  return profile?.username ?? user.user_metadata?.username ?? user.email.split('@')[0]
}
