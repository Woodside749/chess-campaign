// Piece values used for the material score shown next to each player.
export const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

// The pieces each side has captured, as piece types sorted from pawn to queen.
// `w` holds the black pieces White has taken, and `b` the white pieces Black has taken.
export function capturedPieces(game) {
  const captured = { w: [], b: [] }
  for (const move of game.history({ verbose: true })) {
    if (move.captured) captured[move.color].push(move.captured)
  }
  const order = 'pnbrq'
  for (const color of ['w', 'b']) {
    captured[color].sort((a, b) => order.indexOf(a) - order.indexOf(b))
  }
  return captured
}

// White's material minus Black's, counted from the pieces on the board.
// Positive means White is ahead, negative means Black is ahead.
export function materialScore(game) {
  let score = 0
  for (const piece of game.board().flat()) {
    if (!piece) continue
    score += piece.color === 'w' ? PIECE_VALUES[piece.type] : -PIECE_VALUES[piece.type]
  }
  return score
}
