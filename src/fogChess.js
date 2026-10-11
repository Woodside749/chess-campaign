// Fog of War chess rules. chess.js only knows normal chess, where you may never leave
// your king in check. In Fog of War you can't always see what attacks your king, so
// those rules don't apply: any move a piece can make is allowed, even into danger,
// and the game is won by capturing the enemy king.
//
// FogGame copies the parts of chess.js's interface that the rest of the app uses
// (fen, turn, moves, move, history, board, get, ...) so the game screen can use
// either one in the same way.

const FILES = 'abcdefgh'
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const KNIGHT_JUMPS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]
const STRAIGHT = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const DIAGONAL = [[1, 1], [1, -1], [-1, 1], [-1, -1]]
const ALL_DIRECTIONS = [...STRAIGHT, ...DIAGONAL]

const other = (color) => (color === 'w' ? 'b' : 'w')
const fileOf = (square) => FILES.indexOf(square[0])
const rankOf = (square) => Number(square[1])
const squareAt = (file, rank) => (file >= 0 && file < 8 && rank >= 1 && rank <= 8 ? FILES[file] + rank : null)

export class FogGame {
  constructor(fen = START_FEN) {
    this.load(fen)
    this.moveList = []
  }

  load(fen) {
    const [placement, turn, castling, enPassant, halfmove, fullmove] = fen.split(' ')
    this.squares = {} // like { e1: { type: 'k', color: 'w' } }
    placement.split('/').forEach((row, i) => {
      let file = 0
      for (const char of row) {
        if (/\d/.test(char)) {
          file += Number(char)
        } else {
          const color = char === char.toUpperCase() ? 'w' : 'b'
          this.squares[squareAt(file, 8 - i)] = { type: char.toLowerCase(), color }
          file++
        }
      }
    })
    this.sideToMove = turn
    this.castling = {
      w: { k: castling.includes('K'), q: castling.includes('Q') },
      b: { k: castling.includes('k'), q: castling.includes('q') },
    }
    this.enPassant = enPassant === '-' ? null : enPassant
    this.halfmoves = Number(halfmove)
    this.fullmoves = Number(fullmove)
    this.winner = null // set to 'w' or 'b' when a king is captured
  }

  fen() {
    const rows = []
    for (let rank = 8; rank >= 1; rank--) {
      let row = ''
      let empty = 0
      for (let file = 0; file < 8; file++) {
        const piece = this.squares[squareAt(file, rank)]
        if (!piece) {
          empty++
          continue
        }
        if (empty) row += empty
        empty = 0
        row += piece.color === 'w' ? piece.type.toUpperCase() : piece.type
      }
      rows.push(row + (empty || ''))
    }
    const rights =
      (this.castling.w.k ? 'K' : '') +
        (this.castling.w.q ? 'Q' : '') +
        (this.castling.b.k ? 'k' : '') +
        (this.castling.b.q ? 'q' : '') || '-'
    return `${rows.join('/')} ${this.sideToMove} ${rights} ${this.enPassant ?? '-'} ${this.halfmoves} ${this.fullmoves}`
  }

  turn() {
    return this.sideToMove
  }

  moveNumber() {
    return this.fullmoves
  }

  get(square) {
    return this.squares[square]
  }

  // The board as rows from rank 8 to rank 1, like chess.js: { square, type, color } or null.
  board() {
    const rows = []
    for (let rank = 8; rank >= 1; rank--) {
      const row = []
      for (let file = 0; file < 8; file++) {
        const square = squareAt(file, rank)
        const piece = this.squares[square]
        row.push(piece ? { square, ...piece } : null)
      }
      rows.push(row)
    }
    return rows
  }

  findPiece({ type, color }) {
    return Object.keys(this.squares).filter((sq) => this.squares[sq].type === type && this.squares[sq].color === color)
  }

  // Every move the side to move can make (or `color`, if given), ignoring check.
  // Like chess.js: SAN strings by default, move objects with { verbose: true }.
  moves({ square, verbose = false, color } = {}) {
    if (this.winner) return []
    const mover = color ?? this.sideToMove
    const list = this.generate(mover).filter((m) => !square || m.from === square)
    return verbose ? list : list.map((m) => m.san)
  }

