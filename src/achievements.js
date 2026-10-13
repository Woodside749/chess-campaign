// Achievements: milestones in the career. Each one is worked out from the saved progress,
// so it can never get out of step with it (and earlier wins count straight away).
import { wonEvent } from './career.js'
import { roundsWon } from './progress.js'

// `earned(wonIn)` says whether the player has it; `wonIn(eventId)` is rounds won there.
export const ACHIEVEMENTS = [
  {
    id: 'chess-master',
    icon: '👑',
    name: 'Chess Master',
    text: 'Win the Master Title Championship and earn the Master title.',
    earned: (wonIn) => wonEvent(wonIn, 'master-championship'),
  },
]

// Every achievement with `got: true` or false for this player.
export function achievementsFor(progress) {
  const wonIn = (eventId) => roundsWon(progress, eventId)
  return ACHIEVEMENTS.map((achievement) => ({ ...achievement, got: achievement.earned(wonIn) }))
}
