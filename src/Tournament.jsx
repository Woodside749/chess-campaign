import { BOTS, shownRating } from './bots.js'
import { titleById } from './player.js'
import Avatar from './Avatar.jsx'
import TitleBadge from './TitleBadge.jsx'
import Bracket from './Bracket.jsx'
import Silhouette from './Silhouette.jsx'
import { FAIRY_VARIANTS } from './fairy/variants.js'

// A tournament: the bracket on the left, and the player's rounds on the right.
// A round unlocks when the round before it is won, and any unlocked round can be replayed.
export default function Tournament({ event, roundsWon, playerTitle, onPlayRound, onBack }) {
  const champion = roundsWon >= event.rounds.length
  return (
    <main className="tournament-screen">
      <div className="bracket-area">
        <Bracket event={event} roundsWon={roundsWon} playerTitle={playerTitle} />
      </div>

      <aside className="tournament-panel">
        <button className="back" onClick={onBack}>
          ← Home
        </button>
        <div className="event-place">{event.place}</div>
        <h1>{event.title}</h1>
        <p className="event-description">{event.description}</p>

        {champion && <p className="champion-banner">🏆 {event.championText}</p>}

        <ol className="round-list">
          {event.rounds.map((round, i) => {
            const bot = BOTS[round.opponent]
            const won = i < roundsWon
            const locked = i > roundsWon
            return (
              <li key={round.name} className={`round-item${locked ? ' locked' : ''}`}>
                <div className="round-name">
                  {round.name}
                  {won && <span className="round-won"> ✓ Won</span>}
                </div>
                <div className="round-opponent">
                  {/* Opponents stay hidden until the round unlocks, like in a real tournament. */}
                  {locked ? <Silhouette size={36} /> : <Avatar bot={bot} size={36} />}
                  <div>
                    <div className="opponent-name">
                      {locked ? (
                        'Opponent not decided yet'
                      ) : (
                        <>
                          <TitleBadge title={titleById(bot.chessTitle)} /> {bot.name} <span className="rating">({shownRating(bot)})</span>
                        </>
                      )}
                    </div>
                    <div className="bot-bio">
                      {(round.variant ?? event.variant) in FAIRY_VARIANTS &&
                        `${FAIRY_VARIANTS[round.variant ?? event.variant].title} · `}
                      You play {round.color === 'w' ? 'White' : 'Black'} · {event.minutes} min{event.increment ? ` + ${event.increment} s per move` : ''}
                    </div>
                  </div>
                </div>
                {locked ? (
                  <p className="round-locked">🔒 Win {unlockName(event.rounds[i - 1].name)} to unlock</p>
                ) : (
                  <button className={won ? 'round-play secondary' : 'round-play'} onClick={() => onPlayRound(i)}>
                    {won ? 'Play again' : `Play ${round.name.toLowerCase()}`}
                  </button>
                )}
              </li>
            )
          })}
        </ol>
      </aside>
    </main>
  )
}

// "Round 1" -> "round 1", "Semi-final" -> "the semi-final", "Round of 16" -> "the round
// of 16", for "Win ... to unlock".
function unlockName(name) {
  const lower = name.toLowerCase()
  return /^round \d/.test(lower) ? lower : `the ${lower}`
}
