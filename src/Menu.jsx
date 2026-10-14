import { useState } from 'react'
import { BOT_GROUPS, botsInGroup } from './bots.js'
import { BotList, ColorChoice } from './BotPicker.jsx'

// The developer menu: play any bot, for testing. Pick a colour, then tap an opponent.
export default function Menu({ colorChoice, onColorChoice, onPlay, onBack, onResetProgress }) {
  return (
    <main className="app menu">
      <button className="back" onClick={onBack}>
        ← Campaign
      </button>
      <h1>Developer menu</h1>
      <p className="subtitle">Amateur tier · play any bot with a 10-minute clock</p>

      <ColorChoice value={colorChoice} onChange={onColorChoice} />

      {BOT_GROUPS.map((group) => (
        <section key={group.id}>
          <h2 className="group-title">{group.title}</h2>
          <BotList bots={botsInGroup(group.id)} onPick={onPlay} />
        </section>
      ))}

      <h2 className="group-title">Testing</h2>
      <ResetProgressButton onReset={onResetProgress} />
    </main>
  )
}

// Clears the saved career progress, so tournaments can be tested from the start.
function ResetProgressButton({ onReset }) {
  const [done, setDone] = useState(false)
  return (
    <button
      className="dev-reset"
      onClick={() => {
        onReset()
        setDone(true)
      }}
    >
      {done ? 'Campaign progress reset ✓' : 'Reset campaign progress'}
    </button>
  )
}
