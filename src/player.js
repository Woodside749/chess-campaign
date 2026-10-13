// The player: how they look in the game, and the title they have earned.
// There are no accounts yet, so the player is simply "You", and the title comes from
// the career progress saved in this browser.
import { wonEvent } from './career.js'
import { roundsWon } from './progress.js'

// Looks like a bot to the Avatar component (a coloured circle with an initial).
export const PLAYER = { id: 'you', name: 'You', color: '#6f8f4e', flag: '', country: '' }

// Chess titles, like FIDE Master in real life. Shown as a small badge next to the name.
export const TITLES = {
  master: { short: 'M', name: 'Master', earnedBy: 'master-championship' },
}

// The player's title, like TITLES.master, or null if they haven't earned one yet.
export function playerTitle(progress) {
  const wonIn = (eventId) => roundsWon(progress, eventId)
  return Object.values(TITLES).find((title) => wonEvent(wonIn, title.earnedBy)) ?? null
}
