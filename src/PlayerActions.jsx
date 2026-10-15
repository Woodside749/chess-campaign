import { useState } from 'react'
import { REPORT_REASONS } from './friends.js'
import Avatar from './Avatar.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'

// The menu for another player (the ⋯ button on the Friends screen, or a friend's card on
// the profile page): Invite to game (coming later), Remove friend (for friends), Block and
// Report, each with its own "are you sure?" or form.
// `player` is the other player, `friendshipId` set if they are a friend, `api` friends.js.
// `onDone(message)` is called after a change (to reload and show the message), `onClose`
// when the menu is closed without one.
export default function PlayerActions({ player, friendshipId, myId, api, onDone, onClose }) {
  const [step, setStep] = useState('menu') // 'menu', 'remove', 'block' or 'report'
  const [problem, setProblem] = useState(null)

  async function act(action, message) {
    const error = await action()
    if (error) setProblem(error)
    else onDone(message)
    return error
  }

  if (step === 'remove') {
    return (
      <ConfirmDialog
        title={`Remove ${player.name}?`}
        text="You won't be friends anymore. You can send a new request later."
        confirmLabel="Remove friend"
        cancelLabel="Keep friend"
        onConfirm={() => act(() => api.removeFriendship(friendshipId), `${player.name} is no longer your friend.`)}
        onCancel={onClose}
      />
    )
  }

  if (step === 'block') {
    return (
      <ConfirmDialog
        title={`Block ${player.name}?`}
        text="You won't see each other in searches, you can't send each other friend requests, and you won't see their chat messages. If you're friends, that ends. You can unblock them later."
        confirmLabel="Block"
        cancelLabel="Cancel"
        onConfirm={() => act(() => api.blockPlayer(myId, player.id), `${player.name} is blocked.`)}
        onCancel={onClose}
      />
    )
  }

  if (step === 'report') {
    return (
      <ReportDialog
        player={player}
        onSend={async (reason, details, alsoBlock) => {
          const reported = await api.reportPlayer(myId, player.id, reason, details)
          if (reported) return reported
          const blocked = alsoBlock ? await api.blockPlayer(myId, player.id) : null
          if (blocked) return blocked
          onDone(`Thanks. Your report about ${player.name} has been sent${alsoBlock ? ', and they are blocked' : ''}.`)
          return null
        }}
        onClose={onClose}
      />
    )
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog player-menu" role="dialog" aria-modal="true" aria-label={player.name} onClick={(e) => e.stopPropagation()}>
        <Avatar bot={player} size={64} />
        <h2>{player.name}</h2>
        {problem && <p className="account-message error">{problem}</p>}
        <div className="dialog-buttons">
          {/* Games between players come later. */}
          <button className="primary" disabled title="Coming soon: games between players">
            Invite to game
          </button>
          {friendshipId && (
            <button className="secondary" onClick={() => setStep('remove')}>
              Remove friend
            </button>
          )}
          <button className="secondary" onClick={() => setStep('block')}>
            🚫 Block
          </button>
          <button className="secondary" onClick={() => setStep('report')}>
            🚩 Report
          </button>
          <button className="secondary" onClick={onClose} autoFocus>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// Reporting a player to the admins: a reason, a few optional words, and whether to block
// them too. `onSend(reason, details, alsoBlock)` returns an error message, or null.
function ReportDialog({ player, onSend, onClose }) {
  const [reason, setReason] = useState(null)
  const [details, setDetails] = useState('')
  const [alsoBlock, setAlsoBlock] = useState(true)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)

  async function send(e) {
    e.preventDefault()
    setBusy(true)
    setProblem(await onSend(reason, details, alsoBlock))
    setBusy(false)
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form className="dialog account report-dialog" role="dialog" aria-modal="true" onSubmit={send} onClick={(e) => e.stopPropagation()}>
        <h2>Report {player.name}</h2>
        <p className="account-hint">What's wrong? The admins will look at it. {player.name} won't be told who reported them.</p>
        <div className="report-reasons" role="radiogroup" aria-label="Reason">
          {REPORT_REASONS.map(([value, label]) => (
            <label key={value} className={reason === value ? 'report-reason selected' : 'report-reason'}>
              <input type="radio" name="reason" value={value} checked={reason === value} onChange={() => setReason(value)} />
              {label}
            </label>
          ))}
        </div>
        <label className="account-field">
          More details (optional)
          <textarea rows={3} maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} />
        </label>
        <label className="account-check">
          <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} />
          <span>Also block {player.name}</span>
        </label>
        {problem && <p className="account-message error">{problem}</p>}
        <div className="dialog-buttons">
          <button className="primary" type="submit" disabled={!reason || busy}>
            {busy ? 'Sending…' : 'Send report'}
          </button>
          <button className="secondary" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
