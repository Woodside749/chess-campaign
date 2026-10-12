import { createElement as h } from 'react'
import { defaultPieces } from 'react-chessboard'
import { FAIRY_PIECES } from './variants.js'

// Pictures for the fairy pieces, in the form the board expects
// ({ wA: (props) => <svg ...>, ... }). Each one is its base piece (a bishop, rook or
// queen) with a small knight in a badge, meaning "also jumps like a knight".
// (Written with createElement instead of JSX, so this file can be plain .js.)
function fairyPiece(color, base) {
  const Base = defaultPieces[color + base.toUpperCase()]
  const Knight = defaultPieces[color + 'N']
  const badgeFill = color === 'w' ? '#2b2a28' : '#f5f3ee'
  return (props) =>
    h(
      'svg',
      { viewBox: '0 0 100 100', width: '100%', height: '100%', style: props?.svgStyle },
      h('svg', { x: 0, y: 4, width: 92, height: 92 }, Base(props)),
      h('circle', { cx: 76, cy: 24, r: 21, fill: badgeFill, stroke: '#769656', strokeWidth: 4 }),
      h('svg', { x: 60, y: 8, width: 32, height: 32 }, Knight(props)),
    )
}

export const fairyPieces = Object.fromEntries(
  Object.entries(FAIRY_PIECES).flatMap(([letter, piece]) =>
    ['w', 'b'].map((color) => [color + letter.toUpperCase(), fairyPiece(color, piece.looksLike)]),
  ),
)

// Every piece picture: the normal ones plus the fairy pieces.
export const allPieces = { ...defaultPieces, ...fairyPieces }
