import { achievementsFor } from './achievements.js'
import { playerTitle, tierStars, usePlayer } from './player.js'
import Avatar from './Avatar.jsx'
import TitleBadge from './TitleBadge.jsx'
import StarBadges from './StarBadges.jsx'
import { AchievementList } from './ProfileParts.jsx'

// The player's achievements (from the campaign): earned ones in colour, the rest greyed out
// with what to do.
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
      <AchievementList progress={progress} />
    </main>
  )
}
