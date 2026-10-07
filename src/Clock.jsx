// Shows the time left, for example "9:41". Under 20 seconds it also shows tenths.
export default function Clock({ ms, active }) {
  const low = ms < 30_000
  return (
    <div className={`clock${active ? ' active' : ''}${low ? ' low' : ''}`}>
      {formatTime(ms)}
    </div>
  )
}

function formatTime(ms) {
  const clamped = Math.max(0, ms)
  if (clamped < 20_000) return `0:${(clamped / 1000).toFixed(1).padStart(4, '0')}`
  const totalSeconds = Math.ceil(clamped / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}
