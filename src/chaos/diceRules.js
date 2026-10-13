// Dice Chess: every turn the side to move rolls a piece type, and only pieces of that
// type may move. Ground rules: in check, any legal move is allowed; and you only ever
// roll a piece type that has a legal move, so a roll can never leave you stuck.
// Same shape as chaosRules.js's rollRule, so ChaosGame can run it.

const PIECES = [
  { type: 'p', name: 'Pawn', plural: 'pawns', icon: '♟' },
  { type: 'n', name: 'Knight', plural: 'knights', icon: '♞' },
  { type: 'b', name: 'Bishop', plural: 'bishops', icon: '♝' },
  { type: 'r', name: 'Rook', plural: 'rooks', icon: '♜' },
  { type: 'q', name: 'Queen', plural: 'queen', icon: '♛' },
  { type: 'k', name: 'King', plural: 'king', icon: '♚' },
]

const IN_CHECK = {
  id: 'dice-check',
  icon: '⚠️',
  name: 'Any piece',
  text: 'In check, so any legal move is allowed. Get your king to safety!',
}

export function rollPiece(position, random = Math.random) {
  const moves = position.moves({ verbose: true })
  if (moves.length === 0) return { rule: IN_CHECK, moves }
  if (position.inCheck()) return { rule: IN_CHECK, moves }
  const movable = PIECES.filter((piece) => moves.some((m) => m.piece === piece.type))
  const piece = movable[Math.floor(random() * movable.length)]
  const rule = {
    id: `dice-${piece.type}`,
    icon: piece.icon,
    name: piece.name,
    text: `Only your ${piece.plural} may move this turn.`,
  }
  return { rule, moves: moves.filter((m) => m.piece === piece.type) }
}
