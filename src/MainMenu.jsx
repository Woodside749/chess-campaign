import { STAR_TIERS, starsWon } from './career.js'
import { playerTitle } from './player.js'
import { roundsWon } from './progress.js'

// The main menu, the first screen of the game: big tiles on the left (only the chess
// campaign works so far, the rest are coming soon) and the global chat on the right
// (coming soon: it needs accounts and a server).
export default function MainMenu({ progress, onOpenCampaign }) {
  const wonIn = (eventId) => roundsWon(progress, eventId)
  const started = Object.keys(progress.tournaments).length > 0
  const stars = STAR_TIERS.reduce((sum, tier) => sum + starsWon(wonIn, tier.section), 0)
  const title = playerTitle(progress)

  return (
    <main className="main-menu">
      <section className="menu-left">
        <h1 className="menu-title">Chess Campaign</h1>
        <div className="menu-grid">
          <MenuTile color="dark-green" size="small" icon="👥" title="Play with friends" soon />
          <MenuTile color="dark-green" size="small" icon="🤝" title="Play local" soon />
          <MenuTile color="green" icon="🌐" title="Play online" text="Find an opponent and play a game." soon />
          <MenuTile
            color="light-blue"
            icon="♟️"
            title={started ? 'Continue your chess campaign' : 'Start your chess campaign'}
            text={
              started
                ? `${title ? `${title.name} · ` : ''}⭐ ${stars} stars won`
                : 'Travel a world tour of tournaments, from the Chess School to the World Championship.'
            }
            onClick={onOpenCampaign}
          />
          <MenuTile color="red" icon="🎲" title="Game modes" text="Chaos, fog, ducks and more, whenever you like." soon />
          <MenuTile color="purple" icon="👾" title="Start your chess monster campaign" soon />
        </div>
      </section>

      <aside className="menu-chat" aria-label="Global chat">
        <h2>🌍 Global chat</h2>
        <div className="chat-messages">
          <p className="chat-empty">
            Meet other players here: find friends, and agree on a game mode to play together.
          </p>
          <p className="chat-empty">Coming soon, for everyone with an account.</p>
        </div>
        <input className="chat-input" placeholder="Create an account to chat (coming soon)" disabled />
      </aside>
    </main>
  )
}

// One tile of the menu. `soon` tiles show "Coming soon" and can't be clicked yet.
function MenuTile({ color, size = 'big', icon, title, text, soon, onClick }) {
  return (
    <button className={`menu-tile ${color} ${size}`} onClick={onClick} disabled={soon}>
      <span className="menu-tile-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="menu-tile-title">{title}</span>
      {text && size === 'big' && <span className="menu-tile-text">{text}</span>}
      {soon && <span className="menu-tile-soon">Coming soon</span>}
    </button>
  )
}
