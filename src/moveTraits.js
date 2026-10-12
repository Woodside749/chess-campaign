// Describes a move with simple "traits" that bot personalities can like or dislike.
// Each trait is true or false. Bots give a bonus (or penalty) for traits in bots.js.
import { Chess } from 'chess.js'
import { PIECE_VALUES, isEndgame, materialScore } from './material.js'

const FILES = 'abcdefgh'
const distance = (a, b) =>
  Math.max(Math.abs(FILES.indexOf(a[0]) - FILES.indexOf(b[0])), Math.abs(Number(a[1]) - Number(b[1])))

// `game` is the position before the move, and `move` a verbose chess.js move.
export function moveTraits(game, move) {
  const me = move.color
  const them = me === 'w' ? 'b' : 'w'
  const moveNumber = game.moveNumber()
  const after = chessPosition(move.after)
  const enemyKing = game.findPiece({ type: 'k', color: them })[0]
  const myMaterial = materialScore(game) * (me === 'w' ? 1 : -1) // positive: I'm ahead
  const backRank = me === 'w' ? '1' : '8'
  const forward = me === 'w' ? 1 : -1

  return {
    check: move.san.includes('+'),
    capture: Boolean(move.captured),
    // Swapping a piece for one of the same value, like knight for bishop.
    evenTrade: Boolean(move.captured) && PIECE_VALUES[move.captured] === PIECE_VALUES[move.piece],
    // Trading when ahead in material, which makes a win easier.
    tradeWhenAhead: Boolean(move.captured) && myMaterial >= 2 && PIECE_VALUES[move.captured] >= PIECE_VALUES[move.piece],
    castle: move.flags.includes('k') || move.flags.includes('q'),
    // Bringing a knight or bishop off the back rank in the opening.
    develop: (move.piece === 'n' || move.piece === 'b') && move.from[1] === backRank && moveNumber <= 12,
    // Bringing the queen out beyond your own first two ranks in the opening.
    earlyQueen: move.piece === 'q' && moveNumber <= 10 && relativeRank(move.to, me) >= 3,
    // Moving a piece (not a pawn or the king) closer to the enemy king, landing within 3 squares of it.
    towardKing:
      !'pk'.includes(move.piece) &&
      distance(move.to, enemyKing) <= 3 &&
      distance(move.to, enemyKing) < distance(move.from, enemyKing),
    // Moving back towards your own side.
    retreat: move.piece !== 'p' && (Number(move.to[1]) - Number(move.from[1])) * forward < 0,
    quiet: !move.captured && !move.san.includes('+'),
    // Pushing a pawn right up against an enemy pawn, which closes the position.
    lockPawns: move.piece === 'p' && !move.captured && pawnInFront(after, move.to, forward, them),
    // After the move, the moved piece attacks something undefended or more valuable.
    threat: threatens(after, move, them),
    // After the move, one of our pieces (not pawns) can be taken for free.
    hangs: leavesPieceHanging(after, me, them),
    // In an endgame, walking the king towards the middle of the board.
    kingActivity: move.piece === 'k' && isEndgame(game) && distance(move.to, 'e4') < distance(move.from, 'e4'),
  }
}

// A chess.js board for a position. Fischer Random positions can have castling rights
// chess.js doesn't accept, and castling doesn't matter for the traits, so drop it then.
function chessPosition(fen) {
  try {
    return new Chess(fen)
  } catch {
    const [placement, turn, , , halfmove, fullmove] = fen.split(' ')
    return new Chess(`${placement} ${turn} - - ${halfmove} ${fullmove}`)
  }
}

// The rank counted from the player's own side: 1 is their back rank, 8 the opponent's.
function relativeRank(square, color) {
  return color === 'w' ? Number(square[1]) : 9 - Number(square[1])
}

function pawnInFront(position, square, forward, them) {
  const ahead = square[0] + (Number(square[1]) + forward)
  const piece = position.get(ahead)
  return Boolean(piece && piece.type === 'p' && piece.color === them)
}

function threatens(position, move, them) {
  for (const piece of position.board().flat()) {
    if (!piece || piece.color !== them || piece.type === 'k') continue
    if (!position.attackers(piece.square, move.color).includes(move.to)) continue
    const undefended = !position.isAttacked(piece.square, them)
    if (undefended || PIECE_VALUES[piece.type] > PIECE_VALUES[move.piece]) return true
  }
  return false
}

function leavesPieceHanging(position, me, them) {
  return position
    .board()
    .flat()
    .some(
      (piece) =>
        piece &&
        piece.color === me &&
        PIECE_VALUES[piece.type] >= 3 &&
        position.isAttacked(piece.square, them) &&
        !position.isAttacked(piece.square, me),
    )
}
