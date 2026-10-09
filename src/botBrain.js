// How a bot decides on a move and how long it "thinks" about it.
import { getEngine } from './engine.js'

// On average the bot spends this fraction of its remaining time on a move.
// Lower the number to make bots think longer, raise it to make them faster.
const TIME_DIVISOR = 70
// Below this much time left, the bot starts making more mistakes.
const TIME_PRESSURE_MS = 60_000
// How much the blunder chance rises (at most) as the clock approaches zero.
const MAX_EXTRA_BLUNDER = 0.3

const randomBetween = (min, max) => min + Math.random() * (max - min)

// How long the bot should take for its next move, in milliseconds.
export function thinkTimeMs(game, timeLeftMs) {
  const think = (() => {
    // Only one legal move: play it almost straight away.
    if (game.moves().length === 1) return randomBetween(300, 800)
    // The first few moves are quick, like a human playing a familiar opening.
    if (game.history().length < 8) return randomBetween(600, 2000)
    // Otherwise a share of the remaining time, made random between 0.4x and 1.6x.
    return (timeLeftMs / TIME_DIVISOR) * randomBetween(0.4, 1.6)
  })()
  // Never use more than a third of the time that is left.
  return Math.max(200, Math.min(think, timeLeftMs / 3))
}

// The bot's chance of a random move, which rises when its clock is low.
export function blunderChanceNow(bot, timeLeftMs) {
  const pressure = Math.max(0, 1 - timeLeftMs / TIME_PRESSURE_MS) // 0 = relaxed, 1 = no time
  return bot.blunderChance + pressure * MAX_EXTRA_BLUNDER
}

// Picks the bot's move: usually Stockfish's choice, sometimes a random blunder.
export async function chooseBotMove(game, bot, timeLeftMs) {
  const legalMoves = game.moves({ verbose: true })
  if (Math.random() < blunderChanceNow(bot, timeLeftMs)) {
    return legalMoves[Math.floor(Math.random() * legalMoves.length)].san
  }
  const uci = await getEngine().bestMove(game.fen(), {
    skillLevel: bot.skillLevel,
    depth: bot.depth,
  })
  // UCI moves look like "e2e4", or "e7e8q" for a promotion.
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }
}
