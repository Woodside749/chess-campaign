// A star drawn in code, in any colour (emoji stars only come in yellow). Used for the
// tier stars next to the player's avatar and on the achievements screen. The thin light
// outline keeps dark stars (like the black Legend star) visible on the dark background.
export default function StarIcon({ color, size = '1em', title }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <path
        d="M12 1.8l3 6.6 7.2.7-5.4 4.8 1.6 7.1L12 17.3 5.6 21l1.6-7.1L1.8 9.1 9 8.4z"
        fill={color}
        stroke="rgba(255, 255, 255, 0.6)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
