import { allPieces } from './fairy/fairyPieces.js'

// Crazyhouse: the pieces in a player's pocket, ready to be dropped on the board.
// `pieces` lists types like ['p', 'p', 'n']; `color` is whose pocket it is.
// If `onSelect` is given, the pieces are buttons (the player's own pocket on their turn),
// and `selectedType` is the one picked up.
export default function Pocket({ pieces, color, onSelect, selectedType }) {
  const counts = {}
  for (const type of pieces) counts[type] = (counts[type] ?? 0) + 1
  const types = Object.keys(counts)
  return (
    <div className="pocket" aria-label="Pocket">
      {types.length === 0 && <span className="pocket-empty">Pocket empty</span>}
      {types.map((type) => {
        const picture = allPieces[color + type.toUpperCase()]()
        const content = (
          <>
            {picture}
            {counts[type] > 1 && <span className="pocket-count">{counts[type]}</span>}
          </>
        )
        return onSelect ? (
          <button
            key={type}
            className={`pocket-piece${selectedType === type ? ' selected' : ''}`}
            onClick={() => onSelect(type)}
            aria-label={`Drop a ${type}`}
          >
            {content}
          </button>
        ) : (
          <span key={type} className="pocket-piece">
            {content}
          </span>
        )
      })}
    </div>
  )
}
