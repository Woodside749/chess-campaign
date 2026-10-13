import { BOTS } from './bots.js'
import { EVENTS, isUnlocked, leaguesWon } from './career.js'
import { roundsWon } from './progress.js'
import { achievementsFor } from './achievements.js'
import { PLAYER, playerTitle, titleById } from './player.js'
import Avatar from './Avatar.jsx'
import TitleBadge from './TitleBadge.jsx'
import Silhouette from './Silhouette.jsx'

// The player's home screen: a horizontal career road, scrolled from left to right.
// First the title, then the Chess School events (played in order, side by side),
// then the Amateur Leagues as a grid that can be played in any order.
export default function Home({ progress, onOpenEvent, onOpenAchievements, onOpenDevMenu }) {
  const wonIn = (eventId) => roundsWon(progress, eventId)
  const school = EVENTS.filter((event) => event.section === 'school')
  const leagues = EVENTS.filter((event) => event.section === 'leagues')
  const leaguesOpen = leagues.some((event) => isUnlocked(event, wonIn))
  const championship = EVENTS.filter((event) => event.section === 'championship')
  const advanced = EVENTS.filter((event) => event.section === 'advanced')
  const advancedOpen = advanced.some((event) => isUnlocked(event, wonIn))
  const advancedChampionship = EVENTS.filter((event) => event.section === 'advanced-championship')
  const expert = EVENTS.filter((event) => event.section === 'expert')
  const expertOpen = expert.some((event) => isUnlocked(event, wonIn))
  const expertChampionship = EVENTS.filter((event) => event.section === 'expert-championship')
  const master = EVENTS.filter((event) => event.section === 'master')
  const masterOpen = master.some((event) => isUnlocked(event, wonIn))
  const title = playerTitle(progress)
  const achievements = achievementsFor(progress)

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
        <div className="player-card">
          <Avatar bot={PLAYER} size={48} />
          <div className="player-card-info">
            <div className="player-card-name">
              <TitleBadge title={title} /> You
            </div>
            <div className="player-card-title">{title ? title.name : 'No title yet'}</div>
          </div>
          <button className="player-card-button secondary" onClick={onOpenAchievements}>
            🏆 {achievements.filter((a) => a.got).length}/{achievements.length}
          </button>
        </div>
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
          {school.map((event) => (
            <EventCard key={event.id} event={event} won={wonIn(event.id)} onOpen={() => onOpenEvent(event)} />
          ))}
        </div>
      </section>

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

      <section className="stage" aria-labelledby="championship-title">
        <h2 id="championship-title" className="section-title">
          Amateur Championship
        </h2>
        {championship.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            won={wonIn(event.id)}
            lockedText={
              isUnlocked(event, wonIn)
                ? null
                : lockText(event, wonIn)
            }
            onOpen={() => onOpenEvent(event)}
          />
        ))}
      </section>

      <section className="stage" aria-labelledby="advanced-title">
        <h2 id="advanced-title" className="section-title">
          Advanced Leagues
          {!advancedOpen && <span className="section-lock"> · 🔒 Win the Amateur Super Tournament to unlock</span>}
        </h2>
        <div className="league-grid">
          {advanced.map((event) => (
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

      <section className="stage" aria-labelledby="advanced-championship-title">
        <h2 id="advanced-championship-title" className="section-title">
          Advanced Championship
        </h2>
        {advancedChampionship.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            won={wonIn(event.id)}
            lockedText={isUnlocked(event, wonIn) ? null : lockText(event, wonIn)}
            onOpen={() => onOpenEvent(event)}
          />
        ))}
      </section>

      <section className="stage" aria-labelledby="expert-title">
        <h2 id="expert-title" className="section-title">
          Expert Leagues
          {!expertOpen && <span className="section-lock"> · 🔒 Win the Master Title Championship to unlock</span>}
        </h2>
        <div className="league-grid">
          {expert.map((event) => (
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

      <section className="stage" aria-labelledby="expert-championship-title">
        <h2 id="expert-championship-title" className="section-title">
          Expert Championship
        </h2>
        {expertChampionship.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            won={wonIn(event.id)}
            lockedText={isUnlocked(event, wonIn) ? null : lockText(event, wonIn)}
            onOpen={() => onOpenEvent(event)}
          />
        ))}
      </section>

      <section className="stage" aria-labelledby="master-title">
        <h2 id="master-title" className="section-title">
          Master Leagues
          {!masterOpen && <span className="section-lock"> · 🔒 Win the International Master Title Championship to unlock</span>}
        </h2>
        <div className="league-grid">
          {master.map((event) => (
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

// What a locked championship asks for, like "Win 4 Amateur Leagues to unlock (1 of 4 won)".
function lockText(event, wonIn) {
  const { leagues, section } = event.requires
  const name = { advanced: 'Advanced', expert: 'Expert' }[section] ?? 'Amateur'
  return `🔒 Win ${leagues} ${name} Leagues to unlock (${leaguesWon(wonIn, section)} of ${leagues} won)`
}

// A big card for the Chess School events and the championship. `lockedText`, if given,
// replaces the button and says what must be done first.
function EventCard({ event, won, lockedText, onOpen }) {
  return (
    <article className={`event-card${lockedText ? ' locked' : ''}`}>
      <div className="event-place">{event.place}</div>
      <h3>{event.title}</h3>
      {event.type === 'tournament' ? <TournamentSummary event={event} won={won} /> : <Opponent bot={BOTS[event.bot]} />}
      <p className="event-description">{event.description}</p>
      {lockedText ? (
        <p className="league-status">{lockedText}</p>
      ) : (
        <button className="event-play" onClick={onOpen}>
          {event.type === 'tournament' ? 'Open bracket' : 'Start'}
        </button>
      )}
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
            {event.rounds ? <TournamentProgress event={event} won={won} /> : <span />}
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
        <div className="opponent-name">
          <TitleBadge title={titleById(bot.chessTitle)} /> {bot.name}
        </div>
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
