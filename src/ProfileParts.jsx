import { useEffect, useState } from 'react'
import { STAR_TIERS, maxStars, starsWon } from './career.js'
import { achievementsFor } from './achievements.js'
import { playerTitle, tierStars } from './player.js'
import { roundsWon } from './progress.js'
import * as onlineApi from './online.js'
import { GAME_MODES } from './gameModes.js'
import Icon from './Icon.jsx'
import Avatar from './Avatar.jsx'
import TitleBadge from './TitleBadge.jsx'
import StarBadges from './StarBadges.jsx'
import StarIcon from './StarIcon.jsx'

// The parts that the player's own profile and a friend's profile share: the header, the
// numbers, the online ratings and the achievements.

// The top of a profile: the character with its tier stars, the title and username, the
// country and how long they have played. `avatar` replaces the plain picture (the own
// profile makes it a button that opens the character editor); `children` go below.
export function ProfileHeader({ player, progress, since, avatar, children }) {
  const title = playerTitle(progress)
  return (
    <header className="profile-header">
      <div className="avatar-with-stars">
        {avatar ?? <Avatar bot={player} size={88} />}
        <StarBadges stars={tierStars(progress)} size={18} />
      </div>
      <div className="profile-who">
        <h1>
          <TitleBadge title={title} /> {player.name}
        </h1>
        <p className="profile-sub">
          {title ? title.name : 'No title yet'}
          {player.country && ` · ${player.flag} ${player.country}`}
        </p>
        <p className="profile-sub">
          Playing since {new Date(since).toLocaleDateString('en', { month: 'long', year: 'numeric' })}
        </p>
        {children}
      </div>
    </header>
  )
}

// Campaign stars, achievements and game mode trophies.
export function ProfileStats({ progress }) {
  const wonIn = (eventId) => roundsWon(progress, eventId)
  const stars = STAR_TIERS.reduce((sum, tier) => sum + starsWon(wonIn, tier.section), 0)
  const allStars = STAR_TIERS.reduce((sum, tier) => sum + maxStars(tier.section), 0)
  const achievements = achievementsFor(progress)
  const modeWins = Object.values(progress.modeWins ?? {}).reduce((sum, bots) => sum + bots.length, 0)
  return (
    <ul className="profile-stats">
      <Stat value={`${stars} / ${allStars}`} label="Campaign stars" />
      <Stat value={`${achievements.filter((a) => a.got).length} / ${achievements.length}`} label="Achievements" />
      <Stat value={modeWins} label="Game mode trophies" />
    </ul>
  )
}

function Stat({ value, label }) {
  return (
    <li className="profile-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </li>
  )
}

// A player's online rating in every game mode (Play online), in two rows that slide
// sideways: the modes played first (highest rating first, so the best are on the left),
// then the rest, which show the starting rating, 1200.
export function RatingStrip({ playerId, api = onlineApi }) {
  const [ratings, setRatings] = useState({})
  useEffect(() => {
    let cancelled = false
    api.loadRatings(playerId).then(({ ratings: loaded }) => !cancelled && loaded && setRatings(loaded))
    return () => {
      cancelled = true
    }
  }, [playerId, api])
  return (
    <section className="profile-section">
      <h2>Online ratings</h2>
      <ul className="rating-strip">
        {sortedModes(ratings).map((mode) => (
          <li key={mode.id} className="rating-card">
            <span className="rating-card-mode">
              <Icon icon={mode.icon} /> {mode.title}
            </span>
            <strong>{ratings[mode.id]?.rating ?? api.START_RATING}</strong>
            <span className="rating-card-games">
              {ratings[mode.id]
                ? `${ratings[mode.id].games} game${ratings[mode.id].games === 1 ? '' : 's'}`
                : 'Not played yet'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

// The online modes in the order the ratings show them (see RatingStrip).
function sortedModes(ratings) {
  const modes = GAME_MODES.filter((mode) => !mode.simul)
  const played = modes.filter((mode) => ratings[mode.id]).sort((a, b) => ratings[b.id].rating - ratings[a.id].rating)
  return [...played, ...modes.filter((mode) => !ratings[mode.id])]
}

// Every achievement as a small badge: earned ones in colour (first), the rest faded.
// Hovering (or a long press) shows what it is for.
export function AchievementBadges({ progress }) {
  const achievements = achievementsFor(progress)
  const sorted = [...achievements.filter((a) => a.got), ...achievements.filter((a) => !a.got)]
  return (
    <section className="profile-section">
      <h2>Achievements</h2>
      <ul className="achievement-badges">
        {sorted.map((achievement) => (
          <li key={achievement.id} className={achievement.got ? 'got' : ''} title={achievement.text}>
            <span className="achievement-badge-icon" aria-hidden="true">
              {achievement.star ? <StarIcon color={achievement.star} size={20} /> : achievement.icon}
            </span>
            {achievement.name}
            {!achievement.got && <span className="visually-hidden"> (not yet)</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
