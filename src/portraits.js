import { cloneElement, createElement as h } from 'react'

// Drawn portraits for the bots: a head-and-shoulders picture inside the round avatar,
// built from parts (face, hair, beard, glasses, clothes …) in a flat, friendly style on a
// 100 × 100 grid. Each bot's look is set in LOOKS at the bottom: where they are from shapes
// it, but varied within a country, and small touches come from their personality (a whistle
// for the coach, a headset for the online speed demon, a fur collar for the Viking).
// The three final bosses are drawn on their own: a robot, an angel and a demon.
// (Written with createElement instead of JSX, so this file can be plain .js.)

// Skin tones, from light to deep.
const SKIN = {
  1: '#f6d9c6',
  2: '#ecc4a6',
  3: '#dba882',
  4: '#c88f66',
  5: '#a8704b',
  6: '#8c5a3a',
  7: '#6e4229',
  8: '#52301c',
}

// Hair colours.
const HAIR = {
  black: '#1f1a17',
  darkBrown: '#3b2619',
  brown: '#6b4529',
  lightBrown: '#9a7049',
  auburn: '#843d22',
  ginger: '#b9592b',
  blond: '#d8b46e',
  platinum: '#eee0b4',
  grey: '#a9a6a2',
  darkGrey: '#6f6b67',
}

// A colour made darker (factor below 1) or lighter (above 1).
function shade(hex, factor) {
  const n = parseInt(hex.slice(1), 16)
  const channel = (c) => Math.max(0, Math.min(255, Math.round(c * factor)))
  const r = channel(n >> 16)
  const g = channel((n >> 8) & 255)
  const b = channel(n & 255)
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}

const INK = '#2a1d17' // eyes and other dark details

// ---------- Hair ----------
// Each style has a `back` part (drawn behind the head, like long hair) and a `front` part
// (drawn over the top of the head). Both are lists of shapes; `c` is the hair colour.

const path = (d, fill, extra) => h('path', { d, fill, ...extra })
const circles = (list, fill) => list.map(([cx, cy, r], i) => h('circle', { key: i, cx, cy, r, fill }))

// The top of the head with a soft hairline, used by several short styles.
const TOP_SHORT = 'M 33,44 C 31,26 42,21 50,21 C 60,21 69,26 67,44 C 66,36 62,31 56,30 C 50,33 42,31 37,34 C 35,37 34,40 33,44 Z'
// Hair pulled back from the face (buns, ponytails, braids).
const TOP_PULLED = 'M 33,45 C 31,28 41,21.5 50,21.5 C 59,21.5 69,28 67,45 C 65,36 59,30.5 50,30.5 C 41,30.5 35,36 33,45 Z'
// A long side-parted fringe.
const TOP_PARTED = 'M 33,45 C 31,27 41,20 50,20 C 59,20 69,27 67,45 C 65,36 60,30 51,28.5 C 46,31 40,33 36,37 C 34.5,39.5 33.5,42 33,45 Z'
// Straight bangs down to the eyebrows.
const TOP_BANGS = 'M 33,43 C 32,26 41,20.5 50,20.5 C 59,20.5 68,26 67,43 L 66.5,37.5 C 61,36.5 56,36 50,36 C 44,36 39,36.5 33.5,37.5 Z'

