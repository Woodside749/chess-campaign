// The chess variants that run on the rules library (ffish): our fairy chess variants with
// new pieces, Fischer Random, King of the Hill, Pawn Race, Atomic, Horde, Antichess and Crazyhouse. The fairy rules are in
// variants.ini, which both ffish and the engine (Fairy-Stockfish) read. Here is what the
// game shows to players.
//
// Per variant: `title`, `icon` and `intro` for the screen; `rules`, the ffish/engine
// variant name if it differs from the key; `ignoreTraits`, personality traits that make no
// sense in the variant (the bots keep the rest of their personality); `chess960` for
// Fischer Random; `pieces` for the fairy pieces in the game (letters from FAIRY_PIECES);
// `hill` for squares to highlight; `winText` for a special way to win;
// `pockets` for Crazyhouse, where captured pieces can be dropped back on the board;
// `duck` for Duck Chess; `whiteView` to always show the board from White's side.
// `strengthCurve`: measured with `npm run calibrate-fairy` (pairs of [strength, rating] in
// this variant). Bots then get the strength that plays at their rating label here.
// Near the top, runs against different anchors disagree by up to a few hundred points,
// so points measured more than once use the average.
//
// Each fairy piece is drawn as its base piece (`looksLike`) with a badge in the corner:
// a small knight for the knight hybrids, or an emoji (`badge`) for the others.
// `value` is its worth in pawns, used for the material score.

export const FAIRY_PIECES = {
  a: { name: 'Archbishop', looksLike: 'b', value: 7, moves: 'like a bishop and a knight' },
  c: { name: 'Chancellor', looksLike: 'r', value: 8, moves: 'like a rook and a knight' },
  z: { name: 'Amazon', looksLike: 'q', value: 12, moves: 'like a queen and a knight' },
  e: { name: 'Centaur', looksLike: 'n', badge: '👑', value: 5, moves: 'like a king and a knight' },
  l: { name: 'Camel', looksLike: 'n', badge: '🐪', value: 3, moves: 'with a long jump: three squares one way and one to the side' },
  i: { name: 'Nightrider', looksLike: 'n', badge: '🌙', value: 5, moves: 'like a knight, but keeps jumping in the same direction' },
  o: {
    name: 'Cannon',
    looksLike: 'r',
    badge: '💣',
    value: 4,
    moves: 'like a rook, but can only capture by hopping over exactly one piece',
  },
  h: { name: 'Dragon Horse', looksLike: 'b', badge: '🐉', value: 7, moves: 'like a bishop, plus one step straight' },
}

const FAIRY_INTRO = 'Some of your pieces have become fairy pieces. The badge in the corner tells them apart.'

