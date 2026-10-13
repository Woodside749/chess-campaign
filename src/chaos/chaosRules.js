// The rules of Chaos Chess. Every turn, the side to move gets one random rule:
// - restrictions take moves away (like "your queen can't move"),
// - powers add moves normal chess doesn't have (like "pawns may move two squares"),
// - a normal turn changes nothing.
// Ground rules: you may never leave your own king in check; when you are in check the
// turn is always a normal one (so checkmate is normal checkmate); and a rule that
// would change nothing, or leave no legal move, is rolled again.
import { Chess } from 'chess.js'

const FILES = 'abcdefgh'
const square = (file, rank) => FILES[file] + (rank + 1) // file and rank counted from 0
const coords = (sq) => [FILES.indexOf(sq[0]), Number(sq[1]) - 1]
const onBoard = (file, rank) => file >= 0 && file < 8 && rank >= 0 && rank < 8
const other = (color) => (color === 'w' ? 'b' : 'w')
const forwardOf = (color) => (color === 'w' ? 1 : -1)
const lastRank = (color) => (color === 'w' ? 7 : 0)
const firstRank = (color) => (color === 'w' ? 0 : 7)

const KNIGHT_JUMPS = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]
const DIRECTIONS = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]]

// How far forward a move goes for the side making it: positive forward, negative back.
const progress = (move) => (Number(move.to[1]) - Number(move.from[1])) * forwardOf(move.color)

const restriction = (filter) => (position, normalMoves) => normalMoves.filter(filter)
const power = (extraMoves) => (position, normalMoves) => {
  // Special moves that a normal move already covers (like a king "leaping" two squares
  // to castle) are left out, so every from-to pair means one thing.
  const taken = new Set(normalMoves.map((m) => m.from + m.to))
  const extras = extraMoves(position)
    .filter((raw) => !taken.has(raw.from + raw.to))
    .map((raw) => specialMove(position, raw))
    .filter(Boolean)
  return [...normalMoves, ...extras]
}

// `weight` is how often a rule comes up compared with the others (normal turns are
// about 1 in 5). `apply(position, normalMoves)` returns the moves allowed this turn.
export const RULES = [
  { id: 'normal', icon: '😌', name: 'Normal turn', text: 'No special rule this turn.', weight: 3.5 },
  {
    id: 'frozen-queen',
    icon: '🧊',
    name: 'Frozen Queen',
    text: "Your queen can't move.",
    apply: restriction((m) => m.piece !== 'q'),
  },
  {
    id: 'frozen-rooks',
    icon: '🧊',
    name: 'Frozen Rooks',
    text: "Your rooks can't move (so no castling either).",
    apply: restriction((m) => m.piece !== 'r' && !m.flags.includes('k') && !m.flags.includes('q')),
  },
  {
    id: 'frozen-bishops',
    icon: '🧊',
    name: 'Frozen Bishops',
    text: "Your bishops can't move.",
    apply: restriction((m) => m.piece !== 'b'),
  },
  {
    id: 'frozen-knights',
    icon: '🧊',
    name: 'Frozen Knights',
    text: "Your knights can't move.",
    apply: restriction((m) => m.piece !== 'n'),
  },
  {
    id: 'peace',
    icon: '🕊️',
    name: 'Peace Treaty',
    text: 'No captures this turn.',
    apply: restriction((m) => !m.captured),
  },
  {
    id: 'hungry',
    icon: '🍽️',
    name: 'Hungry',
    text: 'If you can capture something, you must.',
    apply: (position, normalMoves) => {
      const captures = normalMoves.filter((m) => m.captured)
      return captures.length > 0 ? captures : normalMoves
    },
  },
  {
    id: 'no-retreat',
    icon: '⏫',
    name: 'No Retreat',
    text: 'No piece may move backwards.',
    apply: restriction((m) => progress(m) >= 0),
  },
  {
    id: 'no-advance',
    icon: '⏬',
    name: 'No Advance',
    text: 'No piece may move forwards. Sideways and backwards only.',
    apply: restriction((m) => progress(m) <= 0),
  },
  {
    id: 'pawn-sprint',
    icon: '🏃',
    name: 'Pawn Sprint',
    text: 'Any pawn may move two squares forward, from anywhere.',
    apply: power(pawnSprints),
  },
  {
    id: 'pawn-bite',
    icon: '🦷',
    name: 'Pawn Bite',
    text: 'Pawns may also capture the piece straight in front of them.',
    apply: power(pawnBites),
  },
  {
    id: 'retreat-pawn',
    icon: '↩️',
    name: 'Retreat Pawn',
    text: 'A pawn may step one square backwards.',
    apply: power(pawnRetreats),
  },
  {
    id: 'knightmare',
    icon: '🐴',
    name: 'Knightmare',
    text: 'Your bishops can also jump like knights.',
    apply: power(bishopJumps),
  },
  {
    id: 'kings-leap',
    icon: '👑',
    name: "King's Leap",
    text: 'Your king may move two squares in any direction (not jumping over pieces).',
    apply: power(kingLeaps),
  },
  {
    id: 'swap',
    icon: '🔄',
    name: 'Swap',
    text: 'Instead of moving, you may swap two of your own pieces (not the king).',
    hint: 'Drag one of your pieces onto the other.',
    apply: power(swaps),
  },
]