const HAIRSTYLES = {
  short: (c) => ({ front: [path(TOP_SHORT, c)] }),
  buzz: (c) => ({
    front: [path('M 34,41 C 33,27 42,23.5 50,23.5 C 58,23.5 67,27 66,41 C 64,33 58,29.5 50,29.5 C 42,29.5 36,33 34,41 Z', c)],
  }),
  sidePart: (c) => ({
    front: [
      path('M 33,45 C 30,27 41,20 51,20.5 C 62,21 70,27 67,45 C 66,37 64,32 60,30 C 52,30 44,29 40,33 C 37,36 34,40 33,45 Z', c),
      path('M 41,23 C 40,26 40,28 40.5,31', 'none', { stroke: shade(c, 1.5), strokeWidth: 1, strokeLinecap: 'round' }),
    ],
  }),
  swept: (c) => ({
    front: [path('M 33,44 C 31,27 38,18.5 52,17.5 C 62,17 70,24 67,44 C 65,35 61,30 54,29 C 47,28 40,31 36,36 C 34.5,38.5 33.5,41 33,44 Z', c)],
  }),
  slicked: (c) => ({
    front: [
      path('M 33.5,42 C 32,27 41,21.5 50,21.5 C 60,21.5 68,27 66.5,42 C 65,34 60,29.5 50,29.5 C 41,29.5 35.5,34 33.5,42 Z', c),
      path('M 40,25.5 C 46,23.5 54,23.5 60,25.5', 'none', { stroke: shade(c, 2.2), strokeWidth: 1, strokeLinecap: 'round', opacity: 0.6 }),
    ],
  }),
  messy: (c) => ({
    front: [
      path(
        'M 33,44 C 30,30 36,22.5 41,22 L 39.5,17.5 L 45,20.5 L 47,15.5 L 51,20 L 55.5,16 L 57,21 L 62.5,18.5 L 61,23 C 67,26 69,34 67,44 C 65,36 61,31 55,30.5 C 49,32 42,30.5 38,34 C 35.5,37 34,40.5 33,44 Z',
        c,
      ),
    ],
  }),
  curlyShort: (c) => ({
    front: circles([[35.5, 37, 5], [37.5, 30.5, 6], [43, 25.5, 6], [50, 23.5, 6.5], [57, 25.5, 6], [62.5, 30.5, 6], [64.5, 37, 5]], c),
  }),
  balding: (c) => ({
    front: [
      path('M 33.2,48 C 32,40 33,34.5 36.5,31.5 C 36.5,37 36,42 35.8,48 Z', c),
      path('M 66.8,48 C 68,40 67,34.5 63.5,31.5 C 63.5,37 64,42 64.2,48 Z', c),
    ],
  }),
  // No hair at all, just a little shine on top of the head. (The hair colour still sets
  // the eyebrows and beard.)
  bald: () => ({
    front: [path('M 42,27.5 Q 47,25.5 53,26.5', 'none', { stroke: '#ffffff', strokeWidth: 2.2, strokeLinecap: 'round', opacity: 0.3 })],
  }),
  afro: (c) => ({
    back: [h('circle', { cx: 50, cy: 38, r: 26, fill: c })],
    front: [path('M 34,40 C 35,30 43,27 50,27 C 57,27 65,30 66,40 C 62,34 56,32 50,32 C 44,32 38,34 34,40 Z', c)],
  }),
  long: (c) => ({
    back: [path('M 30,46 C 28,28 38,19 50,19 C 62,19 72,28 70,46 L 72,76 C 66,80 60,78 57,73 L 43,73 C 40,78 34,80 28,76 Z', c)],
    front: [path(TOP_PARTED, c)],
  }),
  longBangs: (c) => ({
    back: [path('M 30,46 C 28,28 38,19 50,19 C 62,19 72,28 70,46 L 71,76 C 66,79 60,77 57,73 L 43,73 C 40,77 34,79 29,76 Z', c)],
    front: [path(TOP_BANGS, c)],
  }),
  longWavy: (c) => ({
    back: [
      path(
        'M 30,46 C 26,28 38,19 50,19 C 62,19 74,28 70,46 C 74,54 68,60 72,68 C 71,77 62,79 58,73 L 42,73 C 38,79 29,77 28,68 C 32,60 26,54 30,46 Z',
        c,
      ),
    ],
    front: [path(TOP_PARTED, c)],
  }),
  curlyLong: (c) => ({
    back: circles(
      [[31, 40, 9], [28.5, 52, 9], [30, 64, 8.5], [69, 40, 9], [71.5, 52, 9], [70, 64, 8.5], [39, 25, 9], [50, 21.5, 9.5], [61, 25, 9]],
      c,
    ),
    front: circles([[37.5, 33, 5.5], [43.5, 28, 6], [50.5, 26.5, 6], [57, 28, 6], [62.5, 33, 5.5]], c),
  }),
  bob: (c) => ({
    back: [path('M 31,44 C 29,27 40,20 50,20 C 60,20 71,27 69,44 L 70,61 C 66,64 62,63 61,59 L 39,59 C 38,63 34,64 30,61 Z', c)],
    front: [path(TOP_BANGS, c)],
  }),
  pixie: (c) => ({
    front: [path('M 33,46 C 30,28 40,20 50,20 C 61,20 70,27 67,46 C 66,39 64,35 61,33 C 55,34 46,32 41,29 C 39,33 36,37 33,46 Z', c)],
  }),
  bun: (c) => ({
    back: [h('circle', { cx: 50, cy: 18, r: 8, fill: c })],
    front: [path(TOP_PULLED, c)],
  }),
  ponytail: (c) => ({
    back: [path('M 61,25 C 75,27 78,45 73,64 C 71,69 66,67 67,62 C 70,49 67,36 59,30 Z', c)],
    front: [path(TOP_PULLED, c)],
  }),
  braids: (c) => {
    const braid = (x, dir) =>
      path(
        `M ${x},40 C ${x - 4 * dir},50 ${x - 4 * dir},62 ${x - 2 * dir},76 L ${x + 3 * dir},76 C ${x + 2 * dir},62 ${x + 2 * dir},50 ${x + 4 * dir},42 Z`,
        c,
      )
    const ties = (x, dir) =>
      [52, 60, 68].map((y) =>
        path(`M ${x - 3 * dir},${y} L ${x + 2 * dir},${y + 1}`, 'none', { key: y, stroke: shade(c, 0.7), strokeWidth: 1 }),
      )
    return { back: [braid(33, 1), braid(67, -1), ...ties(31.5, 1), ...ties(68.5, -1)], front: [path(TOP_PULLED, c)] }
  },
  // A headscarf (hijab): `c` is the scarf's colour. It covers the hair, ears and neck.
  hijab: (c) => ({
    back: [path('M 28,48 C 26,26 38,17 50,17 C 62,17 74,26 72,48 C 74,60 80,68 86,82 L 14,82 C 20,68 26,60 28,48 Z', c)],
    front: [
      path('M 33,47 C 32,30 40,24 50,24 C 60,24 68,30 67,47 L 70,47 C 71,27 62,19.5 50,19.5 C 38,19.5 29,27 30,47 Z', c),
      path('M 33.5,51 C 36,62 44,66.5 50,66.5 C 56,66.5 64,62 66.5,51 L 70,53 C 68,67 58,73 50,73 C 42,73 32,67 30,53 Z', c),
    ],
    noEars: true,
  }),
}

// ---------- Faces ----------

// Eyebrows for each expression: [left, right] paths.
const BROWS = {
  happy: ['M 39.5,39.5 Q 43.5,37.5 47,39', 'M 53,39 Q 56.5,37.5 60.5,39.5'],
  calm: ['M 39.5,39.5 L 47,39.2', 'M 53,39.2 L 60.5,39.5'],
  stern: ['M 39.5,38.5 L 47,40.5', 'M 53,40.5 L 60.5,38.5'],
  nervous: ['M 39.5,40 L 47,38', 'M 53,38 L 60.5,40'],
  smirk: ['M 39.5,39.5 Q 43.5,37.5 47,39', 'M 53,38.5 Q 56.5,36.5 60.5,38'],
  grin: ['M 39.5,39 Q 43.5,36.8 47,38.5', 'M 53,38.5 Q 56.5,36.8 60.5,39'],
}

// The mouth for each expression.
function mouth(expression, skin) {
  const lip = shade(skin, 0.55)
  const line = (d) => path(d, 'none', { stroke: lip, strokeWidth: 1.6, strokeLinecap: 'round' })
  switch (expression) {
    case 'grin':
      return [
        path('M 44,55.5 Q 50,63 56,55.5 Z', '#5a2620'),
        path('M 45.2,55.9 Q 50,57.2 54.8,55.9 L 54.2,57.2 Q 50,58.2 45.8,57.2 Z', '#ffffff'),
      ]
    case 'smirk':
      return [line('M 45.5,57 Q 51,59 55.5,55')]
    case 'calm':
      return [line('M 46,57 Q 50,58.4 54,57')]
    case 'stern':
      return [line('M 46,57.5 L 54,57.3')]
    case 'nervous':
      return [line('M 45.5,57.4 Q 47.5,56.2 49.5,57.4 Q 51.5,58.6 54.2,57.2')]
    default:
      return [line('M 45,56 Q 50,60 55,56')]
  }
}

