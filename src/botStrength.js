import { isEndgame } from './material.js'

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
//
// Above 1 (up to 1.5) is for the Legend tier: the bot searches deeper (8 moves at 1, up to
// 16 at 1.5), compares fewer moves and has almost no randomness left. Up to 1 nothing
// changes, so the bots of the earlier tiers keep their calibration.
export function strengthSettings(strength) {
  if (strength > 1) return legendSettings(Math.min(strength, 1.5))
  const weakness = 1 - strength
  return {
    blunderChance: 0.85 * weakness ** 2,
    depth: 1 + Math.round(7 * strength),
    candidates: 12 - Math.round(7 * strength),
    tolerance: 50 + 550 * weakness,
    noise: 30 + 270 * weakness,
  }
}

// The settings above 1. `x` goes from 0 (at strength 1) to 1 (at strength 1.5), and the
// numbers carry on smoothly from where strengthSettings stops at 1.
function legendSettings(strength) {
  const x = (strength - 1) / 0.5
  return {
    blunderChance: 0,
    depth: 8 + Math.round(8 * x),
    candidates: 5 - Math.round(2 * x),
    tolerance: 50 - 40 * x,
    noise: 30 - 25 * x,
  }
}

// A bot's full settings in the current position: what its strength gives, plus anything
// set on the bot itself. A bot with an `endgameBoost` plays stronger in endgames.
export function botSettings(bot, game) {
  let strength = bot.strength ?? 0.5
  // (The boost stops at 1 for the earlier tiers, so they keep their calibration, and at
  // 1.5 for Legend bots.)
  if (bot.endgameBoost && game && isEndgame(game)) strength = Math.min(strength > 1 ? 1.5 : 1, strength + bot.endgameBoost)
  return { ...strengthSettings(strength), ...bot }
}

// The `strength` setting that plays at `rating` in a fairy variant, read from that
// variant's measured strength curve: a list of [strength, rating] points from
// `npm run calibrate-fairy` (see FAIRY_VARIANTS in fairy/variants.js). Between two points
// it goes in a straight line; outside the measured range it uses the nearest end.
export function strengthForRating(curve, rating) {
  const points = [...curve].sort((a, b) => a[1] - b[1])
  if (rating <= points[0][1]) return points[0][0]
  if (rating >= points.at(-1)[1]) return points.at(-1)[0]
  for (let i = 1; i < points.length; i++) {
    const [s0, r0] = points[i - 1]
    const [s1, r1] = points[i]
    if (rating <= r1) return s0 + ((rating - r0) / (r1 - r0)) * (s1 - s0)
  }
  return points.at(-1)[0]
}

// A bot's style without the personality traits a variant ignores (see `ignoreTraits` in
// fairy/variants.js), like "likes giving check" in Antichess, where there is no check.
export function withoutTraits(style = {}, ignored = []) {
  return Object.fromEntries(Object.entries(style).filter(([trait]) => !ignored.includes(trait)))
}