const NORMAL = RULES[0]
// The turn when you are in check: always a normal one.
const IN_CHECK = { ...NORMAL, icon: '⚠️', text: 'In check, so no special rule. Get your king to safety!' }

// Rolls this turn's rule for the side to move in `position` (a chess.js game).
// Returns { rule, moves }: the rule and the moves it allows (chess.js-style move objects;
// special moves have `special` set to the rule's id).
export function rollRule(position, random = Math.random) {
  const normalMoves = position.moves({ verbose: true })
  if (normalMoves.length === 0) return { rule: NORMAL, moves: normalMoves }
  if (position.inCheck()) return { rule: IN_CHECK, moves: normalMoves }
  let options = RULES
  while (options.length > 0) {
    const rule = weightedPick(options, random)
    if (!rule.apply) return { rule, moves: normalMoves }
    const moves = rule.apply(position, normalMoves)
    // Restrictions only remove moves and powers only add them, so a different number
    // of moves means the rule changes something.
    if (moves.length > 0 && moves.length !== normalMoves.length) {
      return { rule, moves: moves.map((m) => (m.special ? { ...m, special: rule.id } : m)) }
    }
    options = options.filter((r) => r !== rule)
  }
  return { rule: NORMAL, moves: normalMoves }
}

export function ruleById(id) {
  return RULES.find((rule) => rule.id === id) ?? NORMAL
}

function weightedPick(options, random) {
  const total = options.reduce((sum, rule) => sum + (rule.weight ?? 1), 0)
  let roll = random() * total
  for (const rule of options) {
    roll -= rule.weight ?? 1
    if (roll < 0) return rule
  }
  return options.at(-1)
}

// ---------- the powers' extra moves ----------
// Each returns "raw" moves like { from, to, promotion?, swap? }. specialMove() then
// checks them (your king must not be left in check) and fills in the details.

function ownPieces(position, type) {
  const color = position.turn()
  return position.findPiece({ type, color })
}

// A move to the last rank becomes four moves, one per piece the pawn can promote to.
const withPromotions = (from, to, color) =>
  coords(to)[1] === lastRank(color) ? ['q', 'r', 'b', 'n'].map((promotion) => ({ from, to, promotion })) : [{ from, to }]

function pawnSprints(position) {
  const color = position.turn()
  const step = forwardOf(color)
  return ownPieces(position, 'p').flatMap((from) => {
    const [file, rank] = coords(from)
    const middle = [file, rank + step]
    const target = [file, rank + 2 * step]
    if (!onBoard(...target) || position.get(square(...middle)) || position.get(square(...target))) return []
    return withPromotions(from, square(...target), color)
  })
}

function pawnBites(position) {
  const color = position.turn()
  return ownPieces(position, 'p').flatMap((from) => {
    const [file, rank] = coords(from)
    const to = square(file, rank + forwardOf(color))
    const victim = position.get(to)
    if (!victim || victim.color === color || victim.type === 'k') return []
    return withPromotions(from, to, color)
  })
}

function pawnRetreats(position) {
  const color = position.turn()
  return ownPieces(position, 'p').flatMap((from) => {
    const [file, rank] = coords(from)
    const back = rank - forwardOf(color)
    // A pawn can't go back onto your own first rank (pawns never stand there).
    if (back === firstRank(color) || !onBoard(file, back) || position.get(square(file, back))) return []
    return [{ from, to: square(file, back) }]
  })
}

// Where a piece may land: an empty square or an enemy piece other than the king.
function canLand(position, to) {
  const piece = position.get(to)
  return !piece || (piece.color !== position.turn() && piece.type !== 'k')
}

