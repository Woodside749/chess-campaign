// The chess variants that run on the rules library (ffish): our fairy chess variants with
// new pieces, and Fischer Random. The fairy rules themselves are in variants.ini, which
// both ffish and the engine (Fairy-Stockfish) read. Here is what the game shows to players.
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
    piece: 'a',
    intro: 'Your queenside knight has become an Archbishop: it moves like a bishop and a knight.',
  },
  chancellorchess: {
    title: 'Chancellor chess',
    piece: 'c',
    intro: 'Your queenside knight has become a Chancellor: it moves like a rook and a knight.',
  },
  amazonchess: {
    title: 'Amazon chess',
    piece: 'z',
    intro: 'Your queen has become an Amazon: she moves like a queen and a knight. The strongest piece in the game!',
  },
  // Fischer Random uses normal pieces, so normal Stockfish thinks for the bots and they
  // keep their personalities. `rules` is the ffish variant, `chess960` turns on its
  // shuffled starts and castling rules.
  chess960: {
    title: 'Fischer Random',
    rules: 'chess',
    chess960: true,
    intro:
      'The back-row pieces start in a shuffled order, so no opening theory helps. To castle, move your king onto the rook you want to castle with.',
  },
}

export const isFairyVariant = (variant) => variant in FAIRY_VARIANTS
