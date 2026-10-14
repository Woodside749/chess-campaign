import { useState } from 'react'
import { supabase } from './supabase.js'
import { STAR_TIERS, maxStars, starsWon } from './career.js'
import { achievementsFor } from './achievements.js'
import { playerTitle, tierStars, usePlayer } from './player.js'
import { roundsWon } from './progress.js'
import { COUNTRIES } from './countries.js'
import { USERNAME_RULE, usernameProblem } from './usernames.js'
import Avatar from './Avatar.jsx'
import TitleBadge from './TitleBadge.jsx'
import StarBadges from './StarBadges.jsx'

// The colours a player can pick for their avatar.
const AVATAR_COLORS = [
  '#6f8f4e', '#43a047', '#2e7d6b', '#3f8fc4', '#5b6fd6', '#8a55d4',
  '#c2549c', '#d64545', '#e07b39', '#c9a227', '#7a6a58', '#5f6b75',
]

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

  async function save(changes, success) {
    const problem = await updateProfile(changes)
    setMessage(problem ? { text: problem, error: true } : success ? { text: success } : null)
  }

  return (
    <main className="profile-screen">
      <button className="back" onClick={onBack}>
        ← Main menu
      </button>

      <header className="profile-header">
        <div className="avatar-with-stars">
          <Avatar bot={player} size={88} />
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
        </div>
      </header>

      <ul className="profile-stats">
        <Stat value={`${stars} / ${allStars}`} label="Campaign stars" />
        <Stat value={`${achievements.filter((a) => a.got).length} / ${achievements.length}`} label="Achievements" />
        <Stat value={modeWins} label="Game mode trophies" />
      </ul>

      <section className="profile-section">
        <h2>Avatar colour</h2>
        <div className="color-swatches" role="radiogroup" aria-label="Avatar colour">
          {AVATAR_COLORS.map((color) => (
            <button
              key={color}
              role="radio"
              aria-checked={player.color === color}
              aria-label={color}
              className={player.color === color ? 'swatch selected' : 'swatch'}
              style={{ background: color }}
              onClick={() => save({ avatar_color: color })}
            />
          ))}
        </div>

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
        <button className="profile-logout" onClick={() => supabase.auth.signOut()}>
          Log out
        </button>
      </section>
    </main>
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
