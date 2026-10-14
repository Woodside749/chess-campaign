// Rating maths shared by the calibration scripts (calibrate.js and calibrate-fairy.js).

// Finds the ratings that best explain the results, with the anchors held fixed.
// `results` is a list of { white, black, score } (score 1, 0.5 or 0 for White).
// Uses the standard Elo formula: expected score = 1 / (1 + 10^((opponent - you) / 400)).
export function fitRatings(results, fixed) {
  const players = new Set(results.flatMap((r) => [r.white, r.black]))
  const rating = Object.fromEntries([...players].map((p) => [p, fixed[p] ?? 1000]))
  // One imaginary draw per game pair keeps 100% scores from giving infinite ratings.
  const games = [...results, ...results.map((r) => ({ ...r, score: 0.5, weight: 0.05 }))]
  const expected = (a, b) => 1 / (1 + 10 ** ((rating[b] - rating[a]) / 400))
  const info = {}
  for (let step = 0; step < 500; step++) {
    const gradient = {}
    for (const p of players) {
      gradient[p] = 0
      info[p] = 0
    }
    for (const { white, black, score, weight = 1 } of games) {
      const e = expected(white, black)
      gradient[white] += weight * (score - e)
      gradient[black] -= weight * (score - e)
      info[white] += weight * e * (1 - e)
      info[black] += weight * e * (1 - e)
    }
    for (const p of players) {
      if (p in fixed) continue
      rating[p] += Math.max(-100, Math.min(100, (gradient[p] / info[p]) * (400 / Math.LN10)))
    }
  }
  return Object.fromEntries(
    [...players].map((p) => [p, { rating: rating[p], error: (400 / Math.LN10) / Math.sqrt(info[p]) }]),
  )
}
