import { useEffect, useState } from 'react'
import * as onlineApi from './online.js'
import { isFairyVariant } from './fairy/variants.js'
import { loadFairy } from './fairy/loadFairy.js'
import { playerTitle, tierStars } from './player.js'
import Game from './Game.jsx'

// A game against another player: loads it from Supabase, listens for changes (moves, draw
// offers, the end) and shows it on the normal game screen in its online version. `compact`
// shows the small board of the simul screen, and `onResult` hears how the game ended.
// If this screen gets out of step with the server, the game is loaded again from scratch.
export default function OnlineGame({ gameId, account, progress, onExit, compact = false, onResult, api = onlineApi }) {
  const myId = account.user?.id
  const [game, setGame] = useState(null)
  const [problem, setProblem] = useState(null)
  const [version, setVersion] = useState(0) // bumped to rebuild the board from the server

  useEffect(() => {
    if (!myId) return
    let cancelled = false
    const load = async () => {
      const { game: loaded, error } = await api.loadGame(gameId, myId)
      if (cancelled) return
      if (error) {
        setProblem(error)
        return
      }
      if (isFairyVariant(loaded.variant)) await loadFairy()
      if (!cancelled) setGame(loaded)
    }
    load()
    const stop = api.watchGame(gameId, load)
    return () => {
      cancelled = true
      stop()
    }
  }, [gameId, myId, api, version])

  if (problem) {
    return (
      <main className="app">
        <p className="account-message error">{problem}</p>
        <button className="back" onClick={onExit}>
          ← Main menu
        </button>
      </main>
    )
  }
  if (!game) return compact ? <section className="simul-board simul-waiting">Loading…</section> : <p className="loading">Loading the game…</p>

  return (
    <Game
      key={version}
      bot={null}
      startColor={game.myColor}
      timed={game.timed}
      minutes={game.minutes}
      increment={game.increment}
      variant={game.variant}
      playerTitle={playerTitle(progress)}
      playerStars={tierStars(progress)}
      online={{
        ...game,
        api,
        onResync: () => {
          setGame(null)
          setVersion((n) => n + 1)
        },
      }}
      exitLabel="Back to menu"
      onExit={onExit}
      compact={compact}
      onResult={onResult}
    />
  )
}
