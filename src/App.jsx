import { useState } from 'react'
import { BOTS } from './bots.js'
import { EVENTS } from './career.js'
import { LESSONS } from './lessons.js'
import { loadFairy } from './fairy/loadFairy.js'
import { isFairyVariant } from './fairy/variants.js'
import { clearProgress, loadProgress, roundsWon, saveProgress, withRoundWon } from './progress.js'
import Home from './Home.jsx'
import Menu from './Menu.jsx'
import Tournament from './Tournament.jsx'
import Game from './Game.jsx'
import './App.css'

// The top of the app. It decides which screen to show: the home screen, the developer
// menu (every bot), a tournament's bracket, or a game. It also keeps the career progress.
export default function App() {
  const [screen, setScreen] = useState('home') // 'home', 'dev', or a tournament's event id
  const [colorChoice, setColorChoice] = useState('w') // developer menu: 'w', 'b' or 'random'
  const [match, setMatch] = useState(null) // the game being played, or null
  const [progress, setProgress] = useState(loadProgress)

  // A game from the developer menu: any bot, with clocks.
  function playBot(bot) {
    const color = colorChoice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorChoice
    setMatch({ bot, color, timed: true, lesson: null })
  }

  // An event card on the home screen: a tournament opens its bracket, anything else starts a game.
  function openEvent(event) {
    if (event.comingSoon) return
    if (event.type === 'tournament') {
      setScreen(event.id)
      return
    }
    setMatch({
      bot: BOTS[event.bot],
      color: event.color,
      timed: event.timed,
      lesson: event.lesson ? LESSONS[event.lesson] : null,
    })
  }

  async function playTournamentRound(event, round) {
    const { opponent, color } = event.rounds[round]
    const variant = event.rounds[round].variant ?? event.variant ?? null
    // Fairy chess needs its rules library loaded before the game can start.
    if (isFairyVariant(variant)) await loadFairy()
    setMatch({
      bot: BOTS[opponent],
      color,
      timed: event.timed,
      minutes: event.minutes,
      variant,
      lesson: null,
      tournament: { event, round },
    })
  }

  // Called by the game when it ends. Winning a tournament round is saved.
  function handleResult(result) {
    const tournament = match?.tournament
    if (!tournament || result.outcome !== 'win') return
    const next = withRoundWon(progress, tournament.event.id, tournament.round)
    setProgress(next)
    saveProgress(next)
  }

  if (match) {
    return (
      <Game
        bot={match.bot}
        startColor={match.color}
        timed={match.timed}
        minutes={match.minutes}
        variant={match.variant}
        lesson={match.lesson}
        onResult={handleResult}
        exitLabel={match.tournament ? 'Back to bracket' : 'Back to menu'}
        onExit={() => setMatch(null)}
      />
    )
  }
  if (screen === 'dev') {
    return (
      <Menu
        colorChoice={colorChoice}
        onColorChoice={setColorChoice}
        onPlay={playBot}
        onBack={() => setScreen('home')}
        onResetProgress={() => setProgress(clearProgress())}
      />
    )
  }
  const tournament = EVENTS.find((event) => event.id === screen)
  if (tournament) {
    return (
      <Tournament
        event={tournament}
        roundsWon={roundsWon(progress, tournament.id)}
        onPlayRound={(round) => playTournamentRound(tournament, round)}
        onBack={() => setScreen('home')}
      />
    )
  }
  return <Home progress={progress} onOpenEvent={openEvent} onOpenDevMenu={() => setScreen('dev')} />
}
