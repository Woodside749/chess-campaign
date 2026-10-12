// A fairy chess game with the same interface as chess.js (fen, turn, moves, move,
// history, board, get, isCheckmate, ...), so the game screen and the bot brain can use
// it just like a normal game. Underneath, the rules come from ffish (Fairy-Stockfish's
// rules library), which knows our custom pieces from variants.ini.
//
// Moves are given to ffish in UCI form, like "e2e4" or "e7e8q".

const FILES = 'abcdefgh'

export class FairyGame {
  // `ffish` is the loaded rules library (see loadFairy.js), `variant` a name from variants.ini
  // (or 'chess'). `is960` turns on Fischer Random rules (shuffled start, special castling).
  constructor(ffish, variant, fen, is960 = false) {
    this.variantName = variant
    this.is960 = is960
    this.chessBoard = fen ? new ffish.Board(variant, fen, is960) : new ffish.Board(variant)
    this.moveList = []
  }

  fen() {
    return this.chessBoard.fen()
  }

  turn() {
    return this.chessBoard.turn() ? 'w' : 'b'
  }

  moveNumber() {
    return this.chessBoard.fullmoveNumber()
  }

  get(square) {
    return readPlacement(this.fen())[square]
  }

  // The board as rows from rank 8 to rank 1, like chess.js: { square, type, color } or null.
  board() {
    const pieces = readPlacement(this.fen())
    const rows = []
    for (let rank = 8; rank >= 1; rank--) {
      rows.push([...FILES].map((file) => (pieces[file + rank] ? { square: file + rank, ...pieces[file + rank] } : null)))
    }
    return rows
  }

  findPiece({ type, color }) {
    const pieces = readPlacement(this.fen())
    return Object.keys(pieces).filter((sq) => pieces[sq].type === type && pieces[sq].color === color)
  }

  // Legal moves: SAN strings by default, move objects with { verbose: true }.
  moves({ square, verbose = false } = {}) {
    const ucis = this.legalUcis().filter((uci) => !square || uci.startsWith(square))
    if (!verbose) return ucis.map((uci) => this.sanOf(uci))
    return ucis.map((uci) => this.describe(uci))
  }

  // Plays a move given as SAN ('Nf3'), UCI ('g1f3') or { from, to, promotion }.
  // Throws if it isn't legal, like chess.js.
  move(input) {
    const ucis = this.legalUcis()
    let uci
    if (typeof input === 'string') {
      const clean = input.replace(/[+#?!]/g, '')
      uci = ucis.find((u) => u === input || this.sanOf(u).replace(/[+#]/g, '') === clean)
    } else {
      // Like chess.js, `promotion` only matters if the move really is a promotion
      // (premoves always say 'q', just in case a pawn reaches the last rank).
      let matching = ucis.filter((u) => u.slice(0, 4) === input.from + input.to)
      // Castling can also be given as the king's destination (g1/c1) instead of the rook.
      if (matching.length === 0) {
        matching = ucis.filter((u) => u.startsWith(input.from) && this.describe(u).castleTo === input.to)
      }
      uci = matching.length === 1 ? matching[0] : matching.find((u) => u[4] === (input.promotion ?? 'q'))
    }
    if (!uci) throw new Error(`Invalid move: ${JSON.stringify(input)}`)
    const move = this.describe(uci)
    this.chessBoard.push(uci)
    this.moveList.push(move)
    return move
  }

  history({ verbose = false } = {}) {
    return verbose ? [...this.moveList] : this.moveList.map((m) => m.san)
  }

  inCheck() {
    return this.chessBoard.isCheck()
  }
  isGameOver() {
    // `true` also ends the game on threefold repetition and the 50-move rule.
    return this.chessBoard.isGameOver(true)
  }
  isCheckmate() {
    return this.legalUcis().length === 0 && this.inCheck()
  }
  isStalemate() {
    return this.legalUcis().length === 0 && !this.inCheck()
  }
  isInsufficientMaterial() {
    return this.chessBoard.isInsufficientMaterial()
  }
  isThreefoldRepetition() {
    return this.isDraw() && !this.isStalemate() && !this.isInsufficientMaterial() && this.chessBoard.halfmoveClock() < 100
  }
  isDraw() {
    return this.isGameOver() && !this.isCheckmate()
  }

  // Frees the rules library's memory for this game (it lives outside JavaScript).
  dispose() {
    this.chessBoard.delete()
  }

  // ---------- helpers ----------

  legalUcis() {
    const list = this.chessBoard.legalMoves()
    return list ? list.split(' ') : []
  }

  sanOf(uci) {
    return this.chessBoard.sanMove(uci)
  }

  // A move object like chess.js's: from, to, piece, color, captured, promotion, flags,
  // san, lan, and the positions before and after it. Castling is written as the king
  // moving onto its own rook (like Fischer Random), so castling moves also get
  // `castleTo`: the square the king ends up on, where a player may drop it.
  describe(uci) {
    const before = this.fen()
    const pieces = readPlacement(before)
    const from = uci.slice(0, 2)
    const to = uci.slice(2, 4)
    const promotion = uci[4]
    const mover = pieces[from]
    const ontoOwnRook = pieces[to]?.color === mover.color
    let captured = ontoOwnRook ? undefined : pieces[to]?.type
    let flags = captured ? 'c' : 'n'
    let castleTo
    if (mover.type === 'p' && from[0] !== to[0] && !captured) {
      captured = 'p' // en passant
      flags = 'e'
    }
    if (mover.type === 'p' && Math.abs(Number(to[1]) - Number(from[1])) === 2) flags = 'b'
    if (mover.type === 'k' && (ontoOwnRook || Math.abs(FILES.indexOf(to[0]) - FILES.indexOf(from[0])) === 2)) {
      const kingside = FILES.indexOf(to[0]) > FILES.indexOf(from[0])
      flags = kingside ? 'k' : 'q'
      castleTo = (kingside ? 'g' : 'c') + from[1]
    }
    if (promotion) flags += 'p'
    const san = this.sanOf(uci)
    this.chessBoard.push(uci)
    const after = this.fen()
    this.chessBoard.pop()
    return { from, to, piece: mover.type, color: mover.color, captured, promotion, flags, castleTo, san, lan: uci, before, after }
  }
}

// The pieces in a FEN string, like { e1: { type: 'k', color: 'w' }, ... }.
export function readPlacement(fen) {
  const pieces = {}
  fen
    .split(' ')[0]
    .split('/')
    .forEach((row, i) => {
      let file = 0
      for (const char of row) {
        if (/\d/.test(char)) {
          file += Number(char)
        } else if (/[a-z]/i.test(char)) {
          pieces[FILES[file] + (8 - i)] = { type: char.toLowerCase(), color: char === char.toUpperCase() ? 'w' : 'b' }
          file++
        }
      }
    })
  return pieces
}
