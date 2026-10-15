import { useEffect, useState } from 'react'
import * as friendsApi from './friends.js'
import Avatar from './Avatar.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'

// The Friends screen (the "Play with friends" tile): find players by username and send
// them a friend request, answer requests, and see your friends with their character and
// username. Inviting to a game comes later (the buttons are there, greyed out).
// `api` is friends.js; a test can pass a pretend one.
export default function Friends({ account, onBack, api = friendsApi }) {
  const myId = account.user?.id
  const [lists, setLists] = useState(null) // { friends, incoming, outgoing }, null while loading
  const [problem, setProblem] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null) // players found, null before searching
  const [busy, setBusy] = useState(null) // the id of the player or friendship being changed
  const [removing, setRemoving] = useState(null) // the friend about to be removed

  // Load the friendships, and again whenever one changes (live, from Supabase).
  useEffect(() => {
    if (!myId) return
    let cancelled = false
    const load = () =>
      api.loadFriendships(myId).then(({ lists: loaded, error }) => {
        if (cancelled) return
        if (error) setProblem(error)
        else setLists(loaded)
      })
    load()
    const stop = api.watchFriendships(myId, load)
    return () => {
      cancelled = true
      stop()
    }
  }, [myId, api])

  // Search as the player types (a moment after they stop), from two letters on.
  useEffect(() => {
    const text = query.trim()
    if (!myId || text.length < 2) return
    const timer = setTimeout(async () => {
      const { players, error } = await api.searchPlayers(text, myId)
      if (error) setProblem(error)
      else setResults(players)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, myId, api])

  // Runs a change (send, accept, remove), then reloads the lists.
  async function change(id, action) {
    setBusy(id)
    const error = await action()
    setProblem(error)
    const { lists: loaded } = await api.loadFriendships(myId)
    if (loaded) setLists(loaded)
    setBusy(null)
  }

  if (!myId) {
    return (
      <main className="friends-screen">
        <button className="back" onClick={onBack}>
          ← Main menu
        </button>
        <h1>Friends</h1>
        <p className="friends-empty">Log in (top right on the main menu) to find friends and play with them.</p>
      </main>
    )
  }

  // How I'm connected to a player in the search results.
  const relation = (playerId) => {
    const find = (list) => lists?.[list].find((entry) => entry.player.id === playerId)
    if (find('friends')) return { kind: 'friend' }
    if (find('incoming')) return { kind: 'incoming', id: find('incoming').id }
    if (find('outgoing')) return { kind: 'outgoing', id: find('outgoing').id }
    return { kind: 'none' }
  }
  const searching = query.trim().length >= 2

  return (
    <main className="friends-screen">
      <button className="back" onClick={onBack}>
        ← Main menu
      </button>
      <h1>Friends</h1>

      <section className="friends-section">
        <h2>Find players</h2>
        <input
          className="friends-search"
          type="search"
          placeholder="Search by username"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (e.target.value.trim().length < 2) setResults(null)
          }}
        />
        {searching && results && (
          <ul className="friend-list">
            {results.length === 0 && <li className="friends-empty">No players found with that name.</li>}
            {results.map((player) => {
              const link = relation(player.id)
              return (
                <FriendRow key={player.id} player={player}>
                  {link.kind === 'friend' && <span className="friend-status">Friends ✓</span>}
                  {link.kind === 'outgoing' && <span className="friend-status">Request sent</span>}
                  {link.kind === 'incoming' && (
                    <button className="friend-button primary" disabled={busy === link.id} onClick={() => change(link.id, () => api.acceptRequest(link.id))}>
                      Accept
                    </button>
                  )}
                  {link.kind === 'none' && (
                    <button className="friend-button primary" disabled={busy === player.id} onClick={() => change(player.id, () => api.sendRequest(myId, player.id))}>
                      Add friend
                    </button>
                  )}
                  <InviteButton />
                </FriendRow>
              )
            })}
          </ul>
        )}
      </section>

      {problem && <p className="account-message error">{problem}</p>}

      {lists?.incoming.length > 0 && (
        <section className="friends-section">
          <h2>Friend requests ({lists.incoming.length})</h2>
          <ul className="friend-list">
            {lists.incoming.map(({ id, player }) => (
              <FriendRow key={id} player={player} note="wants to be your friend">
                <button className="friend-button primary" disabled={busy === id} onClick={() => change(id, () => api.acceptRequest(id))}>
                  Accept
                </button>
                <button className="friend-button" disabled={busy === id} onClick={() => change(id, () => api.removeFriendship(id))}>
                  Decline
                </button>
              </FriendRow>
            ))}
          </ul>
        </section>
      )}

      <section className="friends-section">
        <h2>Your friends{lists ? ` (${lists.friends.length})` : ''}</h2>
        {!lists ? (
          <p className="friends-empty">Loading…</p>
        ) : lists.friends.length === 0 ? (
          <p className="friends-empty">No friends yet. Search for a player above and send them a request.</p>
        ) : (
          <ul className="friend-list">
            {lists.friends.map(({ id, player }) => (
              <FriendRow key={id} player={player}>
                <InviteButton />
                <button className="friend-button subtle" onClick={() => setRemoving({ id, player })}>
                  Remove
                </button>
              </FriendRow>
            ))}
          </ul>
        )}
      </section>

      {lists?.outgoing.length > 0 && (
        <section className="friends-section">
          <h2>Sent requests</h2>
          <ul className="friend-list">
            {lists.outgoing.map(({ id, player }) => (
              <FriendRow key={id} player={player} note="hasn't answered yet">
                <button className="friend-button" disabled={busy === id} onClick={() => change(id, () => api.removeFriendship(id))}>
                  Cancel
                </button>
              </FriendRow>
            ))}
          </ul>
        </section>
      )}

      {removing && (
        <ConfirmDialog
          title={`Remove ${removing.player.name}?`}
          text="You won't be friends anymore. You can send a new request later."
          confirmLabel="Remove friend"
          cancelLabel="Keep friend"
          onConfirm={() => {
            const { id } = removing
            setRemoving(null)
            change(id, () => api.removeFriendship(id))
          }}
          onCancel={() => setRemoving(null)}
        />
      )}
    </main>
  )
}

// One player in a list: their character, username and flag, and buttons on the right.
function FriendRow({ player, note, children }) {
  return (
    <li className="friend-row">
      <Avatar bot={player} size={48} />
      <div className="friend-name">
        <strong>{player.name}</strong>
        {note && <span>{note}</span>}
      </div>
      <div className="friend-actions">{children}</div>
    </li>
  )
}

// Inviting to a game needs games between players, which come later.
function InviteButton() {
  return (
    <button className="friend-button" disabled title="Coming soon: games between players">
      Invite to game
    </button>
  )
}
