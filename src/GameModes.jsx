import { BOT_GROUPS, BOTS, botsInGroup } from './bots.js'
import { GAME_MODES, modeById } from './gameModes.js'
import { FAIRY_VARIANTS } from './fairy/variants.js'
import { modeWins } from './progress.js'
import { BotList, ColorChoice } from './BotPicker.jsx'
import Avatar from './Avatar.jsx'
import Icon from './Icon.jsx'

// The game modes menu: every mode in a list on the left; on the right the chosen mode,
// with the colour choice and every bot to play (a 🏆 for each bot beaten in this mode).
// Fairy Chess first asks which setup; the Simul asks for three bots (the same bot may be
// picked more than once). `choice` holds what is picked, kept by App so it is still there
// after a game: { modeId, color, setup, simulBots }.
export default function GameModes({ progress, choice, onChoice, onPlay, onPlaySimul, onBack }) {
  const mode = modeById(choice.modeId)
  const beaten = modeWins(progress, mode.id)
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
    <main className="game-modes">
      <aside className="mode-list-panel">
        <button className="back" onClick={onBack}>
          ← Main menu
        </button>
        <h1>Game modes</h1>
        <ul className="mode-list">
          {GAME_MODES.map((m, i) => (
            <li key={m.id} className={i === 4 ? 'first-variant' : ''}>
              <button
                className={m.id === mode.id ? 'mode-item selected' : 'mode-item'}
                onClick={() => set({ modeId: m.id, simulBots: [] })}
              >
                <span className="mode-icon" aria-hidden="true">
                  <Icon icon={m.icon} />
                </span>
                {m.title}
                {modeWins(progress, m.id).size > 0 && (
                  <span className="mode-wins" title="Bots beaten in this mode">
                    🏆 {modeWins(progress, m.id).size}
                  </span>
                )}
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

        {mode.simul ? (
          <SimulPicks bots={choice.simulBots} onRemove={(i) => set({ simulBots: choice.simulBots.filter((_, j) => j !== i) })} onStart={() => onPlaySimul(mode, choice.simulBots)} />
        ) : (
          <ColorChoice value={choice.color} onChange={(color) => set({ color })} />
        )}

        {BOT_GROUPS.map((group) => (
          <section key={group.id}>
            <h3 className="group-title">{group.title}</h3>
            <BotList bots={botsInGroup(group.id)} onPick={pickBot} beaten={beaten} action={mode.simul ? '＋' : '▶'} />
          </section>
        ))}
      </section>
    </main>
  )
}

// The simul's three chosen opponents (tap one to take it out again), and the start button.
function SimulPicks({ bots, onRemove, onStart }) {
  return (
    <div className="simul-picks">
      <p className="mode-text">You play White on all three boards, with 10 minutes each. Pick three bots below.</p>
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
