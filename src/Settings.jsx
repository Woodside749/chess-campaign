import { useState } from 'react'
import { getVolume, playSound, setVolume } from './sounds.js'

// The ⚙️ button that opens the settings (on the main menu and in every game). For now the
// only setting is the volume: slide it to 0 to turn the sound off.
export default function SettingsButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="settings-button" aria-label="Settings" title="Settings" onClick={() => setOpen(true)}>
        ⚙️
      </button>
      {open && <SettingsDialog onClose={() => setOpen(false)} />}
    </>
  )
}

function SettingsDialog({ onClose }) {
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
          <button className="primary" onClick={onClose} autoFocus>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