// Facial hair, drawn over the face but under the mouth.
function facialHair(kind, color) {
  switch (kind) {
    case 'stubble':
      return [
        path('M 34.5,48 C 35,60 42.5,65 50,65 C 57.5,65 65,60 65.5,48 C 63.5,55 58,58.5 50,59 C 42,58.5 36.5,55 34.5,48 Z', color, { opacity: 0.35 }),
        path('M 44.5,54 C 47,53 53,53 55.5,54 L 55,55.5 C 52,55 48,55 45,55.5 Z', color, { opacity: 0.35 }),
      ]
    case 'beard':
      return [
        path('M 33.5,45 C 33,62 41.5,69 50,69 C 58.5,69 67,62 66.5,45 C 65,52 61,54.5 57.5,54.5 C 55,52.5 45,52.5 42.5,54.5 C 39,54.5 35,52 33.5,45 Z', color),
      ]
    case 'shortBeard':
      return [
        path('M 34,48 C 34.5,61 42,66.5 50,66.5 C 58,66.5 65.5,61 66,48 C 64,54 60,56 57,55.8 C 54.5,53.8 45.5,53.8 43,55.8 C 40,56 36,54 34,48 Z', color),
      ]
    case 'goatee':
      return [
        path('M 45.5,59 C 45.5,65 54.5,65 54.5,59 C 52.5,60.5 47.5,60.5 45.5,59 Z', color),
        path('M 44,54.8 C 46,52.6 49,53 50,54 C 51,53 54,52.6 56,54.8 C 53,55.6 51,55.3 50,54.9 C 49,55.3 47,55.6 44,54.8 Z', color),
      ]
    case 'mustache':
      return [path('M 43.5,54.8 C 46,52 49,52.6 50,53.8 C 51,52.6 54,52 56.5,54.8 C 53.5,56 51,55.4 50,54.9 C 49,55.4 46.5,56 43.5,54.8 Z', color)]
    default:
      return []
  }
}

// ---------- Clothes and extras ----------

const TORSO = 'M 13,100 C 15,80 30,71.5 50,71.5 C 70,71.5 85,80 87,100 Z'

function clothes(kind, color) {
  const dark = shade(color, 0.75)
  switch (kind) {
    case 'suit':
      return [
        path(TORSO, color),
        path('M 43,72 L 50,88 L 57,72 Z', '#f4f1ea'),
        path('M 49,74.5 L 51,74.5 L 52.6,87 L 50,90.5 L 47.4,87 Z', '#8a2b2b'),
        path('M 43,72 L 47,83 M 57,72 L 53,83', 'none', { stroke: shade(color, 0.6), strokeWidth: 1.2 }),
      ]
    case 'hoodie':
      return [path(TORSO, color), path('M 32,77 C 34,66 66,66 68,77 C 62,73 38,73 32,77 Z', dark)]
    case 'collar':
      return [path(TORSO, color), path('M 42,71.5 L 50,79 L 58,71.5 L 55,70 L 50,74.5 L 45,70 Z', '#f4f1ea')]
    case 'sweater':
      return [path(TORSO, color), path('M 40,72 C 44,77 56,77 60,72', 'none', { stroke: dark, strokeWidth: 3 })]
    default:
      return [path(TORSO, color)]
  }
}

const EXTRAS = {
  glasses: () => [
    h('circle', { key: 'l', cx: 43.5, cy: 45, r: 4.6, fill: 'rgba(255,255,255,0.18)', stroke: '#2b2b2b', strokeWidth: 1.4 }),
    h('circle', { key: 'r', cx: 56.5, cy: 45, r: 4.6, fill: 'rgba(255,255,255,0.18)', stroke: '#2b2b2b', strokeWidth: 1.4 }),
    path('M 48.1,44.6 Q 50,43.4 51.9,44.6', 'none', { key: 'b', stroke: '#2b2b2b', strokeWidth: 1.3 }),
  ],
  squareGlasses: () => [
    h('rect', { key: 'l', x: 38.8, y: 41.4, width: 9.4, height: 7.2, rx: 1.6, fill: 'rgba(255,255,255,0.18)', stroke: '#2b2b2b', strokeWidth: 1.4 }),
    h('rect', { key: 'r', x: 51.8, y: 41.4, width: 9.4, height: 7.2, rx: 1.6, fill: 'rgba(255,255,255,0.18)', stroke: '#2b2b2b', strokeWidth: 1.4 }),
    path('M 48.2,44.5 L 51.8,44.5', 'none', { key: 'b', stroke: '#2b2b2b', strokeWidth: 1.3 }),
  ],
  headset: () => [
    path('M 31.5,45 C 29,20 71,20 68.5,45', 'none', { key: 'band', stroke: '#26282c', strokeWidth: 3.2 }),
    h('rect', { key: 'l', x: 27.5, y: 40, width: 7, height: 12, rx: 3, fill: '#33363c' }),
    h('rect', { key: 'r', x: 65.5, y: 40, width: 7, height: 12, rx: 3, fill: '#33363c' }),
    path('M 31,51 C 32,59 38,61.5 44,60.5', 'none', { key: 'mic', stroke: '#33363c', strokeWidth: 1.8, strokeLinecap: 'round' }),
    h('circle', { key: 'tip', cx: 44.5, cy: 60.4, r: 1.6, fill: '#e04848' }),
  ],
  whistle: () => [
    path('M 43,71.5 L 49,85 L 51,85 L 57,71.5', 'none', { key: 'cord', stroke: '#d64545', strokeWidth: 1.4 }),
    h('rect', { key: 'w', x: 46, y: 84, width: 9, height: 4.5, rx: 2, fill: '#cfd4da', stroke: '#7d858e', strokeWidth: 0.8 }),
  ],
  earrings: () => [
    h('circle', { key: 'l', cx: 33.6, cy: 52, r: 1.5, fill: '#e2b53e' }),
    h('circle', { key: 'r', cx: 66.4, cy: 52, r: 1.5, fill: '#e2b53e' }),
  ],
  hoops: () => [
    h('circle', { key: 'l', cx: 33.4, cy: 54, r: 3, fill: 'none', stroke: '#e2b53e', strokeWidth: 1.2 }),
    h('circle', { key: 'r', cx: 66.6, cy: 54, r: 3, fill: 'none', stroke: '#e2b53e', strokeWidth: 1.2 }),
  ],
  flower: () => [
    ...circles([[63, 26.5, 2.7], [66.5, 28.5, 2.7], [65.5, 32.5, 2.7], [61.5, 33, 2.7], [60, 29.2, 2.7]], '#e0465a'),
    h('circle', { key: 'mid', cx: 63.3, cy: 29.9, r: 1.8, fill: '#f5c542' }),
  ],
  fur: () => circles([[26, 82, 6], [33, 78, 6], [41, 75.5, 6], [50, 75, 6], [59, 75.5, 6], [67, 78, 6], [74, 82, 6]], '#cbb89a'),
  scarf: (color) => [
    path('M 37,67 C 43,73.5 57,73.5 63,67 L 65,74 C 57,80 43,80 35,74 Z', color),
    path('M 56,76 L 60,90 L 54,90 L 52,77 Z', shade(color, 0.85)),
  ],
  flatCap: () => [
    path('M 32,37 C 31,23 42,19 50,19 C 60,19 69,24 68,36 Z', '#6d5c48'),
    path('M 29.5,37.5 C 40,33.5 62,33.5 72.5,38 C 62,40.5 40,40.5 29.5,37.5 Z', '#5a4a39'),
  ],
  headband: (color) => [path('M 33.2,35 C 38,30.5 62,30.5 66.8,35 L 66.4,38.6 C 62,34.5 38,34.5 33.6,38.6 Z', color)],
  freckles: (skin) =>
    circles([[40, 50, 0.7], [42.5, 51.3, 0.7], [44.5, 49.7, 0.7], [55.5, 49.7, 0.7], [57.5, 51.3, 0.7], [60, 50, 0.7]], shade(skin, 0.68)),
  wrinkles: (skin) => [
    path('M 43,33.5 L 57,33.5 M 45,35.8 L 55,35.8', 'none', { key: 'f', stroke: shade(skin, 0.8), strokeWidth: 0.8, strokeLinecap: 'round' }),
    path('M 37.2,46 L 35.6,47.2 M 62.8,46 L 64.4,47.2', 'none', { key: 'e', stroke: shade(skin, 0.75), strokeWidth: 0.8, strokeLinecap: 'round' }),
  ],
  sweat: () => [path('M 66,30 C 64,34 64,36.5 66,36.5 C 68,36.5 68,34 66,30 Z', '#7fc8ef')],
  goldTie: () => [path('M 49,74.5 L 51,74.5 L 52.6,87 L 50,90.5 L 47.4,87 Z', '#d9ad2b')],
  blush: () => [
    h('ellipse', { key: 'l', cx: 40.5, cy: 52, rx: 3.2, ry: 1.8, fill: '#e36b6b', opacity: 0.22 }),
    h('ellipse', { key: 'r', cx: 59.5, cy: 52, rx: 3.2, ry: 1.8, fill: '#e36b6b', opacity: 0.22 }),
  ],
}

