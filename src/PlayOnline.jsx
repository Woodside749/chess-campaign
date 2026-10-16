import { useEffect, useRef, useState } from 'react'
import * as onlineApi from './online.js'
import { GAME_MODES, TIME_CHOICES, fixedTime, inviteSettings, modeById } from './gameModes.js'
import { FAIRY_VARIANTS } from './fairy/variants.js'
import Icon from './Icon.jsx'

// Every mode can be played online, except the Simul.
const ONLINE_MODES = GAME_MODES.filter((mode) => !mode.simul)
// How often a search asks the server again (which also keeps the search alive).
const SEARCH_EVERY_MS = 2500

// Play online: rated games against other players. Pick a mode (with your rating in each),
// the Fairy setup and the time, then Find opponent: the server pairs you with the player
// searching the same mode and clock whose rating is closest. When a game is found it opens
// like a game with friends (`onOpenGame(id)`). `api` is online.js; a test can pass a pretend one.
export default function PlayOnline({ account, onBack, onOpenGame, api = onlineApi }) {
  const myId = account.user?.id
  const [modeId, setModeId] = useState('blitz')
  const [setup, setSetup] = useState('archchess')
  const [minutes, setMinutes] = useState(10)
  const [ratings, setRatings] = useState({})
  const [searching, setSearching] = useState(null) // the settings being searched for
  const [waited, setWaited] = useState(0) // seconds searching
  const [problem, setProblem] = useState(null)
  const searchingRef = useRef(false)
  const mode = modeById(modeId)

  useEffect(() => {
    if (!myId) return
    api.loadRatings(myId).then(({ ratings: loaded }) => loaded && setRatings(loaded))
  }, [myId, api])

  // While searching: ask the server every few seconds until it finds a game.
  useEffect(() => {
    if (!searching) return
    searchingRef.current = true
    let cancelled = false
    const started = Date.now()
    const ask = async () => {
      const { gameId, error } = await api.findGame(searching)
      if (cancelled) return
      if (error) {
        setProblem(error)
        setSearching(null)
      } else if (gameId) {
        searchingRef.current = false
        setSearching(null)
        onOpenGame(gameId)
      }
    }
    ask()
    const timer = setInterval(() => {
      setWaited(Math.round((Date.now() - started) / 1000))
      ask()
    }, SEARCH_EVERY_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [searching, api, onOpenGame])

  // Leaving the screen (or cancelling) stops the search on the server too.
  useEffect(
    () => () => {
      if (searchingRef.current) api.stopSearching()
    },
    [api],
  )

  function cancel() {
    searchingRef.current = false
    setSearching(null)
    api.stopSearching()
  }

  const ratingIn = (id) => ratings[id]?.rating ?? api.START_RATING

  if (!myId) {
    return (
      <main className="friends-screen online-screen">
        <button className="back" onClick={onBack}>
          ← Main menu
        </button>
        <h1>Play online</h1>
        <p className="friends-empty">Log in (top right on the main menu) to play rated games against players from all over the world.</p>
      </main>
    )
  }

  return (
    <main className="game-modes online-modes">
      <aside className="mode-list-panel">
        <button className="back" onClick={onBack} disabled={Boolean(searching)}>
          ← Main menu
        </button>
        <h1>Play online</h1>
        <ul className="mode-list">
          {ONLINE_MODES.map((m) => (
            <li key={m.id}>
              <button
                className={m.id === modeId ? 'mode-item selected' : 'mode-item'}
                onClick={() => setModeId(m.id)}
                disabled={Boolean(searching)}
              >
                <span className="mode-icon" aria-hidden="true">
                  <Icon icon={m.icon} />
                </span>
                {m.title}
                <span className="mode-rating">{ratingIn(m.id)}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="mode-detail">
        <h2>
          <Icon icon={mode.icon} /> {mode.title}
        </h2>
        <p className="mode-text">{mode.text}</p>
        <p className="online-rating">
          Your rating: <strong>{ratingIn(mode.id)}</strong>
          {ratings[mode.id] ? ` · ${ratings[mode.id].games} game${ratings[mode.id].games === 1 ? '' : 's'}` : ' · not played yet'}
        </p>

        {mode.setups && (
          <div className="setup-choice" role="radiogroup" aria-label="Setup">
            {mode.setups.map((id) => (
              <button
                key={id}
                role="radio"
                aria-checked={setup === id}
                className={setup === id ? 'selected' : ''}
                onClick={() => setSetup(id)}
                disabled={Boolean(searching)}
              >
                {FAIRY_VARIANTS[id].title}
              </button>
            ))}
          </div>
        )}

        {!fixedTime(mode) && (
          <div className="color-choice time-choice" role="radiogroup" aria-label="Time">
            <span>Time</span>
            {TIME_CHOICES.map((m) => (
              <button
                key={m ?? 'none'}
                role="radio"
                aria-checked={minutes === m}
                className={minutes === m ? 'selected' : ''}
                onClick={() => setMinutes(m)}
                disabled={Boolean(searching)}
              >
                {m === null ? 'No time' : `${m} min`}
              </button>
            ))}
          </div>
        )}

        {problem && <p className="account-message error">{problem}</p>}

        {searching ? (
          <div className="online-searching">
            <span className="online-spinner" aria-hidden="true" />
            <div>
              <strong>Looking for an opponent…</strong>
              <span>
                Players near your rating ({ratingIn(mode.id)}) first; the search widens the longer you wait. {waited} s
              </span>
            </div>
            <button className="friend-button" onClick={cancel}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            className="event-play online-find"
            onClick={() => {
              setProblem(null)
              setWaited(0)
              setSearching(inviteSettings(mode, setup, minutes, 'random'))
            }}
          >
            Find opponent
          </button>
        )}
        <p className="mode-text online-note">
          Online games are rated: you start at 1200 in every mode. Your first games move your rating a lot, then less and less.
        </p>
      </section>
    </main>
  )
}
