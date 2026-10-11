// Bot characters from the Amateur tier. They are listed in the menu in this order,
// grouped into the Chess School and the Amateur circuit.
//
// How a bot plays (see botBrain.js):
// - strength: 0 (weakest) to 1 (strongest). Sets how often it blunders, how far it
//   looks ahead and how much worse than the best move it will play (see botStrength.js).
//   Measured with `npm run calibrate`: 0 is about 380, 0.1 about 520, 0.2 about 600,
//   0.3 about 740, 0.4 about 900, 0.5 about 1100, 0.6 about 1260, 0.7 about 1560.
//   We aim for each bot to play at the strength on its rating label.
// - openings: move lists (in chess notation) the bot plays from memory as White (w) and
//   as Black (b), as long as the game follows one of them.
// - style: bonuses (or penalties, if negative) in centipawns (100 = one pawn) for kinds
//   of moves. The traits are described in moveTraits.js.
// - speed: multiplies thinking time. 0.5 thinks half as long, 1.5 takes 50% longer.
// - endgameBoost: (optional) extra strength in endgames, added to `strength`.
//
// flag and color: shown on the bot's avatar.
// lines: what the bot says. Each situation has a few options and one is picked at random.

export const BOTS = {
  amara: {
    id: 'amara',
    name: 'Coach Amara Okafor',
    country: 'Nigeria',
    flag: '🇳🇬',
    color: '#3f9b74',
    rating: 400,
    group: 'school',
    bio: 'Patient teacher, plays by the textbook principles.',
    strength: 0.06,
    speed: 1,
    style: { develop: 40, castle: 50, earlyQueen: -40 },
    lines: {
      start: [
        "Welcome! Take your time, there's no rush when you're learning.",
        'Remember: control the centre, develop your pieces, castle early.',
      ],
      playerCaptures: [
        'Good eye! Always check what is undefended.',
        'Well spotted. That piece had no protection.',
      ],
      playerChecks: [
        'A check! Now I must move my king, block, or capture.',
        "Nice. Checks force a reply, that's what makes them strong.",
      ],
      botCaptures: [
        'Careful! That piece was left unprotected.',
        'Lesson: before you move, ask what your opponent can take.',
      ],
      botChecks: [
        'Check! What are your three ways out?',
        'Check. Move, block or capture. Your choice.',
      ],
      botWins: [
        "Every loss is a lesson. You'll get it next time.",
        "Good effort! You're learning fast.",
      ],
      playerWins: [
        "Wonderful! You're ready for your classmates.",
        "Excellent game. I'm proud of you!",
      ],
      draw: [
        'A draw! Do you know why the game ended?',
        "Neither of us could win. That's chess too.",
      ],
    },
  },
  lukas: {
    id: 'lukas',
    name: 'Lukas Berg',
    country: 'Sweden',
    flag: '🇸🇪',
    color: '#5b8bd0',
    rating: 400,
    group: 'school',
    bio: 'Nervous beginner, hangs pieces.',
    strength: 0.06,
    speed: 1,
    style: { hangs: 150, retreat: 20 },
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
    group: 'school',
    bio: 'Solid and careful, trades when unsure.',
    strength: 0.17,
    speed: 1.1,
    style: { evenTrade: 60, castle: 40, retreat: 25, quiet: 15 },
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
    group: 'school',
    bio: 'Attacks early, often too early.',
    strength: 0.19,
    speed: 0.9,
    style: { check: 60, capture: 25, towardKing: 40, earlyQueen: 50, castle: -30 },
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
  priya: {
    id: 'priya',
    name: 'Priya Nair',
    country: 'India',
    flag: '🇮🇳',
    color: '#8e5bc7',
    rating: 600,
    group: 'school',
    bio: 'Your rival. Tricky and competitive.',
    strength: 0.2,
    speed: 1,
    style: { threat: 50, check: 30, capture: 15 },
    lines: {
      start: [
        "So you're the new one everyone's talking about. Let's see.",
        "I don't lose to beginners. Just so you know.",
      ],
      playerCaptures: [
        'Lucky. Enjoy it while it lasts.',
        'Fine, take it. I have plans.',
      ],
      playerChecks: [
        'Is that supposed to scare me?',
        "Cute check. Doesn't change anything.",
      ],
      botCaptures: [
        "Didn't see that coming, did you?",
        'Thanks for the gift!',
      ],
      botChecks: [
        'Check. Getting nervous yet?',
        "Check! I've been setting that up for ages.",
      ],
      botWins: [
        'Told you. Better luck next time.',
        'Another win for me. Keep practising!',
      ],
      playerWins: [
        "Fine. You won this one. I'll remember it.",
        'Hmph. Rematch. Soon.',
      ],
      draw: [
        'A draw? I was just getting started.',
        "This isn't over.",
      ],
    },
  },
  jonas: {
    id: 'jonas',
    name: 'Jonas Weber',
    country: 'Germany',
    flag: '🇩🇪',
    color: '#6b7a8f',
    rating: 700,
    group: 'circuit',
    bio: 'Slow and solid, likes closed positions.',
    strength: 0.29,
    speed: 1.3,
    style: { lockPawns: 50, quiet: 25, evenTrade: 15, capture: -15 },
    lines: {
      start: [
        "Good day. Let's build a solid position, step by step.",
        'No hurry. Chess is a game of patience.',
      ],
      playerCaptures: [
        'Hm. A small setback. Nothing more.',
        "I'll rebuild. Solid foundations take time.",
      ],
      playerChecks: [
        'A check. My king has seen worse.',
        'I calmly step aside.',
      ],
      botCaptures: [
        'Material is material.',
        'A well-earned gain.',
      ],
      botChecks: [
        'Check. Methodically, as always.',
        'Check. You see, slow moves add up.',
      ],
      botWins: [
        'Slow and steady wins again.',
        'Structure always tells in the end.',
      ],
      playerWins: [
        'Gut gespielt. Well played.',
        'You broke through my wall. Impressive.',
      ],
      draw: [
        'The fortress holds. A fair result.',
        'Locked tight. A draw is logical.',
      ],
    },
  },
  fatima: {
    id: 'fatima',
    name: 'Fatima Haddad',
    country: 'Morocco',
    flag: '🇲🇦',
    color: '#c0504d',
    rating: 800,
    group: 'circuit',
    bio: 'Trap setter, loves cheap tricks.',
    strength: 0.34,
    speed: 1,
    style: { threat: 70, check: 35 },
    lines: {
      start: [
        "Let's play! Just... watch your step.",
        'I have a few surprises for you today.',
      ],
      playerCaptures: [
        'Hmm, you saw that one. Clever.',
        "Oh, you didn't fall for it? Next one, then.",
      ],
      playerChecks: [
        'Oh! Bold. I like bold.',
        'Checks are fine. Traps are better.',
      ],
      botCaptures: [
        'Gotcha! Did you smell the trap?',
        "Hehe. That piece looked so innocent, didn't it?",
      ],
      botChecks: [
        "Check! And look what else I'm attacking...",
        'Check! Surprise!',
      ],
      botWins: [
        'Too many traps, too little time!',
        'The cheap tricks worked again!',
      ],
      playerWins: [
        'You dodged every trick. Respect.',
        "Okay, you're too careful for my tricks.",
      ],
      draw: [
        'A draw? My traps deserved better!',
        'Neither of us fell for anything. Boring!',
      ],
    },
  },
  liam: {
    id: 'liam',
    name: "Liam O'Connor",
    country: 'Ireland',
    flag: '🇮🇪',
    color: '#4c9a52',
    rating: 850,
    group: 'circuit',
    bio: 'Fast blitz hustler, talks a lot.',
    strength: 0.33,
    speed: 0.45,
    style: { capture: 25, check: 25, towardKing: 20 },
    lines: {
      start: [
        "Right so, let's go, let's go, clock's ticking!",
        'Fastest hands in Dublin, me. Try to keep up!',
      ],
      playerCaptures: [
        'Ah sure, I was going to give you that anyway.',
        "Grand, grand, I've loads of pieces.",
      ],
      playerChecks: [
        'Check, is it? No bother.',
        'Whoa, easy there!',
      ],
      botCaptures: [
        'Snap! Too quick for you!',
        "Yoink! Didn't even think about that one.",
      ],
      botChecks: [
        'Check! Bang bang bang!',
        'Check! Feel the pressure yet?',
      ],
      botWins: [
        'Speed kills! Good game, good game.',
        'Told you, fastest hands in Dublin!',
      ],
      playerWins: [
        'Ah, you got me. Fair play to you.',
        'Should have slowed down. Never!',
      ],
      draw: [
        "A draw! Sure, that's grand.",
        'Fair enough, shake hands, next game!',
      ],
    },
  },
  sofia: {
    id: 'sofia',
    name: 'Sofia Rossi',
    country: 'Italy',
    flag: '🇮🇹',
    color: '#2f8f8a',
    rating: 900,
    group: 'circuit',
    bio: 'Opening specialist, always plays the Italian Game.',
    strength: 0.38,
    speed: 1,
    style: { develop: 40, castle: 40 },
    openings: {
      // As White: the Italian Game.
      w: [
        ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3'],
        ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Bc5', 'c3'],
      ],
      // As Black: answers the Italian with the Italian.
      b: [
        ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6'],
        ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6', 'd3', 'd6'],
      ],
    },
    lines: {
      start: [
        "The Italian Game. Always the Italian. It's tradition.",
        'Bishop to c4, the most elegant square on the board.',
      ],
      playerCaptures: [
        "Mamma mia. I didn't plan for that.",
        'Hmm, that was not in my notes.',
      ],
      playerChecks: [
        'A check! Rude, but legal.',
        "Interesting. My books didn't mention that.",
      ],
      botCaptures: [
        'Grazie! Just like in the books.',
        'Perfetto.',
      ],
      botChecks: [
        'Check! Bellissimo.',
        'Check. The classics never fail.',
      ],
      botWins: [
        'The Italian never disappoints!',
        'Theory wins again. Grazie for the game.',
      ],
      playerWins: [
        'Bravo! You out-prepared me.',
        "I'll need a new chapter in my notes.",
      ],
      draw: [
        'A classical draw. Molto elegante.',
        'Balance. Like a good espresso.',
      ],
    },
  },
  kwame: {
    id: 'kwame',
    name: 'Kwame Mensah',
    country: 'Ghana',
    flag: '🇬🇭',
    color: '#b8862f',
    rating: 1000,
    group: 'circuit',
    bio: 'Endgame specialist, plays better the fewer pieces are left.',
    strength: 0.42,
    // In endgames he plays about 250 rating points stronger (see botStrength.js).
    endgameBoost: 0.15,
    speed: 1.2,
    style: { tradeWhenAhead: 70, kingActivity: 50, evenTrade: 20 },
    lines: {
      start: [
        'We will play until the very last pawn.',
        'Trade the pieces off, and the board becomes mine.',
      ],
      playerCaptures: [
        'Fine. The endgame is still far away.',
        'Less material, but I am still here.',
      ],
      playerChecks: [
        'My king is used to walking.',
        'A check. I step aside and keep grinding.',
      ],
      botCaptures: [
        'One step closer to the endgame.',
        "Trade, simplify, win. That's my way.",
      ],
      botChecks: [
        'Check. Slowly, slowly.',
        'Check. The squeeze begins.',
      ],
      botWins: [
        'The endgame always decides.',
        "Patience. That's the secret.",
      ],
      playerWins: [
        'You beat me in the endgame. That is rare. Well done.',
        'I fought to the end. You earned it.',
      ],
      draw: [
        "Even I couldn't squeeze a win out of that.",
        'A hard-fought draw. Respect.',
      ],
    },
  },
  ana: {
    id: 'ana',
    name: 'Ana Silva',
    country: 'Brazil',
    flag: '🇧🇷',
    color: '#d4a017',
    rating: 1100,
    group: 'circuit',
    bio: 'Speed player, dangerous in bullet.',
    strength: 0.51,
    speed: 0.35,
    style: { capture: 20, check: 20 },
    lines: {
      start: [
        "Vamos! I don't like to think too long.",
        "First instinct is usually right. Let's play fast!",
      ],
      playerCaptures: [
        'Oops! Too fast for my own good.',
        'Ah, I moved before I looked.',
      ],
      playerChecks: [
        'Ooh, a check! Quick, quick!',
        'No time to panic!',
      ],
      botCaptures: [
        'Got it! Speed wins!',
        'Fast hands, fast eyes!',
      ],
      botChecks: [
        'Check! Hurry up!',
        'Check! Tick tock!',
      ],
      botWins: [
        'Fast and furious! Boa partida!',
        'Never let the clock rest!',
      ],
      playerWins: [
        "Nossa, you're good! Well played.",
        'Maybe I should slow down... nah!',
      ],
      draw: [
        'A draw? That went fast!',
        'Okay, empate! Again?',
      ],
    },
  },
  viktor: {
    id: 'viktor',
    name: 'Viktor Novak',
    country: 'Czechia',
    flag: '🇨🇿',
    color: '#2d3e75',
    rating: 1300,
    group: 'circuit',
    bio: 'Amateur champion, only plays gambits.',
    strength: 0.61,
    speed: 1,
    style: { towardKing: 40, check: 40, threat: 30 },
    openings: {
      // As White: the King's Gambit, and the Wing Gambit against the Sicilian.
      w: [
        ['e4', 'e5', 'f4'],
        ['e4', 'c5', 'b4'],
      ],
      // As Black: the Latvian Gambit against 1.e4 e5 2.Nf3, and the Englund Gambit against 1.d4.
      b: [
        ['e4', 'e5', 'Nf3', 'f5'],
        ['d4', 'e5'],
      ],
    },
    lines: {
      start: [
        'Pawns are for sacrificing. Shall we begin?',
        'I am the champion. Accept my gambit, if you dare.',
      ],
      playerCaptures: [
        'Take it. Every pawn you eat is time I gain.',
        'Material. How boring of you.',
      ],
      playerChecks: [
        'A check? Cute.',
        'Even champions get checked. Briefly.',
      ],
      botCaptures: [
        'The initiative pays for itself.',
        'Now you see why I sacrificed.',
      ],
      botChecks: [
        'Check. The attack begins.',
        'Check. You should have declined my gambit.',
      ],
      botWins: [
        'That is why I am the champion.',
        'The gambit always wins in the end.',
      ],
      playerWins: [
        'Impressive. Maybe you are ready for the Pro tier.',
        'You refuted my gambit. I respect that.',
      ],
      draw: [
        'A draw against the champion. Not bad.',
        'Even my gambits have limits.',
      ],
    },
  },
}

export function pickLine(bot, situation) {
  const options = bot.lines[situation]
  return options[Math.floor(Math.random() * options.length)]
}