// ---------- A person ----------

// One portrait from a look like { skin: 3, hair: 'long', hairColor: 'brown', expression,
// beard, clothes, shirt, extras: ['glasses'] } (see LOOKS).
function person(look) {
  const skin = SKIN[look.skin]
  const skinShade = shade(skin, 0.86)
  const hairColor = HAIR[look.hairColor] ?? look.hairColor
  const style = HAIRSTYLES[look.hair](look.hair === 'hijab' ? look.scarf : hairColor)
  const brows = BROWS[look.expression ?? 'happy']
  const browColor = ['hijab', 'balding', 'bald'].includes(look.hair) ? shade(HAIR[look.browColor ?? 'darkBrown'], 1) : shade(hairColor, 0.8)
  const extras = (look.extras ?? []).flatMap((name) => {
    const [kind, arg] = name.split(':')
    return EXTRAS[kind](arg ? `#${arg}` : skin)
  })
  return [
    ...(style.back ?? []),
    ...clothes(look.clothes, look.shirt),
    path('M 43,58 L 57,58 L 57.5,73 C 54,75 46,75 42.5,73 Z', skinShade),
    ...(style.noEars
      ? []
      : [h('ellipse', { key: 'el', cx: 33.6, cy: 46.5, rx: 3, ry: 4.6, fill: skinShade }), h('ellipse', { key: 'er', cx: 66.4, cy: 46.5, rx: 3, ry: 4.6, fill: skinShade })]),
    h('ellipse', { key: 'head', cx: 50, cy: 44, rx: 16.5, ry: 19.5, fill: skin }),
    ...facialHair(look.beard, hairColor === HAIR.platinum ? HAIR.blond : hairColor),
    h('ellipse', { key: 'eyl', cx: 43.5, cy: 45.3, rx: 1.9, ry: 2.4, fill: INK }),
    h('ellipse', { key: 'eyr', cx: 56.5, cy: 45.3, rx: 1.9, ry: 2.4, fill: INK }),
    h('circle', { key: 'gll', cx: 44.2, cy: 44.4, r: 0.6, fill: '#ffffff' }),
    h('circle', { key: 'glr', cx: 57.2, cy: 44.4, r: 0.6, fill: '#ffffff' }),
    ...brows.map((d, i) => path(d, 'none', { key: 'brow' + i, stroke: browColor, strokeWidth: 1.8, strokeLinecap: 'round' })),
    path('M 50.2,46.5 Q 48.4,51.2 50.6,52.2', 'none', { key: 'nose', stroke: shade(skin, 0.72), strokeWidth: 1.3, strokeLinecap: 'round' }),
    ...mouth(look.expression, skin),
    ...(style.front ?? []),
    ...extras,
  ]
}

// ---------- The bosses ----------

function robot() {
  const metal = '#c4ccd4'
  const edge = '#5d6873'
  return [
    path(TORSO, '#8a96a3'),
    path('M 30,86 L 70,86', 'none', { stroke: edge, strokeWidth: 1.5 }),
    h('circle', { key: 'core', cx: 50, cy: 88, r: 3.5, fill: '#5ff0ff' }),
    h('rect', { key: 'neck', x: 44, y: 62, width: 12, height: 11, fill: '#7d8894' }),
    path('M 50,24 L 50,14', 'none', { stroke: edge, strokeWidth: 2 }),
    h('circle', { key: 'ant', cx: 50, cy: 12.5, r: 3.2, fill: '#ff5252' }),
    h('rect', { key: 'earl', x: 25.5, y: 38, width: 6, height: 14, rx: 2, fill: edge }),
    h('rect', { key: 'earr', x: 68.5, y: 38, width: 6, height: 14, rx: 2, fill: edge }),
    h('rect', { key: 'head', x: 30, y: 23, width: 40, height: 41, rx: 7, fill: metal, stroke: edge, strokeWidth: 1.5 }),
    h('rect', { key: 'visor', x: 35, y: 35, width: 30, height: 12, rx: 5, fill: '#1f2a33' }),
    h('rect', { key: 'eyel', x: 39, y: 38.5, width: 8, height: 5, rx: 2.5, fill: '#5ff0ff' }),
    h('rect', { key: 'eyer', x: 53, y: 38.5, width: 8, height: 5, rx: 2.5, fill: '#5ff0ff' }),
    ...[40, 45, 50, 55, 60].map((x) => path(`M ${x},53 L ${x},58`, 'none', { key: 'g' + x, stroke: edge, strokeWidth: 1.6, strokeLinecap: 'round' })),
    ...circles([[34, 27, 1.1], [66, 27, 1.1], [34, 60, 1.1], [66, 60, 1.1]], edge),
  ]
}

