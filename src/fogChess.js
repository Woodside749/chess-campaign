// Fog of War: what each side can see. The rules are normal chess (chess.js handles
// them); the fog only decides which squares are shown.
//
// A side sees the squares its pieces stand on, every square they could move to
// (as far as each piece reaches until something blocks it, including a capture), and
// for each pawn the square in front of it and both forward diagonals.
import { Chess } from 'chess.js'

const FILES = 'abcdefgh'
const KNIGHT_JUMPS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]
const STRAIGHT = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const DIAGONAL = [[1, 1], [1, -1], [-1, 1], [-1, -1]]

const squareAt = (file, rank) => (file >= 0 && file < 8 && rank >= 1 && rank <= 8 ? FILES[file] + rank : null)

// The squares `color` can see in the position given as a FEN string.
export function visibleSquares(fen, color) {
  const board = new Chess(fen, { skipValidation: true })
  const visible = new Set()
  const at = (square) => board.get(square)

  for (const piece of board.board().flat()) {
    if (!piece || piece.color !== color) continue
    const file = FILES.indexOf(piece.square[0])
    const rank = Number(piece.square[1])
    visible.add(piece.square)

    // Every square in each direction until (and including) the first piece in the way.
    const slide = (directions, maxSteps) => {
      for (const [df, dr] of directions) {
        for (let step = 1; step <= maxSteps; step++) {
          const square = squareAt(file + df * step, rank + dr * step)
          if (!square) break
          visible.add(square)
          if (at(square)) break
        }
      }
    }

    if (piece.type === 'p') {
      const forward = color === 'w' ? 1 : -1
      for (const df of [-1, 0, 1]) {
        const square = squareAt(file + df, rank + forward)
        if (square) visible.add(square)
      }
      // On its first move a pawn can go two squares, if the square in front is empty.
      const startRank = color === 'w' ? 2 : 7
      const ahead = squareAt(file, rank + forward)
      if (rank === startRank && !at(ahead)) visible.add(squareAt(file, rank + 2 * forward))
    }
    if (piece.type === 'n') {
      for (const [df, dr] of KNIGHT_JUMPS) {
        const square = squareAt(file + df, rank + dr)
        if (square) visible.add(square)
      }
    }
    if (piece.type === 'b') slide(DIAGONAL, 7)
    if (piece.type === 'r') slide(STRAIGHT, 7)
    if (piece.type === 'q') slide([...STRAIGHT, ...DIAGONAL], 7)
    if (piece.type === 'k') slide([...STRAIGHT, ...DIAGONAL], 1)
  }
  return visible
}
