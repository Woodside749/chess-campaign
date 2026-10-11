// Helpers that look at a chess.js game and work out what happened.

// The result of a finished game from the player's point of view, or null if the
// game is still going. `outcome` is 'win', 'loss' or 'draw'.
export function boardResult(game, playerColor) {
  if (game.isCheckmate()) {
    const playerWon = game.turn() !== playerColor
    return { outcome: playerWon ? 'win' : 'loss', reason: 'Checkmate.' }
  }
  if (game.isStalemate()) return { outcome: 'draw', reason: 'Stalemate. The side to move has no legal moves but is not in check.' }
  if (game.isThreefoldRepetition()) return { outcome: 'draw', reason: 'The same position came up three times.' }
  if (game.isInsufficientMaterial()) return { outcome: 'draw', reason: 'Neither side has enough pieces left to checkmate.' }
  if (game.isDraw()) return { outcome: 'draw', reason: '50 moves without a capture or pawn move.' }
  return null
}

// The result when `flaggedColor` runs out of time. By the rules it's a draw
// instead of a loss if the other side couldn't possibly checkmate.
export function timeoutResult(game, flaggedColor, playerColor) {
  const winner = flaggedColor === 'w' ? 'b' : 'w'
  if (!canMate(game, winner)) return { outcome: 'draw', reason: 'Time ran out, but the other side has no pieces left to checkmate with.' }
  return { outcome: winner === playerColor ? 'win' : 'loss', reason: flaggedColor === playerColor ? 'Your time ran out.' : `Your opponent's time ran out.` }
}

// False if `color` has only a king, or a king and one bishop or knight.
function canMate(game, color) {
  const pieces = game.board().flat().filter((p) => p && p.color === color && p.type !== 'k')
  if (pieces.length === 0) return false
  return !(pieces.length === 1 && (pieces[0].type === 'b' || pieces[0].type === 'n'))
}

// Which talk line a move should trigger, or null if it's an ordinary move.
export function reactionTo(move, playerColor) {
  const byPlayer = move.color === playerColor
  if (move.san.includes('+')) return byPlayer ? 'playerChecks' : 'botChecks'
  if (move.captured) return byPlayer ? 'playerCaptures' : 'botCaptures'
  return null
}
