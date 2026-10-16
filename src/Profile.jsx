import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { usePlayer } from './player.js'
import { COUNTRIES } from './countries.js'
import { USERNAME_RULE, usernameProblem } from './usernames.js'
import * as friendsApi from './friends.js'
import Avatar from './Avatar.jsx'
import CharacterCreator from './CharacterCreator.jsx'
import FriendProfile from './FriendProfile.jsx'
import { useFeedback } from './feedbackContext.js'
import { ProfileHeader, ProfileStats, RatingStrip } from './ProfileParts.jsx'

// The player's profile (only when logged in): how they look to others, their title and
// stars, a few numbers, and the settings for their avatar, flag and username.
// (`api` is friends.js; a test can pass a pretend one.)
export default function Profile({ progress, account, onBack, onOpenFriends, onOpenAdmin, api = friendsApi }) {
  const player = usePlayer()
  const openFeedback = useFeedback()
  const { user, profile, updateProfile } = account
  const since = profile?.created_at ?? user.created_at
  const [message, setMessage] = useState(null) // { text, error }
  // The character editor opens on its own screen when the profile picture is clicked.
  const [editing, setEditing] = useState(false)
  // A friend whose profile is open (clicked in the friends row): { player, friendshipId }.
  const [viewing, setViewing] = useState(null)
  const [friendNotice, setFriendNotice] = useState(null)

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

  if (viewing) {
    return (
      <FriendProfile
        friend={viewing.player}
        friendshipId={viewing.friendshipId}
        myId={user.id}
        back="Profile"
        api={api}
        onBack={(message) => {
          setViewing(null)
          setFriendNotice(message ?? null)
        }}
      />
    )
  }

  return (
    <main className="profile-screen">
      <button className="back" onClick={onBack}>
        ← Main menu
      </button>

      <ProfileHeader
        player={player}
        progress={progress}
        since={since}
        avatar={
          // Clicking the picture opens the character editor.
          <button className="avatar-edit" onClick={() => setEditing(true)} title="Edit your character">
            <Avatar bot={player} size={88} />
            <span className="avatar-edit-badge" aria-hidden="true">
              ✏️
            </span>
            <span className="visually-hidden">Edit your character</span>
          </button>
        }
      >
        {!profile?.avatar && <p className="profile-hint">Tap your picture to create your character.</p>}
      </ProfileHeader>

      <ProfileStats progress={progress} />

      <RatingStrip playerId={user.id} />

      <FriendStrip
        myId={user.id}
        onOpenFriends={onOpenFriends}
        onOpenFriend={setViewing}
        notice={friendNotice}
        api={api}
      />

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
        <UsernameForm
          current={player.name}
          onSave={(username) => save({ username }, `Your username is now ${username}.`)}
        />

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
        <div className="profile-account-buttons">
          <button className="profile-logout" onClick={() => openFeedback('bug', 'Profile page')}>
            🐞 Report a bug
          </button>
          <button className="profile-logout" onClick={() => openFeedback('idea', 'Profile page')}>
            💡 Suggest a feature
          </button>
          {/* Only for admins: what players have sent in. */}
          {player.admin && (
            <button className="profile-logout" onClick={onOpenAdmin}>
              🛠 Admin page
            </button>
          )}
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
              Your account, username, profile and all your saved progress are deleted for good. This can't be undone.
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

// The player's friends in a row that scrolls sideways: each friend's character with their
// username below. Clicking a friend opens their profile (`onOpenFriend({ player,
// friendshipId })`). The last card opens the Friends screen (search, requests), and shows
// how many requests are waiting. `notice` is a message to show, like after removing a friend.
function FriendStrip({ myId, onOpenFriends, onOpenFriend, notice, api }) {
  const [lists, setLists] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      api.loadFriendships(myId).then(({ lists: loaded }) => {
        if (!cancelled && loaded) setLists(loaded)
      })
    load()
    const stop = api.watchFriendships(myId, load)
    return () => {
      cancelled = true
      stop()
    }
  }, [myId, api])

  const requests = lists?.incoming.length ?? 0
  return (
    <section className="profile-section">
      <h2>Friends{lists ? ` (${lists.friends.length})` : ''}</h2>
      <ul className="friend-strip">
        {lists?.friends.map(({ id, player }) => (
          <li key={id}>
            <button className="friend-strip-card" onClick={() => onOpenFriend({ player, friendshipId: id })}>
              <Avatar bot={player} size={64} />
              <span className="friend-strip-name">{player.name}</span>
            </button>
          </li>
        ))}
        <li>
          <button className="friend-strip-card add" onClick={onOpenFriends}>
            <span className="friend-strip-plus" aria-hidden="true">
              +
            </span>
            <span className="friend-strip-name">Find friends</span>
            {requests > 0 && (
              <span className="friend-strip-badge">
                {requests} request{requests === 1 ? '' : 's'}
              </span>
            )}
          </button>
        </li>
      </ul>
      {notice && <p className="account-message">{notice}</p>}
    </section>
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
