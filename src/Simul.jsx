import { useEffect, useRef, useState } from 'react'
import { BOTS } from './bots.js'
import * as onlineApi from './online.js'
import Game from './Game.jsx'
import OnlineGame from './OnlineGame.jsx'
import Avatar from './Avatar.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'

// Points for each result, like in a real tournament: a draw is half a point.
const POINTS = { win: 1, draw: 0.5, loss: 0 }
const showPoints = (points) => String(points).replace('.5', '½').replace(/^0½/, '½')

// A simul: the player against several opponents on several boards at the same time, playing
// White on every board. The bots think on their own, so while one is thinking you can move
// on another board.
// Either `round` ({ title, opponents, needed } from career.js: bots by id), or `boards` (from
// the game modes menu): 2 to 4 of { kind: 'bot', id } or { kind: 'friend', player, inviteId,
// error } (a friend invited to play that board online; they may decline, and then a bot can
// take the board). The same bot may play on more than one board.
// `minutes` is the clock on each board (`timed` false: none). `onFinish(passed)` is called
// once, when all games are over, and `onGameResult(botId, outcome)` (optional) after each
// game against a bot. `account` and `progress` are needed for boards with friends.
export default function Simul({ round, boards, timed = true, minutes, onFinish, onGameResult, onExit, account, progress, api = onlineApi }) {
  const myId = account?.user?.id
  const lineup = boards ?? round.opponents.map((id) => ({ kind: 'bot', id }))
  const title = round?.title ?? 'Simul'
  const needed = round?.needed ?? Math.floor(lineup.length / 2) + 1
  const withFriends = lineup.some((board) => board.kind === 'friend')

  const [results, setResults] = useState({}) // board number → 'win', 'loss' or 'draw'
  const [attempt, setAttempt] = useState(0) // a new number starts fresh games against the bots
  const [confirmingLeave, setConfirmingLeave] = useState(false)
  // Boards with friends: where each invite stands ({ status, gameId } by invite id), and the
  // bots chosen for boards whose friend declined (board number → bot id).
  const [invites, setInvites] = useState({})
  const [standIns, setStandIns] = useState({})

  // Follow the friends' invites: accepted ones become online games on their boards.
  useEffect(() => {
    if (!withFriends || !myId) return
    const ids = lineup.flatMap((board) => (board.inviteId ? [board.inviteId] : []))
    let cancelled = false
    const load = () => api.loadInviteStates(ids).then(({ states }) => !cancelled && states && setInvites(states))
    load()
    const stop = api.watchInvites(myId, (row) => row && ids.includes(row.id) && load())
    return () => {
      cancelled = true
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the boards are fixed for one simul
  }, [withFriends, myId, api])

  const score = Object.values(results).reduce((sum, outcome) => sum + POINTS[outcome], 0)
  const finished = Object.keys(results).length === lineup.length
  const passed = score >= needed

  // Tell the screen that started the simul once, when the last game is over.
  const reportedRef = useRef(false)
  useEffect(() => {
    if (!finished || reportedRef.current) return
    reportedRef.current = true
    onFinish?.(passed)
  }, [finished, passed, onFinish])

  function restart() {
    reportedRef.current = false
    setResults({})
    setAttempt(attempt + 1)
  }

  // Leaving with games still going asks first: games against bots count as lost, games with
  // friends go on (they can be rejoined from the main menu).
  function leave() {
    if (finished) onExit()
    else setConfirmingLeave(true)
  }

  const recordResult = (board, botId) => (result) => {
    setResults((r) => ({ ...r, [board]: result.outcome }))
    if (botId) onGameResult?.(botId, result.outcome)
  }

  const botBoard = (board, botId) => (
    <Game
      key={`${board}-${botId}-${attempt}`}
      compact
      bot={BOTS[botId]}
      startColor="w"
      timed={timed}
      minutes={minutes}
      onResult={recordResult(board, botId)}
      onExit={onExit}
    />
  )

  return (
    <main className="simul-screen">
      <header className="simul-header">
        <button className="back" onClick={leave}>
          ← Back
        </button>
        <h1>🎭 {title}</h1>
        <p className="simul-score">
          Score <strong>{showPoints(score)}</strong> of {lineup.length} · need {needed} to pass
        </p>
      </header>

      <div className={`simul-boards boards-${lineup.length}`}>
        {lineup.map((entry, board) => {
          if (entry.kind === 'bot') return botBoard(board, entry.id)
          if (standIns[board]) return botBoard(board, standIns[board])
          const invite = invites[entry.inviteId]
          if (invite?.status === 'accepted' && invite.gameId) {
            return (
              <OnlineGame
                key={`${board}-${invite.gameId}`}
                compact
                gameId={invite.gameId}
                account={account}
                progress={progress}
                onExit={onExit}
                onResult={recordResult(board, null)}
                api={api}
              />
            )
          }
          return (
            <FriendWaiting
              key={`${board}-waiting`}
              player={entry.player}
              status={entry.error ? 'error' : (invite?.status ?? 'pending')}
              error={entry.error}
              onCancel={() => api.cancelInvite(entry.inviteId)}
              onUseBot={(botId) => setStandIns((s) => ({ ...s, [board]: botId }))}
            />
          )
        })}
      </div>

      {confirmingLeave && (
        <ConfirmDialog
          title="Leave the simul?"
          text={
            withFriends
              ? 'Games against bots that are still going count as lost. Games with friends go on, and you can rejoin them from the main menu.'
              : 'The games still going count as lost.'
          }
          confirmLabel="Leave"
          onConfirm={onExit}
          onCancel={() => setConfirmingLeave(false)}
        />
      )}

      {finished && (
        <div className="overlay">
          <div className={`dialog ${passed ? 'win' : 'loss'}`} role="dialog" aria-modal="true">
            <h2>{passed ? 'Simul passed!' : 'Not quite'}</h2>
            <p className="reason">
              You scored {showPoints(score)} of {lineup.length}
              {passed ? '.' : `; you need ${needed}.`}
            </p>
            {/* After passing, going back is the green button. Games with friends can't be
                replayed from here (invite them again for a new simul). */}
            <div className="dialog-buttons">
              {(passed || withFriends) && (
                <button className="primary" onClick={onExit} autoFocus>
                  Back to the Simul
                </button>
              )}
              {!withFriends && (
                <button className={passed ? 'secondary' : 'primary'} onClick={restart} autoFocus={!passed}>
                  {passed ? 'Play again' : 'Try again'}
                </button>
              )}
              {!passed && !withFriends && (
                <button className="secondary" onClick={onExit}>
                  Back to the Simul
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// A board waiting for a friend to accept their invite. If they decline (or the invite
// couldn't be sent), a bot can play the board instead.
function FriendWaiting({ player, status, error, onCancel, onUseBot }) {
  const [botId, setBotId] = useState('lukas')
  const open = status === 'pending'
  const message = {
    pending: `Waiting for ${player.name} to accept…`,
    declined: `${player.name} declined.`,
    cancelled: `The invite to ${player.name} was cancelled.`,
    error: error,
  }[status]
  return (
    <section className="simul-board simul-waiting">
      <Avatar bot={{ ...player, flag: '' }} size={56} />
      <p>{message}</p>
      {open ? (
        <button className="friend-button" onClick={onCancel}>
          Cancel invite
        </button>
      ) : (
        <div className="simul-stand-in">
          <select className="profile-select" value={botId} onChange={(e) => setBotId(e.target.value)}>
            {Object.values(BOTS).map((bot) => (
              <option key={bot.id} value={bot.id}>
                {bot.name} ({bot.ratingLabel ?? bot.rating})
              </option>
            ))}
          </select>
          <button className="friend-button primary" onClick={() => onUseBot(botId)}>
            Play this bot instead
          </button>
        </div>
      )}
    </section>
  )
}
