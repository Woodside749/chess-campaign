import { lazy, Suspense, useState } from 'react'
import { BOTS } from './bots.js'
import { EVENTS } from './career.js'
import { LESSONS } from './lessons.js'
import { loadFairy } from './fairy/loadFairy.js'
import { isFairyVariant } from './fairy/variants.js'
import { clearProgress, loadProgress, roundsWon, saveProgress, withModeWin, withRoundWon } from './progress.js'
import Home from './Home.jsx'
import Menu from './Menu.jsx'
import Tournament from './Tournament.jsx'
import Game from './Game.jsx'
import PuzzleLeague from './puzzles/PuzzleLeague.jsx'
import SimulLeague from './SimulLeague.jsx'
import Simul from './Simul.jsx'
import Achievements from './Achievements.jsx'
import MainMenu from './MainMenu.jsx'
import GameModes from './GameModes.jsx'
import { playerTitle, tierStars } from './player.js'
import './App.css'

// The puzzle screen (with its puzzle collection) is only downloaded when first opened.
const PuzzleTrial = lazy(() => import('./puzzles/PuzzleTrial.jsx'))

// The top of the app. It decides which screen to show: the main menu, the campaign's home
// screen, the developer
// menu (every bot), a tournament's bracket, a puzzle trial, a simul, or a game. It also keeps the career progress.
export default function App() {
  // 'menu' (the main menu), 'home' (the chess campaign), 'dev', 'achievements', or an event id
  const [screen, setScreen] = useState('menu')
  const [colorChoice, setColorChoice] = useState('w') // developer menu: 'w', 'b' or 'random'
  const [match, setMatch] = useState(null) // the game being played, or null
  const [puzzleRun, setPuzzleRun] = useState(null) // the puzzle trial being played: { event, round }
  // The simul being played: { event, round } in the campaign, or { round, minutes, gameMode }
  // (round = { title, opponents, needed }) from the game modes menu.
  const [simulRun, setSimulRun] = useState(null)
  // What is picked in the game modes menu (kept here, so it is still there after a game).
  const [modesChoice, setModesChoice] = useState({ modeId: 'unlimited', color: 'w', setup: 'archchess', simulBots: [] })
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
    if (match?.gameMode && result.outcome === 'win') saveModeWin(match.gameMode, match.bot.id)
  }

  // Saves that `botId` was beaten in game mode `modeId` (the 🏆 in the game modes menu).
  function saveModeWin(modeId, botId) {
    setProgress((current) => {
      const next = withModeWin(current, modeId, botId)
      saveProgress(next)
      return next
    })
  }

  // A game from the game modes menu: any bot, in any mode.
  async function playGameMode(mode, bot) {
    const pick = modesChoice.color
    const color = pick === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : pick
    const variant = mode.setups ? modesChoice.setup : (mode.variant ?? null)
    // Fairy chess and the other engine variants need their rules library loaded first.
    if (isFairyVariant(variant)) await loadFairy()
    setMatch({
      bot,
      color,
      timed: mode.timed ?? true,
      minutes: mode.minutes ?? 10,
      increment: mode.increment,
      variant,
      lesson: null,
      gameMode: mode.id,
    })
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

  if (simulRun?.gameMode) {
    // A simul from the game modes menu: every board won is a 🏆 against that bot.
    return (
      <Simul
        round={simulRun.round}
        minutes={simulRun.minutes}
        onFinish={() => {}}
        onGameResult={(botId, outcome) => outcome === 'win' && saveModeWin(simulRun.gameMode, botId)}
        onExit={() => setSimulRun(null)}
      />
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
        exitLabel={match.tournament ? 'Back to bracket' : match.gameMode ? 'Back to game modes' : 'Back to menu'}
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
  if (screen === 'menu') {
    return <MainMenu progress={progress} onOpenCampaign={() => setScreen('home')} onOpenGameModes={() => setScreen('modes')} />
  }
  if (screen === 'modes') {
    return (
      <GameModes
        progress={progress}
        choice={modesChoice}
        onChoice={setModesChoice}
        onPlay={playGameMode}
        onPlaySimul={(mode, opponents) => setSimulRun({ round: { title: 'Simul', opponents, needed: 2 }, minutes: 10, gameMode: mode.id })}
        onBack={() => setScreen('menu')}
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
      onBackToMenu={() => setScreen('menu')}
      onOpenDevMenu={() => setScreen('dev')}
    />
  )
}
