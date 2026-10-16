import { useState } from 'react'
import * as feedbackApi from './feedback.js'

// The feedback window: 🐞 Report a bug or 💡 Suggest a feature (two tabs). Bug reports also
// send where the player was (`context`) and their browser. Only for logged-in players.
// `myId` is the player's account (null when logged out); `api` is feedback.js.
export default function FeedbackDialog({ myId, kind: firstKind, context, onClose, api = feedbackApi }) {
  const [kind, setKind] = useState(firstKind)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)
  const [sent, setSent] = useState(false)

  async function send(e) {
    e.preventDefault()
    setBusy(true)
    const error = await api.sendFeedback(myId, kind, message, context)
    setBusy(false)
    setProblem(error)
    if (!error) setSent(true)
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form className="dialog account feedback-dialog" role="dialog" aria-modal="true" onSubmit={send} onClick={(e) => e.stopPropagation()}>
        <div className="feedback-tabs" role="tablist">
          {[
            ['bug', '🐞 Report a bug'],
            ['idea', '💡 Suggest a feature'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={kind === value}
              className={kind === value ? 'selected' : ''}
              onClick={() => {
                setKind(value)
                setSent(false)
                setProblem(null)
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {!myId ? (
          <>
            <p className="account-message">Log in (top right on the main menu) to send us a message.</p>
            <div className="dialog-buttons">
              <button className="secondary" type="button" onClick={onClose} autoFocus>
                Close
              </button>
            </div>
          </>
        ) : sent ? (
          <>
            <p className="account-message">
              {kind === 'bug' ? 'Thanks for reporting it! We will take a look.' : 'Thanks for the idea! We read every one.'}
            </p>
            <div className="dialog-buttons">
              <button className="primary" type="button" onClick={onClose} autoFocus>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="account-hint">
              {kind === 'bug'
                ? 'What went wrong, and what did you expect to happen? We also send which screen you are on and your browser, to help find it.'
                : 'What should we add to Chess Campaign next? New game modes, features, bots, anything.'}
            </p>
            <label className="account-field">
              {kind === 'bug' ? 'What happened?' : 'Your idea'}
              <textarea
                rows={5}
                maxLength={api.MAX_LENGTH}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                autoFocus
              />
            </label>
            {problem && <p className="account-message error">{problem}</p>}
            <div className="dialog-buttons">
              <button className="primary" type="submit" disabled={busy || !message.trim()}>
                {busy ? 'Sending…' : 'Send'}
              </button>
              <button className="secondary" type="button" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
