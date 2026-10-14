import { givesStars, roundStars } from './career.js'

// How many stars a league round is worth (⭐, ⭐⭐ or ⭐⭐⭐), dimmed until it is won.
// Nothing for events that give no stars (the School, the championships).
export default function RoundStars({ event, round, won }) {
  if (!givesStars(event)) return null
  const stars = roundStars(round)
  return (
    <span className={`round-stars${won ? ' won' : ''}`} title={`${stars} ${stars === 1 ? 'star' : 'stars'}`}>
      {'⭐'.repeat(stars)}
    </span>
  )
}