function angel() {
  const skin = '#fbeedd'
  const hair = '#f2d888'
  const wing = (dir) =>
    path(
      dir > 0
        ? 'M 38,72 C 24,70 10,58 6,38 C 12,44 16,45 20,44 C 16,50 20,54 25,54 C 22,59 27,63 33,62 Z'
        : 'M 62,72 C 76,70 90,58 94,38 C 88,44 84,45 80,44 C 84,50 80,54 75,54 C 78,59 73,63 67,62 Z',
      '#fffaf0',
      { stroke: '#b8923a', strokeWidth: 1.5 },
    )
  return [
    wing(1),
    wing(-1),
    path('M 30,46 C 28,28 38,19 50,19 C 62,19 72,28 70,46 L 72,74 C 66,78 60,76 57,72 L 43,72 C 40,76 34,78 28,74 Z', hair),
    path(TORSO, '#fffdf7'),
    path('M 38,73 C 44,79 56,79 62,73', 'none', { stroke: '#e2bd4f', strokeWidth: 2 }),
    path('M 43,58 L 57,58 L 57.5,73 C 54,75 46,75 42.5,73 Z', shade(skin, 0.92)),
    h('ellipse', { key: 'head', cx: 50, cy: 44, rx: 16.5, ry: 19.5, fill: skin }),
    // Closed, peaceful eyes and a soft smile.
    path('M 41,45.5 Q 43.5,47.5 46,45.5', 'none', { stroke: '#7a6040', strokeWidth: 1.4, strokeLinecap: 'round' }),
    path('M 54,45.5 Q 56.5,47.5 59,45.5', 'none', { stroke: '#7a6040', strokeWidth: 1.4, strokeLinecap: 'round' }),
    path('M 50.2,47.5 Q 48.8,51 50.6,52', 'none', { stroke: '#e0c0a0', strokeWidth: 1.2, strokeLinecap: 'round' }),
    path('M 46,56.5 Q 50,59 54,56.5', 'none', { stroke: '#c98a7a', strokeWidth: 1.5, strokeLinecap: 'round' }),
    path(TOP_PARTED, hair),
    h('ellipse', { key: 'halo', cx: 50, cy: 15, rx: 15, ry: 4.2, fill: 'none', stroke: '#ffd447', strokeWidth: 2.8 }),
  ]
}

function demon() {
  const skin = '#b5392d'
  const dark = '#7a1f17'
  return [
    path(TORSO, '#1d1414'),
    path('M 30,80 L 40,74 L 50,82 L 60,74 L 70,80', 'none', { stroke: '#5a1a14', strokeWidth: 1.5 }),
    path('M 43,58 L 57,58 L 57.5,73 C 54,75 46,75 42.5,73 Z', dark),
    // Horns.
    path('M 37,30 C 30,24 27,15 31,6 C 33,15 38,20 43,24 Z', '#e8dcc0', { stroke: '#8a7a5a', strokeWidth: 1 }),
    path('M 63,30 C 70,24 73,15 69,6 C 67,15 62,20 57,24 Z', '#e8dcc0', { stroke: '#8a7a5a', strokeWidth: 1 }),
    // Pointed ears.
    path('M 34,42 L 25,36 L 33,52 Z', dark),
    path('M 66,42 L 75,36 L 67,52 Z', dark),
    h('ellipse', { key: 'head', cx: 50, cy: 44, rx: 16.5, ry: 19.5, fill: skin }),
    // Glowing eyes with slits, angry brows and a fanged grin.
    h('ellipse', { key: 'el', cx: 43.5, cy: 45, rx: 3, ry: 2.4, fill: '#ffd23f' }),
    h('ellipse', { key: 'er', cx: 56.5, cy: 45, rx: 3, ry: 2.4, fill: '#ffd23f' }),
    h('rect', { key: 'sl', x: 43, y: 43, width: 1, height: 4, fill: '#1a0a08' }),
    h('rect', { key: 'sr', x: 56, y: 43, width: 1, height: 4, fill: '#1a0a08' }),
    path('M 39,38.5 L 47.5,41.5', 'none', { stroke: '#1a0a08', strokeWidth: 2.2, strokeLinecap: 'round' }),
    path('M 61,38.5 L 52.5,41.5', 'none', { stroke: '#1a0a08', strokeWidth: 2.2, strokeLinecap: 'round' }),
    path('M 43,55 Q 50,62 57,55 Z', '#2a0d0a'),
    path('M 45,55.6 L 46.5,58.6 L 48,55.9 Z M 52,55.9 L 53.5,58.6 L 55,55.6 Z', '#ffffff'),
    path('M 34,38 C 33,26 42,22 50,22 C 58,22 67,26 66,38 C 63,31 57,29 50,30.5 C 43,29 37,31 34,38 Z', '#120a0a'),
  ]
}

