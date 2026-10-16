import { useState } from 'react'
import { getVolume, playSound, setVolume } from './sounds.js'
import { useFeedback } from './feedbackContext.js'

// The ⚙️ button that opens the settings (on the main menu and in every game): the volume
// (slide it to 0 to turn the sound off), and the buttons to report a bug or suggest a
// feature. `context` says where the player is, for bug reports (like "Main menu").
export default function SettingsButton({ context = '' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="settings-button" aria-label="Settings" title="Settings" onClick={() => setOpen(true)}>
        ⚙️
      </button>
      {open && <SettingsDialog context={context} onClose={() => setOpen(false)} />}
    </>
  )
}

function SettingsDialog({ context, onClose }) {
  const openFeedback = useFeedback()
  const [volume, setVolumeState] = useState(getVolume)
  const percent = Math.round(volume * 100)

  function change(value) {
    setVolume(value)
    setVolumeState(value)
  }

  return (
    // Clicking outside the box closes it, like the Done button.
    <div className="overlay" onClick={onClose}>
      <div className="dialog settings" role="dialog" aria-modal="true" aria-label="Settings" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>
        <label className="volume-setting">
          <span className="volume-label">
            Volume <span className="volume-value">{percent === 0 ? '🔇 Off' : `${percent}%`}</span>
          </span>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={percent}
            onChange={(e) => change(Number(e.target.value) / 100)}
            // A test sound when you let go, so you hear the new volume.
            onPointerUp={() => playSound('move')}
            onKeyUp={() => playSound('move')}
          />
        </label>
        <div className="dialog-buttons">
          <button
            className="secondary"
            onClick={() => {
              onClose()
              openFeedback('bug', context)
            }}
          >
            🐞 Report a bug
          </button>
          <button
            className="secondary"
            onClick={() => {
              onClose()
              openFeedback('idea', context)
            }}
          >
            💡 Suggest a feature
          </button>
          <button className="primary" onClick={onClose} autoFocus>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
