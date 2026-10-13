// The events on the player's career screen, in the order they are played.
//
// A lesson or match:
// - bot: the opponent (an id from bots.js).
// - lesson: a scripted lesson from lessons.js, played before the game carries on normally.
// - timed: whether the game has clocks.
// - color: the player's colour ('w' or 'b').
//
// Every event also has:
// - section: where it is shown on the home screen ('school', 'leagues', 'championship'
//   or 'advanced').
// - requires: (optional) what must be won first: a whole event, like
//   { event: 'school-tournament' }, or a number of leagues, like { leagues: 4 }.
// - comingSoon: (optional) a placeholder for an event that isn't built yet.
// - variant: (optional) a chess variant, like 'fog' for Fog of War.
//
// A tournament (type: 'tournament') is a knockout bracket:
// - minutes: the clock for each game.
// - increment: (optional) seconds added to a player's clock after each of their moves.
// - championText: shown when the player wins the whole tournament.
// - bracket: the first-round pairings, top to bottom. 'you' is the player. Neighbouring
//   matches meet in the next round, so put the player where their opponents will come
//   from. Varying where the player starts makes tournaments feel less scripted.
// - rounds: the player's matches: the round's name, the opponent and the player's colour,
//   and optionally a `variant` for just that round (otherwise the event's variant).
// - ranking: decides matches between other players: whoever is listed first wins.
//   It is set up so the player meets the opponents listed in `rounds`.
// - classmates: players who only appear in the bracket and are never played.
//
// A puzzle league (type: 'trials') is a series of puzzle trials instead, see the
// Puzzle Trials event below.