// ---------- Each bot's look ----------
// skin 1 (light) to 8 (deep); hair style and colour; expression (happy, calm, stern,
// nervous, smirk, grin); beard (stubble, shortBeard, beard, goatee, mustache); clothes
// (plain, suit, hoodie, collar, sweater) in the `shirt` colour; extras (glasses,
// squareGlasses, headset, whistle, earrings, hoops, flower, fur, scarf:colour, flatCap,
// headband:colour, freckles, wrinkles, sweat, goldTie, blush).
const LOOKS = {
  // Chess School
  amara: { skin: 7, hair: 'bun', hairColor: 'black', expression: 'happy', clothes: 'collar', shirt: '#2f7d5c', extras: ['whistle', 'earrings'] },
  lukas: { skin: 1, hair: 'messy', hairColor: 'blond', expression: 'nervous', clothes: 'hoodie', shirt: '#4f7fc2', extras: ['sweat', 'blush'] },
  mei: { skin: 2, hair: 'bob', hairColor: 'black', expression: 'calm', clothes: 'collar', shirt: '#e38aa3' },
  diego: { skin: 4, hair: 'swept', hairColor: 'black', expression: 'grin', clothes: 'plain', shirt: '#d9532f' },
  priya: { skin: 5, hair: 'ponytail', hairColor: 'black', expression: 'smirk', clothes: 'plain', shirt: '#f08a24', extras: ['earrings'] },
  // Amateur circuit
  jonas: { skin: 2, hair: 'sidePart', hairColor: 'brown', expression: 'calm', beard: 'shortBeard', clothes: 'sweater', shirt: '#6f7c8c', extras: ['squareGlasses'] },
  fatima: { skin: 4, hair: 'longWavy', hairColor: 'darkBrown', expression: 'smirk', clothes: 'plain', shirt: '#b8433f', extras: ['hoops'] },
  liam: { skin: 1, hair: 'curlyShort', hairColor: 'ginger', expression: 'grin', clothes: 'plain', shirt: '#3f8a46', extras: ['freckles'] },
  sofia: { skin: 3, hair: 'long', hairColor: 'darkBrown', expression: 'happy', clothes: 'collar', shirt: '#2a8a84', extras: ['earrings'] },
  kwame: { skin: 8, hair: 'buzz', hairColor: 'darkGrey', expression: 'calm', beard: 'goatee', clothes: 'collar', shirt: '#c0903a', extras: ['squareGlasses', 'wrinkles'] },
  ana: { skin: 5, hair: 'curlyLong', hairColor: 'darkBrown', expression: 'grin', clothes: 'plain', shirt: '#e3b21c', extras: ['headband:2f9e57'] },
  viktor: { skin: 2, hair: 'swept', hairColor: 'lightBrown', expression: 'smirk', beard: 'mustache', clothes: 'plain', shirt: '#2d3e75', extras: ['scarf:c0392b'] },
  // Advanced
  carlos: { skin: 3, hair: 'slicked', hairColor: 'black', expression: 'smirk', beard: 'stubble', clothes: 'collar', shirt: '#b8473a', extras: ['flatCap'] },
  zofia: { skin: 1, hair: 'bun', hairColor: 'lightBrown', expression: 'calm', clothes: 'sweater', shirt: '#7d6b9e', extras: ['glasses'] },
  jake: { skin: 6, hair: 'buzz', hairColor: 'black', expression: 'grin', clothes: 'hoodie', shirt: '#3b6fc4', extras: ['headset'] },
  meilin: { skin: 2, hair: 'longBangs', hairColor: 'black', expression: 'calm', clothes: 'collar', shirt: '#c43b5c' },
  ivan: { skin: 1, hair: 'sidePart', hairColor: 'lightBrown', expression: 'calm', clothes: 'sweater', shirt: '#c4a03b', extras: ['glasses'] },
  lucia: { skin: 3, hair: 'ponytail', hairColor: 'brown', expression: 'stern', clothes: 'plain', shirt: '#4a9fd4', extras: ['earrings'] },
  erik: { skin: 1, hair: 'short', hairColor: 'blond', expression: 'calm', beard: 'beard', clothes: 'sweater', shirt: '#5b7c99' },
  amina: { skin: 4, hair: 'hijab', scarf: '#2c8c8c', expression: 'happy', clothes: 'plain', shirt: '#2c8c8c', browColor: 'black' },
  // Expert
  lea: { skin: 1, hair: 'pixie', hairColor: 'auburn', expression: 'smirk', clothes: 'collar', shirt: '#4f6fb5', extras: ['earrings'] },
  daan: { skin: 1, hair: 'short', hairColor: 'lightBrown', expression: 'calm', clothes: 'hoodie', shirt: '#e0822b' },
  emre: { skin: 3, hair: 'swept', hairColor: 'black', expression: 'smirk', beard: 'stubble', clothes: 'plain', shirt: '#c0392b' },
  jiwoo: { skin: 2, hair: 'long', hairColor: 'black', expression: 'calm', clothes: 'collar', shirt: '#2f8f83', extras: ['glasses'] },
  chloe: { skin: 1, hair: 'longWavy', hairColor: 'blond', expression: 'grin', clothes: 'plain', shirt: '#a83f6e', extras: ['earrings'] },
  giorgi: { skin: 3, hair: 'balding', hairColor: 'darkGrey', browColor: 'darkGrey', expression: 'calm', beard: 'beard', clothes: 'sweater', shirt: '#8a6b3d', extras: ['wrinkles'] },
  lan: { skin: 3, hair: 'ponytail', hairColor: 'black', expression: 'smirk', clothes: 'collar', shirt: '#d6b13a', extras: ['earrings'] },
  andras: { skin: 2, hair: 'balding', hairColor: 'grey', browColor: 'grey', expression: 'calm', beard: 'mustache', clothes: 'suit', shirt: '#2f4a3a', extras: ['glasses', 'wrinkles'] },
  // Master
  ruby: { skin: 1, hair: 'curlyLong', hairColor: 'ginger', expression: 'grin', clothes: 'plain', shirt: '#3f8fb0', extras: ['freckles'] },
  arman: { skin: 3, hair: 'short', hairColor: 'black', expression: 'calm', beard: 'beard', clothes: 'collar', shirt: '#a85a3a' },
  sipho: { skin: 8, hair: 'buzz', hairColor: 'black', expression: 'grin', clothes: 'plain', shirt: '#3f9a5a' },
  aino: { skin: 1, hair: 'long', hairColor: 'platinum', expression: 'calm', clothes: 'plain', shirt: '#5a7ab0', extras: ['scarf:dfe8f2'] },
  rashad: { skin: 3, hair: 'curlyShort', hairColor: 'black', expression: 'smirk', beard: 'mustache', clothes: 'collar', shirt: '#b04a5a' },
  maria: { skin: 4, hair: 'longWavy', hairColor: 'black', expression: 'happy', clothes: 'plain', shirt: '#c0703a', extras: ['flower'] },
  dragan: { skin: 2, hair: 'buzz', hairColor: 'darkBrown', expression: 'stern', beard: 'stubble', clothes: 'sweater', shirt: '#4e4466', extras: ['wrinkles'] },
  thea: { skin: 1, hair: 'ponytail', hairColor: 'blond', expression: 'happy', clothes: 'collar', shirt: '#c84a4a', extras: ['earrings'] },
  // Legend
  freyja: { skin: 1, hair: 'braids', hairColor: 'blond', expression: 'grin', clothes: 'plain', shirt: '#5a4a3a', extras: ['fur'] },
  aziz: { skin: 3, hair: 'messy', hairColor: 'black', expression: 'grin', clothes: 'hoodie', shirt: '#3aa08a' },
  valentina: { skin: 6, hair: 'curlyLong', hairColor: 'black', expression: 'happy', clothes: 'plain', shirt: '#c0503a', extras: ['hoops'] },
  baterdene: { skin: 3, hair: 'short', hairColor: 'black', expression: 'calm', clothes: 'collar', shirt: '#2f5f9e', extras: ['scarf:d9a441'] },
  leon: { skin: 2, hair: 'buzz', hairColor: 'brown', expression: 'stern', beard: 'shortBeard', clothes: 'sweater', shirt: '#5a6aa0' },
  selam: { skin: 7, hair: 'afro', hairColor: 'black', expression: 'calm', clothes: 'collar', shirt: '#3a8a4a', extras: ['earrings'] },
  rohan: { skin: 5, hair: 'sidePart', hairColor: 'black', expression: 'calm', clothes: 'collar', shirt: '#2a4f8a', extras: ['squareGlasses'] },
  noor: { skin: 3, hair: 'swept', hairColor: 'darkBrown', expression: 'smirk', beard: 'shortBeard', clothes: 'suit', shirt: '#1f2430', extras: ['goldTie'] },
  // Visiting players: they fill the brackets of the tournaments (see career.js).
  oskar: { skin: 1, hair: 'sidePart', hairColor: 'lightBrown', expression: 'calm', clothes: 'sweater', shirt: '#7a8a5a' },
  elif: { skin: 3, hair: 'longWavy', hairColor: 'darkBrown', expression: 'happy', clothes: 'plain', shirt: '#a0607a', extras: ['earrings'] },
  ingrid: { skin: 1, hair: 'bob', hairColor: 'blond', expression: 'calm', clothes: 'collar', shirt: '#b0605a' },
  rafael: { skin: 3, hair: 'curlyShort', hairColor: 'darkBrown', expression: 'grin', beard: 'stubble', clothes: 'plain', shirt: '#5a8f6a' },
  aisha: { skin: 7, hair: 'braids', hairColor: 'black', expression: 'happy', clothes: 'plain', shirt: '#a0784a', extras: ['hoops'] },
  mateo: { skin: 3, hair: 'messy', hairColor: 'brown', expression: 'happy', clothes: 'hoodie', shirt: '#5a7aa8' },
  oliver: { skin: 1, hair: 'slicked', hairColor: 'lightBrown', expression: 'smirk', clothes: 'collar', shirt: '#6a7fa0' },
  nadia: { skin: 2, hair: 'long', hairColor: 'darkBrown', expression: 'calm', clothes: 'plain', shirt: '#9a5a7a', extras: ['earrings'] },
  tomas: { skin: 4, hair: 'short', hairColor: 'black', expression: 'happy', beard: 'shortBeard', clothes: 'plain', shirt: '#a0704a' },
  leila: { skin: 3, hair: 'longBangs', hairColor: 'darkBrown', expression: 'smirk', clothes: 'plain', shirt: '#5a9a8a', extras: ['earrings'] },
  kenji: { skin: 2, hair: 'sidePart', hairColor: 'black', expression: 'calm', clothes: 'collar', shirt: '#7a6aa8', extras: ['squareGlasses'] },
  felix: { skin: 1, hair: 'swept', hairColor: 'blond', expression: 'smirk', clothes: 'plain', shirt: '#8a5a9a' },
  isabel: { skin: 4, hair: 'curlyLong', hairColor: 'darkBrown', expression: 'grin', clothes: 'plain', shirt: '#c08a3a', extras: ['earrings'] },
  elena: { skin: 2, hair: 'ponytail', hairColor: 'brown', expression: 'happy', clothes: 'collar', shirt: '#4a7a9a' },
  tariq: { skin: 4, hair: 'short', hairColor: 'black', expression: 'calm', beard: 'beard', clothes: 'collar', shirt: '#6a8a4a' },
  hugo: { skin: 1, hair: 'curlyShort', hairColor: 'brown', expression: 'happy', clothes: 'sweater', shirt: '#7a6a4a', extras: ['glasses'] },
  amaru: { skin: 5, hair: 'short', hairColor: 'black', expression: 'happy', clothes: 'plain', shirt: '#a0503a', extras: ['scarf:e0b040'] },
  eleni: { skin: 3, hair: 'longWavy', hairColor: 'black', expression: 'happy', clothes: 'plain', shirt: '#4a6aa0', extras: ['earrings'] },
  bilal: { skin: 5, hair: 'swept', hairColor: 'black', expression: 'calm', beard: 'shortBeard', clothes: 'collar', shirt: '#3a8a5a' },
  nurlan: { skin: 3, hair: 'buzz', hairColor: 'black', expression: 'calm', clothes: 'sweater', shirt: '#3a8ab0' },
  putri: { skin: 4, hair: 'hijab', scarf: '#d07a8a', expression: 'happy', clothes: 'plain', shirt: '#b04a4a', browColor: 'black' },
  kalev: { skin: 1, hair: 'buzz', hairColor: 'blond', expression: 'calm', beard: 'stubble', clothes: 'plain', shirt: '#4a6a8a' },
  santiago: { skin: 3, hair: 'slicked', hairColor: 'darkBrown', expression: 'smirk', beard: 'stubble', clothes: 'collar', shirt: '#6a9ac0' },
}

