// Turns a bot's `strength` (0 = weakest, 1 = strongest) into the settings that
// botBrain.js uses. One dial is much easier to tune than five separate numbers.
// A bot in bots.js can still override any single setting if it needs to.
//
// What the settings mean:
// - blunderChance: chance of playing a completely random move.
// - depth: how many moves ahead Stockfish looks when scoring candidate moves.
// - candidates: how many of Stockfish's top moves the bot considers.
// - tolerance: how much worse than the best move (in centipawns, 100 = one pawn)
//   a move may be and still be considered.
// - noise: random amount (up to +/- this many centipawns) added to every move.
export function strengthSettings(strength) {
  const weakness = 1 - strength
  return {
    blunderChance: 0.85 * weakness ** 2,
    depth: 1 + Math.round(7 * strength),
    candidates: 12 - Math.round(7 * strength),
    tolerance: 50 + 550 * weakness,
    noise: 30 + 270 * weakness,
  }
}

// A bot's full settings: what its strength gives, plus anything set on the bot itself.
export function botSettings(bot) {
  return { ...strengthSettings(bot.strength ?? 0.5), ...bot }
}
