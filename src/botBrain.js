// How a bot decides on a move and how long it "thinks" about it.
import { getEngine } from './engine.js'
import { moveTraits } from './moveTraits.js'
import { botSettings } from './botStrength.js'

// On average the bot spends this fraction of its remaining time on a move
// (before its own `speed` is applied). Lower makes bots think longer.
const TIME_DIVISOR = 70
// The clock length these timings are tuned for. Shorter games (blitz, bullet) scale
// them down, so a 1-minute bot doesn't panic after a few moves.
const STANDARD_CLOCK_MS = 10 * 60 * 1000
// With a 10-minute clock, below this much time left the bot starts making more mistakes.
const TIME_PRESSURE_MS = 60_000
// How much the blunder chance rises (at most) as the clock approaches zero.
const MAX_EXTRA_BLUNDER = 0.3

const randomBetween = (min, max) => min + Math.random() * (max - min)
const pickRandom = (list) => list[Math.floor(Math.random() * list.length)]

// How long the bot should take for its next move, in milliseconds.
// `clockMs` is how long each side's clock started with.
export function thinkTimeMs(game, bot, timeLeftMs, clockMs = STANDARD_CLOCK_MS) {
  // Quick moves get quicker in fast games (but no less than a fifth as long).
  const pace = Math.min(1, Math.max(0.2, clockMs / STANDARD_CLOCK_MS))
  const think = (() => {
    // Only one legal move: play it almost straight away.
    if (game.moves().length === 1) return randomBetween(300, 800) * pace
    // The first few moves are quick, like a human playing a familiar opening.
    if (game.history().length < 8) return randomBetween(600, 2000) * pace
    // Otherwise a share of the remaining time, made random between 0.4x and 1.6x.
    return (timeLeftMs / TIME_DIVISOR) * randomBetween(0.4, 1.6)
  })()
  // Fast players (speed below 1) move quicker, slow players take longer.
  // Never use more than a third of the time that is left.
  return Math.max(200, Math.min(think * bot.speed, timeLeftMs / 3))
}

// 0 when relaxed, rising to 1 as the clock runs out. The pressure starts at a tenth of
// the clock: after 9 of 10 minutes, or after 54 seconds of a 1-minute game.
export function timePressure(timeLeftMs, clockMs = STANDARD_CLOCK_MS) {
  const startsAt = TIME_PRESSURE_MS * (clockMs / STANDARD_CLOCK_MS)
  return Math.max(0, 1 - timeLeftMs / startsAt)
}

// The bot's chance of a random move, which rises when its clock is low.
// A `flawless` bot (the final bosses) never makes time-pressure mistakes.
export function blunderChanceNow(bot, timeLeftMs, game, clockMs) {
  const pressure = bot.flawless ? 0 : timePressure(timeLeftMs, clockMs)
  return botSettings(bot, game).blunderChance + pressure * MAX_EXTRA_BLUNDER
}

// Picks the bot's move, in this order:
// 1. A move from its opening book, if the game so far matches one of its lines.
// 2. Sometimes a random move (a blunder), more often when short of time.
// 3. Otherwise: Stockfish suggests its top moves, and the bot picks one using its
//    personality (style bonuses), a bit of randomness, and how far below the best
//    move it is willing to go (tolerance).
// `clockMs` is how long each side's clock started with (for time pressure).
export async function chooseBotMove(game, bot, timeLeftMs, engine = getEngine(), clockMs = STANDARD_CLOCK_MS) {
  const legalMoves = game.moves({ verbose: true })
  if (legalMoves.length === 1) return legalMoves[0].san

  const bookMove = openingBookMove(game, bot)
  if (bookMove) return bookMove

  if (Math.random() < blunderChanceNow(bot, timeLeftMs, game, clockMs)) return pickRandom(legalMoves).san

  const settings = botSettings(bot, game)
  const candidates = await engine.analyse(game.fen(), { depth: settings.depth, multiPv: settings.candidates })
  // Safety net: if Stockfish has no suggestions, play any legal move rather than get stuck.
  if (candidates.length === 0) return pickRandom(legalMoves).san
  const bestScore = candidates[0].score
  // Under time pressure the bot also accepts worse moves.
  const tolerance = settings.tolerance * (1 + (bot.flawless ? 0 : timePressure(timeLeftMs, clockMs)))

  let choice = null
  let choiceTotal = -Infinity
  for (const candidate of candidates) {
    if (candidate.score < bestScore - tolerance) continue
    const move = legalMoves.find((m) => m.lan === candidate.uci)
    if (!move) continue
    const total = candidate.score + styleBonus(game, move, bot) + randomBetween(-settings.noise, settings.noise)
    if (total > choiceTotal) {
      choice = move
      choiceTotal = total
    }
  }
  return (choice ?? legalMoves.find((m) => m.lan === candidates[0].uci)).san
}

// Adds up the bot's bonuses for the traits this move has.
export function styleBonus(game, move, bot) {
  if (!bot.style || Object.keys(bot.style).length === 0) return 0
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
