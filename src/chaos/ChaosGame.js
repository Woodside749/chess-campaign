// A Chaos Chess game with the same interface as chess.js (fen, turn, moves, move,
// history, board, get, isCheckmate, ...), so the game screen can use it like any other
// game. Every turn the side to move gets a random rule (see chaosRules.js), and
// moves() only lists what that rule allows, including any special "power" moves.
//
// Underneath, a chess.js board holds the current position. Special moves can't be
// played by chess.js, so after every move we simply load the new position into a
// fresh chess.js board, and keep the history (and repeated positions) ourselves.
import { Chess } from 'chess.js'
import { rollRule } from './chaosRules.js'

export class ChaosGame {
  // `roll` picks each turn's rule and the moves it allows: Chaos Chess (rollRule) by
  // default, or Dice Chess (rollPiece in diceRules.js).
  constructor(fen, roll = rollRule) {
    this.roll = roll
    this.position = new Chess(fen)
    this.startFen = this.position.fen()
    this.moveList = []
    this.seen = new Map() // position → how many times it has come up (for threefold repetition)
    this.remember()
    this.startTurn()
  }

  // Rolls the rule for the side to move, and works out the moves it allows.
  startTurn() {
    const { rule, moves } = this.roll(this.position)
    this.rule = rule
    this.legal = moves
  }

  remember() {
    const key = positionKey(this.fen())
    this.seen.set(key, (this.seen.get(key) ?? 0) + 1)
  }

  // The rule for the turn being played now, like { icon, name, text }.
  currentRule() {
    return this.rule
  }

  fen() {
    return this.position.fen()
  }
  turn() {
    return this.position.turn()
  }
  moveNumber() {
    return this.position.moveNumber()
  }
  get(square) {
    return this.position.get(square)
  }
  board() {
    return this.position.board()
  }
  findPiece(piece) {
    return this.position.findPiece(piece)
  }
  inCheck() {
    return this.position.inCheck()
  }

  // The moves this turn's rule allows: SAN strings, or move objects with { verbose: true }.
  moves({ square, verbose = false } = {}) {
    const moves = square ? this.legal.filter((m) => m.from === square) : this.legal
    return verbose ? [...moves] : moves.map((m) => m.san)
  }

  // Plays a move given as SAN ('Nf3'), UCI ('g1f3') or { from, to, promotion }.
  // Throws if this turn's rule doesn't allow it, like chess.js.
  move(input) {
    let move
    if (typeof input === 'string') {
      const clean = input.replace(/[+#]/g, '')
      move = this.legal.find((m) => m.lan === input || m.san.replace(/[+#]/g, '') === clean)
    } else {
      const matching = this.legal.filter((m) => m.from === input.from && m.to === input.to)
      // Like chess.js, `promotion` only matters if the move really is a promotion.
      move = matching.length <= 1 ? matching[0] : matching.find((m) => m.promotion === (input.promotion ?? 'q'))
    }
    if (!move) throw new Error(`Invalid move: ${JSON.stringify(input)}`)
    // Remember which rule the move was played under, for the move list.
    const played = { ...move, rule: this.rule.id }
    this.position = new Chess(move.after)
    this.moveList.push(played)
    this.remember()
    this.startTurn()
    return played
  }

  history({ verbose = false } = {}) {
    return verbose ? [...this.moveList] : this.moveList.map((m) => m.san)
  }

  isCheckmate() {
    return this.legal.length === 0 && this.inCheck()
  }
  isStalemate() {
    return this.legal.length === 0 && !this.inCheck()
  }
  isInsufficientMaterial() {
    return this.position.isInsufficientMaterial()
  }
  isThreefoldRepetition() {
    return this.seen.get(positionKey(this.fen())) >= 3
  }
  isDraw() {
    const fiftyMoves = Number(this.fen().split(' ')[4]) >= 100
    return this.isStalemate() || this.isInsufficientMaterial() || this.isThreefoldRepetition() || fiftyMoves
  }
  isGameOver() {
    return this.isCheckmate() || this.isDraw()
  }
}

// The parts of a FEN that make positions "the same" for repetition: the pieces, whose
// turn it is, castling rights and en passant (not the move counters).
const positionKey = (fen) => fen.split(' ').slice(0, 4).join(' ')
