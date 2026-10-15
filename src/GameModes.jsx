import { BOTS } from './bots.js'
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
// Fairy Chess first asks which setup; the Simul asks for three bots (the same bot may be
// picked more than once). `choice` holds what is picked, kept by App so it is still there
// after a game: { modeId, color, setup, simulBots, names }.
// With `local` it is the Play local menu instead: two people on one device, so the same
// modes (without the Simul) but two name fields and a start button instead of the bots;
// `onPlayLocal(mode)` starts the game.
export default function GameModes({ progress, choice, onChoice, onPlay, onPlaySimul, onBack, local = false, onPlayLocal }) {
  const mode = modeById(choice.modeId)
  const beaten = modeWins(progress, mode.id)
  const modes = local ? GAME_MODES.filter((m) => !m.simul) : GAME_MODES
  const set = (changes) => onChoice((current) => ({ ...current, ...changes }))

  function pickBot(bot) {
    if (!mode.simul) {
      onPlay(mode, bot)
      return
    }
    onChoice((current) =>
      current.simulBots.length < 3 ? { ...current, simulBots: [...current.simulBots, bot.id] } : current,
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
                onClick={() => set({ modeId: m.id, simulBots: [] })}
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
          <SimulPicks minutes={choice.minutes} bots={choice.simulBots} onRemove={(i) => set({ simulBots: choice.simulBots.filter((_, j) => j !== i) })} onStart={() => onPlaySimul(mode, choice.simulBots)} />
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

// The simul's three chosen opponents (tap one to take it out again), and the start button.
function SimulPicks({ minutes, bots, onRemove, onStart }) {
  return (
    <div className="simul-picks">
      <p className="mode-text">
        You play White on all three boards, {minutes === null ? 'with no clock' : `with ${minutes} minutes each`}. Pick three bots below.
      </p>
      <div className="simul-slots">
        {[0, 1, 2].map((i) =>
          bots[i] ? (
            <button key={i} className="simul-slot filled" onClick={() => onRemove(i)} title="Take out">
              <Avatar bot={BOTS[bots[i]]} size={32} />
              {BOTS[bots[i]].name.split(' ')[0]} ✕
            </button>
          ) : (
            <span key={i} className="simul-slot">
              Board {i + 1}
            </span>
          ),
        )}
        <button className="event-play" onClick={onStart} disabled={bots.length < 3}>
          Start simul
        </button>
      </div>
    </div>
  )
}
