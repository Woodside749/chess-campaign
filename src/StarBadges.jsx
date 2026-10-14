import StarIcon from './StarIcon.jsx'

// The tier stars the player has earned (all 36 stars in a tier's leagues), shown small
// next to their avatar: up to five, in two rows of three like the league grid.
// `stars` is a list like [{ name: 'Amateur', color: '#9e9e9e' }, ...].
export default function StarBadges({ stars, size = 14 }) {
  if (!stars || stars.length === 0) return null
  return (
    <div className="star-badges" aria-label={`${stars.map((star) => star.name).join(', ')} stars`}>
      {stars.map((star) => (
        <StarIcon key={star.name} color={star.color} size={size} title={`${star.name} star: all 36 stars won`} />
      ))}
    </div>
  )
}
