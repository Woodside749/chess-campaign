import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

// Who is logged in: `user` is the Supabase user (with .email), or null when nobody is.
// `recovering` is true after the player opens the "reset your password" link from the
// email, until they have chosen a new password.
export function useAccount() {
  const [user, setUser] = useState(null)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return { user, recovering, doneRecovering: () => setRecovering(false) }
}
