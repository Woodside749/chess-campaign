import { BOTS } from './bots.js'
import { useState } from 'react'
import Avatar from './Avatar.jsx'

const GROUPS = [
  { id: 'school', title: 'Chess School' },
  { id: 'circuit', title: 'Amateur circuit' },
  { id: 'advanced', title: 'Advanced' },
]

const COLOR_CHOICES = [
  { value: 'w', label: 'White' },
  { value: 'b', label: 'Black' },
  { value: 'random', label: 'Random' },
]

// The developer menu: play any bot, for testing. Pick a colour, then tap an opponent.
export default function Menu({ colorChoice, onColorChoice, onPlay, onBack, onResetProgress }) {
  return (
    <main className="app menu">
      <button className="back" onClick={onBack}>
        ← Home
      </button>
      <h1>Developer menu</h1>
      <p className="subtitle">Amateur tier · play any bot with a 10-minute clock</p>

      <div className="color-choice" role="radiogroup" aria-label="Play as">
        <span>Play as</span>
        {COLOR_CHOICES.map((choice) => (
          <button
            key={choice.value}
            role="radio"
            aria-checked={colorChoice === choice.value}
            className={colorChoice === choice.value ? 'selected' : ''}
            onClick={() => onColorChoice(choice.value)}
          >
            {choice.label}
          </button>
        ))}
      </div>

      {GROUPS.map((group) => (
        <section key={group.id}>
          <h2 className="group-title">{group.title}</h2>
          <BotList bots={Object.values(BOTS).filter((bot) => bot.group === group.id)} onPlay={onPlay} />
        </section>
      ))}

      <h2 className="group-title">Testing</h2>
      <ResetProgressButton onReset={onResetProgress} />
    </main>
  )
}

function BotList({ bots, onPlay }) {
  return (
    <ul className="bot-list">
      {bots.map((bot) => (
        <li key={bot.id}>
          <button className="bot-card" onClick={() => onPlay(bot)}>
            <Avatar bot={bot} size={56} />
            <div className="bot-card-text">
              <div className="opponent-name">
                {bot.name} <span className="rating">({bot.rating})</span>
              </div>
              <div className="bot-bio">
                {bot.country} · {bot.bio}
              </div>
            </div>
            <span className="play-arrow" aria-hidden="true">
              ▶
            </span>
          </button>
        </li>
      ))}
    </ul>
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
      {done ? 'Career progress reset ✓' : 'Reset career progress'}
    </button>
  )
}
