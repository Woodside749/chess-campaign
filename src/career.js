// The events on the player's career screen, in the order they are played.
// - bot: the opponent (an id from bots.js).
// - lesson: a scripted lesson from lessons.js, played before the game carries on normally.
// - timed: whether the game has clocks.
// - color: the player's colour ('w' or 'b').

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
]
