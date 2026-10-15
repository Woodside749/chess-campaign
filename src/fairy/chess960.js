// Fischer Random (Chess960): a random starting position. The back row is shuffled with
// two rules, which give 960 possible setups: the bishops stand on opposite colours, and
// the king stands somewhere between the two rooks. Black mirrors White.

// `random` gives the random numbers (an online game passes a seeded one, so both players
// get the same start).
export function randomChess960Fen(random = Math.random) {
  const pickRandom = (list) => list[Math.floor(random() * list.length)]
  const row = Array(8).fill(null)
  const emptyFiles = () => row.flatMap((piece, file) => (piece ? [] : [file]))
  row[pickRandom([0, 2, 4, 6])] = 'b' // one bishop on a dark square...
  row[pickRandom([1, 3, 5, 7])] = 'b' // ...and one on a light square
  row[pickRandom(emptyFiles())] = 'q'
  row[pickRandom(emptyFiles())] = 'n'
  row[pickRandom(emptyFiles())] = 'n'
  // The three files left get rook, king, rook from left to right, so the king is between.
  const [left, middle, right] = emptyFiles()
  row[left] = 'r'
  row[middle] = 'k'
  row[right] = 'r'
  const black = row.join('')
  return `${black}/pppppppp/8/8/8/8/PPPPPPPP/${black.toUpperCase()} w KQkq - 0 1`
}
