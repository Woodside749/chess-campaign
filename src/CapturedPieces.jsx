import { allPieces } from './fairy/fairyPieces.js'

// Small images of the pieces `color` has captured, plus "+N" if `color` is ahead.
// `captured` lists piece types like ['p', 'p', 'n'], and `advantage` is how many
// points `color` is ahead by (zero or negative means not ahead).
export default function CapturedPieces({ color, captured, advantage }) {
  // The captured pieces belong to the other side, so they're drawn in its colour.
  const pieceColor = color === 'w' ? 'b' : 'w'
  return (
    <div className="captured">
      {captured.map((type, i) => (
        <span key={i} className={`captured-piece${captured[i - 1] === type ? ' stacked' : ''}`}>
          {allPieces[pieceColor + type.toUpperCase()]()}
        </span>
      ))}
      {advantage > 0 && <span className="advantage">+{advantage}</span>}
    </div>
  )
}
