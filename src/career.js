// The events on the player's career screen, in the order they are played.
//
// A lesson or match:
// - bot: the opponent (an id from bots.js).
// - lesson: a scripted lesson from lessons.js, played before the game carries on normally.
// - timed: whether the game has clocks.
// - color: the player's colour ('w' or 'b').
//
// Every event also has:
// - section: where it is shown on the home screen ('school' or 'leagues').
// - requires: (optional) what must be won first, like { event: 'school-tournament' }.
// - comingSoon: (optional) a placeholder for an event that isn't built yet.
// - variant: (optional) a chess variant, like 'fog' for Fog of War.
//
// A tournament (type: 'tournament') is a knockout bracket:
// - minutes: the clock for each game.
// - championText: shown when the player wins the whole tournament.
// - bracket: the first-round pairings, top to bottom. 'you' is the player. Neighbouring
//   matches meet in the next round, so put the player where their opponents will come
//   from. Varying where the player starts makes tournaments feel less scripted.
// - rounds: the player's matches: the round's name, the opponent and the player's colour.
// - ranking: decides matches between other players: whoever is listed first wins.
//   It is set up so the player meets the opponents listed in `rounds`.
// - classmates: players who only appear in the bracket and are never played.

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
    description: 'Fast 3-minute games. Think quickly or lose on time.',
    requires: { event: 'school-tournament' },
    timed: true,
    minutes: 3,
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
    id: 'bullet-dash',
    section: 'leagues',
    comingSoon: true,
    icon: '🚀',
    title: 'Bullet Dash',
    place: 'Amateur League',
    description: 'One minute on the clock. Every second counts.',
    requires: { event: 'school-tournament' },
  },
  {
    id: 'fischer-random-open',
    section: 'leagues',
    comingSoon: true,
    icon: '🎲',
    title: 'Fischer Random Open',
    place: 'Amateur League',
    description: 'The back-row pieces start in a shuffled order, so no opening theory helps.',
    requires: { event: 'school-tournament' },
  },
  {
    id: 'puzzle-trials',
    section: 'leagues',
    comingSoon: true,
    icon: '🧩',
    title: 'Puzzle Trials',
    place: 'Amateur League',
    description: 'Solve tactics puzzles against the clock.',
    requires: { event: 'school-tournament' },
  },
  {
    id: 'king-of-the-hill',
    section: 'leagues',
    comingSoon: true,
    icon: '⛰️',
    title: 'King of the Hill',
    place: 'Amateur League',
    description: 'Win by checkmate, or by walking your king to one of the four centre squares.',
    requires: { event: 'school-tournament' },
  },
]

// Whether an event's requirement is met: the required tournament has been won.
export function isUnlocked(event, roundsWonIn) {
  if (!event.requires) return true
  const required = EVENTS.find((other) => other.id === event.requires.event)
  return roundsWonIn(required.id) >= required.rounds.length
}
