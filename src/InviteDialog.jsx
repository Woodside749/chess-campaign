import { useState } from 'react'
import { GAME_MODES, TIME_CHOICES, DEFAULT_MINUTES, describeInvite, fixedTime, inviteSettings, modeById } from './gameModes.js'
import { FAIRY_VARIANTS } from './fairy/variants.js'
import Avatar from './Avatar.jsx'

// Every mode can be played online, except the Simul (that comes later, as its own thing).
const ONLINE_MODES = GAME_MODES.filter((mode) => !mode.simul)

// The "Invite to game" window: pick the mode (and Fairy setup), the time and your colour.
// `onSend(settings)` sends the invite and returns an error message, or null.
export default function InviteDialog({ player, onSend, onClose }) {
  const [modeId, setModeId] = useState('rapid')
  const [setup, setSetup] = useState('archchess')
  const [minutes, setMinutes] = useState(DEFAULT_MINUTES)
  const [color, setColor] = useState('random')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)
  const mode = modeById(modeId)

  async function send(e) {
    e.preventDefault()
    setBusy(true)
    const error = await onSend(inviteSettings(mode, setup, minutes, color))
    setBusy(false)
    if (error) setProblem(error)
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form className="dialog account invite-dialog" role="dialog" aria-modal="true" onSubmit={send} onClick={(e) => e.stopPropagation()}>
        <Avatar bot={player} size={56} />
        <h2>Invite {player.name}</h2>

        <label className="account-field">
          Game mode
          <select className="profile-select" value={modeId} onChange={(e) => setModeId(e.target.value)}>
            {ONLINE_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>

        {mode.setups && (
          <label className="account-field">
            Setup
            <select className="profile-select" value={setup} onChange={(e) => setSetup(e.target.value)}>
              {mode.setups.map((id) => (
                <option key={id} value={id}>
                  {FAIRY_VARIANTS[id].title}
                </option>
              ))}
            </select>
          </label>
        )}

        {!fixedTime(mode) && (
          <div className="account-field">
            Time
            <div className="choice-pills">
              {TIME_CHOICES.map((m) => (
                <button key={m ?? 'none'} type="button" className={minutes === m ? 'selected' : ''} onClick={() => setMinutes(m)}>
                  {m === null ? 'No time' : `${m} min`}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="account-field">
          You play
          <div className="choice-pills">
            {[
              ['w', 'White'],
              ['b', 'Black'],
              ['random', 'Random'],
            ].map(([value, label]) => (
              <button key={value} type="button" className={color === value ? 'selected' : ''} onClick={() => setColor(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <p className="account-hint">{describeInvite(inviteSettings(mode, setup, minutes, color))}</p>
        {problem && <p className="account-message error">{problem}</p>}
        <div className="dialog-buttons">
          <button className="primary" type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send invite'}
          </button>
          <button className="secondary" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
