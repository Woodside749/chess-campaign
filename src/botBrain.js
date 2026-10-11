// How a bot decides on a move and how long it "thinks" about it.
import { getEngine } from './engine.js'
import { moveTraits } from './moveTraits.js'

// On average the bot spends this fraction of its remaining time on a move
// (before its own `speed` is applied). Lower makes bots think longer.
const TIME_DIVISOR = 70
// Below this much time left, the bot starts making more mistakes.
const TIME_PRESSURE_MS = 60_000
// How much the blunder chance rises (at most) as the clock approaches zero.
const MAX_EXTRA_BLUNDER = 0.3

const randomBetween = (min, max) => min + Math.random() * (max - min)
const pickRandom = (list) => list[Math.floor(Math.random() * list.length)]

// How long the bot should take for its next move, in milliseconds.
export function thinkTimeMs(game, bot, timeLeftMs) {
  const think = (() => {
    // Only one legal move: play it almost straight away.
    if (game.moves().length === 1) return randomBetween(300, 800)
    // The first few moves are quick, like a human playing a familiar opening.
    if (game.history().length < 8) return randomBetween(600, 2000)
    // Otherwise a share of the remaining time, made random between 0.4x and 1.6x.
    return (timeLeftMs / TIME_DIVISOR) * randomBetween(0.4, 1.6)
  })()
  // Fast players (speed below 1) move quicker, slow players take longer.
  // Never use more than a third of the time that is left.
  return Math.max(200, Math.min(think * bot.speed, timeLeftMs / 3))
}

// 0 when relaxed, rising to 1 as the clock runs out.
function timePressure(timeLeftMs) {
  return Math.max(0, 1 - timeLeftMs / TIME_PRESSURE_MS)
}

// The bot's chance of a random move, which rises when its clock is low.
export function blunderChanceNow(bot, timeLeftMs) {
  return bot.blunderChance + timePressure(timeLeftMs) * MAX_EXTRA_BLUNDER
}

// Picks the bot's move, in this order:
// 1. A move from its opening book, if the game so far matches one of its lines.
// 2. Sometimes a random move (a blunder), more often when short of time.
// 3. Otherwise: Stockfish suggests its top moves, and the bot picks one using its
//    personality (style bonuses), a bit of randomness, and how far below the best
//    move it is willing to go (tolerance).
export async function chooseBotMove(game, bot, timeLeftMs) {
  const legalMoves = game.moves({ verbose: true })
  if (legalMoves.length === 1) return legalMoves[0].san

  const bookMove = openingBookMove(game, bot)
  if (bookMove) return bookMove

  if (Math.random() < blunderChanceNow(bot, timeLeftMs)) return pickRandom(legalMoves).san

  const candidates = await getEngine().analyse(game.fen(), { depth: bot.depth, multiPv: bot.candidates })
  const bestScore = candidates[0].score
  // Under time pressure the bot also accepts worse moves.
  const tolerance = bot.tolerance * (1 + timePressure(timeLeftMs))

  let choice = null
  let choiceTotal = -Infinity
  for (const candidate of candidates) {
    if (candidate.score < bestScore - tolerance) continue
    const move = legalMoves.find((m) => m.lan === candidate.uci)
    if (!move) continue
    const total = candidate.score + styleBonus(game, move, bot) + randomBetween(-bot.noise, bot.noise)
    if (total > choiceTotal) {
      choice = move
      choiceTotal = total
    }
  }
  return (choice ?? legalMoves.find((m) => m.lan === candidates[0].uci)).san
}

// Adds up the bot's bonuses for the traits this move has.
export function styleBonus(game, move, bot) {
  const traits = moveTraits(game, move)
  let bonus = 0
  for (const [trait, value] of Object.entries(bot.style)) {
    if (traits[trait]) bonus += value
  }
  return bonus
}

// The next move from one of the bot's opening lines that matches the game so far.
function openingBookMove(game, bot) {
  const lines = bot.openings?.[game.turn()] ?? []
  const played = game.history()
  const matching = lines.filter(
    (line) => line.length > played.length && played.every((san, i) => line[i] === san),
  )
  if (matching.length === 0) return null
  const next = pickRandom(matching)[played.length]
  // Only play it if it's legal, in case the game didn't start from the normal position.
  return game.moves().includes(next) ? next : null
}