function bishopJumps(position) {
  return ownPieces(position, 'b').flatMap((from) => {
    const [file, rank] = coords(from)
    return KNIGHT_JUMPS.map(([df, dr]) => [file + df, rank + dr])
      .filter((target) => onBoard(...target) && canLand(position, square(...target)))
      .map((target) => ({ from, to: square(...target) }))
  })
}

function kingLeaps(position) {
  return ownPieces(position, 'k').flatMap((from) => {
    const [file, rank] = coords(from)
    return DIRECTIONS.filter(([df, dr]) => {
      const target = [file + 2 * df, rank + 2 * dr]
      return onBoard(...target) && !position.get(square(file + df, rank + dr)) && canLand(position, square(...target))
    }).map(([df, dr]) => ({ from, to: square(file + 2 * df, rank + 2 * dr) }))
  })
}

function swaps(position) {
  const color = position.turn()
  const pieces = position
    .board()
    .flat()
    .filter((p) => p && p.color === color && p.type !== 'k')
  const pawnMayStand = (sq) => ![0, 7].includes(coords(sq)[1])
  const moves = []
  for (const a of pieces) {
    for (const b of pieces) {
      if (a.type === b.type) continue // swapping two of the same piece changes nothing
      if (a.type === 'p' && !pawnMayStand(b.square)) continue
      if (b.type === 'p' && !pawnMayStand(a.square)) continue
      moves.push({ from: a.square, to: b.square, swap: true })
    }
  }
  return moves
}

// Turns a raw special move into a full move object like chess.js's (from, to, piece,
// color, captured, promotion, flags, san, lan, before, after), or null if it would
// leave your own king in check.
function specialMove(position, raw) {
  const color = position.turn()
  const them = other(color)
  const before = position.fen()
  const [, , castling, , halfmove, fullmove] = before.split(' ')
  const board = {}
  for (const piece of position.board().flat()) if (piece) board[piece.square] = { type: piece.type, color: piece.color }

  const moving = board[raw.from]
  const target = board[raw.to]
  const captured = raw.swap ? undefined : target?.type
  if (raw.swap) {
    board[raw.from] = target
    board[raw.to] = moving
  } else {
    delete board[raw.from]
    board[raw.to] = raw.promotion ? { type: raw.promotion, color } : moving
  }

  // Castling stays allowed only while the king and that rook are still on their squares.
  const keeps = { K: ['e1', 'h1', 'w'], Q: ['e1', 'a1', 'w'], k: ['e8', 'h8', 'b'], q: ['e8', 'a8', 'b'] }
  const rights = [...castling]
    .filter((right) => {
      const [kingSq, rookSq, side] = keeps[right] ?? []
      return board[kingSq]?.type === 'k' && board[kingSq].color === side && board[rookSq]?.type === 'r' && board[rookSq].color === side
    })
    .join('')
  const pawnMoved = moving.type === 'p' || (raw.swap && target.type === 'p')
  const clock = pawnMoved || captured ? 0 : Number(halfmove) + 1
  const after = `${placement(board)} ${them} ${rights || '-'} - ${clock} ${Number(fullmove) + (color === 'b' ? 1 : 0)}`

  let next
  try {
    next = new Chess(after)
  } catch {
    return null
  }
  const myKing = Object.keys(board).find((sq) => board[sq].type === 'k' && board[sq].color === color)
  if (next.isAttacked(myKing, them)) return null

  const letter = moving.type === 'p' ? '' : moving.type.toUpperCase()
  let san = raw.swap
    ? `${letter || 'P'}${raw.from}⇄${target.type === 'p' ? 'P' : target.type.toUpperCase()}${raw.to}`
    : `${letter}${captured ? (letter ? 'x' : `${raw.from[0]}x`) : ''}${raw.to}${raw.promotion ? `=${raw.promotion.toUpperCase()}` : ''}`
  if (next.isCheckmate()) san += '#'
  else if (next.inCheck()) san += '+'

  return {
    color,
    from: raw.from,
    to: raw.to,
    piece: moving.type,
    captured,
    promotion: raw.promotion,
    flags: captured ? 'c' : 'n',
    san,
    lan: raw.from + raw.to + (raw.promotion ?? ''),
    before,
    after,
    swap: Boolean(raw.swap),
    special: true, // replaced by the rule's id in rollRule()
  }
}

// The first part of a FEN (where the pieces stand) from { square: { type, color } }.
function placement(board) {
  const rows = []
  for (let rank = 7; rank >= 0; rank--) {
    let row = ''
    let empty = 0
    for (let file = 0; file < 8; file++) {
      const piece = board[square(file, rank)]
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
  return rows.join('/')
}
