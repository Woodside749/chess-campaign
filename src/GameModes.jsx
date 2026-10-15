import { useEffect, useState } from 'react'
import { BOTS } from './bots.js'
import * as friendsApi from './friends.js'
import { GAME_MODES, TIME_CHOICES, fixedTime, modeById } from './gameModes.js'
import { FAIRY_VARIANTS } from './fairy/variants.js'
import { modeWins } from './progress.js'
import { BotList, ColorChoice } from './BotPicker.jsx'
import Avatar from './Avatar.jsx'
import Icon from './Icon.jsx'

// Every bot, weakest first (the game modes menu lists them by rating, without groups).
const BOTS_BY_RATING = Object.values(BOTS).sort((a, b) => a.rating - b.rating)

// The game modes menu: every mode in a list on the left; on the right the chosen mode,
// with the colour choice and every bot to play (a 🏆 for each bot beaten in this mode).
// Fairy Chess first asks which setup; the Simul asks how many boards (2 to 4) and who plays
// them: bots (the same bot may be picked more than once) and, for logged-in players,
// friends (they get an invite). `choice` holds what is picked, kept by App so it is still
// there after a game: { modeId, color, setup, simulCount, simulBoards, minutes, names };
// simulBoards is a list of { kind: 'bot', id } or { kind: 'friend', player }.
// With `local` it is the Play local menu instead: two people on one device, so the same
// modes (without the Simul) but two name fields and a start button instead of the bots;
// `onPlayLocal(mode)` starts the game.
export default function GameModes({ progress, account, choice, onChoice, onPlay, onPlaySimul, onBack, local = false, onPlayLocal }) {
  const mode = modeById(choice.modeId)
  const beaten = modeWins(progress, mode.id)
  const modes = local ? GAME_MODES.filter((m) => !m.simul) : GAME_MODES
  const set = (changes) => onChoice((current) => ({ ...current, ...changes }))

  function pickBot(bot) {
    if (!mode.simul) {
      onPlay(mode, bot)
      return
    }
    addToSimul({ kind: 'bot', id: bot.id })
  }

  // Puts a bot or a friend on the next free simul board.
  function addToSimul(board) {
    onChoice((current) =>
      current.simulBoards.length < current.simulCount ? { ...current, simulBoards: [...current.simulBoards, board] } : current,
    )
  }

  return (
    <main className={local ? 'game-modes local-modes' : 'game-modes'}>
      <aside className="mode-list-panel">
        <button className="back" onClick={onBack}>
          ← Main menu
        </button>
        <h1>{local ? 'Play local' : 'Game modes'}</h1>
        <ul className="mode-list">
          {modes.map((m) => (
            <li key={m.id}>
              <button
                className={m.id === mode.id ? 'mode-item selected' : 'mode-item'}
                onClick={() => set({ modeId: m.id })}
              >
                <span className="mode-icon" aria-hidden="true">
                  <Icon icon={m.icon} />
                </span>
                {m.title}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="mode-detail">
        <h2>
          <Icon icon={mode.icon} /> {mode.title}
        </h2>
        <p className="mode-text">{mode.text}</p>

        {mode.setups && (
          <div className="setup-choice" role="radiogroup" aria-label="Setup">
            {mode.setups.map((setup) => (
              <button
                key={setup}
                role="radio"
                aria-checked={choice.setup === setup}
                className={choice.setup === setup ? 'selected' : ''}
                onClick={() => set({ setup })}
              >
                {FAIRY_VARIANTS[setup].title}
              </button>
            ))}
          </div>
        )}

        {!fixedTime(mode) && <TimeChoice value={choice.minutes} onChange={(minutes) => set({ minutes })} />}

        {local ? (
          <LocalStart names={choice.names} onNames={(names) => set({ names })} onStart={() => onPlayLocal(mode)} />
        ) : mode.simul ? (
          <SimulPicks
            minutes={choice.minutes}
            count={choice.simulCount}
            boards={choice.simulBoards}
            myId={account?.user?.id}
            onCount={(simulCount) => set({ simulCount, simulBoards: choice.simulBoards.slice(0, simulCount) })}
            onAddFriend={(player) => addToSimul({ kind: 'friend', player })}
            onRemove={(i) => set({ simulBoards: choice.simulBoards.filter((_, j) => j !== i) })}
            onStart={() => onPlaySimul(mode, choice.simulBoards)}
          />
        ) : (
          <ColorChoice value={choice.color} onChange={(color) => set({ color })} />
        )}

        {!local && (
          <BotList
            bots={BOTS_BY_RATING}
            onPick={pickBot}
            beaten={beaten}
            action={mode.simul ? '＋' : '▶'}
            titles={false}
          />
        )}
      </section>
    </main>
  )
}

// The clock for this game: 1, 3, 5, 10 or 30 minutes each, or no clock.
function TimeChoice({ value, onChange }) {
  return (
    <div className="color-choice time-choice" role="radiogroup" aria-label="Time">
      <span>Time</span>
      {TIME_CHOICES.map((minutes) => (
        <button
          key={minutes ?? 'none'}
          role="radio"
          aria-checked={value === minutes}
          className={value === minutes ? 'selected' : ''}
          onClick={() => onChange(minutes)}
        >
          {minutes === null ? 'No time' : `${minutes} min`}
        </button>
      ))}
    </div>
  )
}

// Play local: the two players' names (empty means "White" and "Black") and the start button.
function LocalStart({ names, onNames, onStart }) {
  return (
    <div className="local-start">
      <p className="mode-text">Two players on this device, taking turns. The board turns to whoever is to move.</p>
      <div className="local-names">
        <label className="account-field">
          ♔ White
          <input value={names.w} placeholder="Write a name" maxLength={20} onChange={(e) => onNames({ ...names, w: e.target.value })} />
        </label>
        <label className="account-field">
          ♚ Black
          <input value={names.b} placeholder="Write a name" maxLength={20} onChange={(e) => onNames({ ...names, b: e.target.value })} />
        </label>
      </div>
      <button className="event-play" onClick={onStart}>
        Start game
      </button>
    </div>
  )
}

// The simul's boards: how many (2 to 4), who plays each (tap a filled board to take it out),
// and the start button. Bots are picked from the list below; logged-in players can also
// put friends on boards (they get an invite when the simul starts).
function SimulPicks({ minutes, count, boards, myId, onCount, onAddFriend, onRemove, onStart }) {
  const [picking, setPicking] = useState(false) // the friend list is open
  return (
    <div className="simul-picks">
      <div className="color-choice" role="radiogroup" aria-label="Boards">
        <span>Boards</span>
        {[2, 3, 4].map((n) => (
          <button key={n} role="radio" aria-checked={count === n} className={count === n ? 'selected' : ''} onClick={() => onCount(n)}>
            {n}
          </button>
        ))}
      </div>
      <p className="mode-text">
        You play White on all {count} boards, {minutes === null ? 'with no clock' : `with ${minutes} minutes each`}. Pick a bot
        for each board below{myId ? ', or add a friend' : ''}.
      </p>
      <div className="simul-slots">
        {Array.from({ length: count }, (_, i) => {
          const board = boards[i]
          if (!board) {
            return (
              <span key={i} className="simul-slot">
                Board {i + 1}
              </span>
            )
          }
          const who = board.kind === 'bot' ? BOTS[board.id] : board.player
          return (
            <button key={i} className="simul-slot filled" onClick={() => onRemove(i)} title="Take out">
              <Avatar bot={{ ...who, flag: '' }} size={32} />
              {who.name.split(' ')[0]}
              {board.kind === 'friend' && ' 👥'} ✕
            </button>
          )
        })}
        {myId && boards.length < count && (
          <button className="simul-slot add-friend" onClick={() => setPicking((open) => !open)}>
            ＋ Friend
          </button>
        )}
        <button className="event-play" onClick={onStart} disabled={boards.length < count}>
          Start simul
        </button>
      </div>
      {picking && myId && (
        <FriendPicker
          myId={myId}
          taken={boards.flatMap((board) => (board.kind === 'friend' ? [board.player.id] : []))}
          onPick={(player) => {
            onAddFriend(player)
            setPicking(false)
          }}
        />
      )}
    </div>
  )
}

// The player's friends, to put on a simul board (each friend at most once).
function FriendPicker({ myId, taken, onPick, api = friendsApi }) {
  const [friends, setFriends] = useState(null)
  useEffect(() => {
    let cancelled = false
    api.loadFriendships(myId).then(({ lists }) => !cancelled && setFriends(lists?.friends ?? []))
    return () => {
      cancelled = true
    }
  }, [myId, api])
  if (!friends) return <p className="mode-text">Loading your friends…</p>
  const free = friends.filter(({ player }) => !taken.includes(player.id))
  if (free.length === 0) return <p className="mode-text">No friends to add. Find friends with the Play with friends tile on the main menu.</p>
  return (
    <ul className="simul-friend-picker">
      {free.map(({ id, player }) => (
        <li key={id}>
          <button className="simul-slot filled" onClick={() => onPick(player)}>
            <Avatar bot={{ ...player, flag: '' }} size={32} />
            {player.name}
          </button>
        </li>
      ))}
    </ul>
  )
}
