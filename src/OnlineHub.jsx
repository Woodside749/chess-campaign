import { useEffect, useState } from 'react'
import * as onlineApi from './online.js'
import { describeInvite } from './gameModes.js'
import Avatar from './Avatar.jsx'

// The online notices in the bottom left corner of every screen (for logged-in players): invites to me
// (Accept / Decline), my invites waiting for an answer (Cancel), and games still going
// that I can rejoin. When someone accepts my invite, the game opens by itself.
// `onOpenGame(id)` opens a game; `inGame` hides the rejoin notices while playing one.
export default function OnlineHub({ account, inGame, onOpenGame, api = onlineApi }) {
  const myId = account.user?.id
  const [invites, setInvites] = useState({ incoming: [], outgoing: [] })
  const [games, setGames] = useState([])
  const [problem, setProblem] = useState(null)
  const [busy, setBusy] = useState(null)
  const [round, setRound] = useState(0) // bumped to load everything again

  useEffect(() => {
    if (!myId) return
    let cancelled = false
    const load = () => {
      api.loadInvites(myId).then(({ invites: loaded }) => !cancelled && loaded && setInvites(loaded))
      api.loadActiveGames(myId).then(({ games: loaded }) => !cancelled && loaded && setGames(loaded))
    }
    load()
    const stop = api.watchInvites(myId, (row) => {
      // My invite was accepted: open the game. (Not for simul boards: the simul screen shows
      // those itself.)
      if (row?.status === 'accepted' && row.sender === myId && row.game_id && row.mode !== 'simul') onOpenGame(row.game_id)
      load()
    })
    return () => {
      cancelled = true
      stop()
    }
  }, [myId, api, onOpenGame, round, inGame])

  if (!myId) return null

  async function answer(invite, accept) {
    setBusy(invite.id)
    const { gameId, error } = await api.answerInvite(invite.id, accept)
    setBusy(null)
    setProblem(error ?? null)
    setRound((n) => n + 1)
    if (gameId) onOpenGame(gameId)
  }

  async function cancel(invite) {
    setBusy(invite.id)
    setProblem(await api.cancelInvite(invite.id))
    setBusy(null)
    setRound((n) => n + 1)
  }

  // The receiver plays the other colour than the sender picked.
  const yourColor = (color) => ({ w: 'You play Black', b: 'You play White', random: 'Colours are random' })[color]
  const rejoin = inGame ? [] : games
  const waiting = invites.outgoing.filter((invite) => invite.settings.mode !== 'simul')
  if (invites.incoming.length + waiting.length + rejoin.length === 0 && !problem) return null

  return (
    <div className="online-hub" aria-live="polite">
      {invites.incoming.map((invite) => (
        <div key={invite.id} className="hub-card invite">
          <Avatar bot={{ ...invite.player, flag: '' }} size={40} />
          <div className="hub-text">
            <strong>
              {invite.player.name} invites you to {invite.settings.mode === 'simul' ? 'a board in their simul' : 'play'}
            </strong>
            <span>
              {describeInvite(invite.settings)} · {yourColor(invite.settings.color)}
            </span>
          </div>
          <div className="hub-buttons">
            <button className="friend-button primary" disabled={busy === invite.id} onClick={() => answer(invite, true)}>
              Accept
            </button>
            <button className="friend-button" disabled={busy === invite.id} onClick={() => answer(invite, false)}>
              Decline
            </button>
          </div>
        </div>
      ))}
      {waiting.map((invite) => (
        <div key={invite.id} className="hub-card">
          <Avatar bot={{ ...invite.player, flag: '' }} size={40} />
          <div className="hub-text">
            <strong>Waiting for {invite.player.name}…</strong>
            <span>{describeInvite(invite.settings)}</span>
          </div>
          <div className="hub-buttons">
            <button className="friend-button" disabled={busy === invite.id} onClick={() => cancel(invite)}>
              Cancel
            </button>
          </div>
        </div>
      ))}
      {rejoin.map((game) => (
        <div key={game.id} className="hub-card">
          <Avatar bot={{ ...game.opponent, flag: '' }} size={40} />
          <div className="hub-text">
            <strong>Your game against {game.opponent.name} is still going</strong>
            <span>{describeInvite({ ...game, mode: game.mode })}</span>
          </div>
          <div className="hub-buttons">
            <button className="friend-button primary" onClick={() => onOpenGame(game.id)}>
              Rejoin
            </button>
          </div>
        </div>
      ))}
      {problem && (
        <div className="hub-card">
          <p className="account-message error">{problem}</p>
          <button className="friend-button" onClick={() => setProblem(null)}>
            OK
          </button>
        </div>
      )}
    </div>
  )
}
