import { achievementsFor } from './achievements.js'
import { playerTitle, tierStars, usePlayer } from './player.js'
import Avatar from './Avatar.jsx'
import TitleBadge from './TitleBadge.jsx'
import StarBadges from './StarBadges.jsx'
import StarIcon from './StarIcon.jsx'

// The player's achievements: earned ones in colour, the rest greyed out with what to do.
export default function Achievements({ progress, onBack }) {
  const achievements = achievementsFor(progress)
  const title = playerTitle(progress)
  const earned = achievements.filter((a) => a.got).length
  const player = usePlayer()
  return (
    <main className="achievements-screen">
      <button className="back" onClick={onBack}>
        ← Campaign
      </button>
      <header className="achievements-header">
        <div className="avatar-with-stars">
          <Avatar bot={player} size={64} />
          <StarBadges stars={tierStars(progress)} size={18} />
        </div>
        <div>
          <h1>
            <TitleBadge title={title} /> {player.name}
          </h1>
          <p className="achievements-summary">
            {title ? `${title.name} · ` : 'No title yet · '}
            {earned} of {achievements.length} achievements
          </p>
        </div>
      </header>
      <ul className="achievement-list">
        {achievements.map((achievement) => (
          <li key={achievement.id} className={`achievement${achievement.got ? ' got' : ''}`}>
            <span className="achievement-icon" aria-hidden="true">
              {!achievement.got ? '🔒' : achievement.star ? <StarIcon color={achievement.star} size={30} /> : achievement.icon}
            </span>
            <div>
              <div className="achievement-name">{achievement.name}</div>
              <div className="achievement-text">{achievement.text}</div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
