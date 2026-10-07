// Bot characters. For now only Lukas, the first opponent in the Chess School.
//
// How strength works:
// - skillLevel: Stockfish's own weakening setting, 0 (weakest) to 20 (full strength).
// - depth: how many moves ahead Stockfish looks. Lower is weaker and faster.
// - blunderChance: chance (0 to 1) of playing a random legal move instead,
//   because even Skill Level 0 is far stronger than a 400-rated player.
// These numbers are a first guess to tune by playtesting.
//
// lines: what the bot says. Each situation has a few options and one is picked at random.

export const BOTS = {
  lukas: {
    id: 'lukas',
    name: 'Lukas Berg',
    country: 'Sweden',
    rating: 400,
    bio: 'Nervous beginner, hangs pieces.',
    skillLevel: 0,
    depth: 1,
    blunderChance: 0.4,
    lines: {
      start: [
        "H-hi! I've only just learned how the knight moves...",
        "Okay, pieces to the middle. That's what Coach Amara says, right?",
      ],
      playerCaptures: [
        'Wait, was that piece protected? Oh no...',
        'Not again! I keep leaving things hanging.',
      ],
      playerChecks: [
        'Check?! Um, where can my king go...',
        "Eek! Okay, don't panic, Lukas.",
      ],
      botCaptures: [
        "I took something! That's allowed, right?",
        'Ha! I actually saw that one.',
      ],
      botChecks: [
        "Check! ...I think? Yes, that's check.",
        'Your king is in check! Sorry!',
      ],
      botWins: [
        'I... won? Wait until I tell Coach Amara!',
        "Really? Checkmate? I didn't even plan that.",
      ],
      playerWins: [
        "Good game! You're way better than me.",
        "I'll get you next time. Probably not, but maybe!",
      ],
      draw: [
        "A draw? I'll take it, that's my best result ever!",
        "Phew, at least I didn't lose.",
      ],
    },
  },
}

export function pickLine(bot, situation) {
  const options = bot.lines[situation]
  return options[Math.floor(Math.random() * options.length)]
}
