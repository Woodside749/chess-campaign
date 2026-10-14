import { portraitFor } from './portraits.js'

// A round avatar with the bot's drawn portrait (see portraits.js) and country flag. Anyone
// without a portrait (the player, players in a local game) gets their first initial.
export default function Avatar({ bot, size = 44 }) {
  const portrait = portraitFor(bot.id)
  return (
    <div className="avatar" style={{ background: bot.color, width: size, height: size, fontSize: size * 0.45 }}>
      {portrait ?? bot.name[0].toUpperCase()}
      <span className="flag" aria-label={bot.country}>
        {bot.flag}
      </span>
    </div>
  )
}
