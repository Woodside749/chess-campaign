// The player's career progress, saved in the browser (localStorage), so it survives
// closing the page. When the player is logged in, App also saves it to their account
// (cloudProgress.js), and mergeProgress combines the two.
//
// Shape: { tournaments: { [eventId]: { roundsWon: 0 } },
//          modeWins: { [gameModeId]: [botId, ...] } }   (bots beaten in the game modes menu)

// The key keeps the game's first working name ("Chess Career"): changing it would make
// every browser forget its saved career.
const STORAGE_KEY = 'chess-career-progress-v1'

const EMPTY = { tournaments: {}, modeWins: {} }

export function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    // (Older saves have no modeWins yet, so the empty one fills in.)
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

// The bots beaten in a game mode (from the game modes menu), as a set of bot ids.
export function modeWins(progress, modeId) {
  return new Set(progress.modeWins?.[modeId] ?? [])
}

// The progress after beating `botId` in game mode `modeId`.
export function withModeWin(progress, modeId, botId) {
  const wins = modeWins(progress, modeId)
  if (wins.has(botId)) return progress
  return { ...progress, modeWins: { ...progress.modeWins, [modeId]: [...wins, botId] } }
}

// Everything won in either `a` or `b` (for example the browser's progress and the
// account's): the most rounds won in each tournament, and every trophy from both.
export function mergeProgress(a, b) {
  const merged = { tournaments: { ...a?.tournaments }, modeWins: { ...a?.modeWins } }
  for (const [eventId, { roundsWon: won }] of Object.entries(b?.tournaments ?? {})) {
    if (won > roundsWon(merged, eventId)) merged.tournaments[eventId] = { roundsWon: won }
  }
  for (const [modeId, bots] of Object.entries(b?.modeWins ?? {})) {
    merged.modeWins[modeId] = [...new Set([...(merged.modeWins[modeId] ?? []), ...bots])]
  }
  return merged
}

// Clears all saved progress (used by the developer menu).
export function clearProgress() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing saved, or storage is blocked: either way there is nothing to clear.
  }
  return EMPTY
}
