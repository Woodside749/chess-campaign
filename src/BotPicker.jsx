import { shownRating } from './bots.js'
import { titleById } from './player.js'
import Avatar from './Avatar.jsx'
import TitleBadge from './TitleBadge.jsx'

// Shared pieces for choosing an opponent: the colour choice and the list of bots. Used by
// the developer menu and the game modes screen.

const COLOR_CHOICES = [
  { value: 'w', label: 'White' },
  { value: 'b', label: 'Black' },
  { value: 'random', label: 'Random' },
]

// "Play as White / Black / Random".
export function ColorChoice({ value, onChange }) {
  return (
    <div className="color-choice" role="radiogroup" aria-label="Play as">
      <span>Play as</span>
      {COLOR_CHOICES.map((choice) => (
        <button
          key={choice.value}
          role="radio"
          aria-checked={value === choice.value}
          className={value === choice.value ? 'selected' : ''}
          onClick={() => onChange(choice.value)}
        >
          {choice.label}
        </button>
      ))}
    </div>
  )
}

// A list of bots to tap. `beaten` (optional) is a set of bot ids that get a 🏆, and
// `action` the symbol at the end of each row (▶ to play, ＋ to add to a simul).
// `titles` false hides the chess titles (the game modes menu shows none).
export function BotList({ bots, onPick, beaten, action = '▶', titles = true }) {
  return (
    <ul className="bot-list">
      {bots.map((bot) => (
        <li key={bot.id}>
          <button className="bot-card" onClick={() => onPick(bot)}>
            <Avatar bot={bot} size={56} />
            <div className="bot-card-text">
              <div className="opponent-name">
                {titles && <TitleBadge title={titleById(bot.chessTitle)} />} {bot.name} <span className="rating">({shownRating(bot)})</span>
                {beaten?.has(bot.id) && (
                  <span className="beaten" title="You have beaten this bot in this mode">
                    {' '}
                    🏆
                  </span>
                )}
              </div>
              <div className="bot-bio">
                {bot.country} · {bot.bio}
              </div>
            </div>
            <span className="play-arrow" aria-hidden="true">
              {action}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
