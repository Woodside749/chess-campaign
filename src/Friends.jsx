import { useEffect, useState } from 'react'
import * as friendsApi from './friends.js'
import Avatar from './Avatar.jsx'
import PlayerActions from './PlayerActions.jsx'
import { useInvite } from './onlineContext.js'

// The Friends screen (the "Play with friends" tile): find players by username and send
// them a friend request, answer requests, see your friends with their character and
// username, invite them to a game, and block or report players (the ⋯ button on every player).
// `api` is friends.js; a test can pass a pretend one.
export default function Friends({ account, onBack, api = friendsApi }) {
  const myId = account.user?.id
  const [lists, setLists] = useState(null) // { friends, incoming, outgoing }, null while loading
  const [blocked, setBlocked] = useState([]) // [{ player }]
  const [problem, setProblem] = useState(null)
  const [notice, setNotice] = useState(null) // a short "done" message, like after a report
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null) // players found, null before searching
  const [searchRound, setSearchRound] = useState(0) // bumped to search again (after a block)
  const [busy, setBusy] = useState(null) // the id of the player or friendship being changed
  // The ⋯ menu for a player (remove, block, report; see PlayerActions).
  const [menuFor, setMenuFor] = useState(null) // { player, friendshipId? }

  // Load the friendships and blocks, and the friendships again whenever one changes (live).
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
    api.loadBlocked().then(({ blocked: loaded }) => !cancelled && loaded && setBlocked(loaded))
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
      const { players, error } = await api.searchPlayers(text)
      if (error) setProblem(error)
      else setResults(players)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, myId, api, searchRound])

  // Runs a change (send, accept, remove, block …), then reloads the lists.
  async function change(id, action) {
    setBusy(id)
    setNotice(null)
    const error = await action()
    setProblem(error)
    const [{ lists: loaded }, { blocked: blockedNow }] = await Promise.all([api.loadFriendships(myId), api.loadBlocked()])
    if (loaded) setLists(loaded)
    if (blockedNow) setBlocked(blockedNow)
    setBusy(null)
    return error
  }

  // After something in the ⋯ menu (remove, block, report): reload, and search again (a
  // blocked player disappears from the results).
  async function afterAction(message) {
    setMenuFor(null)
    await change(null, async () => null)
    setNotice(message)
    setSearchRound((n) => n + 1)
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
    if (find('friends')) return { kind: 'friend', id: find('friends').id }
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
                <FriendRow
                  key={player.id}
                  player={player}
                  onMore={() => setMenuFor({ player, friendshipId: link.kind === 'friend' ? link.id : null })}
                >
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
                  <InviteButton player={player} />
                </FriendRow>
              )
            })}
          </ul>
        )}
      </section>

      {problem && <p className="account-message error">{problem}</p>}
      {notice && <p className="account-message">{notice}</p>}

      {lists?.incoming.length > 0 && (
        <section className="friends-section">
          <h2>Friend requests ({lists.incoming.length})</h2>
          <ul className="friend-list">
            {lists.incoming.map(({ id, player }) => (
              <FriendRow key={id} player={player} note="wants to be your friend" onMore={() => setMenuFor({ player })}>
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
              <FriendRow key={id} player={player} onMore={() => setMenuFor({ player, friendshipId: id })}>
                <InviteButton player={player} />
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

      {blocked.length > 0 && (
        <section className="friends-section">
          <h2>Blocked players</h2>
          <ul className="friend-list">
            {blocked.map(({ player }) => (
              <FriendRow key={player.id} player={player}>
                <button
                  className="friend-button"
                  disabled={busy === player.id}
                  onClick={() => change(player.id, () => api.unblockPlayer(myId, player.id))}
                >
                  Unblock
                </button>
              </FriendRow>
            ))}
          </ul>
        </section>
      )}

      {menuFor && (
        <PlayerActions
          player={menuFor.player}
          friendshipId={menuFor.friendshipId}
          myId={myId}
          api={api}
          onDone={afterAction}
          onClose={() => setMenuFor(null)}
        />
      )}
    </main>
  )
}

// One player in a list: their character, username and flag, buttons on the right, and the
// ⋯ button (if `onMore`) for removing, blocking and reporting.
function FriendRow({ player, note, onMore, children }) {
  return (
    <li className="friend-row">
      <Avatar bot={player} size={48} />
      <div className="friend-name">
        <strong>{player.name}</strong>
        {note && <span>{note}</span>}
      </div>
      <div className="friend-actions">
        {children}
        {onMore && (
          <button className="friend-button more" onClick={onMore} aria-label={`More for ${player.name}`} title="More">
            ⋯
          </button>
        )}
      </div>
    </li>
  )
}

// Opens the "Invite to game" window for a player.
function InviteButton({ player }) {
  const invite = useInvite()
  return (
    <button className="friend-button" disabled={!invite} onClick={() => invite(player)}>
      Invite to game
    </button>
  )
}
