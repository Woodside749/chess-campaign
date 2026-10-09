// Bot characters from the Chess School. They are listed in the menu in this order.
//
// How strength works:
// - skillLevel: Stockfish's own weakening setting, 0 (weakest) to 20 (full strength).
// - depth: how many moves ahead Stockfish looks. Lower is weaker and faster.
// - blunderChance: chance (0 to 1) of playing a random legal move instead,
//   because even Skill Level 0 is far stronger than a 400-rated player.
// These numbers are a first guess to tune by playtesting.
//
// flag and color: shown on the bot's avatar in the menu and during the game.
// lines: what the bot says. Each situation has a few options and one is picked at random.

export const BOTS = {
  lukas: {
    id: 'lukas',
    name: 'Lukas Berg',
    country: 'Sweden',
    flag: '🇸🇪',
    color: '#5b8bd0',
    rating: 400,
    bio: 'Nervous beginner, hangs pieces.',
    skillLevel: 0,
    depth: 1,
    blunderChance: 0.2,
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
  mei: {
    id: 'mei',
    name: 'Mei Tanaka',
    country: 'Japan',
    flag: '🇯🇵',
    color: '#c75b7a',
    rating: 500,
    bio: 'Solid and careful, trades when unsure.',
    skillLevel: 0,
    depth: 1,
    blunderChance: 0.15,
    lines: {
      start: [
        "Let's have a calm, careful game.",
        'I always check every capture twice. Well, I try to.',
      ],
      playerCaptures: [
        'Hmm. I should have seen that.',
        "That's fine. I'll stay calm and trade down.",
      ],
      playerChecks: [
        'A check. Let me think about this carefully.',
        'No rush. My king will find a safe square.',
      ],
      botCaptures: [
        'A fair trade, I think.',
        'Thank you, I will take that.',
      ],
      botChecks: [
        "Check. Please don't take it personally.",
        'Check. Your king looks a little lonely.',
      ],
      botWins: [
        'Slow and steady. Thank you for the game.',
        'Patience pays off. Good game!',
      ],
      playerWins: [
        'Well played. I will study this game tonight.',
        'You were sharper today. Congratulations.',
      ],
      draw: [
        'A draw is a fair result. Good game.',
        'Balanced to the end. I like that.',
      ],
    },
  },
  diego: {
    id: 'diego',
    name: 'Diego Alvarez',
    country: 'Mexico',
    flag: '🇲🇽',
    color: '#e0803a',
    rating: 550,
    bio: 'Attacks early, often too early.',
    skillLevel: 0,
    depth: 1,
    blunderChance: 0.125,
    lines: {
      start: [
        "¡Vamos! I'm going straight for your king!",
        'Defence is boring. Attack, attack, attack!',
      ],
      playerCaptures: [
        "Pfff, I didn't need that piece anyway!",
        "That's called a sacrifice. On purpose. Probably.",
      ],
      playerChecks: [
        "Oh, so you can attack too? Let's see!",
        "My king is fine! He's... mostly fine.",
      ],
      botCaptures: [
        '¡Olé! Mine now!',
        'Did you forget about that one?',
      ],
      botChecks: [
        'CHECK! Run, little king, run!',
        "Check! And there's more coming!",
      ],
      botWins: [
        '¡Victoria! Attacking chess always wins!',
        'Boom! Nobody survives my attack!',
      ],
      playerWins: [
        'Okay, okay... maybe I attacked a little too early.',
        'Next time I attack even faster!',
      ],
      draw: [
        'A draw? I had so many attacks left!',
        'Hmm, not the fireworks I wanted.',
      ],
    },
  },
}

export function pickLine(bot, situation) {
  const options = bot.lines[situation]
  return options[Math.floor(Math.random() * options.length)]
}
