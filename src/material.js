// Piece values used for the material score shown next to each player.
// Fairy pieces: a = Archbishop, c = Chancellor, z = Amazon (see fairy/variants.js).
export const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0, a: 7, c: 8, z: 12 }

// The pieces each side has captured, as piece types sorted from pawn to queen.
// `w` holds the black pieces White has taken, and `b` the white pieces Black has taken.
export function capturedPieces(game) {
  const captured = { w: [], b: [] }
  for (const move of game.history({ verbose: true })) {
    if (move.captured) captured[move.color].push(move.captured)
  }
  const order = 'pnbracqz'
  for (const color of ['w', 'b']) {
    captured[color].sort((a, b) => order.indexOf(a) - order.indexOf(b))
  }
  return captured
}

// Atomic chess: explosions destroy pieces without a capture move, so instead count which
// pieces are gone from the board since the start. (A promoted pawn isn't counted as gone:
// it became the piece it promoted to.) Same `w`/`b` layout as capturedPieces.
export function missingPieces(game, startFen) {
  const count = (fen) => {
    const counts = { w: {}, b: {} }
    for (const char of fen.split(' ')[0]) {
      if (!/[a-z]/i.test(char)) continue
      const color = char === char.toUpperCase() ? 'w' : 'b'
      const type = char.toLowerCase()
      counts[color][type] = (counts[color][type] ?? 0) + 1
    }
    return counts
  }
  const expected = count(startFen)
  for (const move of game.history({ verbose: true })) {
    if (!move.promotion) continue
    expected[move.color].p -= 1
    expected[move.color][move.promotion] = (expected[move.color][move.promotion] ?? 0) + 1
  }
  const now = count(game.fen())
  const order = 'pnbracqz'
  const missing = { w: [], b: [] }
  // White's captures are the black pieces that are gone, and the other way round.
  for (const [taker, owner] of [['w', 'b'], ['b', 'w']]) {
    for (const type of order) {
      const gone = (expected[owner][type] ?? 0) - (now[owner][type] ?? 0)
      for (let i = 0; i < gone; i++) missing[taker].push(type)
    }
  }
  return missing
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

// Whether the position is an endgame: the pieces left (not counting kings and pawns)
// are worth 26 points or less in total, out of 62 at the start. For example each side
// down to a rook, bishop and knight, or the queens traded off and a few pieces gone.
export function isEndgame(game) {
  let pieces = 0
  for (const piece of game.board().flat()) {
    if (piece && piece.type !== 'p') pieces += PIECE_VALUES[piece.type]
  }
  return pieces <= 26
}
