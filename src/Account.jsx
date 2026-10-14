import { useState } from 'react'
import { supabase } from './supabase.js'

const MIN_PASSWORD = 8

// The 👤 button on the main menu: "Log in" when nobody is logged in, otherwise the
// player's name. It opens the account window. `account` comes from useAccount().
export default function AccountButton({ account }) {
  const [open, setOpen] = useState(false)
  const { user, recovering } = account
  const name = user?.email.split('@')[0]

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
// 'newPassword' (after opening that link) and 'account' (logged in: log out).
function AccountDialog({ account, onClose }) {
  const { user, recovering } = account
  const [page, setPage] = useState(recovering ? 'newPassword' : user ? 'account' : 'login')
  const [email, setEmail] = useState('')
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
    if (error) setMessage({ text: error.message, error: true })
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
      const ok = await run(() => supabase.auth.signUp({ email, password, options: { emailRedirectTo: back } }))
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
              Logged in as <strong>{user?.email}</strong>
            </p>
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
            {page !== 'newPassword' && (
              <label className="account-field">
                Email
                <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
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
