import { useEffect, useState } from 'react'
import * as friendsApi from './friends.js'
import { REPORT_REASONS } from './friends.js'
import Avatar from './Avatar.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'

// The Friends screen (the "Play with friends" tile): find players by username and send
// them a friend request, answer requests, see your friends with their character and
// username, and block or report players (the ⋯ button on every player). Inviting to a game
// comes later (the buttons are there, greyed out).
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
  // Pop-ups: the ⋯ menu for a player, and the remove, block and report dialogs.
  const [menuFor, setMenuFor] = useState(null) // { player, friendshipId? }
  const [removing, setRemoving] = useState(null) // { id, player }
  const [blocking, setBlocking] = useState(null) // player
  const [reporting, setReporting] = useState(null) // player

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

  async function block(player) {
    setBlocking(null)
    const error = await change(player.id, () => api.blockPlayer(myId, player.id))
    if (!error) {
      setNotice(`${player.name} is blocked.`)
      setSearchRound((n) => n + 1) // they disappear from the search results
    }
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
                  <InviteButton />
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
                <InviteButton />
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
        <PlayerMenu
          player={menuFor.player}
          isFriend={Boolean(menuFor.friendshipId)}
          onRemove={() => {
            setRemoving({ id: menuFor.friendshipId, player: menuFor.player })
            setMenuFor(null)
          }}
          onBlock={() => {
            setBlocking(menuFor.player)
            setMenuFor(null)
          }}
          onReport={() => {
            setReporting(menuFor.player)
            setMenuFor(null)
          }}
          onClose={() => setMenuFor(null)}
        />
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

      {blocking && (
        <ConfirmDialog
          title={`Block ${blocking.name}?`}
          text="You won't see each other in searches, you can't send each other friend requests, and you won't see their chat messages. If you're friends, that ends. You can unblock them later."
          confirmLabel="Block"
          cancelLabel="Cancel"
          onConfirm={() => block(blocking)}
          onCancel={() => setBlocking(null)}
        />
      )}

      {reporting && (
        <ReportDialog
          player={reporting}
          onSend={async (reason, details, alsoBlock) => {
            const error = await api.reportPlayer(myId, reporting.id, reason, details)
            if (error) return error
            const player = reporting
            setReporting(null)
            if (alsoBlock) await block(player)
            setNotice(`Thanks. Your report about ${player.name} has been sent${alsoBlock ? ', and they are blocked' : ''}.`)
            return null
          }}
          onClose={() => setReporting(null)}
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

// The ⋯ menu for a player.
function PlayerMenu({ player, isFriend, onRemove, onBlock, onReport, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog player-menu" role="dialog" aria-modal="true" aria-label={player.name} onClick={(e) => e.stopPropagation()}>
        <Avatar bot={player} size={64} />
        <h2>{player.name}</h2>
        <div className="dialog-buttons">
          {isFriend && (
            <button className="secondary" onClick={onRemove}>
              Remove friend
            </button>
          )}
          <button className="secondary" onClick={onBlock}>
            🚫 Block
          </button>
          <button className="secondary" onClick={onReport}>
            🚩 Report
          </button>
          <button className="secondary" onClick={onClose} autoFocus>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// Reporting a player to the admins: a reason, a few optional words, and whether to block
// them too. `onSend(reason, details, alsoBlock)` returns an error message, or null.
function ReportDialog({ player, onSend, onClose }) {
  const [reason, setReason] = useState(null)
  const [details, setDetails] = useState('')
  const [alsoBlock, setAlsoBlock] = useState(true)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)

  async function send(e) {
    e.preventDefault()
    setBusy(true)
    setProblem(await onSend(reason, details, alsoBlock))
    setBusy(false)
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form className="dialog account report-dialog" role="dialog" aria-modal="true" onSubmit={send} onClick={(e) => e.stopPropagation()}>
        <h2>Report {player.name}</h2>
        <p className="account-hint">What's wrong? The admins will look at it. {player.name} won't be told who reported them.</p>
        <div className="report-reasons" role="radiogroup" aria-label="Reason">
          {REPORT_REASONS.map(([value, label]) => (
            <label key={value} className={reason === value ? 'report-reason selected' : 'report-reason'}>
              <input type="radio" name="reason" value={value} checked={reason === value} onChange={() => setReason(value)} />
              {label}
            </label>
          ))}
        </div>
        <label className="account-field">
          More details (optional)
          <textarea rows={3} maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} />
        </label>
        <label className="account-check">
          <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} />
          <span>Also block {player.name}</span>
        </label>
        {problem && <p className="account-message error">{problem}</p>}
        <div className="dialog-buttons">
          <button className="primary" type="submit" disabled={!reason || busy}>
            {busy ? 'Sending…' : 'Send report'}
          </button>
          <button className="secondary" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
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
