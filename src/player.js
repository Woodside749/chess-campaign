// The player: how they look in the game, and the title they have earned.
// There are no accounts yet, so the player is simply "You", and the title comes from
// the career progress saved in this browser.
import { wonEvent } from './career.js'
import { roundsWon } from './progress.js'

// Looks like a bot to the Avatar component (a coloured circle with an initial).
export const PLAYER = { id: 'you', name: 'You', color: '#6f8f4e', flag: '', country: '' }

// Chess titles, like in real life (FIDE Master, International Master). Shown as a small
// badge next to the name. Listed from highest to lowest: the player shows the highest
// title they have earned.
export const TITLES = [
  { id: 'im', short: 'IM', name: 'International Master', earnedBy: 'im-championship' },
  { id: 'master', short: 'M', name: 'Master', earnedBy: 'master-championship' },
]

// The player's highest title, like { short: 'IM', ... }, or null if they have none yet.
export function playerTitle(progress) {
  const wonIn = (eventId) => roundsWon(progress, eventId)
  return TITLES.find((title) => wonEvent(wonIn, title.earnedBy)) ?? null
}
