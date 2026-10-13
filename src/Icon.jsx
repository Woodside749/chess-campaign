import { duck } from './fairy/fairyPieces.js'

// An event's or variant's icon: an emoji, or 'rubber-duck' for our own rubber duck
// drawing (there is no rubber-duck emoji). The duck is sized like the text around it.
export default function Icon({ icon }) {
  if (icon !== 'rubber-duck') return icon
  return <span className="icon-drawing">{duck()}</span>
}
