import { defaultPieces } from 'react-chessboard'

const CHOICES = [
  { type: 'q', label: 'Queen' },
  { type: 'r', label: 'Rook' },
  { type: 'b', label: 'Bishop' },
  { type: 'n', label: 'Knight' },
]

// Shown over the board when a pawn reaches the last rank. Tapping outside cancels.
export default function PromotionPicker({ color, onChoose, onCancel }) {
  return (
    <div className="promotion-backdrop" onClick={onCancel}>
      <div className="promotion-picker" role="dialog" aria-label="Promote pawn to" onClick={(e) => e.stopPropagation()}>
        {CHOICES.map((choice) => (
          <button key={choice.type} aria-label={choice.label} onClick={() => onChoose(choice.type)}>
            {defaultPieces[color + choice.type.toUpperCase()]()}
          </button>
        ))}
      </div>
    </div>
  )
}
