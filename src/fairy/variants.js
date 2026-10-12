// The chess variants that run on the rules library (ffish): our fairy chess variants with
// new pieces, Fischer Random, King of the Hill, Pawn Race, Atomic and Horde. The fairy rules are in
// variants.ini, which both ffish and the engine (Fairy-Stockfish) read. Here is what the
// game shows to players.
//
// Per variant: `title`, `icon` and `intro` for the screen; `rules`, the ffish/engine
// variant name if it differs from the key; `noPersonality` if the bots' personality code
// can't read its positions (new pieces, exploded kings, pawns on the first rank); `chess960` for
// Fischer Random; `hill` for squares to highlight; `winText` for a special way to win.
//
// Each fairy piece is drawn as its base piece (`looksLike`) with a small knight badge,
// because all of ours are a normal piece that can also jump like a knight.
// `value` is its worth in pawns, used for the material score.

export const FAIRY_PIECES = {
  a: { name: 'Archbishop', looksLike: 'b', value: 7, moves: 'like a bishop and a knight' },
  c: { name: 'Chancellor', looksLike: 'r', value: 8, moves: 'like a rook and a knight' },
  z: { name: 'Amazon', looksLike: 'q', value: 12, moves: 'like a queen and a knight' },
}

export const FAIRY_VARIANTS = {
  archchess: {
    title: 'Archbishop chess',
    icon: '🧚',
    noPersonality: true,
    piece: 'a',
    intro: 'Your queenside knight has become an Archbishop: it moves like a bishop and a knight.',
  },
  chancellorchess: {
    title: 'Chancellor chess',
    icon: '🧚',
    noPersonality: true,
    piece: 'c',
    intro: 'Your queenside knight has become a Chancellor: it moves like a rook and a knight.',
  },
  amazonchess: {
    title: 'Amazon chess',
    icon: '🧚',
    noPersonality: true,
    piece: 'z',
    intro: 'Your queen has become an Amazon: she moves like a queen and a knight. The strongest piece in the game!',
  },
  // Fischer Random uses normal pieces, so normal Stockfish thinks for the bots and they
  // keep their personalities. `rules` is the ffish variant, `chess960` turns on its
  // shuffled starts and castling rules.
  chess960: {
    title: 'Fischer Random',
    icon: '🎲',
    rules: 'chess',
    chess960: true,
    intro:
      'The back-row pieces start in a shuffled order, so no opening theory helps. To castle, move your king onto the rook you want to castle with.',
  },
  // Advanced tier variants.
  pawnrace: {
    title: 'Pawn Race',
    icon: '🏁',
    intro:
      'Win by checkmate, or by getting any pawn to the far side of the board. Pawns do not promote here: the first one across wins!',
    winText: {
      win: 'Your pawn reached the far side!',
      loss: "Your opponent's pawn reached the far side.",
    },
  },
  atomic: {
    title: 'Atomic chess',
    icon: '💥',
    noPersonality: true,
    intro:
      'Every capture explodes: the capturing piece and every piece next to it (except pawns) are destroyed. Blow up the enemy king to win, and never capture next to your own king!',
    winText: {
      win: 'The enemy king was blown up!',
      loss: 'Your king was blown up.',
    },
  },
  horde: {
    title: 'Horde',
    icon: '🐜',
    noPersonality: true,
    intro:
      'White is a horde of 36 pawns, Black a normal army. The army wins by capturing every last pawn; the horde wins by checkmate.',
    winText: {
      win: 'You captured the whole horde!',
      loss: 'Your whole horde was captured.',
    },
  },
  // King of the Hill is built into Fairy-Stockfish, so it needs no entry in variants.ini.
  kingofthehill: {
    title: 'King of the Hill',
    icon: '⛰️',
    hill: ['d4', 'e4', 'd5', 'e5'],
    intro:
      'Win by checkmate, or by walking your king onto one of the four golden centre squares. Careful: the same goes for your opponent!',
    winText: {
      win: 'Your king reached the hill!',
      loss: "Your opponent's king reached the hill.",
    },
  },
}

export const isFairyVariant = (variant) => variant in FAIRY_VARIANTS