  // Plays a move given as SAN ('Nf3') or as { from, to, promotion }. Throws if it isn't possible.
  move(input) {
    const candidates = this.generate(this.sideToMove)
    let found
    if (typeof input === 'string') {
      const clean = input.replace(/[+#?!]/g, '')
      found = candidates.find((m) => m.san === clean || m.lan === clean)
    } else {
      found = candidates.find(
        (m) => m.from === input.from && m.to === input.to && (!m.promotion || m.promotion === (input.promotion ?? 'q')),
      )
    }
    if (!found || this.winner) throw new Error(`Invalid move: ${JSON.stringify(input)}`)
    this.apply(found)
    this.moveList.push(found)
    return found
  }

  history({ verbose = false } = {}) {
    return verbose ? [...this.moveList] : this.moveList.map((m) => m.san)
  }

  // Whether `square` is attacked by any piece of `byColor`.
  isAttacked(square, byColor) {
    const file = fileOf(square)
    const rank = rankOf(square)
    const has = (sq, types) => {
      const piece = sq && this.squares[sq]
      return piece && piece.color === byColor && types.includes(piece.type)
    }
    const pawnRank = byColor === 'w' ? rank - 1 : rank + 1
    if (has(squareAt(file - 1, pawnRank), 'p') || has(squareAt(file + 1, pawnRank), 'p')) return true
    if (KNIGHT_JUMPS.some(([df, dr]) => has(squareAt(file + df, rank + dr), 'n'))) return true
    if (ALL_DIRECTIONS.some(([df, dr]) => has(squareAt(file + df, rank + dr), 'k'))) return true
    for (const [directions, types] of [[STRAIGHT, 'rq'], [DIAGONAL, 'bq']]) {
      for (const [df, dr] of directions) {
        for (let step = 1; step < 8; step++) {
          const sq = squareAt(file + df * step, rank + dr * step)
          if (!sq) break
          if (this.squares[sq]) {
            if (has(sq, types)) return true
            break
          }
        }
      }
    }
    return false
  }

  // Whether `color`'s king is attacked right now (the "check" warning).
  kingAttacked(color) {
    const king = this.findPiece({ type: 'k', color })[0]
    return Boolean(king) && this.isAttacked(king, other(color))
  }

  isGameOver() {
    return Boolean(this.winner) || this.isDraw()
  }
  isCheckmate() {
    return false // there is no checkmate in Fog of War: you capture the king instead
  }
  inCheck() {
    return false // check is shown with kingAttacked() instead, only to the king's owner
  }
  isStalemate() {
    return !this.winner && this.generate(this.sideToMove).length === 0
  }
  isThreefoldRepetition() {
    return false
  }
  isInsufficientMaterial() {
    return Object.values(this.squares).every((piece) => piece.type === 'k')
  }
  isDraw() {
    return !this.winner && (this.halfmoves >= 100 || this.isInsufficientMaterial() || this.isStalemate())
  }

  // ---------- Move generation ----------

  generate(color) {
    const moves = []
    for (const [from, piece] of Object.entries(this.squares)) {
      if (piece.color !== color) continue
      for (const target of this.targets(from, piece)) moves.push(target)
    }
    return moves.map((m) => this.describe(m, moves))
  }

  // The raw moves of one piece: { from, to, piece, color, captured?, promotion?, flags }.
  targets(from, piece) {
    const file = fileOf(from)
    const rank = rankOf(from)
    const moves = []
    const enemy = other(piece.color)
    const add = (to, flags = 'n', extra = {}) => {
      const captured = this.squares[to]?.type
      // 'c' = capture, 'cp' = capture with promotion; otherwise the given flags.
      const moveFlags = captured ? (flags.includes('p') ? 'cp' : 'c') : flags
      moves.push({ from, to, piece: piece.type, color: piece.color, captured, flags: moveFlags, ...extra })
    }

    if (piece.type === 'p') {
      const forward = piece.color === 'w' ? 1 : -1
      const lastRank = piece.color === 'w' ? 8 : 1
      const addPawn = (to, flags, extra) => {
        if (rankOf(to) === lastRank) {
          for (const promotion of 'qrbn') add(to, flags + 'p', { ...extra, promotion })
        } else {
          add(to, flags, extra)
        }
      }
      const one = squareAt(file, rank + forward)
      if (one && !this.squares[one]) {
        addPawn(one, 'n')
        const two = squareAt(file, rank + 2 * forward)
        const startRank = piece.color === 'w' ? 2 : 7
        if (rank === startRank && !this.squares[two]) add(two, 'b')
      }
      for (const df of [-1, 1]) {
        const to = squareAt(file + df, rank + forward)
        if (!to) continue
        if (this.squares[to]?.color === enemy) addPawn(to, 'c')
        else if (to === this.enPassant && piece.color === this.sideToMove) add(to, 'e', { captured: 'p' })
      }
      return moves
    }

    const slide = (directions, maxSteps) => {
      for (const [df, dr] of directions) {
        for (let step = 1; step <= maxSteps; step++) {
          const to = squareAt(file + df * step, rank + dr * step)
          if (!to) break
          const occupant = this.squares[to]
          if (occupant?.color === piece.color) break
          add(to)
          if (occupant) break
        }
      }
    }
    if (piece.type === 'n') {
      for (const [df, dr] of KNIGHT_JUMPS) {
        const to = squareAt(file + df, rank + dr)
        if (to && this.squares[to]?.color !== piece.color) add(to)
      }
    }
    if (piece.type === 'b') slide(DIAGONAL, 7)
    if (piece.type === 'r') slide(STRAIGHT, 7)
    if (piece.type === 'q') slide(ALL_DIRECTIONS, 7)
    if (piece.type === 'k') {
      slide(ALL_DIRECTIONS, 1)
      // Castling: only the pieces and the empty squares matter, not check.
      const home = piece.color === 'w' ? 1 : 8
      const rights = this.castling[piece.color]
      const empty = (...files) => files.every((f) => !this.squares[f + home])
      const rookAt = (f) => this.squares[f + home]?.type === 'r' && this.squares[f + home]?.color === piece.color
      if (from === 'e' + home) {
        if (rights.k && rookAt('h') && empty('f', 'g')) moves.push({ from, to: 'g' + home, piece: 'k', color: piece.color, flags: 'k' })
        if (rights.q && rookAt('a') && empty('b', 'c', 'd')) moves.push({ from, to: 'c' + home, piece: 'k', color: piece.color, flags: 'q' })
      }
    }
    return moves
  }

  // Adds SAN, LAN and the positions before and after, like chess.js move objects.
  describe(move, allMoves) {
    const before = this.fen()
    const copy = new FogGame(before)
    copy.apply(move)
    return { ...move, san: sanFor(move, allMoves), lan: move.from + move.to + (move.promotion ?? ''), before, after: copy.fen() }
  }

  apply(move) {
    const { from, to, color } = move
    const piece = this.squares[from]
    const home = color === 'w' ? 1 : 8
    if (this.squares[to]?.type === 'k') this.winner = color
    delete this.squares[from]
    this.squares[to] = move.promotion ? { type: move.promotion, color } : piece
    if (move.flags.includes('e')) delete this.squares[to[0] + from[1]] // en passant
    if (move.flags === 'k') {
      this.squares['f' + home] = this.squares['h' + home]
      delete this.squares['h' + home]
    }
    if (move.flags === 'q') {
      this.squares['d' + home] = this.squares['a' + home]
      delete this.squares['a' + home]
    }
    // Castling rights are lost when the king or a rook moves, or a rook is captured.
    if (piece.type === 'k') this.castling[color] = { k: false, q: false }
    for (const [square, c, side] of [['a1', 'w', 'q'], ['h1', 'w', 'k'], ['a8', 'b', 'q'], ['h8', 'b', 'k']]) {
      if (from === square || to === square) this.castling[c][side] = false
    }
    this.enPassant = move.flags === 'b' ? from[0] + (rankOf(from) + (color === 'w' ? 1 : -1)) : null
    this.halfmoves = piece.type === 'p' || move.captured ? 0 : this.halfmoves + 1
    if (color === 'b') this.fullmoves++
    this.sideToMove = other(color)
  }
}

// Standard notation for a move, like "Nbd2", "exd5", "e8=Q" or "O-O".
function sanFor(move, allMoves) {
  if (move.flags === 'k') return 'O-O'
  if (move.flags === 'q') return 'O-O-O'
  const capture = move.captured ? 'x' : ''
  const promotion = move.promotion ? '=' + move.promotion.toUpperCase() : ''
  if (move.piece === 'p') return (capture ? move.from[0] : '') + capture + move.to + promotion
  // If another piece of the same kind can go to the same square, add its file or rank.
  const rivals = allMoves.filter((m) => m.piece === move.piece && m.to === move.to && m.from !== move.from)
  let from = ''
  if (rivals.length > 0) {
    if (rivals.every((m) => m.from[0] !== move.from[0])) from = move.from[0]
    else if (rivals.every((m) => m.from[1] !== move.from[1])) from = move.from[1]
    else from = move.from
  }
  return move.piece.toUpperCase() + from + capture + move.to
}

// The squares `color` can see in the position: where its pieces stand, every square
// they can move to (including captures), and for each pawn the square right in front
// of it and both forward diagonals (the squares it attacks, even if they're empty).
export function visibleSquares(game, color) {
  const visible = new Set()
  for (const row of game.board()) {
    for (const piece of row) {
      if (!piece || piece.color !== color) continue
      visible.add(piece.square)
      if (piece.type === 'p') {
        const nextRank = rankOf(piece.square) + (color === 'w' ? 1 : -1)
        for (const df of [-1, 0, 1]) {
          const square = squareAt(fileOf(piece.square) + df, nextRank)
          if (square) visible.add(square)
        }
      }
    }
  }
  for (const move of game.moves({ verbose: true, color })) visible.add(move.to)
  return visible
}
