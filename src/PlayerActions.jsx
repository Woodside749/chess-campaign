import { useState } from 'react'
import { REPORT_REASONS } from './friends.js'
import Avatar from './Avatar.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'

// The menu for another player (the ⋯ button on the Friends screen, a friend's card on the
// profile page, or a name in the chat): Invite to game (coming later), the friend button
// (Add friend, Request sent, Accept, or Remove friend), Block and Report, each with its own
// "are you sure?" or form.
// `player` is the other player and `api` friends.js. How we are connected is either
// `friendshipId` (set if they are a friend) or `relation`, like { kind: 'incoming', id }
// (kind: 'none', 'friend', 'incoming' or 'outgoing'; leave both out to show no friend button).
// `onDone(message)` is called after a change (to reload and show the message), `onClose`
// when the menu is closed without one. From the chat, `reportReason` and `reportDetails`
// fill in the report form (the reason, and the message being reported).
export default function PlayerActions({
  player,
  friendshipId,
  relation,
  myId,
  api,
  onDone,
  onClose,
  reportReason = null,
  reportDetails = '',
}) {
  const link = relation ?? (friendshipId ? { kind: 'friend', id: friendshipId } : null)
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
        onConfirm={() => act(() => api.removeFriendship(link.id), `${player.name} is no longer your friend.`)}
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
        initialReason={reportReason}
        initialDetails={reportDetails}
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
          {link?.kind === 'none' && (
            <button className="secondary" onClick={() => act(() => api.sendRequest(myId, player.id), `Friend request sent to ${player.name}.`)}>
              Add friend
            </button>
          )}
          {link?.kind === 'outgoing' && (
            <button className="secondary" disabled>
              Friend request sent
            </button>
          )}
          {link?.kind === 'incoming' && (
            <button className="secondary" onClick={() => act(() => api.acceptRequest(link.id), `You and ${player.name} are now friends.`)}>
              Accept friend request
            </button>
          )}
          {link?.kind === 'friend' && (
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
function ReportDialog({ player, initialReason, initialDetails, onSend, onClose }) {
  const [reason, setReason] = useState(initialReason)
  const [details, setDetails] = useState(initialDetails)
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
