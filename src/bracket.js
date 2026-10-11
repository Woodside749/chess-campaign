// Works out a knockout bracket from a tournament event (see career.js) and how many
// rounds the player has won.
//
// Returns { rounds, champion }:
// - rounds: one list of matches per round, like [{ players: ['you', 'lukas'], winner: 'you' }].
//   A player is null while not known yet, and winner is null until the match is decided.
// - champion: the tournament winner, or null.
//
// Results of a round only appear once the player has won their match in that round,
// so the bracket fills in step by step as the player progresses.
export function buildBracket(event, roundsWon) {
  const rank = (id) => event.ranking.indexOf(id)
  const rounds = []
  let pairs = event.bracket
  for (let round = 0; ; round++) {
    const decided = roundsWon > round
    const matches = pairs.map(([a, b]) => {
      let winner = null
      if (decided && a && b) {
        if (a === 'you' || b === 'you') winner = 'you'
        else winner = rank(a) < rank(b) ? a : b
      }
      return { players: [a, b], winner }
    })
    rounds.push(matches)
    if (matches.length === 1) break
    // The winners of each two neighbouring matches meet in the next round.
    pairs = []
    for (let i = 0; i < matches.length; i += 2) pairs.push([matches[i].winner, matches[i + 1].winner])
  }
  return { rounds, champion: rounds.at(-1)[0].winner }
}
