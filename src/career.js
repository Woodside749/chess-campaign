// The events on the player's career screen, in the order they are played.
//
// A lesson or match:
// - bot: the opponent (an id from bots.js).
// - lesson: a scripted lesson from lessons.js, played before the game carries on normally.
// - timed: whether the game has clocks.
// - color: the player's colour ('w' or 'b').
//
// A tournament (type: 'tournament') is a knockout bracket:
// - bracket: the first-round pairings, top to bottom. 'you' is the player.
// - rounds: the player's matches: the round's name, the opponent and the player's colour.
// - ranking: decides matches between other players: whoever is listed first wins.
//   It is set up so the player meets the opponents listed in `rounds`.
// - classmates: players who only appear in the bracket and are never played.

export const EVENTS = [
  {
    id: 'learn',
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
    type: 'tournament',
    title: 'School Tournament',
    place: 'Chess School',
    description: 'An 8-player knockout against your classmates. Win three matches to become school champion.',
    timed: true,
    bracket: [
      ['you', 'lukas'],
      ['mei', 'diego'],
      ['jonas', 'oskar'],
      ['priya', 'elif'],
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
]