const SPECIAL = { robot, angel, demon }

// Clothing colours to switch to when someone's clothes are too close to their background.
const CLOTHES_COLORS = ['#26324a', '#f1ede4', '#2f5d45', '#7d2a36', '#d9a441', '#55595f', '#3a74b3', '#a9572f', '#5e4687', '#1e1e1e']

// How different two colours look (0 = the same; about 440 = black against white).
function colorDistance(a, b) {
  const n = (hex) => parseInt(hex.slice(1), 16)
  const [x, y] = [n(a), n(b)]
  const dr = (x >> 16) - (y >> 16)
  const dg = ((x >> 8) & 255) - ((y >> 8) & 255)
  const db = (x & 255) - (y & 255)
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

// `color`, unless it is too close to the background: then one of CLOTHES_COLORS that stands
// out against it (picked by the person's id, so different people get different colours).
function standOut(color, background, id) {
  if (!color || !background || colorDistance(color, background) >= 120) return color
  const options = CLOTHES_COLORS.filter((option) => colorDistance(option, background) >= 130)
  const seed = [...id].reduce((hash, letter) => (hash * 31 + letter.charCodeAt(0)) % 9973, 7)
  return options[seed % options.length]
}

// The portrait for a bot, as an <svg>, or null if it has none (like the player).
// `background` is the colour of the circle behind it: clothes (and headscarves) are never
// drawn in a colour too close to it. People are shown a little closer up than they are
// drawn, so their faces fill the circle.
export function portraitFor(id, background) {
  let parts = null
  if (SPECIAL[id]) {
    parts = SPECIAL[id]()
  } else if (LOOKS[id]) {
    const look = LOOKS[id]
    const contrasted = { ...look, shirt: standOut(look.shirt, background, id), scarf: standOut(look.scarf, background, id) }
    parts = [closeUp(person(contrasted))]
  }
  return parts ? framed(parts, id) : null
}

// A person shown a little closer up than drawn, so the face fills the circle.
const closeUp = (parts) =>
  h('g', { transform: 'translate(50 60) scale(1.2) translate(-50 -60)' }, ...parts.map((part, i) => cloneElement(part, { key: i })))

// The finished <svg>: the parts, cut to a circle.
function framed(parts, id) {
  const clip = `portrait-clip-${id}`
  return h(
    'svg',
    { viewBox: '0 0 100 100', width: '100%', height: '100%', className: 'portrait', 'aria-hidden': true },
    h('defs', null, h('clipPath', { id: clip }, h('circle', { cx: 50, cy: 50, r: 50 }))),
    h('g', { clipPath: `url(#${clip})` }, ...parts.map((part, i) => cloneElement(part, { key: i }))),
  )
}

// ---------- Players' own characters ----------
// Players build their character in the character creator (CharacterCreator.jsx) from the
// same parts as the bots. It is saved with their profile as a small object like
// { skin: 3, hair: 'long', hairColor: 'brown', beard: 'none', expression: 'happy',
//   glasses: 'none', extras: ['earrings'], clothes: 'hoodie', shirt: '#3a74b3', scarf: '#2c8c8c' }.

// Everything a player can pick, in the order the creator shows it.
export const CREATOR_OPTIONS = {
  skin: Object.keys(SKIN).map(Number),
  hair: [
    ['short', 'Short'],
    ['buzz', 'Buzz cut'],
    ['sidePart', 'Side part'],
    ['swept', 'Swept'],
    ['slicked', 'Slicked back'],
    ['messy', 'Spiky'],
    ['curlyShort', 'Short curls'],
    ['balding', 'Bald top'],
    ['bald', 'Bald'],
    ['pixie', 'Pixie'],
    ['bob', 'Bob'],
    ['long', 'Long'],
    ['longBangs', 'Long with bangs'],
    ['longWavy', 'Long and wavy'],
    ['curlyLong', 'Long curls'],
    ['afro', 'Afro'],
    ['bun', 'Bun'],
    ['ponytail', 'Ponytail'],
    ['braids', 'Braids'],
    ['hijab', 'Headscarf'],
  ],
  hairColor: Object.keys(HAIR),
  beard: [
    ['none', 'None'],
    ['stubble', 'Stubble'],
    ['shortBeard', 'Short beard'],
    ['beard', 'Full beard'],
    ['goatee', 'Goatee'],
    ['mustache', 'Mustache'],
  ],
  expression: [
    ['happy', 'Happy'],
    ['grin', 'Grin'],
    ['smirk', 'Smirk'],
    ['calm', 'Calm'],
    ['stern', 'Serious'],
  ],
  glasses: [
    ['none', 'None'],
    ['glasses', 'Round'],
    ['squareGlasses', 'Square'],
  ],
  extras: [
    ['earrings', 'Earrings'],
    ['hoops', 'Hoops'],
    ['freckles', 'Freckles'],
    ['blush', 'Rosy cheeks'],
    ['headset', 'Headset'],
    ['flatCap', 'Cap'],
    ['flower', 'Flower'],
  ],
  clothes: [
    ['plain', 'T-shirt'],
    ['collar', 'Shirt'],
    ['sweater', 'Sweater'],
    ['hoodie', 'Hoodie'],
    ['suit', 'Suit'],
  ],
  // Clothes and headscarf colours.
  colors: ['#d64545', '#e07b39', '#d9a441', '#43a047', '#2f5d45', '#2c8c8c', '#3a74b3', '#26324a', '#5e4687', '#c2549c', '#7d2a36', '#a9572f', '#55595f', '#f1ede4', '#1e1e1e'],
}

const DEFAULT_CHARACTER = {
  skin: 3,
  hair: 'short',
  hairColor: 'brown',
  beard: 'none',
  expression: 'happy',
  glasses: 'none',
  extras: [],
  clothes: 'hoodie',
  shirt: '#3a74b3',
  scarf: '#2c8c8c',
}

const ids = (list) => list.map((option) => (Array.isArray(option) ? option[0] : option))
const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback)

