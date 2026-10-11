import { Fragment } from 'react'
import { BOTS } from './bots.js'
import { EVENTS, isUnlocked } from './career.js'
import { roundsWon } from './progress.js'
import Avatar from './Avatar.jsx'
import Silhouette from './Silhouette.jsx'

// The player's home screen: a horizontal career road, scrolled from left to right.
// First the title, then the Chess School events (played in order, with arrows between
// them), then the Amateur Leagues as a grid that can be played in any order.
export default function Home({ progress, onOpenEvent, onOpenDevMenu }) {
  const wonIn = (eventId) => roundsWon(progress, eventId)
  const school = EVENTS.filter((event) => event.section === 'school')
  const leagues = EVENTS.filter((event) => event.section === 'leagues')
  const leaguesOpen = leagues.some((event) => isUnlocked(event, wonIn))

  // A normal mouse wheel scrolls up and down; here it scrolls the road sideways instead.
  function scrollSideways(event) {
    const road = event.currentTarget
    if (road.scrollWidth > road.clientWidth && Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      road.scrollLeft += event.deltaY
    }
  }

  return (
    <main className="home" onWheel={scrollSideways}>
      <section className="home-intro">
        <h1>Chess Career</h1>
        <p>
          Travel a world tour of chess clubs, tournaments and rivals. Every opponent has their own
          style, and every event moves your career forward.
        </p>
        {/* Only shown while developing (npm run dev), never in the published game. */}
        {import.meta.env.DEV && (
          <button className="dev-link" onClick={onOpenDevMenu}>
            Developer menu
          </button>
        )}
      </section>

      <section className="stage" aria-labelledby="school-title">
        <h2 id="school-title" className="section-title">
          Chess School
        </h2>
        <div className="stage-row">
          {school.map((event, i) => (
            <Fragment key={event.id}>
              {i > 0 && <Arrow />}
              <EventCard event={event} won={wonIn(event.id)} onOpen={() => onOpenEvent(event)} />
            </Fragment>
          ))}
        </div>
      </section>

      <Arrow />

      <section className="stage" aria-labelledby="leagues-title">
        <h2 id="leagues-title" className="section-title">
          Amateur Leagues
          {!leaguesOpen && <span className="section-lock"> · 🔒 Win the School Tournament to unlock</span>}
        </h2>
        <div className="league-grid">
          {leagues.map((event) => (
            <LeagueCard
              key={event.id}
              event={event}
              locked={!isUnlocked(event, wonIn)}
              won={wonIn(event.id)}
              onOpen={() => onOpenEvent(event)}
            />
          ))}
        </div>
      </section>
    </main>
  )
}

function Arrow() {
  return (
    <div className="stage-arrow" aria-hidden="true">
      →
    </div>
  )
}

// A big card for the Chess School events.
function EventCard({ event, won, onOpen }) {
  return (
    <article className="event-card">
      <div className="event-place">{event.place}</div>
      <h3>{event.title}</h3>
      {event.type === 'tournament' ? <TournamentSummary event={event} won={won} /> : <Opponent bot={BOTS[event.bot]} />}
      <p className="event-description">{event.description}</p>
      <button className="event-play" onClick={onOpen}>
        {event.type === 'tournament' ? 'Open bracket' : 'Start'}
      </button>
    </article>
  )
}

// A smaller card for a league. Locked leagues and ones that aren't built yet can't be opened.
function LeagueCard({ event, locked, won, onOpen }) {
  const playable = !locked && !event.comingSoon
  return (
    <article className={`league-card${playable ? '' : ' unavailable'}`}>
      <div className="league-heading">
        <span className="league-icon" aria-hidden="true">
          {event.icon}
        </span>
        <h3>{event.title}</h3>
      </div>
      <p className="event-description">{event.description}</p>
      <div className="league-footer">
        {playable ? (
          <>
            {event.type === 'tournament' ? <TournamentProgress event={event} won={won} /> : <span />}
            <button className="event-play" onClick={onOpen}>
              Open
            </button>
          </>
        ) : (
          <span className="league-status">{locked ? '🔒 Locked' : 'Coming soon'}</span>
        )}
      </div>
    </article>
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
      <TournamentProgress event={event} won={won} />
    </div>
  )
}

function TournamentProgress({ event, won }) {
  const total = event.rounds.length
  return (
    <div className="bot-bio">
      {won >= total ? '🏆 Champion' : won === 0 ? `${total} rounds` : `${won} of ${total} rounds won`}
    </div>
  )
}
