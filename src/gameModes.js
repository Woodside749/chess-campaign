// The game modes menu: every way of playing, against any bot, outside the campaign.
// The time controls come first, then the variants (each with a 10-minute clock unless
// it says otherwise).
//
// Per mode: `id` (also where wins are saved), `icon`, `title`, `text`;
// `variant` for the rules (see Game.jsx), `timed` false for no clock, `minutes` and
// `increment` for the clock, `setups` for a choice of variants (Fairy Chess), and
// `simul` for the simul (three bots at once).
export const GAME_MODES = [
  { id: 'unlimited', icon: '🕰️', title: 'No time', text: 'Normal chess with no clock. Take as long as you like.', timed: false },
  { id: 'rapid', icon: '⏱️', title: 'Rapid', text: 'Normal chess, 10 minutes each.', minutes: 10 },
  { id: 'blitz', icon: '⚡', title: 'Blitz', text: 'Normal chess, 3 minutes each plus 1 second per move.', minutes: 3, increment: 1 },
  { id: 'bullet', icon: '🚀', title: 'Bullet', text: 'Normal chess, 1 minute each plus 1 second per move.', minutes: 1, increment: 1 },
  { id: 'fog', icon: '🌫️', title: 'Fog of War', text: 'You only see the squares your pieces can reach.', variant: 'fog' },
  { id: 'chess960', icon: '🎲', title: 'Fischer Random', text: 'The back-row pieces start in a shuffled order.', variant: 'chess960' },
  {
    id: 'fairy',
    icon: '🧚',
    title: 'Fairy Chess',
    text: 'Fairy pieces like the Archbishop, the Camel and the Cannon. Pick a setup.',
    setups: ['archchess', 'chancellorchess', 'amazonchess', 'leapers', 'eastern', 'royalcourt'],
  },
  { id: 'kingofthehill', icon: '⛰️', title: 'King of the Hill', text: 'Checkmate, or walk your king to one of the four centre squares.', variant: 'kingofthehill' },
  { id: 'pawnrace', icon: '🏁', title: 'Pawn Race', text: 'The first pawn to reach the far side wins.', variant: 'pawnrace' },
  { id: 'atomic', icon: '💥', title: 'Atomic', text: 'Every capture explodes. Blow up the enemy king to win.', variant: 'atomic' },
  { id: 'horde', icon: '🐜', title: 'Horde', text: 'White is 36 pawns, Black a normal army.', variant: 'horde' },
  { id: 'chaos', icon: '🌪️', title: 'Chaos Chess', text: 'Every turn a random rule, for you and for the bot.', variant: 'chaos' },
  { id: 'dice', icon: '🎲', title: 'Dice Chess', text: 'Every turn you roll which kind of piece may move.', variant: 'dice' },
  { id: 'antichess', icon: '🙃', title: 'Antichess', text: 'Lose all your pieces to win. Captures are compulsory.', variant: 'antichess' },
  { id: 'crazyhouse', icon: '🏠', title: 'Crazyhouse', text: 'Captured pieces switch sides and can be dropped back.', variant: 'crazyhouse' },
  { id: 'duckchess', icon: 'rubber-duck', title: 'Duck Chess', text: 'After every move you also move the duck. Capture the king to win.', variant: 'duckchess' },
  { id: 'racingkings', icon: '🏎️', title: 'Racing Kings', text: 'No checks: the first king to reach the top row wins.', variant: 'racingkings' },
  { id: 'blindfold', icon: '🙈', title: 'Blindfold', text: 'The pieces are invisible. Play from memory.', variant: 'blindfold' },
  { id: 'threecheck', icon: '✔️', title: 'Three-check', text: 'Checkmate, or give check three times.', variant: 'threecheck' },
  { id: 'berolina', icon: '↗️', title: 'Berolina', text: 'Pawns move diagonally and capture straight ahead.', variant: 'berolina' },
  { id: 'simul', icon: '🎭', title: 'Simul', text: 'Play three bots at once, on three boards.', simul: true },
]

export const modeById = (id) => GAME_MODES.find((mode) => mode.id === id)