export const EVENTS = [
  {
    id: 'learn',
    section: 'school',
    title: 'Learn how to play chess',
    place: 'Chess School',
    description: 'Coach Amara shows you how every piece moves, then plays a relaxed game with you. No clock.',
    bot: 'amara',
    lesson: 'basics',
    timed: false,
    color: 'w',
  },
  {
    id: 'school-tournament',
    section: 'school',
    type: 'tournament',
    title: 'School Tournament',
    place: 'Chess School',
    description: 'An 8-player knockout against your classmates. Win three matches to become school champion.',
    timed: true,
    minutes: 10,
    championText: 'You are the school champion!',
    bracket: [
      ['mei', 'diego'],
      ['lukas', 'you'],
      ['priya', 'elif'],
      ['oskar', 'jonas'],
    ],
    rounds: [
      { name: 'Round 1', opponent: 'lukas', color: 'w' },
      { name: 'Semi-final', opponent: 'diego', color: 'b' },
      { name: 'Final', opponent: 'jonas', color: 'w' },
    ],
    ranking: ['jonas', 'diego', 'priya', 'mei', 'oskar', 'elif', 'lukas'],
    classmates: {
      oskar: { id: 'oskar', name: 'Oskar Lind', country: 'Norway', flag: '🇳🇴', color: '#7a8a5a' },
      elif: { id: 'elif', name: 'Elif Yılmaz', country: 'Turkey', flag: '🇹🇷', color: '#a0607a' },
    },
  },

  // The Amateur leagues: open in any order once the School Tournament is won.
  {
    id: 'fog-cup',
    section: 'leagues',
    type: 'tournament',
    variant: 'fog',
    icon: '🌫️',
    title: 'Fog of War Cup',
    place: 'Amateur League',
    description: 'You only see the squares your pieces can reach. Otherwise normal chess rules apply.',
    requires: { event: 'school-tournament' },
    timed: true,
    minutes: 10,
    championText: 'You won the Fog of War Cup!',
    bracket: [
      ['fatima', 'sofia'],
      ['jonas', 'ana'],
      ['mei', 'liam'],
      ['priya', 'you'],
    ],
    rounds: [
      { name: 'Round 1', opponent: 'priya', color: 'w' },
      { name: 'Semi-final', opponent: 'liam', color: 'b' },
      { name: 'Final', opponent: 'ana', color: 'w' },
    ],
    ranking: ['ana', 'liam', 'sofia', 'jonas', 'fatima', 'mei', 'priya'],
    classmates: {},
  },
  {
    id: 'blitz-league',
    section: 'leagues',
    type: 'tournament',
    icon: '⚡',
    title: 'Blitz League',
    place: 'Amateur League',
    description: 'Fast 3-minute games, plus 1 second per move. Think quickly or lose on time.',
    requires: { event: 'school-tournament' },
    timed: true,
    minutes: 3,
    increment: 1,
    championText: 'You won the Blitz League!',
    bracket: [
      ['sofia', 'fatima'],
      ['mei', 'ana'],
      ['you', 'diego'],
      ['liam', 'kwame'],
    ],
    rounds: [
      { name: 'Round 1', opponent: 'diego', color: 'b' },
      { name: 'Semi-final', opponent: 'liam', color: 'w' },
      { name: 'Final', opponent: 'ana', color: 'b' },
    ],
    ranking: ['ana', 'liam', 'sofia', 'kwame', 'fatima', 'jonas', 'mei', 'diego'],
    classmates: {},
  },
  {
    id: 'fairy-cup',
    section: 'leagues',
    type: 'tournament',
    icon: '🧚',
    title: 'Fairy Chess Cup',
    place: 'Amateur League',
    description: 'Every round brings a new piece: the Archbishop, the Chancellor and the Amazon.',
    requires: { event: 'school-tournament' },
    timed: true,
    minutes: 10,
    championText: 'You won the Fairy Chess Cup!',
    bracket: [
      ['mei', 'you'],
      ['jonas', 'fatima'],
      ['kwame', 'diego'],
      ['priya', 'liam'],
    ],
    // Each round is a different fairy variant (see fairy/variants.js).
    rounds: [
      { name: 'Round 1', opponent: 'mei', color: 'w', variant: 'archchess' },
      { name: 'Semi-final', opponent: 'fatima', color: 'b', variant: 'chancellorchess' },
      { name: 'Final', opponent: 'kwame', color: 'w', variant: 'amazonchess' },
    ],
    ranking: ['kwame', 'fatima', 'liam', 'jonas', 'priya', 'diego', 'mei'],
    classmates: {},
  },
  {
    id: 'fischer-random-open',
    section: 'leagues',
    type: 'tournament',
    variant: 'chess960',
    icon: '🎲',
    title: 'Fischer Random Open',
    place: 'Amateur League',
    description: 'The back-row pieces start in a shuffled order, so no opening theory helps.',
    requires: { event: 'school-tournament' },
    timed: true,
    minutes: 10,
    championText: 'You won the Fischer Random Open!',
    bracket: [
      ['sofia', 'mei'],
      ['you', 'jonas'],
      ['liam', 'ana'],
      ['fatima', 'kwame'],
    ],
    rounds: [
      { name: 'Round 1', opponent: 'jonas', color: 'w' },
      { name: 'Semi-final', opponent: 'sofia', color: 'b' },
      { name: 'Final', opponent: 'ana', color: 'w' },
    ],
    ranking: ['ana', 'sofia', 'kwame', 'liam', 'fatima', 'mei', 'jonas'],
    classmates: {},
  },
  {
    id: 'puzzle-trials',
    section: 'leagues',
    type: 'trials',
    icon: '🧩',
    title: 'Puzzle Trials',
    place: 'Amateur League',
    description: 'Three puzzle trials, from easy to hard. Solve 8 of 10 to pass each one.',
    requires: { event: 'school-tournament' },
    championText: 'You passed every Puzzle Trial!',
    // `band` is the difficulty group in src/puzzles/puzzles.json (see scripts/pick-puzzles.py).
    rounds: [
      { title: 'Easy trial', band: 'easy', ratings: '600–800', count: 10, needed: 8 },
      { title: 'Medium trial', band: 'medium', ratings: '800–1100', count: 10, needed: 8 },
      { title: 'Hard trial', band: 'hard', ratings: '1100–1400', count: 10, needed: 8 },
    ],
  },
  {
    id: 'king-of-the-hill',
    section: 'leagues',
    type: 'tournament',
    variant: 'kingofthehill',
    icon: '⛰️',
    title: 'King of the Hill',
    place: 'Amateur League',
    description: 'Win by checkmate, or by walking your king to one of the four centre squares.',
    requires: { event: 'school-tournament' },
    timed: true,
    minutes: 10,
    championText: 'You are the King of the Hill!',
    bracket: [
      ['kwame', 'mei'],
      ['jonas', 'liam'],
      ['diego', 'you'],
      ['fatima', 'sofia'],
    ],
    rounds: [
      { name: 'Round 1', opponent: 'diego', color: 'b' },
      { name: 'Semi-final', opponent: 'fatima', color: 'w' },
      { name: 'Final', opponent: 'kwame', color: 'b' },
    ],
    ranking: ['kwame', 'fatima', 'liam', 'jonas', 'sofia', 'mei', 'diego'],
    classmates: {},
  },

  // The Amateur tier's championship: open once 4 of the 6 leagues are won (later this
  // could become a number of stars, as in the design doc). Winning it opens the Advanced tier.
  {
    id: 'amateur-super',
    section: 'championship',
    type: 'tournament',
    title: 'Amateur Super Tournament',
    place: 'Amateur Championship',
    description: 'A 16-player knockout with the best amateurs. Win four matches, and the final is against the champion, Viktor.',
    requires: { leagues: 4 },
    timed: true,
    minutes: 10,
    championText: 'You are the Amateur Super Champion! The Advanced tier is open.',
    bracket: [
      ['ana', 'lukas'],
      ['liam', 'rafael'],
      ['sofia', 'you'],
      ['kwame', 'ingrid'],
      ['viktor', 'mei'],
      ['jonas', 'aisha'],
      ['fatima', 'mateo'],
      ['priya', 'diego'],
    ],
    rounds: [
      { name: 'Round of 16', opponent: 'sofia', color: 'w' },
      { name: 'Quarter-final', opponent: 'kwame', color: 'b' },
      { name: 'Semi-final', opponent: 'ana', color: 'w' },
      { name: 'Final', opponent: 'viktor', color: 'b' },
    ],
    ranking: ['viktor', 'ana', 'kwame', 'sofia', 'fatima', 'liam', 'jonas', 'priya', 'diego', 'mei', 'ingrid', 'rafael', 'aisha', 'mateo', 'lukas'],
    // Visiting players who fill the 16 places. They only appear in the bracket.
    classmates: {
      ingrid: { id: 'ingrid', name: 'Ingrid Holm', country: 'Denmark', flag: '🇩🇰', color: '#b0605a' },
      rafael: { id: 'rafael', name: 'Rafael Costa', country: 'Portugal', flag: '🇵🇹', color: '#5a8f6a' },
      aisha: { id: 'aisha', name: 'Aisha Bello', country: 'Kenya', flag: '🇰🇪', color: '#a0784a' },
      mateo: { id: 'mateo', name: 'Mateo Ruiz', country: 'Argentina', flag: '🇦🇷', color: '#5a7aa8' },
    },
  },

  // The next tier, not built yet.
  {
    id: 'pawn-race',
    section: 'advanced',
    type: 'tournament',
    variant: 'pawnrace',
    icon: '🏁',
    title: 'Pawn Race',
    place: 'Advanced League',
    description: 'Normal chess, but the first pawn to reach the far side wins the game.',
    requires: { event: 'amateur-super' },
    timed: true,
    minutes: 10,
    championText: 'You won the Pawn Race!',
    bracket: [
      ['ivan', 'lucia'],
      ['erik', 'carlos'],
      ['jake', 'meilin'],
      ['zofia', 'you'],
    ],
    rounds: [
      { name: 'Round 1', opponent: 'zofia', color: 'w' },
      { name: 'Semi-final', opponent: 'meilin', color: 'b' },
      { name: 'Final', opponent: 'lucia', color: 'w' },
    ],
    ranking: ['lucia', 'meilin', 'erik', 'ivan', 'jake', 'carlos', 'zofia'],
    classmates: {},
  },
  {
    id: 'atomic-cup',
    section: 'advanced',
    type: 'tournament',
    variant: 'atomic',
    icon: '💥',
    title: 'Atomic Cup',
    place: 'Advanced League',
    description: 'Every capture explodes, blowing up the pieces around it. Blow up the enemy king to win.',
    requires: { event: 'amateur-super' },
    timed: true,
    minutes: 10,
    championText: 'You are the Atomic champion!',
    bracket: [
      ['you', 'carlos'],
      ['jake', 'zofia'],
      ['ivan', 'meilin'],
      ['lucia', 'erik'],
    ],
    rounds: [
      { name: 'Round 1', opponent: 'carlos', color: 'w' },
      { name: 'Semi-final', opponent: 'jake', color: 'b' },
      { name: 'Final', opponent: 'ivan', color: 'w' },
    ],
    ranking: ['ivan', 'jake', 'lucia', 'erik', 'meilin', 'zofia', 'carlos'],
    classmates: {},
  },
  {
    id: 'horde-cup',
    section: 'advanced',
    type: 'tournament',
    variant: 'horde',
    icon: '🐜',
    title: 'Horde Cup',
    place: 'Advanced League',
    description: 'White is an army of 36 pawns. Black has normal pieces and must capture every last pawn.',
    requires: { event: 'amateur-super' },
    timed: true,
    minutes: 10,
    championText: 'You beat the Horde!',
    bracket: [
      ['viktor', 'zofia'],
      ['ana', 'you'],
      ['erik', 'carlos'],
      ['lucia', 'ivan'],
    ],
    rounds: [
      { name: 'Round 1', opponent: 'ana', color: 'b' },
      { name: 'Semi-final', opponent: 'viktor', color: 'w' },
      { name: 'Final', opponent: 'erik', color: 'b' },
    ],
    ranking: ['erik', 'viktor', 'ivan', 'lucia', 'carlos', 'zofia', 'ana'],
    classmates: {},
  },
  {
    id: 'bullet-dash',
    section: 'advanced',
    type: 'tournament',
    icon: '🚀',
    title: 'Bullet Dash',
    place: 'Advanced League',
    description: 'One minute on the clock, plus 1 second per move. Think fast and move faster!',
    requires: { event: 'amateur-super' },
    timed: true,
    minutes: 1,
    increment: 1,
    championText: 'You won the Bullet Dash!',
    bracket: [
      ['lucia', 'zofia'],
      ['erik', 'meilin'],
      ['you', 'carlos'],
      ['ivan', 'jake'],
    ],
    rounds: [
      { name: 'Round 1', opponent: 'carlos', color: 'w' },
      { name: 'Semi-final', opponent: 'jake', color: 'b' },
      { name: 'Final', opponent: 'erik', color: 'w' },
    ],
    ranking: ['erik', 'jake', 'lucia', 'ivan', 'meilin', 'zofia', 'carlos'],
    classmates: {},
  },
  {
    id: 'simul',
    section: 'advanced',
    type: 'simul',
    icon: '🎭',
    title: 'Simul',
    place: 'Advanced League',
    description: 'Play three opponents on three boards at the same time. Score 2 of 3 points to pass each simul.',
    requires: { event: 'amateur-super' },
    championText: 'You beat all three simuls!',
    // Each simul is one easy, one medium and one hard round's worth of opponents at once.
    rounds: [
      { title: 'Easy simul', opponents: ['ana', 'carlos', 'zofia'], needed: 2 },
      { title: 'Medium simul', opponents: ['viktor', 'jake', 'meilin'], needed: 2 },
      { title: 'Hard simul', opponents: ['ivan', 'lucia', 'erik'], needed: 2 },
    ],
  },
  {
    id: 'chaos-chess',
    section: 'advanced',
    comingSoon: true,
    icon: '🎲',
    title: 'Chaos Chess',
    place: 'Advanced League',
    description: 'Every turn brings a random new rule, for you and for the bot.',
    requires: { event: 'amateur-super' },
  },
]

// Whether an event's requirement is met. `roundsWonIn(id)` tells how many rounds of an
// event the player has won.
export function isUnlocked(event, roundsWonIn) {
  const needs = event.requires
  if (!needs) return true
  const wonWhole = (other) => other.rounds && roundsWonIn(other.id) >= other.rounds.length
  if (needs.leagues) return leaguesWon(roundsWonIn) >= needs.leagues
  return wonWhole(EVENTS.find((other) => other.id === needs.event))
}

// How many Amateur leagues the player has won completely.
export function leaguesWon(roundsWonIn) {
  return EVENTS.filter((event) => event.section === 'leagues' && event.rounds && roundsWonIn(event.id) >= event.rounds.length).length
}
