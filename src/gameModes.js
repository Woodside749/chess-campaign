import { FAIRY_VARIANTS } from './fairy/variants.js'

// The game modes menu: every way of playing, against any bot, outside the campaign.
// The time controls come first, then the variants (each with a 10-minute clock unless
// it says otherwise).
//
// Per mode: `id` (also where wins are saved), `icon`, `title`, `text`;
// `variant` for the rules (see Game.jsx), `timed` false for no clock, `minutes` and
// `increment` for the clock, `setups` for a choice of variants (Fairy Chess), and
// `simul` for the simul (three bots at once).
export const GAME_MODES = [
  { id: 'unlimited', icon: 'line:unlimited', title: 'No time', text: 'Normal chess with no clock. Take as long as you like.', timed: false },
  { id: 'rapid', icon: 'line:rapid', title: 'Rapid', text: 'Normal chess, 10 minutes each.', minutes: 10 },
  { id: 'blitz', icon: 'line:blitz', title: 'Blitz', text: 'Normal chess, 3 minutes each plus 1 second per move.', minutes: 3, increment: 1 },
  { id: 'bullet', icon: 'line:bullet', title: 'Bullet', text: 'Normal chess, 1 minute each plus 1 second per move.', minutes: 1, increment: 1 },
  { id: 'fog', icon: 'line:fog', title: 'Fog of War', text: 'You only see the squares your pieces can reach.', variant: 'fog' },
  { id: 'chess960', icon: 'line:chess960', title: 'Fischer Random', text: 'The back-row pieces start in a shuffled order.', variant: 'chess960' },
  {
    id: 'fairy',
    icon: 'line:fairy',
    title: 'Fairy Chess',
    text: 'Fairy pieces like the Archbishop, the Camel and the Cannon. Pick a setup.',
    setups: ['archchess', 'chancellorchess', 'amazonchess', 'leapers', 'eastern', 'royalcourt'],
  },
  { id: 'kingofthehill', icon: 'line:kingofthehill', title: 'King of the Hill', text: 'Checkmate, or walk your king to one of the four centre squares.', variant: 'kingofthehill' },
  { id: 'pawnrace', icon: 'line:pawnrace', title: 'Pawn Race', text: 'The first pawn to reach the far side wins.', variant: 'pawnrace' },
  { id: 'atomic', icon: 'line:atomic', title: 'Atomic', text: 'Every capture explodes. Blow up the enemy king to win.', variant: 'atomic' },
  { id: 'horde', icon: 'line:horde', title: 'Horde', text: 'White is 36 pawns, Black a normal army.', variant: 'horde' },
  { id: 'chaos', icon: 'line:chaos', title: 'Chaos Chess', text: 'Every turn a random rule, for you and for the bot.', variant: 'chaos' },
  { id: 'dice', icon: 'line:dice', title: 'Dice Chess', text: 'Every turn you roll which kind of piece may move.', variant: 'dice' },
  { id: 'antichess', icon: 'line:antichess', title: 'Antichess', text: 'Lose all your pieces to win. Captures are compulsory.', variant: 'antichess' },
  { id: 'crazyhouse', icon: 'line:crazyhouse', title: 'Crazyhouse', text: 'Captured pieces switch sides and can be dropped back.', variant: 'crazyhouse' },
  { id: 'duckchess', icon: 'line:duckchess', title: 'Duck Chess', text: 'After every move you also move the duck. Capture the king to win.', variant: 'duckchess' },
  { id: 'racingkings', icon: 'line:racingkings', title: 'Racing Kings', text: 'No checks: the first king to reach the top row wins.', variant: 'racingkings' },
  { id: 'blindfold', icon: 'line:blindfold', title: 'Blindfold', text: 'The pieces are invisible. Play from memory.', variant: 'blindfold' },
  { id: 'threecheck', icon: 'line:threecheck', title: 'Three-check', text: 'Checkmate, or give check three times.', variant: 'threecheck' },
  { id: 'berolina', icon: 'line:berolina', title: 'Berolina', text: 'Pawns move diagonally and capture straight ahead.', variant: 'berolina' },
  { id: 'simul', icon: 'line:simul', title: 'Simul', text: 'Play 2 to 4 opponents at once, each on their own board.', simul: true },
]

export const modeById = (id) => GAME_MODES.find((mode) => mode.id === id)

// The clocks a player can pick for a mode (minutes each; null = no clock). 10 is the default.
export const TIME_CHOICES = [1, 3, 5, 10, 30, null]
export const DEFAULT_MINUTES = 10

// Modes whose time is the mode itself (No time, Rapid, Blitz, Bullet): no time choice there.
export const fixedTime = (mode) => mode.minutes !== undefined || mode.timed === false

// The clock for a game of `mode` with the picked `minutes`: { timed, minutes, increment }.
export function clockFor(mode, minutes = DEFAULT_MINUTES) {
  if (fixedTime(mode)) return { timed: mode.timed ?? true, minutes: mode.minutes ?? DEFAULT_MINUTES, increment: mode.increment }
  return { timed: minutes !== null, minutes: minutes ?? DEFAULT_MINUTES, increment: 0 }
}

// The settings an invite sends: { mode, variant, timed, minutes, increment, color }.
export function inviteSettings(mode, setup, minutes, color) {
  const clock = clockFor(mode, minutes)
  return {
    mode: mode.id,
    variant: mode.setups ? setup : (mode.variant ?? null),
    timed: clock.timed,
    minutes: clock.minutes,
    increment: clock.increment ?? 0,
    color,
  }
}

// How an invite reads, like "Fairy Chess (Eastern army) · 10 min".
export function describeInvite(settings) {
  const mode = modeById(settings.mode)
  const setup = mode?.setups ? ` (${FAIRY_VARIANTS[settings.variant]?.title ?? settings.variant})` : ''
  const time = !settings.timed ? 'no clock' : `${settings.minutes} min${settings.increment ? ` + ${settings.increment} s` : ''}`
  return `${mode?.title ?? settings.mode}${setup} · ${time}`
}
