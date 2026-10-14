// A round avatar with the bot's first initial and country flag.
export default function Avatar({ bot, size = 44 }) {
  return (
    <div className="avatar" style={{ background: bot.color, width: size, height: size, fontSize: size * 0.45 }}>
      {bot.name[0].toUpperCase()}
      <span className="flag" aria-label={bot.country}>
        {bot.flag}
      </span>
    </div>
  )
}
