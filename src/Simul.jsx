import { useEffect, useRef, useState } from 'react'
import { BOTS } from './bots.js'
import Game from './Game.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'

// Points for each result, like in a real tournament: a draw is half a point.
const POINTS = { win: 1, draw: 0.5, loss: 0 }
const showPoints = (points) => String(points).replace('.5', '½').replace(/^0½/, '½')

// One simul round: the player against three bots on three boards at the same time.
// The bots think on their own, so while one is thinking you can move on another board.
// `round` is { title, opponents, needed } from career.js. `onFinish(passed)` is called
// once, when all three games are over.
export default function Simul({ round, onFinish, onExit }) {
  const [results, setResults] = useState({}) // bot id → 'win', 'loss' or 'draw'
  const [attempt, setAttempt] = useState(0) // a new number starts three fresh games
  const [confirmingLeave, setConfirmingLeave] = useState(false)

  const score = Object.values(results).reduce((sum, outcome) => sum + POINTS[outcome], 0)
  const finished = Object.keys(results).length === round.opponents.length
  const passed = score >= round.needed

  // Tell the Simul league screen once, when the last game is over.
  const reportedRef = useRef(false)
  useEffect(() => {
    if (!finished || reportedRef.current) return
    reportedRef.current = true
    onFinish(passed)
  }, [finished, passed, onFinish])

  function restart() {
    reportedRef.current = false
    setResults({})
    setAttempt(attempt + 1)
  }

  // Leaving with games still going asks first, because those games count as lost.
  function leave() {
    if (finished) onExit()
    else setConfirmingLeave(true)
  }

  return (
    <main className="simul-screen">
      <header className="simul-header">
        <button className="back" onClick={leave}>
          ← Back
        </button>
        <h1>🎭 {round.title}</h1>
        <p className="simul-score">
          Score <strong>{showPoints(score)}</strong> of {round.opponents.length} · need {round.needed} to pass
        </p>
      </header>

      <div className="simul-boards">
        {round.opponents.map((id) => (
          <Game
            key={`${id}-${attempt}`}
            compact
            bot={BOTS[id]}
            startColor="w"
            timed={false}
            onResult={(result) => setResults((r) => ({ ...r, [id]: result.outcome }))}
            onExit={onExit}
          />
        ))}
      </div>

      {confirmingLeave && (
        <ConfirmDialog
          title="Leave the simul?"
          text="The games still going count as lost."
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
              You scored {showPoints(score)} of {round.opponents.length}
              {passed ? '.' : `; you need ${round.needed}.`}
            </p>
            {/* After passing, going back to the league is the green button. */}
            <div className="dialog-buttons">
              {passed && (
                <button className="primary" onClick={onExit} autoFocus>
                  Back to the Simul
                </button>
              )}
              <button className={passed ? 'secondary' : 'primary'} onClick={restart} autoFocus={!passed}>
                {passed ? 'Play again' : 'Try again'}
              </button>
              {!passed && (
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
