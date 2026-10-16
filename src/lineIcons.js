import { cloneElement, createElement as h } from 'react'

// Our own icons for the game modes and the main menu tiles: simple line drawings on a 24 × 24
// grid, all with the same line width and rounded ends, in the colour of the text around them
// (white on the main menu's coloured tiles). Used as `<Icon icon="line:blitz" />`.
// (Written with createElement instead of JSX, so this file can be plain .js.)

const line = (d) => h('path', { d })
const filled = (d) => h('path', { d, fill: 'currentColor', stroke: 'none' })
const dot = (cx, cy, r = 1.3) => h('circle', { cx, cy, r, fill: 'currentColor', stroke: 'none' })
const ring = (cx, cy, r) => h('circle', { cx, cy, r })

// A pawn standing on a base, with its head centred at x and its foot at `bottom`.
const pawn = (x, bottom, size = 1) =>
  h(
    'g',
    { transform: `translate(${x} ${bottom}) scale(${size})` },
    ring(0, -11.5, 2.5),
    line('M -2.6 -1.5 C -2.6 -4.5 -1.6 -7 0 -8.6 C 1.6 -7 2.6 -4.5 2.6 -1.5 Z'),
    line('M -4 0 H 4'),
  )

// A crown (the king), standing on its base.
const crown = 'M5 16.5 6.5 8l3.5 3.5L12 6l2 5.5L17.5 8 19 16.5Z'

