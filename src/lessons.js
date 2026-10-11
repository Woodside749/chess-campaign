// Scripted lessons. Each step is one thing the coach says:
// - text: what the coach says.
// - move: the move the player must play, like 'e2e4'. A green arrow shows it.
//   Steps without a move have a Continue button instead.
// - reply: the coach's answer after the player's move.
// - highlight: squares to light up while the coach is talking.
// - button: the label of the Continue button (default "Continue").
// When the last step is done, the game carries on as a normal game against the coach.

export const LESSONS = {
  basics: [
    {
      text: "Welcome to the Chess School! I'm Coach Amara. I'll show you how every piece moves, then we'll play a real game. You play White, and White always moves first.",
    },
    {
      text: 'The goal is to checkmate the enemy king: attack it so it has no way to escape. You capture an enemy piece by moving onto its square.',
      highlight: ['e1', 'e8'],
    },
    {
      text: 'Pawns move straight forward, one square at a time. On its very first move, a pawn may move two squares. Move your e-pawn two squares, from e2 to e4.',
      move: 'e2e4',
      reply: 'e7e5',
    },
    {
      text: "I did the same. Now our pawns block each other, because pawns can't move forward into another piece. They capture differently: one square diagonally forward.",
      highlight: ['e4', 'e5'],
    },
    {
      text: 'Knights move in an L-shape: two squares in one direction, then one to the side. They are the only pieces that can jump over others. Move your knight from g1 to f3. It attacks my pawn on e5!',
      move: 'g1f3',
      reply: 'b8c6',
    },
    {
      text: 'I protected my pawn with my own knight, so if you take it, I can take back. Bishops move diagonally, as far as they like, but they cannot jump. Each bishop stays on its own colour forever. Move your bishop from f1 to c4.',
      move: 'f1c4',
      reply: 'f8c5',
    },
    {
      text: "Now a special move: castling. Your king moves two squares towards a rook, and the rook jumps over to the king's other side. It tucks your king into safety. Castle by moving your king from e1 to g1.",
      move: 'e1g1',
      reply: 'g8f6',
    },
    {
      text: "Well done! Castling has rules: neither the king nor that rook may have moved before, the squares between them must be empty, and you can't castle out of, through or into check.",
      highlight: ['g1', 'f1'],
    },
    {
      text: 'Remember that pawns can also move just one square. Move your c-pawn from c2 to c3. That opens a path for your queen.',
      move: 'c2c3',
      reply: 'd7d6',
    },
    {
      text: 'Rooks move in straight lines: up, down or sideways, as far as they like. Move your rook from f1 to e1, behind your e-pawn.',
      move: 'f1e1',
      reply: 'e8g8',
    },
    {
      text: 'I castled too. Now your strongest piece, the queen. She moves like a rook and a bishop combined: any distance, straight or diagonally. Move your queen from d1 to b3.',
      move: 'd1b3',
      reply: 'h7h6',
    },
    {
      text: "Last, the king. He moves one square in any direction. When a king is attacked, it's called check, and it must escape straight away. If it can't escape, that's checkmate and the game is over.",
      highlight: ['g1', 'g8'],
    },
    {
      text: "A few more rules you'll meet: a pawn that reaches the far side becomes a queen, rook, bishop or knight, your choice. If an enemy pawn jumps two squares and lands right beside your pawn, you may capture it as if it had moved only one square. That's called en passant, and you can only do it straight away. And a game can end in a draw, for example when neither side can win. That's everything! Now let's play a real game from here. Good luck!",
      button: 'Start playing',
    },
  ],
}
