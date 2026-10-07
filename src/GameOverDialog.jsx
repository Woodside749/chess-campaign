const TITLES = { win: 'You won!', loss: 'You lost', draw: 'Draw' }

// The pop-up shown when a game ends.
export default function GameOverDialog({ result, bot, botLine, onTryAgain, onClose }) {
  return (
    <div className="overlay">
      <div className={`dialog ${result.outcome}`} role="dialog" aria-modal="true" aria-labelledby="result-title">
        <h2 id="result-title">{TITLES[result.outcome]}</h2>
        <p className="reason">{result.reason}</p>
        <blockquote>
          “{botLine}”
          <cite>{bot.name}</cite>
        </blockquote>
        <div className="dialog-buttons">
          <button className="primary" onClick={onTryAgain} autoFocus>
            Try again
          </button>
          <button className="secondary" onClick={onClose}>
            View board
          </button>
        </div>
      </div>
    </div>
  )
}
