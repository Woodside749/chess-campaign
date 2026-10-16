import { useEffect, useState } from 'react'
import * as friendsApi from './friends.js'
import Avatar from './Avatar.jsx'
import PlayerActions from './PlayerActions.jsx'
import { useInvite } from './onlineContext.js'
import { AchievementBadges, ProfileHeader, ProfileStats, RatingStrip } from './ProfileParts.jsx'

// A friend's profile (clicking a friend on the Friends screen or the profile page): like the
// top of your own profile, with their title and stars, numbers, online ratings,
// achievements and friends. Invite to game, and ⋯ for remove, block and report.
// Their friends can be clicked too: one who is also your friend opens their profile,
// anyone else the player menu (Add friend …). `back` names the screen ← goes back to.
// `api` is friends.js; a test can pass a pretend one.
export default function FriendProfile({ friend, friendshipId, myId, back, onBack, api = friendsApi }) {
  // The profiles opened so far (a friend's friend opens on top; ← goes back one).
  const [stack, setStack] = useState([{ player: friend, friendshipId }])
  const shown = stack.at(-1)
  // The loaded profile, and whose it is (so the last one isn't shown while the next loads).
  const [loaded, setLoaded] = useState({ id: null })
  const { profile, error: problem } = loaded.id === shown.player.id ? loaded : {}
  const [myLists, setMyLists] = useState(null) // my own friendships, to know who is my friend
  const [menuFor, setMenuFor] = useState(null) // { player, relation }
  const [notice, setNotice] = useState(null)
  const invite = useInvite()

  useEffect(() => {
    let cancelled = false
    const id = shown.player.id
    api.loadFriendProfile(id).then(({ profile: found, error }) => {
      if (!cancelled) setLoaded({ id, profile: found, error })
    })
    return () => {
      cancelled = true
    }
  }, [shown, api])

  useEffect(() => {
    let cancelled = false
    api.loadFriendships(myId).then(({ lists }) => !cancelled && lists && setMyLists(lists))
    return () => {
      cancelled = true
    }
  }, [myId, api])

  // How I'm connected to one of their friends.
  function relationTo(playerId) {
    const find = (list) => myLists?.[list].find((entry) => entry.player.id === playerId)
    if (find('friends')) return { kind: 'friend', id: find('friends').id }
    if (find('incoming')) return { kind: 'incoming', id: find('incoming').id }
    if (find('outgoing')) return { kind: 'outgoing', id: find('outgoing').id }
    return { kind: 'none' }
  }

  function openPlayer(player) {
    if (player.id === myId) return
    const relation = relationTo(player.id)
    if (relation.kind === 'friend') setStack((list) => [...list, { player, friendshipId: relation.id }])
    else setMenuFor({ player, relation })
  }

  function goBack() {
    setNotice(null)
    if (stack.length > 1) setStack((list) => list.slice(0, -1))
    else onBack()
  }

  const backLabel = stack.length > 1 ? stack.at(-2).player.name : back

  return (
    <main className="profile-screen">
      <button className="back" onClick={goBack}>
        ← {backLabel}
      </button>

      {problem && <p className="account-message error">{problem}</p>}
      {!profile && !problem && <p className="friends-empty">Loading…</p>}
      {profile && (
        <>
          <ProfileHeader player={shown.player} progress={profile.progress} since={profile.since}>
            <div className="friend-profile-buttons">
              <button className="friend-button primary" disabled={!invite} onClick={() => invite(shown.player)}>
                Invite to game
              </button>
              <button
                className="friend-button more"
                onClick={() =>
                  setMenuFor({ player: shown.player, relation: { kind: 'friend', id: shown.friendshipId } })
                }
                aria-label={`More for ${shown.player.name}`}
                title="More"
              >
                ⋯
              </button>
            </div>
          </ProfileHeader>
          {notice && <p className="account-message">{notice}</p>}

          <ProfileStats progress={profile.progress} />
          <RatingStrip playerId={shown.player.id} />
          <AchievementBadges progress={profile.progress} />

          <section className="profile-section">
            <h2>Friends ({profile.friends.length})</h2>
            {profile.friends.length === 0 ? (
              <p className="friends-empty">No friends yet.</p>
            ) : (
              <ul className="friend-strip">
                {profile.friends.map((player) => (
                  <li key={player.id}>
                    <button
                      className="friend-strip-card"
                      onClick={() => openPlayer(player)}
                      disabled={player.id === myId}
                    >
                      <Avatar bot={player} size={64} />
                      <span className="friend-strip-name">{player.id === myId ? 'You' : player.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {menuFor && (
        <PlayerActions
          player={menuFor.player}
          relation={menuFor.relation}
          myId={myId}
          api={api}
          onDone={async (message) => {
            setMenuFor(null)
            const { lists } = await api.loadFriendships(myId)
            if (lists) setMyLists(lists)
            // After removing or blocking the friend whose profile this is, it closes.
            if (lists && !lists.friends.some((entry) => entry.player.id === shown.player.id)) {
              if (stack.length > 1) setStack((list) => list.slice(0, -1))
              else return onBack(message)
            }
            setNotice(message)
          }}
          onClose={() => setMenuFor(null)}
        />
      )}
    </main>
  )
}
