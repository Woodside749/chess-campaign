import { BOTS } from './bots.js'
import { buildBracket } from './bracket.js'
import { titleById } from './player.js'

// Sizes of the drawing, in SVG units. The drawing scales to fit its container.
const BOX_W = 150
const BOX_H = 30
const COL_GAP = 44
const COL_W = BOX_W + COL_GAP
const TOP = 34 // room for the column titles
// Column titles, counted from the end: the last round is always the final.
const ROUND_TITLES_FROM_END = ['Final', 'Semi-finals', 'Quarter-finals', 'Round of 16', 'Round of 32']
const columnTitles = (roundCount) => [
  ...Array.from({ length: roundCount }, (_, r) => ROUND_TITLES_FROM_END[roundCount - 1 - r]),
  'Champion',
]

// A knockout bracket drawn as an SVG: one column per round, and a champion box at the end.
// `playerTitle` (optional) is the player's title, like { short: 'M' }, shown before "You".
// Bots with a `chessTitle` get the same badge.
export default function Bracket({ event, roundsWon, playerTitle }) {
  const { rounds, champion } = buildBracket(event, roundsWon)
  const person = (id) => {
    if (id === 'you') return { name: 'You', color: 'var(--accent)', flag: '', title: playerTitle }
    const bot = BOTS[id]
    return bot ? { ...bot, title: titleById(bot.chessTitle) } : event.classmates[id]
  }

  // The vertical centre of every box. First-round boxes are spaced evenly (with a gap
  // between matches); each later box sits halfway between the two boxes it comes from.
  const centres = [rounds[0].flatMap((_, m) => [0, 1].map((i) => TOP + 20 + (m * 2 + i) * 40 + m * 20))]
  for (let r = 1; r <= rounds.length; r++) {
    const previous = centres[r - 1]
    centres.push(previous.filter((_, i) => i % 2 === 0).map((y, i) => (y + previous[i * 2 + 1]) / 2))
  }
  const width = COL_W * rounds.length + BOX_W
  const height = centres[0].at(-1) + BOX_H

  return (
    <svg className="bracket" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${event.title} bracket`}>
      {columnTitles(rounds.length).map((title, r) => (
        <text key={title} className="bracket-title" x={r * COL_W} y={14}>
          {title}
        </text>
      ))}

      {/* Lines from each match to the box of its winner in the next column. */}
      {rounds.map((matches, r) =>
        matches.map((match, m) => {
          const [ya, yb] = [centres[r][m * 2], centres[r][m * 2 + 1]]
          const x = r * COL_W + BOX_W
          const middle = x + COL_GAP / 2
          return (
            <path
              key={`line-${r}-${m}`}
              className={match.winner ? 'bracket-line decided' : 'bracket-line'}
              d={`M ${x} ${ya} H ${middle} M ${x} ${yb} H ${middle} M ${middle} ${ya} V ${yb} M ${middle} ${centres[r + 1][m]} H ${x + COL_GAP}`}
            />
          )
        }),
      )}

      {rounds.map((matches, r) =>
        matches.flatMap((match, m) =>
          match.players.map((id, i) => (
            <PlayerBox
              key={`${r}-${m}-${i}`}
              x={r * COL_W}
              y={centres[r][m * 2 + i]}
              person={id && person(id)}
              isYou={id === 'you'}
              won={match.winner !== null && match.winner === id}
              lost={match.winner !== null && match.winner !== id}
            />
          )),
        ),
      )}

      <PlayerBox
        x={rounds.length * COL_W}
        y={centres[rounds.length][0]}
        person={champion && person(champion)}
        isYou={champion === 'you'}
        won={champion !== null}
        trophy
      />
    </svg>
  )
}

// One player's box: a coloured initial, the name and the flag. Empty (a "?") if not known yet.
function PlayerBox({ x, y, person, isYou, won, lost, trophy }) {
  const top = y - BOX_H / 2
  if (!person) {
    return (
      <g>
        <rect className="bracket-box empty" x={x} y={top} width={BOX_W} height={BOX_H} rx={6} />
        <text className="bracket-unknown" x={x + BOX_W / 2} y={y + 4} textAnchor="middle">
          {trophy ? '🏆' : '?'}
        </text>
      </g>
    )
  }
  const classes = ['bracket-box', isYou && 'you', won && 'won'].filter(Boolean).join(' ')
  return (
    <g opacity={lost ? 0.4 : 1}>
      <rect className={classes} x={x} y={top} width={BOX_W} height={BOX_H} rx={6} />
      <circle cx={x + 15} cy={y} r={10} style={{ fill: person.color }} />
      <text className="bracket-initial" x={x + 15} y={y + 4} textAnchor="middle">
        {person.name[0]}
      </text>
      <text className={won ? 'bracket-name won' : 'bracket-name'} x={x + 31} y={y + 4}>
        {trophy && '🏆 '}
        {person.title && <tspan className="bracket-title-badge">{person.title.short} </tspan>}
        {person.name}
      </text>
      <text className="bracket-flag" x={x + BOX_W - 8} y={y + 5} textAnchor="end">
        {person.flag}
      </text>
    </g>
  )
}
