import { BOTS, shownRating } from './bots.js'
import Avatar from './Avatar.jsx'
import TitleBadge from './TitleBadge.jsx'
import { titleById } from './player.js'

// The Simul league: three simuls of rising difficulty. Like a tournament, a round
// unlocks when the one before it is passed, and passed rounds can be played again.
export default function SimulLeague({ event, roundsWon, onPlayRound, onBack }) {
  const allPassed = roundsWon >= event.rounds.length
  return (
    <main className="tournament-screen">
      <section className="puzzle-intro">
        <div className="puzzle-intro-icon" aria-hidden="true">
          🎭
        </div>
        <h2>How it works</h2>
        <ul>
          <li>You play three opponents at once, on three boards side by side. You have White on every board.</li>
          <li>Every board has its own {event.minutes}-minute clocks. Your clock on a board runs whenever it is your move there, so don't leave a board waiting too long.</li>
          <li>Each opponent thinks on its own, so move on another board while one is thinking.</li>
          <li>A win is 1 point and a draw is ½. Score {event.rounds[0].needed} of 3 to pass and unlock the next simul.</li>
        </ul>
      </section>

      <aside className="tournament-panel">
        <button className="back" onClick={onBack}>
          ← Home
        </button>
        <div className="event-place">{event.place}</div>
        <h1>{event.title}</h1>
        <p className="event-description">{event.description}</p>

        {allPassed && <p className="champion-banner">🏆 {event.championText}</p>}

        <ol className="round-list">
          {event.rounds.map((round, i) => {
            const passed = i < roundsWon
            const locked = i > roundsWon
            return (
              <li key={round.title} className={`round-item${locked ? ' locked' : ''}`}>
                <div className="round-name">
                  {round.title}
                  {passed && <span className="round-won"> ✓ Passed</span>}
                </div>
                <div className="simul-opponents">
                  {round.opponents.map((id) => (
                    <span key={id} className="simul-opponent">
                      <Avatar bot={BOTS[id]} size={28} />
                      <TitleBadge title={titleById(BOTS[id].chessTitle)} /> {BOTS[id].name.split(' ')[0]} ({shownRating(BOTS[id])})
                    </span>
                  ))}
                </div>
                {locked ? (
                  <p className="round-locked">🔒 Pass the {event.rounds[i - 1].title.toLowerCase()} to unlock</p>
                ) : (
                  <button className={passed ? 'round-play secondary' : 'round-play'} onClick={() => onPlayRound(i)}>
                    {passed ? 'Play again' : 'Start simul'}
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
