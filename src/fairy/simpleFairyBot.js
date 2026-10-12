// A simple backup brain for fairy chess, used only if Fairy-Stockfish can't start in
// this browser (it needs a "cross-origin isolated" page, see vite.config.js). It looks
// one move ahead plus the opponent's replies: it plays a winning move (mate in one, or a
// variant win like reaching the hill), likes winning material, and avoids leaving the
// moved piece where it can be taken. Much weaker than
// the real engine, but the game stays playable.
import { PIECE_VALUES } from '../material.js'
import { botSettings } from '../botStrength.js'
import { fairyRules } from './loadFairy.js'

export function simpleFairyMove(game, bot) {
  const moves = game.moves({ verbose: true })
  const asMove = (m) => ({ from: m.from, to: m.to, promotion: m.promotion })
  // Weaker bots still make random moves now and then, like with the real engine.
  if (Math.random() < botSettings(bot, game).blunderChance) {
    return asMove(moves[Math.floor(Math.random() * moves.length)])
  }

  const ffish = fairyRules()
  let best = moves[0]
  let bestScore = -Infinity
  for (const move of moves) {
    let score = PIECE_VALUES[move.captured] ?? 0
    const after = new ffish.Board(game.variantName, move.after, game.is960)
    const replies = after.legalMoves() ? after.legalMoves().split(' ') : []
    const won = after.isGameOver(true) && after.result(true) === (move.color === 'w' ? '1-0' : '0-1')
    if (won) score += 1000 // checkmate, or a variant win like reaching the hill
    // If the opponent can take the piece that just moved, count it as lost.
    if (replies.some((reply) => reply.slice(2, 4) === move.to)) score -= PIECE_VALUES[move.promotion ?? move.piece]
    after.delete()
    score += Math.random() * 0.5 // a little variety between equal moves
    if (score > bestScore) {
      best = move
      bestScore = score
    }
  }
  return asMove(best)
}
