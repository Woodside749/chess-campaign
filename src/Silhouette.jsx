// A dark, faceless avatar for an opponent whose identity isn't revealed yet.
export default function Silhouette({ size = 44 }) {
  return (
    <div className="avatar silhouette" style={{ width: size, height: size }} aria-label="Unknown opponent">
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} aria-hidden="true">
        <circle cx="12" cy="8" r="4.5" />
        <path d="M3 22c0-5 4-8 9-8s9 3 9 8z" />
      </svg>
    </div>
  )
}