const DRAWINGS = {
  // ---------- Game modes ----------
  unlimited: () => [
    line('M12 12c-2-2.6-3.6-3.6-5.4-3.6a3.6 3.6 0 0 0 0 7.2c1.8 0 3.4-1 5.4-3.6Zm0 0c2 2.6 3.6 3.6 5.4 3.6a3.6 3.6 0 0 0 0-7.2c-1.8 0-3.4 1-5.4 3.6Z'),
  ],
  rapid: () => [ring(12, 13.5, 7.5), line('M10 2.5h4M12 2.5V6M12 13.5V9.5M18 7l1.6-1.6')],
  blitz: () => [line('M13.5 2 5 13.5h6.5L10.5 22 19 10.5h-6.5L13.5 2Z')],
  bullet: () => [line('M8 8.5h7c3 0 5.5 1.5 5.5 3.5s-2.5 3.5-5.5 3.5H8ZM11 8.5v7M2.5 10H5M2 12h3M2.5 14H5')],
  fog: () => [line('M6.5 12.5a3.5 3.5 0 0 1 .4-7 5 5 0 0 1 9.4 1.4 3 3 0 0 1 .7 5.6H6.5ZM3.5 16h13M6.5 19.5h13')],
  chess960: () => [line('M3 7h4.5l9 10H21M3 17h4.5l9-10H21M18 4l3 3-3 3M18 14l3 3-3 3')],
  fairy: () => [
    line('M4 20 14 10'),
    line('M17 2.5l1.2 2.8 2.8 1.2-2.8 1.2L17 10.5l-1.2-2.8-2.8-1.2 2.8-1.2Z'),
    line('M20 13.5v3M18.5 15h3M7.5 3.5v3M6 5h3'),
  ],
  kingofthehill: () => [line('M2 20.5 9 9.5l4 6 2.5-3.5 6.5 8.5ZM9 9.5V3l4.5 1.6L9 6.3')],
  pawnrace: () => [pawn(8, 20), line('M15.5 20.5V3.5M15.5 3.5h5.5v6h-5.5M18.25 3.5v6M15.5 6.5H21')],
  atomic: () => [
    line('M12 2.5l1.8 4.6 4.8-1.7-1.7 4.8 4.6 1.8-4.6 1.8 1.7 4.8-4.8-1.7L12 21.5l-1.8-4.6-4.8 1.7 1.7-4.8L2.5 12l4.6-1.8-1.7-4.8 4.8 1.7Z'),
    ring(12, 12, 2.2),
  ],
  horde: () => [pawn(5.5, 20.5, 0.8), pawn(12, 20.5, 0.8), pawn(18.5, 20.5, 0.8), pawn(8.8, 13.5, 0.6), pawn(15.2, 13.5, 0.6)],
  chaos: () => [line('M3 4.5h18M5 8.5h13M8 12.5h10M9 16.5h6M11 20.5h3')],
  dice: () => [h('rect', { x: 3.5, y: 3.5, width: 17, height: 17, rx: 3.5 }), dot(8.3, 8.3), dot(12, 12), dot(15.7, 15.7)],
  // The king isn't special in Antichess: a crossed-out crown.
  antichess: () => [line(crown), line('M5 19.5h14'), line('M3.5 3.5l17 17')],
  crazyhouse: () => [line('M3 11 12 3.5 21 11M5.5 9v11.5h13V9M12 10.5v6.5M9.3 14.3 12 17l2.7-2.7')],
  duckchess: () => [
    ring(8.5, 8, 3.3),
    line('M11.6 7.3 15.5 7l-1.3 2.4'),
    line('M5.6 9.8C4 10.6 3 11.6 3 13c0 3.6 3.6 6 8.5 6 4.6 0 9-2.6 9-7 0-1-.9-1.6-1.8-1C17 12.5 14.8 13 12.8 12.3'),
    dot(9.3, 7.2, 0.9),
  ],
  racingkings: () => [line(crown), line('M5 19.5h14'), line('M1.5 9h2M1 12.5h2.5M1.5 16h2')],
  blindfold: () => [line('M2.5 12S6 6 12 6s9.5 6 9.5 6S18 18 12 18 2.5 12 2.5 12Z'), ring(12, 12, 2.8), line('M4 4l16 16')],
  threecheck: () => [line('M2 12.5l2 2 3.5-4.2M9 12.5l2 2 3.5-4.2M16 12.5l2 2 3.5-4.2')],
  berolina: () => [pawn(7, 20.5), line('M12 15.5 20 7.5M14.5 7.5H20v5.5')],
  // A checkered board in front, with two more boards behind it.
  simul: () => [
    line('M3 15V5a1.5 1.5 0 0 1 1.5-1.5h7.5M21 15V5a1.5 1.5 0 0 0-1.5-1.5H12M12 3.5V8'),
    h('rect', { x: 6, y: 8, width: 12, height: 12.5, rx: 1.5 }),
    filled('M6 9.5A1.5 1.5 0 0 1 7.5 8H12v6.25H6ZM12 14.25h6V19a1.5 1.5 0 0 1-1.5 1.5H12Z'),
  ],

  // ---------- Main menu ----------
  friends: () => [
    ring(9, 8, 3.2),
    line('M3 20c0-3.6 2.7-6.2 6-6.2s6 2.6 6 6.2'),
    ring(16.8, 9, 2.6),
    line('M16 14.2c3 0 5.3 2.2 5.3 5.3'),
  ],
  local: () => [pawn(7.5, 20.5), h('g', null, filled('M14.4 19c0-3 1-5.5 2.6-7.1 1.6 1.6 2.6 4.1 2.6 7.1Z'), dot(17, 8.5, 2.5)), line('M13 20.5h8')],
  online: () => [ring(12, 12, 9), h('ellipse', { cx: 12, cy: 12, rx: 4, ry: 9 }), line('M3 12h18M4.7 7.5h14.6M4.7 16.5h14.6')],
  campaign: () => [
    line('M8 3.5h8v5.5a4 4 0 0 1-8 0Z'),
    line('M8 5.5H5.5a2.2 2.2 0 0 0 0 4.4h2.8M16 5.5h2.5a2.2 2.2 0 0 1 0 4.4h-2.8'),
    line('M12 13v3.5M9.5 16.5h5M8 20.5h8'),
  ],
  modes: () => [
    h('rect', { x: 3.5, y: 3.5, width: 7, height: 7, rx: 1.5 }),
    h('rect', { x: 13.5, y: 3.5, width: 7, height: 7, rx: 1.5 }),
    h('rect', { x: 3.5, y: 13.5, width: 7, height: 7, rx: 1.5 }),
    h('rect', { x: 13.5, y: 13.5, width: 7, height: 7, rx: 1.5 }),
  ],
  // A wizard's hat: a cone with a bent tip, a wide brim and a star.
  fantasy: () => [
    line('M7 18.3C8.5 12.5 10.5 7 14.5 3.5c1.6-1.4 3.6-1 4.5.6-1.8-.3-3 .6-3.2 2.3-.5 3.5.3 7.6 1.5 11.9'),
    line('M2.5 19.3c2.8-1.5 16.2-1.5 19 0-2.8 1.7-16.2 1.7-19 0Z'),
    line('M11.6 10.6l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7Z'),
  ],
}

// The icon for a name (like 'blitz'), as an <svg> sized like the text, or null if there is none.
export function lineIcon(name) {
  const drawing = DRAWINGS[name]
  if (!drawing) return null
  return h(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: '1em',
      height: '1em',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.8,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      className: 'line-icon',
      'aria-hidden': true,
    },
    ...drawing().map((part, i) => cloneElement(part, { key: i })),
  )
}
