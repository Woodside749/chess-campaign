// The Puzzle Trials league: three trials of rising difficulty. Like a tournament, a trial
// unlocks when the one before it is passed, and passed trials can be played again.
export default function PuzzleLeague({ event, roundsWon, onPlayTrial, onBack }) {
  const allPassed = roundsWon >= event.rounds.length
  return (
    <main className="tournament-screen">
      <section className="puzzle-intro">
        <div className="puzzle-intro-icon" aria-hidden="true">
          🧩
        </div>
        <h2>How it works</h2>
        <ul>
          <li>Each trial is {event.rounds[0].count} puzzles. The opponent makes a move, then it is your turn.</li>
          <li>Find the best move. Some puzzles need two or three moves in a row.</li>
          <li>
            Solve {event.rounds[0].needed} of {event.rounds[0].count} to pass and unlock the next, harder trial.
          </li>
          <li>Every attempt picks new puzzles.</li>
        </ul>
        <p className="puzzle-credit">
          Puzzles from the free{' '}
          <a href="https://database.lichess.org/#puzzles" target="_blank" rel="noreferrer">
            Lichess puzzle database
          </a>
          .
        </p>
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
          {event.rounds.map((trial, i) => {
            const passed = i < roundsWon
            const locked = i > roundsWon
            return (
              <li key={trial.title} className={`round-item${locked ? ' locked' : ''}`}>
                <div className="round-name">
                  {trial.title}
                  {passed && <span className="round-won"> ✓ Passed</span>}
                </div>
                <div className="bot-bio">
                  {trial.count} puzzles rated {trial.ratings} · solve {trial.needed} to pass
                </div>
                {locked ? (
                  <p className="round-locked">🔒 Pass the {event.rounds[i - 1].title.toLowerCase()} to unlock</p>
                ) : (
                  <button className={passed ? 'round-play secondary' : 'round-play'} onClick={() => onPlayTrial(i)}>
                    {passed ? 'Play again' : 'Start trial'}
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
