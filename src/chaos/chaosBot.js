// The bot's brain for Chaos Chess. Stockfish only knows normal chess, so:
// - Normal moves the rule allows are scored by Stockfish, told to search only those
//   moves (that handles every restriction exactly).
// - Special "power" moves are tried one by one: Stockfish scores the position after
//   each one from the opponent's side, and the bot takes the opposite of that score.
// Then the bot picks from the scored moves just like in normal games (tolerance,
// noise, personality), so its strength still matches its rating.
import { Chess } from 'chess.js'
import { blunderChanceNow, styleBonus, timePressure } from '../botBrain.js'
import { botSettings } from '../botStrength.js'
import { PIECE_VALUES } from '../material.js'
import { getEngine } from '../engine.js'

// At most this many special moves are checked (Swap alone can offer about a hundred).
const MAX_SPECIALS = 12
// How deep to look after a special move. Kept low, because each one is its own search.
const SPECIAL_DEPTH = 6

const randomBetween = (min, max) => min + Math.random() * (max - min)
const pickRandom = (list) => list[Math.floor(Math.random() * list.length)]

// Returns the move to play, as { from, to, promotion }.
export async function chooseChaosMove(game, bot, timeLeftMs, clockMs, engine = getEngine()) {
  const legal = game.moves({ verbose: true })
  const asInput = (m) => ({ from: m.from, to: m.to, promotion: m.promotion })
  if (legal.length === 1) return asInput(legal[0])
  if (Math.random() < blunderChanceNow(bot, timeLeftMs, game, clockMs)) return asInput(pickRandom(legal))

  const settings = botSettings(bot, game)
  const normal = legal.filter((m) => !m.special)
  const scored = []

  if (normal.length > 0) {
    const lines = await engine.analyse(game.fen(), {
      depth: settings.depth,
      multiPv: settings.candidates,
      searchMoves: normal.map((m) => m.lan),
    })
    for (const line of lines) {
      const move = normal.find((m) => m.lan === line.uci)
      if (move) scored.push({ move, score: line.score })
    }
  }

  for (const move of specialsWorthChecking(legal.filter((m) => m.special))) {
    const replies = await engine.analyse(move.after, { depth: Math.min(settings.depth, SPECIAL_DEPTH), multiPv: 1 })
    let score
    if (replies.length > 0) score = -replies[0].score
    else score = new Chess(move.after).inCheck() ? 10000 : 0 // no reply: checkmate, or stalemate
    scored.push({ move, score })
  }

  if (scored.length === 0) return asInput(pickRandom(legal))
  const best = Math.max(...scored.map((s) => s.score))
  const tolerance = settings.tolerance * (1 + timePressure(timeLeftMs, clockMs))
  let choice = null
  let choiceTotal = -Infinity
  for (const { move, score } of scored) {
    if (score < best - tolerance) continue
    const total = score + styleBonus(game, move, bot) + randomBetween(-settings.noise, settings.noise)
    if (total > choiceTotal) {
      choice = move
      choiceTotal = total
    }
  }
  return asInput(choice ?? scored.find((s) => s.score === best).move)
}

// Picks which special moves to check: captures first (biggest first), then a random
// selection of the rest. A swap of A and B is listed both ways, so only one is kept,
// and a promotion is only checked as a queen.
function specialsWorthChecking(specials) {
  const seen = new Set()
  const unique = specials.filter((m) => {
    if (m.promotion && m.promotion !== 'q') return false
    const key = m.swap ? [m.from, m.to].sort().join() : m.from + m.to
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const captures = unique.filter((m) => m.captured).sort((a, b) => PIECE_VALUES[b.captured] - PIECE_VALUES[a.captured])
  const others = unique.filter((m) => !m.captured).sort(() => Math.random() - 0.5)
  return [...captures, ...others].slice(0, MAX_SPECIALS)
}
