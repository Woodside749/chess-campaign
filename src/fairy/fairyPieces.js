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

// The duck in Duck Chess: a yellow rubber duck. In the board's FEN it is written "X"
// (see Game.jsx).
const duck = (props) =>
  h(
    'svg',
    { viewBox: '0 0 100 100', width: '100%', height: '100%', style: props?.svgStyle },
    // Tail, body and wing.
    h('path', { d: 'M24 62 Q10 42 32 50 Z', fill: '#ffd21f', stroke: '#c99a00', strokeWidth: 2.5, strokeLinejoin: 'round' }),
    h('ellipse', { cx: 50, cy: 66, rx: 32, ry: 19, fill: '#ffd21f', stroke: '#c99a00', strokeWidth: 2.5 }),
    h('path', { d: 'M36 62 Q50 52 62 63 Q49 72 36 62 Z', fill: '#f2b800' }),
    // Head, beak and eye.
    h('circle', { cx: 62, cy: 37, r: 17, fill: '#ffd21f', stroke: '#c99a00', strokeWidth: 2.5 }),
    h('path', { d: 'M76 36 Q93 33 91 41 Q85 47 76 45 Z', fill: '#ff8a00', stroke: '#c95f00', strokeWidth: 2 }),
    h('circle', { cx: 66, cy: 31, r: 3.2, fill: '#222' }),
    h('circle', { cx: 67.2, cy: 29.8, r: 1.1, fill: '#fff' }),
  )

// Every piece picture: the normal ones, the fairy pieces and the duck.
export const allPieces = { ...defaultPieces, ...fairyPieces, wX: duck }
