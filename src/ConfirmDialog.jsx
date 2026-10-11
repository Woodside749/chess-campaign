// A small "are you sure?" pop-up, used before resigning or leaving a game.
export default function ConfirmDialog({ title, text, confirmLabel, onConfirm, onCancel }) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="confirm-title">
          {title}
        </h2>
        {text && <p className="reason">{text}</p>}
        <div className="dialog-buttons">
          <button className="danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button className="secondary" onClick={onCancel} autoFocus>
            Keep playing
          </button>
        </div>
      </div>
    </div>
  )
}
