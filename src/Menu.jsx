import { useState } from 'react'
import { BOT_GROUPS, botsInGroup } from './bots.js'
import { BotList, ColorChoice } from './BotPicker.jsx'
import { FAIRY_PIECES, FAIRY_VARIANTS } from './fairy/variants.js'
import { fairyPieces } from './fairy/fairyPieces.js'

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

      <h2 className="group-title">Fairy pieces</h2>
      <FairyPieceList />

      <h2 className="group-title">Testing</h2>
      <ResetProgressButton onReset={onResetProgress} />
    </main>
  )
}

// Every custom fairy piece, in white and black, with how it moves and the Fairy Chess
// setups that use it, to keep track of them.
function FairyPieceList() {
  return (
    <ul className="fairy-piece-list">
      {Object.entries(FAIRY_PIECES).map(([letter, piece]) => {
        const type = letter.toUpperCase()
        const setups = Object.values(FAIRY_VARIANTS).filter((variant) => variant.pieces?.includes(letter))
        return (
          <li key={letter} className="fairy-piece-card">
            <span className="fairy-piece-pictures">
              <span className="fairy-piece-picture light">{fairyPieces['w' + type]()}</span>
              <span className="fairy-piece-picture dark">{fairyPieces['b' + type]()}</span>
            </span>
            <span className="bot-card-text">
              <span className="opponent-name">
                {piece.name} <span className="rating">({letter} · worth {piece.value})</span>
              </span>
              <span className="bot-bio">
                Moves {piece.moves}.<br />
                In: {setups.map((variant) => variant.title).join(', ') || 'no setup yet'}
              </span>
            </span>
          </li>
        )
      })}
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
      {done ? 'Campaign progress reset ✓' : 'Reset campaign progress'}
    </button>
  )
}
