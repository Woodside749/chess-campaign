// Bot characters. For now only Lukas, the first opponent in the Chess School.
//
// How strength works:
// - skillLevel: Stockfish's own weakening setting, 0 (weakest) to 20 (full strength).
// - depth: how many moves ahead Stockfish looks. Lower is weaker and faster.
// - blunderChance: chance (0 to 1) of playing a random legal move instead,
//   because even Skill Level 0 is far stronger than a 400-rated player.
// These numbers are a first guess to tune by playtesting.

export const BOTS = {
  lukas: {
    id: 'lukas',
    name: 'Lukas Berg',
    country: 'Sweden',
    rating: 400,
    bio: 'Nervous beginner, hangs pieces.',
    greeting: "H-hi! I've only just learned how the knight moves...",
    skillLevel: 0,
    depth: 1,
    blunderChance: 0.4,
  },
}
