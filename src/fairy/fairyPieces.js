import { createElement as h } from 'react'
import { defaultPieces } from 'react-chessboard'
import { FAIRY_PIECES } from './variants.js'

// Pictures for the fairy pieces, in the form the board expects
// ({ wA: (props) => <svg ...>, ... }), drawn in the same style as the normal pieces (the
// "cburnett" set: a 45 × 45 grid, black outlines, white or black fill).
// The knight hybrids are half knight (its head, on the left) and half the other piece,
// so they show how they move: the Archbishop is knight + bishop, and so on. The others
// are drawn from scratch: the Camel, the Nightrider (a knight with a moon), the Cannon
// and the Dragon Horse (a bishop with dragon wings).
// (Written with createElement instead of JSX, so this file can be plain .js.)

const STROKE = { stroke: '#000000', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }
const fillOf = (color) => (color === 'w' ? '#ffffff' : '#000000')
// Inner lines: black on white pieces, white on black ones (like the normal black pieces).
const detailOf = (color) => (color === 'w' ? '#000000' : '#ffffff')

// The outer picture every piece is drawn in.
const frame = (props, ...children) =>
  h('svg', { viewBox: '0 0 45 45', width: '100%', height: '100%', style: props?.svgStyle }, ...children)

// A normal piece, drawn at full size inside a fairy piece's picture.
const normal = (color, type, props) => h('svg', { x: 0, y: 0, width: 45, height: 45 }, defaultPieces[color + type](props))

// Half a knight (the left half, with its head) and half of another piece (`type`).
function knightHybrid(color, type) {
  const id = `fairy-half-${color}${type}`
  return (props) =>
    frame(
      props,
      h(
        'defs',
        null,
        h('clipPath', { id: id + '-left' }, h('rect', { x: 0, y: 0, width: 22.5, height: 45 })),
        h('clipPath', { id: id + '-right' }, h('rect', { x: 22.5, y: 0, width: 22.5, height: 45 })),
      ),
      h('g', { clipPath: `url(#${id}-left)` }, normal(color, 'N', props)),
      h('g', { clipPath: `url(#${id}-right)` }, normal(color, type, props)),
      // Where the halves meet: an outline on white pieces, a thin white line on black ones.
      h('line', {
        x1: 22.5,
        y1: 10.5,
        x2: 22.5,
        y2: 38,
        stroke: detailOf(color),
        strokeWidth: color === 'w' ? 1.5 : 0.8,
        strokeLinecap: 'round',
      }),
    )
}

// The Camel: resting on its stand, with its hump, a long neck and a drooping snout.
function camel(color) {
  const fill = fillOf(color)
  const detail = detailOf(color)
  return (props) =>
    frame(
      props,
      h('path', { d: 'M 9,39 L 36,39 L 36,36 L 9,36 Z', fill, ...STROKE }),
      h('path', {
        d: 'M 12,36 L 35,36 C 37.5,31 36.5,27 33,25.5 C 32,18.5 24.5,14.5 21,23.5 C 18,24.5 16,21.5 15.5,17.5 C 15,13.5 13.5,10.5 11,10.5 L 11.5,7.5 L 8.5,10 C 6,10.5 4,12.5 4,15 C 4,17 6,17.5 8,17 C 10,17 11,18.5 11.5,20.5 C 12.5,25 14,28 13,31 C 12.5,33 12,34.5 12,36 Z',
        fill,
        ...STROKE,
      }),
      // The eye and nostril, and the folded legs it rests on.
      h('ellipse', { cx: 9.5, cy: 12.8, rx: 1, ry: 1.3, fill: detail }),
      h('circle', { cx: 5.3, cy: 14.6, r: 0.8, fill: detail }),
      h('path', {
        d: 'M 16.5,36 C 17,32.5 21,32.5 21.5,36 M 27,36 C 27.5,32.5 31.5,32.5 32,36',
        fill: 'none',
        stroke: detail,
        strokeWidth: 1.2,
        strokeLinecap: 'round',
      }),
    )
}

