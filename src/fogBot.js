// How a bot plays Fog of War. It only knows what its own pieces can see, plus a
// memory of where it last saw the opponent's pieces. From that it builds the board
// it *believes* is on the table, and picks a move there with its normal brain
// (Stockfish, personality and strength, see botBrain.js). The move is then played
// on the real board, if it's legal there. The rules are normal chess.
import { Chess } from 'chess.js'
import { chooseBotMove } from './botBrain.js'
import { visibleSquares } from './fogChess.js'

const FILES = 'abcdefgh'
const pickRandom = (list) => list[Math.floor(Math.random() * list.length)]
const distance = (a, b) =>
  Math.max(Math.abs(FILES.indexOf(a[0]) - FILES.indexOf(b[0])), Math.abs(Number(a[1]) - Number(b[1])))

// The bot's memory at the start of a game: the opponent's pieces on their starting squares.
export function createFogMemory(game, botColor) {
  const startFen = game.history({ verbose: true })[0]?.before ?? game.fen()
  const pieces = {}
  for (const piece of new Chess(startFen).board().flat()) {
    if (piece && piece.color !== botColor) pieces[piece.square] = { type: piece.type, color: piece.color }
  }
  return { pieces, lastKingSquare: Object.keys(pieces).find((sq) => pieces[sq].type === 'k') }
}

// Updates the memory with what the bot can see now: visible squares are known for sure.
// When an opponent's piece shows up somewhere new, the bot assumes it moved there from
// where it was remembered, so it forgets the nearest hidden piece of the same kind.
// (Otherwise it could "remember" nine pawns, which confuses Stockfish.)
export function updateFogMemory(memory, game, botColor) {
  const visible = visibleSquares(game.fen(), botColor)
  const seen = []
  for (const square of visible) {
    const piece = game.get(square)
    if (piece && piece.color !== botColor) {
      const remembered = memory.pieces[square]
      const isNew = !remembered || remembered.type !== piece.type
      seen.push({ square, piece, isNew })
    }
    delete memory.pieces[square]
  }
  for (const { square, piece, isNew } of seen) {
    if (isNew) {
      const sameKind = Object.keys(memory.pieces).filter((sq) => memory.pieces[sq].type === piece.type)
      sameKind.sort((a, b) => distance(a, square) - distance(b, square))
      if (sameKind.length > 0) delete memory.pieces[sameKind[0]]
    }
    memory.pieces[square] = { type: piece.type, color: piece.color }
    if (piece.type === 'k') memory.lastKingSquare = square
  }
  return visible
}

// Picks the bot's move in a Fog of War game. Returns { from, to, promotion }.
export async function chooseFogMove(game, bot, timeLeftMs, memory, engine) {
  const botColor = game.turn()
  const realMoves = game.moves({ verbose: true }) // only legal moves, so check can't be ignored
  const asMove = (m) => ({ from: m.from, to: m.to, promotion: m.promotion })

  const visible = updateFogMemory(memory, game, botColor)
  const believed = believedGame(game, botColor, memory, visible)
  if (!believed || believed.moves().length === 0) return asMove(pickRandom(realMoves))

  // The bot knows when it's in check, but not always from where. If the attacker is
  // hidden (so the believed board doesn't show the check), it plays a legal move,
  // preferring a king move to a square it believes is safe.
  const theirColor = botColor === 'w' ? 'b' : 'w'
  if (game.inCheck() && !believed.inCheck()) {
    const safeKingMoves = realMoves.filter((m) => m.piece === 'k' && !believed.isAttacked(m.to, theirColor))
    return asMove(pickRandom(safeKingMoves.length > 0 ? safeKingMoves : realMoves))
  }

  // Otherwise the normal brain chooses on the believed board. Opening books are left
  // out, because the bot can't see which opening the opponent is playing.
  const san = await chooseBotMove(believed, { ...bot, openings: null }, timeLeftMs, engine)
  const planned = believed.move(san)
  const real = realMoves.find(
    (m) => m.from === planned.from && m.to === planned.to && (m.promotion ?? null) === (planned.promotion ?? null),
  )
  return asMove(real ?? pickRandom(realMoves))
}

// A normal chess.js game of the board the bot believes in: its own pieces, the
// opponent's pieces it can see, and the rest where it last saw them.
function believedGame(game, botColor, memory, visible) {
  const theirColor = botColor === 'w' ? 'b' : 'w'
  const believed = new Chess()
  believed.clear()
  for (const piece of game.board().flat()) {
    if (piece && piece.color === botColor) believed.put({ type: piece.type, color: piece.color }, piece.square)
  }
  for (const [square, piece] of Object.entries(memory.pieces)) {
    if (!believed.get(square)) believed.put(piece, square)
  }

  // There must be exactly one opponent king. If the memory lost track of it, guess:
  // the nearest hidden, empty square to where it was last seen.
  let kings = believed.findPiece({ type: 'k', color: theirColor })
  if (kings.length === 0) {
    const hidden = []
    for (const file of FILES) {
      for (let rank = 1; rank <= 8; rank++) {
        const square = file + rank
        if (!visible.has(square) && !believed.get(square)) hidden.push(square)
      }
    }
    hidden.sort((a, b) => distance(a, memory.lastKingSquare) - distance(b, memory.lastKingSquare))
    if (hidden.length === 0) return null
    believed.put({ type: 'k', color: theirColor }, hidden[0])
    kings = [hidden[0]]
  }

  // Castling rights: the bot's own are real; the opponent's only if king and rook look unmoved.
  const real = game.fen().split(' ')[2]
  const rights = [...real]
    .filter((right) => {
      const color = right === right.toUpperCase() ? 'w' : 'b'
      if (color === botColor) return true
      const home = color === 'w' ? '1' : '8'
      const rookFile = right.toLowerCase() === 'k' ? 'h' : 'a'
      const king = believed.get('e' + home)
      const rook = believed.get(rookFile + home)
      return king?.type === 'k' && king.color === color && rook?.type === 'r' && rook.color === color
    })
    .join('')
  // A real side never has more than 8 pawns or 16 pieces. If the memory got that
  // wrong, don't trust this board (Stockfish can't handle impossible positions).
  const theirs = believed.board().flat().filter((p) => p && p.color === theirColor)
  if (theirs.length > 16 || theirs.filter((p) => p.type === 'p').length > 8) return null

  const [placement] = believed.fen().split(' ')
  const fullmove = game.fen().split(' ')[5]
  try {
    const result = new Chess(`${placement} ${botColor} ${rights || '-'} - 0 ${fullmove}`)
    // A board where the opponent's king is already under attack isn't a real chess
    // position. It means the guess about the king is wrong, so leave it to chance.
    result.setTurn(theirColor)
    const opponentInCheck = result.inCheck()
    result.setTurn(botColor)
    return opponentInCheck ? null : result
  } catch {
    return null
  }
}
