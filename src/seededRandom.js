// Random numbers that come out the same on every device given the same seed, so both
// players in an online game get the same Fischer Random start, Chaos rules and dice.
// (The "mulberry32" generator: tiny and good enough for games.) Returns a function that,
// like Math.random, gives a new number from 0 up to 1 each time it is called.
export function seededRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