// The Nightrider: a knight with a crescent moon on its body.
function nightrider(color) {
  return (props) =>
    frame(
      props,
      normal(color, 'N', props),
      h('path', { d: 'M 30,23.5 A 5.5,5.5 0 0 0 30,34.5 A 7,7 0 0 1 30,23.5 Z', fill: detailOf(color), stroke: 'none' }),
    )
}

// The Cannon: a barrel pointing up on a carriage with a wheel, on a stand like the rook's.
function cannon(color) {
  const fill = fillOf(color)
  const detail = detailOf(color)
  return (props) =>
    frame(
      props,
      h('path', { d: 'M 9,39 L 36,39 L 36,36 L 9,36 Z', fill, ...STROKE }),
      // Everything above the stand is drawn a bit bigger, so the Cannon is as tall as the
      // other pieces.
      h(
        'g',
        { transform: 'translate(22.5 36) scale(1.2) translate(-22.5 -36)' },
        h('path', { d: 'M 14,36 L 31,36 L 28,28 L 17.5,28 Z', fill, ...STROKE, strokeWidth: 1.25 }),
        h(
          'g',
          { transform: 'rotate(-32 22.5 25)' },
          h('rect', { x: 10, y: 21.5, width: 24, height: 7, rx: 3, fill, ...STROKE, strokeWidth: 1.25 }),
          h('rect', { x: 31, y: 20, width: 4, height: 10, rx: 1.3, fill, ...STROKE, strokeWidth: 1.25 }),
          h('path', { d: 'M 14.5,23.8 L 29,23.8', fill: 'none', stroke: detail, strokeWidth: 0.85, strokeLinecap: 'round' }),
        ),
        h('circle', { cx: 19, cy: 31, r: 4.6, fill, ...STROKE, strokeWidth: 1.25 }),
        // The wheel's rim, hub and spokes (white on the black Cannon, so the wheel stands out).
        h('circle', { cx: 19, cy: 31, r: 3.4, fill: 'none', stroke: detail, strokeWidth: 0.7 }),
        h('circle', { cx: 19, cy: 31, r: 1.2, fill: detail }),
        h('path', { d: 'M 19,27.6 L 19,34.4 M 15.6,31 L 22.4,31', fill: 'none', stroke: detail, strokeWidth: 0.7 }),
      ),
    )
}

// The Dragon Horse: a bishop with a dragon's wings behind it.
function dragonHorse(color) {
  const fill = fillOf(color)
  const detail = detailOf(color)
  const wing = 'M 16,25 C 11,24 6.5,20 4.5,13 C 7,14.5 9,14.5 10.5,13.5 C 10.5,16 12,17 14,17 C 13.5,19 14.5,20.5 16.5,21 Z'
  const ribs = 'M 15.5,22.5 C 11,21 8,17.5 6.5,15.5 M 15,19.5 C 13,18.5 11.5,17 11,15.5'
  return (props) =>
    frame(
      props,
      h('path', { d: wing, fill, ...STROKE }),
      h('path', { d: wing, fill, ...STROKE, transform: 'translate(45 0) scale(-1 1)' }),
      h('path', { d: ribs, fill: 'none', stroke: detail, strokeWidth: 0.8, strokeLinecap: 'round' }),
      h('path', { d: ribs, fill: 'none', stroke: detail, strokeWidth: 0.8, strokeLinecap: 'round', transform: 'translate(45 0) scale(-1 1)' }),
      normal(color, 'B', props),
    )
}

// How each fairy piece (by its letter in FAIRY_PIECES) is drawn.
const DRAWINGS = {
  a: (color) => knightHybrid(color, 'B'), // Archbishop
  c: (color) => knightHybrid(color, 'R'), // Chancellor
  z: (color) => knightHybrid(color, 'Q'), // Amazon
  e: (color) => knightHybrid(color, 'K'), // Centaur
  l: camel,
  i: nightrider,
  o: cannon,
  h: dragonHorse,
}

export const fairyPieces = Object.fromEntries(
  Object.keys(FAIRY_PIECES).flatMap((letter) => ['w', 'b'].map((color) => [color + letter.toUpperCase(), DRAWINGS[letter](color)])),
)

// The duck in Duck Chess: a yellow rubber duck. In the board's FEN it is written "X"
// (see Game.jsx).
export const duck = (props) =>
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
