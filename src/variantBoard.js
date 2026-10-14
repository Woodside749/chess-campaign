// A small board reader for the variants, so the bots' personality code (moveTraits.js)
// can ask "what stands here?" and "who attacks this square?" in positions that the normal
// chess library (chess.js) can't read: fairy pieces, the duck, exploded kings, pawns on
// the first rank, no king at all. It answers with the same methods chess.js has
// (get, board, attackers, isAttacked), so the personality code works with either.
//
// It only knows how pieces attack, not the full rules (no castling, check or pockets),
// which is all the personality code needs.
import { duckSquareIn, readPlacement } from './fairy/FairyGame.js'

const FILES = 'abcdefgh'
const coords = (square) => [FILES.indexOf(square[0]), Number(square[1]) - 1]
const square = (file, rank) => FILES[file] + (rank + 1)
const onBoard = (file, rank) => file >= 0 && file < 8 && rank >= 0 && rank < 8

const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]]
const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]
const CAMEL = [[1, 3], [3, 1], [3, -1], [1, -3], [-1, -3], [-3, -1], [-3, 1], [-1, 3]]

// How each piece attacks: `leap` jumps straight to a square, `ride` keeps going in a
// direction until something is in the way, `hop` (the Cannon) captures the first piece
// behind exactly one other piece. Letters as in fairy/variants.js.
const PATTERNS = {
  n: [{ leap: KNIGHT }],
  b: [{ ride: DIAG }],
  r: [{ ride: ORTH }],
  q: [{ ride: DIAG }, { ride: ORTH }],
  k: [{ leap: [...ORTH, ...DIAG] }],
  a: [{ ride: DIAG }, { leap: KNIGHT }], // Archbishop
  c: [{ ride: ORTH }, { leap: KNIGHT }], // Chancellor
  z: [{ ride: DIAG }, { ride: ORTH }, { leap: KNIGHT }], // Amazon
  e: [{ leap: [...ORTH, ...DIAG, ...KNIGHT] }], // Centaur
  l: [{ leap: CAMEL }], // Camel
  i: [{ ride: KNIGHT }], // Nightrider
  o: [{ hop: ORTH }], // Cannon
  h: [{ ride: DIAG }, { leap: ORTH }], // Dragon Horse
}

export class VariantPosition {
  // `variant` matters for pawns: in Berolina they capture straight ahead.
  constructor(fen, variant) {
    this.berolina = variant === 'berolina'
    this.pieces = readPlacement(fen) // { e4: { type, color }, ... }
    this.duck = duckSquareIn(fen) // Duck Chess: a wall on this square, or null
  }

  get(sq) {
    return this.pieces[sq]
  }

  // Rows from rank 8 to rank 1, like chess.js: { square, type, color } or null.
  board() {
    const rows = []
    for (let rank = 7; rank >= 0; rank--) {
      rows.push([...FILES].map((file) => {
        const sq = file + (rank + 1)
        return this.pieces[sq] ? { square: sq, ...this.pieces[sq] } : null
      }))
    }
    return rows
  }

  occupied(sq) {
    return Boolean(this.pieces[sq]) || sq === this.duck
  }

  // The squares a piece standing on `from` attacks.
  attacksFrom(from) {
    const piece = this.pieces[from]
    if (!piece) return []
    const [f, r] = coords(from)
    if (piece.type === 'p') {
      const step = piece.color === 'w' ? 1 : -1
      const captures = this.berolina ? [[0, step]] : [[1, step], [-1, step]]
      return captures.map(([df, dr]) => [f + df, r + dr]).filter((t) => onBoard(...t)).map((t) => square(...t))
    }
    const targets = []
    for (const pattern of PATTERNS[piece.type] ?? []) {
      for (const [df, dr] of pattern.leap ?? []) if (onBoard(f + df, r + dr)) targets.push(square(f + df, r + dr))
      for (const [df, dr] of pattern.ride ?? []) {
        for (let tf = f + df, tr = r + dr; onBoard(tf, tr); tf += df, tr += dr) {
          targets.push(square(tf, tr))
          if (this.occupied(square(tf, tr))) break
        }
      }
      for (const [df, dr] of pattern.hop ?? []) {
        let screen = false
        for (let tf = f + df, tr = r + dr; onBoard(tf, tr); tf += df, tr += dr) {
          const sq = square(tf, tr)
          if (!this.occupied(sq)) continue
          if (screen) {
            targets.push(sq)
            break
          }
          screen = true
        }
      }
    }
    // Nobody can capture the duck.
    return targets.filter((sq) => sq !== this.duck)
  }

  // The squares of `color`'s pieces that attack `sq`.
  attackers(sq, color) {
    return Object.keys(this.pieces).filter((from) => this.pieces[from].color === color && this.attacksFrom(from).includes(sq))
  }

  isAttacked(sq, color) {
    return this.attackers(sq, color).length > 0
  }
}
