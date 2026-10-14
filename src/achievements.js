// Achievements: milestones in the career. Each one is worked out from the saved progress,
// so it can never get out of step with it (and earlier wins count straight away).
import { STAR_TIERS, maxStars, starsWon, wonEvent } from './career.js'

const colorOf = (section) => STAR_TIERS.find((tier) => tier.section === section).color
import { roundsWon } from './progress.js'

// `earned(wonIn)` says whether the player has it; `wonIn(eventId)` is rounds won there.
// `icon` is an emoji, or `star` the colour of a drawn star (the tier star achievements).
export const ACHIEVEMENTS = [
  {
    id: 'leagues-stars',
    star: colorOf('leagues'),
    name: 'Amateur Star',
    text: 'Win all 36 stars in the Amateur Leagues.',
    earned: (wonIn) => starsWon(wonIn, 'leagues') >= maxStars('leagues'),
  },
  {
    id: 'advanced-stars',
    star: colorOf('advanced'),
    name: 'Advanced Star',
    text: 'Win all 36 stars in the Advanced Leagues.',
    earned: (wonIn) => starsWon(wonIn, 'advanced') >= maxStars('advanced'),
  },
  {
    id: 'chess-master',
    icon: '👑',
    name: 'Chess Master',
    text: 'Win the Master Title Championship and earn the Master title.',
    earned: (wonIn) => wonEvent(wonIn, 'master-championship'),
  },
  {
    id: 'expert-stars',
    star: colorOf('expert'),
    name: 'Expert Star',
    text: 'Win all 36 stars in the Expert Leagues.',
    earned: (wonIn) => starsWon(wonIn, 'expert') >= maxStars('expert'),
  },
  {
    id: 'international-master',
    icon: '🎖️',
    name: 'International Master',
    text: 'Win the International Master Title Championship and earn the IM title.',
    earned: (wonIn) => wonEvent(wonIn, 'im-championship'),
  },
  {
    id: 'master-stars',
    star: colorOf('master'),
    name: 'Master Star',
    text: 'Win all 36 stars in the Master Leagues.',
    earned: (wonIn) => starsWon(wonIn, 'master') >= maxStars('master'),
  },
  {
    id: 'grandmaster',
    icon: '🌟',
    name: 'Grandmaster',
    text: 'Win the Grandmaster Title Championship and earn the GM title, the highest title in chess.',
    earned: (wonIn) => wonEvent(wonIn, 'gm-championship'),
  },
  {
    id: 'legend-stars',
    star: colorOf('legend'),
    name: 'Legend Star',
    text: 'Win all 36 stars in the Legend Leagues.',
    earned: (wonIn) => starsWon(wonIn, 'legend') >= maxStars('legend'),
  },
  {
    id: 'world-champion',
    icon: '🏆',
    name: 'World Champion',
    text: 'Win the World Championship and become the World Champion: the end of the campaign.',
    earned: (wonIn) => wonEvent(wonIn, 'world-championship'),
  },
]

// Every achievement with `got: true` or false for this player.
export function achievementsFor(progress) {
  const wonIn = (eventId) => roundsWon(progress, eventId)
  return ACHIEVEMENTS.map((achievement) => ({ ...achievement, got: achievement.earned(wonIn) }))
}
