import { useState } from 'react'
import { supabase } from './supabase.js'

const MIN_PASSWORD = 8
const USERNAME = /^[A-Za-z0-9_-]{3,20}$/
const USERNAME_RULE = '3 to 20 letters or digits (and _ or -), no spaces.'

// The name shown for a logged-in player: their username, or (for an account made before
// usernames existed) the start of their email.
function displayName(user) {
  return user.user_metadata?.username ?? user.email.split('@')[0]
}

// Checks a username; returns an error message, or null when it is fine and free.
async function usernameProblem(username) {
  if (!USERNAME.test(username)) return `The username needs ${USERNAME_RULE.toLowerCase()}`
  const { data: taken, error } = await supabase.rpc('username_taken', { name: username })
  if (error) return error.message
  return taken ? `${username} is already taken. Try another one.` : null
}

// The 👤 button on the main menu: "Log in" when nobody is logged in, otherwise the
// player's name. It opens the account window. `account` comes from useAccount().
export default function AccountButton({ account }) {
  const [open, setOpen] = useState(false)
  const { user, recovering } = account
  const name = user && displayName(user)

  return (
    <>
      <button className="account-button" onClick={() => setOpen(true)}>
        <span aria-hidden="true">👤</span>
        <span className="account-name">{user ? name : 'Log in'}</span>
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

// The account window. Its pages: 'login', 'signup', 'forgot' (send a reset link),
// 'newPassword' (after opening that link) and 'account' (logged in: log out, and choose a
// username if the account has none yet).
function AccountDialog({ account, onClose }) {
  const { user, recovering } = account
  const [page, setPage] = useState(recovering ? 'newPassword' : user ? 'account' : 'login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(null) // { text, error }
  const [busy, setBusy] = useState(false)

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
        setMessage({ text: 'Your new password is saved.' })
        setPage('account')
      }
    }
  }

  // For an account without a username (made before usernames existed).
  async function saveUsername(e) {
    e.preventDefault()
    setBusy(true)
    const problem = await usernameProblem(username)
    setBusy(false)
    if (problem) {
      setMessage({ text: problem, error: true })
      return
    }
    const saved = await run(() => supabase.from('profiles').upsert({ id: user.id, username }))
    if (saved && (await run(() => supabase.auth.updateUser({ data: { username } })))) {
      setMessage({ text: `Your username is now ${username}.` })
    }
  }

  async function logOut() {
    if (await run(() => supabase.auth.signOut())) onClose()
  }

  const titles = {
    login: 'Log in',
    signup: 'Create a free account',
    forgot: 'Forgot your password?',
    newPassword: 'Choose a new password',
    account: 'Your account',
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog account" role="dialog" aria-modal="true" aria-label={titles[page]} onClick={(e) => e.stopPropagation()}>
        <h2>{titles[page]}</h2>

        {page === 'account' ? (
          <>
            <p className="account-email">
              Logged in as <strong>{user && displayName(user)}</strong>
              <br />
              <span className="account-hint">{user?.email}</span>
            </p>
            {!user?.user_metadata?.username && (
              <form onSubmit={saveUsername}>
                <label className="account-field">
                  Choose your username
                  <input required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value.trim())} />
                </label>
                <p className="account-hint">{USERNAME_RULE}</p>
                <div className="dialog-buttons">
                  <button className="primary" type="submit" disabled={busy}>
                    Save username
                  </button>
                </div>
              </form>
            )}
            {message && <p className={message.error ? 'account-message error' : 'account-message'}>{message.text}</p>}
            <div className="dialog-buttons">
              <button className="secondary" onClick={logOut} disabled={busy}>
                Log out
              </button>
              <button className="primary" onClick={onClose} autoFocus>
                Done
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            {page === 'signup' && (
              <>
                <label className="account-field">
                  Username
                  <input
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.trim())}
                    autoFocus
                  />
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
            {page !== 'forgot' && (
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
              <button className="primary" type="submit" disabled={busy}>
                {busy ? 'One moment…' : { login: 'Log in', signup: 'Create account', forgot: 'Send reset link', newPassword: 'Save password' }[page]}
              </button>
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
        )}
      </div>
    </div>
  )
}
