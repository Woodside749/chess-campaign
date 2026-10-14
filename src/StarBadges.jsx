import StarIcon from './StarIcon.jsx'

// The tier stars the player has earned (all 36 stars in a tier's leagues), shown small
// in one row below their avatar: up to five.
// `stars` is a list like [{ name: 'Amateur', color: '#9e9e9e' }, ...].
export default function StarBadges({ stars, size = 12 }) {
  if (!stars || stars.length === 0) return null
  return (
    <div className="star-badges" aria-label={`${stars.map((star) => star.name).join(', ')} stars`}>
      {stars.map((star) => (
        <StarIcon key={star.name} color={star.color} size={size} title={`${star.name} star: all 36 stars won`} />
      ))}
    </div>
  )
}
