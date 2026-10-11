import Avatar from './Avatar.jsx'

// The coach's speech during a lesson, with a Continue button on steps without a move.
export default function LessonPanel({ bot, step, stepNumber, totalSteps, hint, busy, onContinue }) {
  return (
    <section className="lesson-panel" aria-live="polite">
      <div className="lesson-header">
        <Avatar bot={bot} size={36} />
        <div className="opponent-name">{bot.name}</div>
        <div className="lesson-progress">
          {stepNumber}/{totalSteps}
        </div>
      </div>
      <p className="lesson-text">{step.text}</p>
      {hint && <p className="lesson-hint">{hint}</p>}
      {!step.move && (
        <button className="lesson-continue" onClick={onContinue} disabled={busy} autoFocus>
          {step.button ?? 'Continue'}
        </button>
      )}
      {step.move && !busy && <p className="lesson-instruction">Follow the green arrow.</p>}
    </section>
  )
}
