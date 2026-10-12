// Squares a piece could premove to. A premove is chosen before the opponent has
// moved, so we only look at how the piece moves and ignore what is in the way.
// Whether the premove is actually legal is checked when it is played.

const FILES = 'abcdefgh'

const KNIGHT_JUMPS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]
const STRAIGHT = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const DIAGONAL = [[1, 1], [1, -1], [-1, 1], [-1, -1]]

export function premoveTargets(game, square) {
  const piece = game.get(square)
  if (!piece) return []
  const file = FILES.indexOf(square[0])
  const rank = Number(square[1])
  const targets = []
  const add = (f, r) => {
    if (f >= 0 && f < 8 && r >= 1 && r <= 8) targets.push(FILES[f] + r)
  }
  // Every square in each direction, up to the edge of the board.
  const slide = (directions) => {
    for (const [df, dr] of directions) {
      for (let step = 1; step < 8; step++) add(file + df * step, rank + dr * step)
    }
  }

  switch (piece.type) {
    case 'p': {
      const forward = piece.color === 'w' ? 1 : -1
      const startRank = piece.color === 'w' ? 2 : 7
      add(file, rank + forward)
      if (rank === startRank) add(file, rank + 2 * forward)
      add(file - 1, rank + forward) // captures
      add(file + 1, rank + forward)
      break
    }
    case 'n':
      for (const [df, dr] of KNIGHT_JUMPS) add(file + df, rank + dr)
      break
    case 'b':
      slide(DIAGONAL)
      break
    case 'r':
      slide(STRAIGHT)
      break
    case 'q':
      slide([...STRAIGHT, ...DIAGONAL])
      break
    // Fairy pieces: a normal piece that can also jump like a knight.
    case 'a':
    case 'c':
    case 'z':
      slide({ a: DIAGONAL, c: STRAIGHT, z: [...STRAIGHT, ...DIAGONAL] }[piece.type])
      for (const [df, dr] of KNIGHT_JUMPS) add(file + df, rank + dr)
      break
    case 'k': {
      for (const [df, dr] of [...STRAIGHT, ...DIAGONAL]) add(file + df, rank + dr)
      // Castling, if the king is on its home rank (in Fischer Random it can start on any file).
      const homeRank = piece.color === 'w' ? 1 : 8
      if (rank === homeRank) targets.push('g' + homeRank, 'c' + homeRank)
      break
    }
  }
  return targets
}
