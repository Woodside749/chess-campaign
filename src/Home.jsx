import { BOTS } from './bots.js'
import { EVENTS } from './career.js'
import Avatar from './Avatar.jsx'

// The player's home screen: the game's title, and the career events as a row of cards.
export default function Home({ onPlayEvent, onOpenDevMenu }) {
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
        {EVENTS.map((event) => {
          const bot = BOTS[event.bot]
          return (
            <article key={event.id} className="event-card">
              <div className="event-place">{event.place}</div>
              <h2>{event.title}</h2>
              <div className="event-opponent">
                <Avatar bot={bot} size={48} />
                <div>
                  <div className="opponent-name">{bot.name}</div>
                  <div className="bot-bio">{bot.country}</div>
                </div>
              </div>
              <p className="event-description">{event.description}</p>
              <button className="event-play" onClick={() => onPlayEvent(event)}>
                Start
              </button>
            </article>
          )
        })}
      </section>
    </main>
  )
}