// A saved character, with anything unknown replaced by the default: characters come from
// the database, so only values from CREATOR_OPTIONS are ever drawn.
export function cleanCharacter(saved) {
  const c = saved && typeof saved === 'object' ? saved : {}
  const extras = Array.isArray(c.extras) ? c.extras : []
  return {
    skin: pick(c.skin, CREATOR_OPTIONS.skin, DEFAULT_CHARACTER.skin),
    hair: pick(c.hair, ids(CREATOR_OPTIONS.hair), DEFAULT_CHARACTER.hair),
    hairColor: pick(c.hairColor, CREATOR_OPTIONS.hairColor, DEFAULT_CHARACTER.hairColor),
    beard: pick(c.beard, ids(CREATOR_OPTIONS.beard), 'none'),
    expression: pick(c.expression, ids(CREATOR_OPTIONS.expression), 'happy'),
    glasses: pick(c.glasses, ids(CREATOR_OPTIONS.glasses), 'none'),
    extras: ids(CREATOR_OPTIONS.extras).filter((extra) => extras.includes(extra)),
    clothes: pick(c.clothes, ids(CREATOR_OPTIONS.clothes), DEFAULT_CHARACTER.clothes),
    shirt: pick(c.shirt, CREATOR_OPTIONS.colors, DEFAULT_CHARACTER.shirt),
    scarf: pick(c.scarf, CREATOR_OPTIONS.colors, DEFAULT_CHARACTER.scarf),
  }
}

// A random character (the creator's 🎲 button).
export function randomCharacter() {
  const any = (list) => list[Math.floor(Math.random() * list.length)]
  return cleanCharacter({
    skin: any(CREATOR_OPTIONS.skin),
    hair: any(ids(CREATOR_OPTIONS.hair)),
    hairColor: any(CREATOR_OPTIONS.hairColor),
    beard: Math.random() < 0.6 ? 'none' : any(ids(CREATOR_OPTIONS.beard)),
    expression: any(ids(CREATOR_OPTIONS.expression)),
    glasses: Math.random() < 0.7 ? 'none' : any(ids(CREATOR_OPTIONS.glasses)),
    extras: ids(CREATOR_OPTIONS.extras).filter(() => Math.random() < 0.15),
    clothes: any(ids(CREATOR_OPTIONS.clothes)),
    shirt: any(CREATOR_OPTIONS.colors),
    scarf: any(CREATOR_OPTIONS.colors),
  })
}

// The portrait of a player's character (see cleanCharacter), as an <svg>.
export function characterPortrait(character, id = 'you') {
  const c = cleanCharacter(character)
  const look = {
    ...c,
    browColor: c.hairColor,
    extras: [...(c.glasses === 'none' ? [] : [c.glasses]), ...c.extras],
  }
  return framed([closeUp(person(look))], id)
}

// The skin tones and hair colours, for the creator's colour buttons.
export { SKIN as SKIN_TONES, HAIR as HAIR_COLORS }
