import { duck } from './fairy/fairyPieces.js'
import { lineIcon } from './lineIcons.js'

// An icon: one of our line icons ('line:blitz', see lineIcons.js; the game modes and the main
// menu), 'rubber-duck' for our own rubber duck drawing (there is no rubber-duck emoji), or an
// emoji (the campaign's events). Drawings are sized like the text around them.
export default function Icon({ icon }) {
  if (icon.startsWith('line:')) return lineIcon(icon.slice(5))
  if (icon !== 'rubber-duck') return icon
  return <span className="icon-drawing">{duck()}</span>
}
