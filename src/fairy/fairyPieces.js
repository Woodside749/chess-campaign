import { createElement as h } from 'react'
import { defaultPieces } from 'react-chessboard'
import { FAIRY_PIECES } from './variants.js'

// Pictures for the fairy pieces, in the form the board expects
// ({ wA: (props) => <svg ...>, ... }). Each one is its base piece (a bishop, rook,
// queen or knight) with a badge in the corner: a small knight for the knight hybrids
// ("also jumps like a knight"), or the piece's own emoji, like 🐪 for the Camel.
// (Written with createElement instead of JSX, so this file can be plain .js.)
function fairyPiece(color, { looksLike, badge }) {
  const Base = defaultPieces[color + looksLike.toUpperCase()]
  const Knight = defaultPieces[color + 'N']
  const badgeFill = color === 'w' ? '#2b2a28' : '#f5f3ee'
  return (props) =>
    h(
      'svg',
      { viewBox: '0 0 100 100', width: '100%', height: '100%', style: props?.svgStyle },
      h('svg', { x: 0, y: 4, width: 92, height: 92 }, Base(props)),
      h('circle', { cx: 76, cy: 24, r: 21, fill: badgeFill, stroke: '#769656', strokeWidth: 4 }),
      badge
        ? h('text', { x: 76, y: 32, fontSize: 24, textAnchor: 'middle' }, badge)
        : h('svg', { x: 60, y: 8, width: 32, height: 32 }, Knight(props)),
    )
}

export const fairyPieces = Object.fromEntries(
  Object.entries(FAIRY_PIECES).flatMap(([letter, piece]) =>
    ['w', 'b'].map((color) => [color + letter.toUpperCase(), fairyPiece(color, piece)]),
  ),
)

// The duck in Duck Chess. In the board's FEN it is written "X" (see Game.jsx).
const duck = (props) =>
  h(
    'svg',
    { viewBox: '0 0 100 100', width: '100%', height: '100%', style: props?.svgStyle },
    h('text', { x: 50, y: 72, fontSize: 64, textAnchor: 'middle' }, '🦆'),
  )

// Every piece picture: the normal ones, the fairy pieces and the duck.
export const allPieces = { ...defaultPieces, ...fairyPieces, wX: duck }
