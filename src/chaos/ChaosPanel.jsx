// The Chaos Chess banner beside the board: this turn's rule, for you or for the bot.
// `rule` is { icon, name, text, hint? } from chaosRules.js (or diceRules.js, with `dice`).
export default function ChaosPanel({ rule, yourTurn, botName, hasPowers, dice = false }) {
  // The rules are written to the player ("your queen"); on the bot's turn, say "their".
  const text = yourTurn
    ? rule.text
    : rule.text.replace(/\bYour\b/g, 'Their').replace(/\byour\b/g, 'their').replace(/\byou\b/g, 'they')
  return (
    <section className={`lesson-panel chaos-panel${yourTurn ? ' yours' : ''}`}>
      <div className="chaos-label">
        {dice ? (yourTurn ? 'You rolled' : `${botName} rolled`) : yourTurn ? 'Your rule this turn' : `${botName}’s rule this turn`}
      </div>
      <div className="chaos-rule">
        <span className="chaos-icon" aria-hidden="true">
          {rule.icon}
        </span>
        {rule.name}
      </div>
      <p className="lesson-text">{text}</p>
      {yourTurn && hasPowers && (
        <p className="chaos-hint">
          {rule.hint ?? 'The special moves are marked in purple when you pick up a piece.'}
          {rule.hint && ' Special moves are marked in purple.'}
        </p>
      )}
    </section>
  )
}
