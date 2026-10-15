import { useState } from 'react'
import { supabase } from './supabase.js'
import { STAR_TIERS, maxStars, starsWon } from './career.js'
import { achievementsFor } from './achievements.js'
import { playerTitle, tierStars, usePlayer } from './player.js'
import { roundsWon } from './progress.js'
import { COUNTRIES } from './countries.js'
import { USERNAME_RULE, usernameProblem } from './usernames.js'
import Avatar from './Avatar.jsx'
import CharacterCreator from './CharacterCreator.jsx'
import TitleBadge from './TitleBadge.jsx'
import StarBadges from './StarBadges.jsx'


// The player's profile (only when logged in): how they look to others, their title and
// stars, a few numbers, and the settings for their avatar, flag and username.
export default function Profile({ progress, account, onBack }) {
  const player = usePlayer()
  const { user, profile, updateProfile } = account
  const title = playerTitle(progress)
  const wonIn = (eventId) => roundsWon(progress, eventId)
  const stars = STAR_TIERS.reduce((sum, tier) => sum + starsWon(wonIn, tier.section), 0)
  const allStars = STAR_TIERS.reduce((sum, tier) => sum + maxStars(tier.section), 0)
  const achievements = achievementsFor(progress)
  const modeWins = Object.values(progress.modeWins ?? {}).reduce((sum, bots) => sum + bots.length, 0)
  const since = profile?.created_at ?? user.created_at
  const [message, setMessage] = useState(null) // { text, error }
  // The character editor opens on its own screen when the profile picture is clicked.
  const [editing, setEditing] = useState(false)

  async function save(changes, success) {
    const problem = await updateProfile(changes)
    setMessage(problem ? { text: problem, error: true } : success ? { text: success } : null)
  }

  if (editing) {
    return (
      <main className="profile-screen">
        <button className="back" onClick={() => setEditing(false)}>
          ← Profile
        </button>
        <h1 className="creator-title">Your character</h1>
        <CharacterCreator
          character={profile?.avatar}
          background={player.color}
          onSave={(avatar, color) => updateProfile({ avatar, avatar_color: color })}
        />
      </main>
    )
  }

  return (
    <main className="profile-screen">
      <button className="back" onClick={onBack}>
        ← Main menu
      </button>

      <header className="profile-header">
        <div className="avatar-with-stars">
          {/* Clicking the picture opens the character editor. */}
          <button className="avatar-edit" onClick={() => setEditing(true)} title="Edit your character">
            <Avatar bot={player} size={88} />
            <span className="avatar-edit-badge" aria-hidden="true">
              ✏️
            </span>
            <span className="visually-hidden">Edit your character</span>
          </button>
          <StarBadges stars={tierStars(progress)} size={18} />
        </div>
        <div className="profile-who">
          <h1>
            <TitleBadge title={title} /> {player.name}
          </h1>
          <p className="profile-sub">
            {title ? title.name : 'No title yet'}
            {player.country && ` · ${player.flag} ${player.country}`}
          </p>
          <p className="profile-sub">
            Playing since {new Date(since).toLocaleDateString('en', { month: 'long', year: 'numeric' })}
          </p>
          {!profile?.avatar && <p className="profile-hint">Tap your picture to create your character.</p>}
        </div>
      </header>

      <ul className="profile-stats">
        <Stat value={`${stars} / ${allStars}`} label="Campaign stars" />
        <Stat value={`${achievements.filter((a) => a.got).length} / ${achievements.length}`} label="Achievements" />
        <Stat value={modeWins} label="Game mode trophies" />
      </ul>

      <section className="profile-section">
        <h2>Country</h2>
        <select
          className="profile-select"
          value={profile?.country ?? ''}
          onChange={(e) => save({ country: e.target.value || null })}
        >
          <option value="">No flag</option>
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.flag} {country.name}
            </option>
          ))}
        </select>

        <h2>Username</h2>
        <UsernameForm current={player.name} onSave={(username) => save({ username }, `Your username is now ${username}.`)} />

        {message && <p className={message.error ? 'account-message error' : 'account-message'}>{message.text}</p>}
      </section>

      <section className="profile-section">
        <h2>Account</h2>
        <p className="profile-sub">{user.email}</p>
        <div className="profile-account-buttons">
          <button className="profile-logout" onClick={() => supabase.auth.signOut()}>
            Log out
          </button>
          <DeleteAccountButton />
        </div>
        <p className="profile-links">
          <a href="/privacy.html">Privacy policy</a> · <a href="/credits.html">Credits</a>
        </p>
      </section>
    </main>
  )
}

// Deletes the account and everything saved with it, after asking first.
function DeleteAccountButton() {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)

  async function deleteAccount() {
    setBusy(true)
    const { error } = await supabase.rpc('delete_my_account')
    if (error) {
      setBusy(false)
      setProblem(error.message)
      return
    }
    // The account is gone; log out on this device too (the game then forgets the progress).
    await supabase.auth.signOut({ scope: 'local' })
  }

  return (
    <>
      <button className="profile-delete" onClick={() => setAsking(true)}>
        Delete my account
      </button>
      {asking && (
        <div className="overlay" onClick={() => !busy && setAsking(false)}>
          <div className="dialog account" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Delete your account?</h2>
            <p className="account-message">
              Your account, username, profile and all your saved progress are deleted for good. This can't be
              undone.
            </p>
            {problem && <p className="account-message error">{problem}</p>}
            <div className="dialog-buttons">
              <button className="danger" onClick={deleteAccount} disabled={busy}>
                {busy ? 'Deleting…' : 'Yes, delete everything'}
              </button>
              <button className="secondary" onClick={() => setAsking(false)} disabled={busy} autoFocus>
                Keep my account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Stat({ value, label }) {
  return (
    <li className="profile-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </li>
  )
}

// Change the username: checked for format and whether it's free before saving.
function UsernameForm({ current, onSave }) {
  const [username, setUsername] = useState(current)
  const [problem, setProblem] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (username === current) return
    setBusy(true)
    const found = username.toLowerCase() === current.toLowerCase() ? null : await usernameProblem(username)
    setProblem(found)
    if (!found) await onSave(username)
    setBusy(false)
  }

  return (
    <form className="username-form" onSubmit={submit}>
      <input required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value.trim())} />
      <button type="submit" disabled={busy || username === current}>
        {busy ? 'Saving…' : 'Save'}
      </button>
      <p className="account-hint">{problem ?? USERNAME_RULE}</p>
    </form>
  )
}
