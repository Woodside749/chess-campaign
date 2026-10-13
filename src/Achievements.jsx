import { achievementsFor } from './achievements.js'
import { PLAYER, playerTitle } from './player.js'
import Avatar from './Avatar.jsx'
import TitleBadge from './TitleBadge.jsx'

// The player's achievements: earned ones in colour, the rest greyed out with what to do.
export default function Achievements({ progress, onBack }) {
  const achievements = achievementsFor(progress)
  const title = playerTitle(progress)
  const earned = achievements.filter((a) => a.got).length
  return (
    <main className="achievements-screen">
      <button className="back" onClick={onBack}>
        ← Home
      </button>
      <header className="achievements-header">
        <Avatar bot={PLAYER} size={64} />
        <div>
          <h1>
            <TitleBadge title={title} /> You
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
              {achievement.got ? achievement.icon : '🔒'}
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
