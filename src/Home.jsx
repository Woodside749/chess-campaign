import { BOTS } from './bots.js'
import { EVENTS } from './career.js'
import { roundsWon } from './progress.js'
import Avatar from './Avatar.jsx'
import Silhouette from './Silhouette.jsx'

// The player's home screen: the game's title, and the career events as a row of cards.
export default function Home({ progress, onOpenEvent, onOpenDevMenu }) {
  return (
    <main className="home">
      <section className="home-intro">
        <h1>Chess Career</h1>
        <p>
          Travel a world tour of chess clubs, tournaments and rivals. Every opponent has their own
          style, and every event moves your career forward.
        </p>
        <button className="dev-link" onClick={onOpenDevMenu}>
          Developer menu
        </button>
      </section>

      <section className="event-row" aria-label="Events">
        {EVENTS.map((event) => (
          <article key={event.id} className="event-card">
            <div className="event-place">{event.place}</div>
            <h2>{event.title}</h2>
            {event.type === 'tournament' ? (
              <TournamentSummary event={event} won={roundsWon(progress, event.id)} />
            ) : (
              <Opponent bot={BOTS[event.bot]} />
            )}
            <p className="event-description">{event.description}</p>
            <button className="event-play" onClick={() => onOpenEvent(event)}>
              {event.type === 'tournament' ? 'Open bracket' : 'Start'}
            </button>
          </article>
        ))}
      </section>
    </main>
  )
}

function Opponent({ bot }) {
  return (
    <div className="event-opponent">
      <Avatar bot={bot} size={48} />
      <div>
        <div className="opponent-name">{bot.name}</div>
        <div className="bot-bio">{bot.country}</div>
      </div>
    </div>
  )
}

// The tournament's opponents as a row of avatars, and how far the player has got.
// Opponents of rounds not reached yet are shown as silhouettes.
function TournamentSummary({ event, won }) {
  const total = event.rounds.length
  return (
    <div className="event-opponent">
      <div className="avatar-stack">
        {event.rounds.map((round, i) =>
          i <= won ? (
            <Avatar key={round.opponent} bot={BOTS[round.opponent]} size={40} />
          ) : (
            <Silhouette key={round.opponent} size={40} />
          ),
        )}
      </div>
      <div className="bot-bio">
        {won >= total ? '🏆 Champion' : won === 0 ? `${total} rounds` : `${won} of ${total} rounds won`}
      </div>
    </div>
  )
}
