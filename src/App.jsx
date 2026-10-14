import { lazy, Suspense, useState } from 'react'
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
import PuzzleLeague from './puzzles/PuzzleLeague.jsx'
import SimulLeague from './SimulLeague.jsx'
import Simul from './Simul.jsx'
import Achievements from './Achievements.jsx'
import { playerTitle, tierStars } from './player.js'
import './App.css'

// The puzzle screen (with its puzzle collection) is only downloaded when first opened.
const PuzzleTrial = lazy(() => import('./puzzles/PuzzleTrial.jsx'))

// The top of the app. It decides which screen to show: the home screen, the developer
// menu (every bot), a tournament's bracket, a puzzle trial, a simul, or a game. It also keeps the career progress.
export default function App() {
  const [screen, setScreen] = useState('home') // 'home', 'dev', 'achievements', or an event id
  const [colorChoice, setColorChoice] = useState('w') // developer menu: 'w', 'b' or 'random'
  const [match, setMatch] = useState(null) // the game being played, or null
  const [puzzleRun, setPuzzleRun] = useState(null) // the puzzle trial being played: { event, round }
  const [simulRun, setSimulRun] = useState(null) // the simul being played: { event, round }
  const [progress, setProgress] = useState(loadProgress)

  // A game from the developer menu: any bot, with clocks.
  function playBot(bot) {
    const color = colorChoice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorChoice
    setMatch({ bot, color, timed: true, lesson: null })
  }

  // An event card on the home screen: a tournament or puzzle league opens its own screen,
  // anything else starts a game.
  function openEvent(event) {
    if (event.comingSoon) return
    if (event.type === 'tournament' || event.type === 'trials' || event.type === 'simul') {
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
      increment: event.increment,
      peeks: event.peeks,
      variant,
      lesson: null,
      tournament: { event, round },
    })
  }

  // Saves that round `round` of a tournament or puzzle league was won.
  function saveRoundWon(event, round) {
    const next = withRoundWon(progress, event.id, round)
    setProgress(next)
    saveProgress(next)
  }

  // Called by the game when it ends. Winning a tournament round is saved.
  function handleResult(result) {
    const tournament = match?.tournament
    if (tournament && result.outcome === 'win') saveRoundWon(tournament.event, tournament.round)
  }

  if (puzzleRun) {
    const { event, round } = puzzleRun
    return (
      <Suspense fallback={<p className="loading">Loading puzzles…</p>}>
        <PuzzleTrial
          trial={event.rounds[round]}
          onFinish={(passed) => passed && saveRoundWon(event, round)}
          onExit={() => setPuzzleRun(null)}
        />
      </Suspense>
    )
  }

  if (simulRun) {
    const { event, round } = simulRun
    return (
      <Simul
        key={round}
        round={event.rounds[round]}
        minutes={event.minutes}
        onFinish={(passed) => passed && saveRoundWon(event, round)}
        onExit={() => setSimulRun(null)}
      />
    )
  }

  if (match) {
    return (
      <Game
        bot={match.bot}
        startColor={match.color}
        timed={match.timed}
        minutes={match.minutes}
        increment={match.increment}
        peeks={match.peeks}
        variant={match.variant}
        lesson={match.lesson}
        playerTitle={playerTitle(progress)}
        playerStars={tierStars(progress)}
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
  if (screen === 'achievements') return <Achievements progress={progress} onBack={() => setScreen('home')} />
  const opened = EVENTS.find((event) => event.id === screen)
  if (opened?.type === 'trials') {
    return (
      <PuzzleLeague
        event={opened}
        roundsWon={roundsWon(progress, opened.id)}
        onPlayTrial={(round) => setPuzzleRun({ event: opened, round })}
        onBack={() => setScreen('home')}
      />
    )
  }
  if (opened?.type === 'simul') {
    return (
      <SimulLeague
        event={opened}
        roundsWon={roundsWon(progress, opened.id)}
        onPlayRound={(round) => setSimulRun({ event: opened, round })}
        onBack={() => setScreen('home')}
      />
    )
  }
  if (opened?.type === 'tournament') {
    return (
      <Tournament
        event={opened}
        roundsWon={roundsWon(progress, opened.id)}
        playerTitle={playerTitle(progress)}
        onPlayRound={(round) => playTournamentRound(opened, round)}
        onBack={() => setScreen('home')}
      />
    )
  }
  return (
    <Home
      progress={progress}
      onOpenEvent={openEvent}
      onOpenAchievements={() => setScreen('achievements')}
      onOpenDevMenu={() => setScreen('dev')}
    />
  )
}
