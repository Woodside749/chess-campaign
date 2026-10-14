import { useState } from 'react'
import { supabase } from './supabase.js'
import { USERNAME_RULE, usernameProblem } from './usernames.js'
import { usePlayer } from './player.js'
import Avatar from './Avatar.jsx'

const MIN_PASSWORD = 8

// The 👤 button on the main menu. Logged out it says "Log in" and opens the login window;
// logged in it shows the player's avatar and username and opens their profile.
// `account` comes from useAccount().
export default function AccountButton({ account, onOpenProfile }) {
  const [open, setOpen] = useState(false)
  const player = usePlayer()
  const { user, recovering } = account

  return (
    <>
      <button className="account-button" onClick={() => (user ? onOpenProfile() : setOpen(true))}>
        {user ? <Avatar bot={{ ...player, flag: '' }} size={28} /> : <span aria-hidden="true">👤</span>}
        <span className="account-name">{user ? player.name : 'Log in'}</span>
      </button>
      {(open || recovering) && (
        <AccountDialog
          account={account}
          onClose={() => {
            setOpen(false)
            account.doneRecovering()
          }}
        />
      )}
    </>
  )
}

// The login window. Its pages: 'login', 'signup', 'forgot' (send a reset link) and
// 'newPassword' (after opening that link from the email).
function AccountDialog({ account, onClose }) {
  const [page, setPage] = useState(account.recovering ? 'newPassword' : 'login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(null) // { text, error }
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false) // after the new password is saved

  function goTo(next) {
    setPage(next)
    setMessage(null)
    setPassword('')
  }

  // Runs one Supabase call, shows its error (if any), and returns whether it worked.
  async function run(call) {
    setBusy(true)
    setMessage(null)
    const { error } = await call()
    setBusy(false)
    // Someone took the same username a moment before us.
    if (error?.message === 'Database error saving new user') {
      setMessage({ text: `${username} was just taken. Try another one.`, error: true })
    } else if (error) {
      setMessage({ text: error.message, error: true })
    }
    return !error
  }

  async function submit(e) {
    e.preventDefault()
    // Links in the emails bring the player back to this website.
    const back = window.location.origin
    if ((page === 'signup' || page === 'newPassword') && password.length < MIN_PASSWORD) {
      setMessage({ text: `The password needs at least ${MIN_PASSWORD} characters.`, error: true })
      return
    }
    if (page === 'login') {
      if (await run(() => supabase.auth.signInWithPassword({ email, password }))) onClose()
    } else if (page === 'signup') {
      setBusy(true)
      const problem = await usernameProblem(username)
      setBusy(false)
      if (problem) {
        setMessage({ text: problem, error: true })
        return
      }
      const ok = await run(() =>
        supabase.auth.signUp({ email, password, options: { emailRedirectTo: back, data: { username } } }),
      )
      if (ok) setMessage({ text: `Almost done! We sent an email to ${email}. Open the link in it to confirm your account.` })
    } else if (page === 'forgot') {
      const ok = await run(() => supabase.auth.resetPasswordForEmail(email, { redirectTo: back }))
      if (ok) setMessage({ text: `If ${email} has an account, we sent it a link to choose a new password.` })
    } else if (page === 'newPassword') {
      if (await run(() => supabase.auth.updateUser({ password }))) {
        account.doneRecovering()
        setMessage({ text: 'Your new password is saved. You are logged in.' })
        setDone(true)
      }
    }
  }

  const titles = {
    login: 'Log in',
    signup: 'Create a free account',
    forgot: 'Forgot your password?',
    newPassword: 'Choose a new password',
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog account" role="dialog" aria-modal="true" aria-label={titles[page]} onClick={(e) => e.stopPropagation()}>
        <h2>{titles[page]}</h2>

        <form onSubmit={submit}>
          {page === 'signup' && (
            <>
              <label className="account-field">
                Username
                <input required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value.trim())} autoFocus />
              </label>
              <p className="account-hint">{USERNAME_RULE} Other players will see it.</p>
            </>
          )}
          {page !== 'newPassword' && (
            <label className="account-field">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus={page !== 'signup'}
              />
            </label>
          )}
          {page !== 'forgot' && !done && (
            <label className="account-field">
              {page === 'newPassword' ? 'New password' : 'Password'}
              <input
                type="password"
                required
                autoComplete={page === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus={page === 'newPassword'}
              />
            </label>
          )}
          {page === 'signup' && <p className="account-hint">At least {MIN_PASSWORD} characters.</p>}

          {message && <p className={message.error ? 'account-message error' : 'account-message'}>{message.text}</p>}

          <div className="dialog-buttons">
            {done ? (
              <button className="primary" type="button" onClick={onClose} autoFocus>
                Done
              </button>
            ) : (
              <button className="primary" type="submit" disabled={busy}>
                {busy ? 'One moment…' : { login: 'Log in', signup: 'Create account', forgot: 'Send reset link', newPassword: 'Save password' }[page]}
              </button>
            )}
          </div>

          <div className="account-links">
            {page === 'login' && (
              <>
                <button type="button" onClick={() => goTo('signup')}>
                  New here? Create a free account
                </button>
                <button type="button" onClick={() => goTo('forgot')}>
                  Forgot your password?
                </button>
              </>
            )}
            {(page === 'signup' || page === 'forgot') && (
              <button type="button" onClick={() => goTo('login')}>
                Back to log in
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
