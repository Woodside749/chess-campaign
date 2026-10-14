import { useLayoutEffect, useRef } from 'react'
import { BOTS } from './bots.js'
import { EVENTS, eventMaxStars, eventStars, givesStars, isUnlocked, maxStars, starsWon } from './career.js'
import { roundsWon } from './progress.js'
import { achievementsFor } from './achievements.js'
import { PLAYER, playerTitle, tierStars, titleById } from './player.js'
import Avatar from './Avatar.jsx'
import Icon from './Icon.jsx'
import TitleBadge from './TitleBadge.jsx'
import StarBadges from './StarBadges.jsx'
import Silhouette from './Silhouette.jsx'

// Where the home screen is scrolled to, so coming back from a bracket or a game lands in
// the same place instead of at the start of the road. On a computer the road scrolls
// sideways; on a phone the page scrolls down. It is kept in the browser's session storage
// (not just in memory), so it also survives the page reloading, which Safari sometimes
// does to background tabs. It is forgotten when the tab is closed.
// (The key keeps the game's first working name, so saved data isn't lost.)
const SCROLL_KEY = 'chess-career-home-scroll'

function loadScroll() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY))
    return { left: Number(saved?.left) || 0, top: Number(saved?.top) || 0 }
  } catch {
    return { left: 0, top: 0 }
  }
}

function saveScroll(road) {
  try {
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ left: road.scrollLeft, top: window.scrollY }))
  } catch {
    // Storage can be blocked (private browsing); then the road just starts at the beginning.
  }
}

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
  const masterChampionship = EVENTS.filter((event) => event.section === 'master-championship')
  const legend = EVENTS.filter((event) => event.section === 'legend')
  const legendOpen = legend.some((event) => isUnlocked(event, wonIn))
  const legendChampionship = EVENTS.filter((event) => event.section === 'legend-championship')
  const title = playerTitle(progress)
  const achievements = achievementsFor(progress)

  // Go back to where the player was, and remember the spot when they leave.
  const roadRef = useRef(null)
  useLayoutEffect(() => {
    const road = roadRef.current
    const saved = loadScroll()
    road.scrollLeft = saved.left
    window.scrollTo(0, saved.top)
    // Save whenever the player scrolls (sideways or down), and once more when leaving.
    const save = () => saveScroll(road)
    road.addEventListener('scroll', save, { passive: true })
    window.addEventListener('scroll', save, { passive: true })
    return () => {
      save()
      road.removeEventListener('scroll', save)
      window.removeEventListener('scroll', save)
    }
  }, [])

  // A normal mouse wheel scrolls up and down; here it scrolls the road sideways instead.
  function scrollSideways(event) {
    const road = event.currentTarget
    if (road.scrollWidth > road.clientWidth && Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      road.scrollLeft += event.deltaY
    }
  }

  return (
    <main className="home" ref={roadRef} onWheel={scrollSideways}>
      <section className="home-intro">
        <h1>Chess Campaign</h1>
        <p>
          Travel a world tour of chess clubs, tournaments and rivals. Every opponent has their own
          style, and every event moves your campaign forward.
        </p>
        <div className="player-card">
          <div className="avatar-with-stars">
            <Avatar bot={PLAYER} size={48} />
            <StarBadges stars={tierStars(progress)} />
          </div>
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
          {leaguesOpen && <SectionStars section="leagues" wonIn={wonIn} />}
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

      <section className="stage championship-stage" aria-label="Amateur Championship">
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
          {advancedOpen && <SectionStars section="advanced" wonIn={wonIn} />}
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

      <section className="stage championship-stage" aria-label="Advanced Championship">
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
          {expertOpen && <SectionStars section="expert" wonIn={wonIn} />}
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

      <section className="stage championship-stage" aria-label="Expert Championship">
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
          {masterOpen && <SectionStars section="master" wonIn={wonIn} />}
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

      <section className="stage championship-stage" aria-label="Master Championship">
        {masterChampionship.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            won={wonIn(event.id)}
            lockedText={isUnlocked(event, wonIn) ? null : lockText(event, wonIn)}
            onOpen={() => onOpenEvent(event)}
          />
        ))}
      </section>

      <section className="stage" aria-labelledby="legend-title">
        <h2 id="legend-title" className="section-title">
          Legend Leagues
          {legendOpen && <SectionStars section="legend" wonIn={wonIn} />}
          {!legendOpen && <span className="section-lock"> · 🔒 Win the Grandmaster Title Championship to unlock</span>}
        </h2>
        <div className="league-grid">
          {legend.map((event) => (
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

      <section className="stage championship-stage" aria-label="World Championship">
        {legendChampionship.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            won={wonIn(event.id)}
            lockedText={isUnlocked(event, wonIn) ? null : lockText(event, wonIn)}
            onOpen={() => onOpenEvent(event)}
          />
        ))}
      </section>
    </main>
  )
}

// What a locked championship asks for, like "Win 4 Amateur Leagues to unlock (1 of 4 won)".
function lockText(event, wonIn) {
  const { stars, section } = event.requires
  const name = { advanced: 'Advanced', expert: 'Expert', master: 'Master', legend: 'Legend' }[section] ?? 'Amateur'
  return `🔒 Win ${stars} ⭐ in the ${name} Leagues to unlock (${Math.min(starsWon(wonIn, section), stars)} of ${stars})`
}

// The stars won in a tier's leagues, shown next to its heading, like "⭐ 12/36".
function SectionStars({ section, wonIn }) {
  return (
    <span className="section-stars">
      {' · '}⭐ {starsWon(wonIn, section)}/{maxStars(section)}
    </span>
  )
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
          <Icon icon={event.icon} />
        </span>
        <h3>{event.title}</h3>
      </div>
      <p className="event-description">{event.description}</p>
      <div className="league-footer">
        {playable ? (
          <>
            {givesStars(event) ? <LeagueStars event={event} won={won} /> : event.rounds ? <TournamentProgress event={event} won={won} /> : <span />}
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

// A league card's stars, like "⭐ 3/6" (with a trophy once the league is won).
function LeagueStars({ event, won }) {
  const max = eventMaxStars(event)
  const stars = eventStars(event, won)
  return (
    <div className="bot-bio league-stars">
      {stars >= max && '🏆 '}⭐ {stars}/{max}
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
