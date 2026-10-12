const TITLES = { win: 'You won!', loss: 'You lost', draw: 'Draw' }

// The pop-up shown when a game ends.
export default function GameOverDialog({ result, bot, botLine, onTryAgain, onClose, onMenu, menuLabel = 'Back to menu' }) {
  return (
    <div className="overlay">
      <div className={`dialog ${result.outcome}`} role="dialog" aria-modal="true" aria-labelledby="result-title">
        <h2 id="result-title">{TITLES[result.outcome]}</h2>
        <p className="reason">{result.reason}</p>
        <blockquote>
          “{botLine}”
          <cite>{bot.name}</cite>
        </blockquote>
        {/* After a win you usually want to move on, so the way back (for example to the
            bracket) is the green button. After a loss or draw, trying again is. */}
        {result.outcome === 'win' ? (
          <div className="dialog-buttons">
            <button className="primary" onClick={onMenu} autoFocus>
              {menuLabel}
            </button>
            <button className="secondary" onClick={onTryAgain}>
              Play again
            </button>
            <button className="secondary" onClick={onClose}>
              View board
            </button>
          </div>
        ) : (
          <div className="dialog-buttons">
            <button className="primary" onClick={onTryAgain} autoFocus>
              {result.outcome === 'loss' ? 'Try again' : 'Play again'}
            </button>
            <button className="secondary" onClick={onClose}>
              View board
            </button>
            <button className="secondary" onClick={onMenu}>
              {menuLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
