import { STAR_TIERS, starsWon } from './career.js'
import { playerTitle } from './player.js'
import { roundsWon } from './progress.js'
import SettingsButton from './Settings.jsx'
import AccountButton from './Account.jsx'
import GlobalChat from './GlobalChat.jsx'

// The main menu, the first screen of the game: big tiles on the left (the chess campaign,
// the game modes, play local and friends work so far, the rest are coming soon) and the
// global chat on the right (GlobalChat.jsx).
export default function MainMenu({ progress, account, onOpenCampaign, onOpenGameModes, onOpenProfile, onOpenLocal, onOpenFriends }) {
  const wonIn = (eventId) => roundsWon(progress, eventId)
  const started = Object.keys(progress.tournaments).length > 0
  const stars = STAR_TIERS.reduce((sum, tier) => sum + starsWon(wonIn, tier.section), 0)
  const title = playerTitle(progress)

  return (
    <main className="main-menu">
      <section className="menu-left">
        <div className="menu-title-row">
          <h1 className="menu-title">Chess Campaign</h1>
          <div className="menu-buttons">
            <AccountButton account={account} onOpenProfile={onOpenProfile} />
            <SettingsButton />
          </div>
        </div>
        <div className="menu-grid">
          <MenuTile color="dark-green" size="small" icon="👥" title="Play with friends" onClick={onOpenFriends} />
          <MenuTile color="dark-green" size="small" icon="🤝" title="Play local" onClick={onOpenLocal} />
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
          <MenuTile
            color="red"
            icon="🎲"
            title="Game modes"
            text="Every mode against any bot: blitz, fog, ducks, chaos and more."
            onClick={onOpenGameModes}
          />
          <MenuTile color="yellow" icon="🧙" title="Start your fantasy chess campaign" soon />
        </div>
      </section>

      <GlobalChat account={account} />
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