export const FAIRY_VARIANTS = {
  // Amateur Fairy Cup.
  archchess: {
    title: 'Archbishop chess',
    icon: '🧚',
    strengthCurve: [[0.1, 512], [0.3, 863], [0.5, 1130], [0.7, 1511], [0.85, 1909], [1, 2223]],
    pieces: ['a'],
    intro: 'Both your knights have become Archbishops.',
  },
  chancellorchess: {
    title: 'Chancellor chess',
    icon: '🧚',
    strengthCurve: [[0.1, 465], [0.3, 776], [0.5, 1081], [0.7, 1284], [0.85, 1843], [1, 2255]],
    pieces: ['c'],
    intro: 'Both your rooks have become Chancellors. They still castle like rooks.',
  },
  amazonchess: {
    title: 'Amazon & Centaurs',
    icon: '🧚',
    strengthCurve: [[0.1, 458], [0.3, 757], [0.5, 1070], [0.7, 1475], [0.85, 1805], [1, 2212]],
    pieces: ['z', 'e'],
    intro: 'Your queen has become an Amazon, the strongest piece in the game, and your knights have become Centaurs.',
  },
  // Master Fairy: four fairy pieces each.
  leapers: {
    title: 'Leapers',
    icon: '🧚',
    strengthCurve: [[0.1, 623], [0.3, 841], [0.5, 1085], [0.7, 1510], [0.75, 1557], [0.8, 1774], [0.85, 1912], [0.9, 1996], [0.95, 2323]],
    pieces: ['i', 'l'],
    intro: `${FAIRY_INTRO} Knights have become Nightriders and bishops have become Camels.`,
  },
  eastern: {
    title: 'Eastern army',
    icon: '🧚',
    strengthCurve: [[0.1, 513], [0.3, 779], [0.5, 1042], [0.7, 1592], [0.75, 1716], [0.8, 1897], [0.85, 1941], [0.9, 2106], [0.95, 2348]],
    pieces: ['o', 'h'],
    intro: `${FAIRY_INTRO} Rooks have become Cannons (from Chinese chess) and bishops Dragon Horses (from Japanese chess). Cannons still castle like rooks.`,
  },
  royalcourt: {
    title: 'Royal court',
    icon: '🧚',
    strengthCurve: [[0.1, 526], [0.3, 817], [0.5, 1051], [0.7, 1473], [0.75, 1598], [0.8, 1724], [0.85, 1776], [0.9, 1812], [0.95, 2214], [1, 2278], [1.05, 2560], [1.1, 2650]],
    pieces: ['c', 'a'],
    intro: `${FAIRY_INTRO} Rooks have become Chancellors and bishops Archbishops: four big hybrid pieces each.`,
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
    intro:
      'White is a horde of 36 pawns, Black a normal army. The army wins by capturing every last pawn; the horde wins by checkmate.',
    winText: {
      win: 'You captured the whole horde!',
      loss: 'Your whole horde was captured.',
    },
  },
  // Expert tier variants (built into Fairy-Stockfish, so no entry in variants.ini).
  antichess: {
    title: 'Antichess',
    // Losing pieces is the goal here and there is no check, so these traits make no sense.
    ignoreTraits: ['check', 'threat', 'towardKing', 'hangs', 'tradeWhenAhead', 'evenTrade', 'castle', 'kingActivity'],
    icon: '🙃',
    intro:
      'Lose all your pieces to win! If you can capture, you must. The king is an ordinary piece that can be captured, and there is no check. You also win if you have no legal moves left.',
    winText: {
      win: 'You got rid of all your pieces. You win!',
      loss: 'Your opponent got rid of all their pieces first.',
    },
  },
  // `pockets`: captured pieces go into the capturer's pocket and can be dropped back.
  crazyhouse: {
    title: 'Crazyhouse',
    icon: '🏠',
    pockets: true,
    intro:
      'Pieces you capture switch sides and go into your pocket. Instead of moving, you may drop a pocket piece onto any empty square (pawns not on the first or last rank). Tap the piece in your pocket, then the square.',
  },
  // Master tier variants.
  // `duck`: every move also moves the duck, so the game asks where to put it.
  duckchess: {
    title: 'Duck Chess',
    icon: 'rubber-duck',
    duck: true,
    intro:
      'After every move, you also move the duck to any empty square. Nobody can pass through it or capture it. There is no check: capture the king to win!',
    winText: {
      win: 'You captured the king!',
      loss: 'Your king was captured.',
    },
  },
  // Racing Kings is built into Fairy-Stockfish. Both armies race up the board, so the
  // board is always shown from White's side (`whiteView`).
  racingkings: {
    title: 'Racing Kings',
    // Checks are illegal, there is no castling and no enemy king to attack.
    ignoreTraits: ['check', 'castle', 'develop', 'towardKing', 'earlyQueen', 'kingActivity'],
    icon: '🏎️',
    whiteView: true,
    intro:
      'Both kings race to the top row: the first king to reach the 8th rank wins. Nobody may give check. If White gets there first, Black still gets one move to reach it too, and then it is a draw.',
    winText: {
      win: 'Your king reached the finish line!',
      loss: "Your opponent's king reached the finish line.",
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
