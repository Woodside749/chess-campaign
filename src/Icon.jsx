import { duck } from './fairy/fairyPieces.js'
import { colorIcon, lineIcon } from './lineIcons.js'

// An icon: one of our line icons ('line:blitz', see lineIcons.js; the game modes and the main
// menu), its coloured version ('color:blitz'; the campaign's events), 'rubber-duck' for our
// own rubber duck drawing, or an emoji. Drawings are sized like the text around them.
export default function Icon({ icon }) {
  if (icon.startsWith('line:')) return lineIcon(icon.slice(5))
  if (icon.startsWith('color:')) return colorIcon(icon.slice(6))
  if (icon !== 'rubber-duck') return icon
  return <span className="icon-drawing">{duck()}</span>
}
