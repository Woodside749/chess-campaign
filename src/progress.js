// The player's career progress, saved in the browser (localStorage), so it survives
// closing the page. It only lives in this browser on this device for now.
//
// Shape: { tournaments: { [eventId]: { roundsWon: 0 } } }

const STORAGE_KEY = 'chess-career-progress-v1'

const EMPTY = { tournaments: {} }

export function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return saved && typeof saved === 'object' ? { ...EMPTY, ...saved } : EMPTY
  } catch {
    // Storage can be blocked (for example in private browsing). Start fresh then.
    return EMPTY
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // If saving fails, the game still works; progress just won't be remembered.
  }
}

// How many rounds of a tournament the player has won so far.
export function roundsWon(progress, eventId) {
  return progress.tournaments[eventId]?.roundsWon ?? 0
}

// The progress after winning round `round` (0 = first round) of a tournament.
// Winning a round you've already won again doesn't change anything.
export function withRoundWon(progress, eventId, round) {
  const won = roundsWon(progress, eventId)
  if (round < won) return progress
  return {
    ...progress,
    tournaments: { ...progress.tournaments, [eventId]: { roundsWon: round + 1 } },
  }
}
