import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { BOTS } from './bots.js'
import { EVENTS } from './career.js'
import { LESSONS } from './lessons.js'
import { loadFairy } from './fairy/loadFairy.js'
import { isFairyVariant } from './fairy/variants.js'
import {
  clearProgress,
  loadProgress,
  mergeProgress,
  roundsWon,
  saveProgress,
  withModeWin,
  withRoundWon,
} from './progress.js'
import { loadCloudProgress, saveCloudProgress } from './cloudProgress.js'
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
import { clockFor } from './gameModes.js'
import Profile from './Profile.jsx'
import Friends from './Friends.jsx'
import { PlayerContext, playerLook, playerTitle, tierStars, useDevTools } from './player.js'
import { useAccount } from './useAccount.js'
import { InviteContext } from './onlineContext.js'
import { sendInvite } from './online.js'
import OnlineGame from './OnlineGame.jsx'
import OnlineHub from './OnlineHub.jsx'
import InviteDialog from './InviteDialog.jsx'
import './App.css'

// The puzzle screen (with its puzzle collection) is only downloaded when first opened.
const PuzzleTrial = lazy(() => import('./puzzles/PuzzleTrial.jsx'))

// The top of the app. It decides which screen to show: the main menu, the campaign's home
// screen, the developer
// menu (every bot), a tournament's bracket, a puzzle trial, a simul, or a game. It also keeps the career progress.
export default function App() {
  const account = useAccount() // who is logged in (null when nobody)
  const myId = account.user?.id
  // Games between players: the one being played (its id), and who is being invited.
  const [onlineGameId, setOnlineGameId] = useState(null)
  const [inviting, setInviting] = useState(null) // a player card, while the invite window is open
  const openGame = useCallback((id) => setOnlineGameId(id), [])
  return (
    // Every screen can show the player's name and avatar (usePlayer in player.js), and open
    // the "Invite to game" window for another player (logged in only).
    <PlayerContext.Provider value={playerLook(account)}>
      <InviteContext.Provider value={myId ? setInviting : null}>
        <Screens account={account} onlineGameId={onlineGameId} onLeaveOnlineGame={() => setOnlineGameId(null)} />
        <OnlineHub account={account} inGame={onlineGameId !== null} onOpenGame={openGame} />
        {inviting && (
          <InviteDialog
            player={inviting}
            onSend={async (settings) => {
              const { error } = await sendInvite(myId, inviting.id, settings)
              if (!error) setInviting(null)
              return error ?? null
            }}
            onClose={() => setInviting(null)}
          />
        )}
      </InviteContext.Provider>
    </PlayerContext.Provider>
  )
}

// Picks the screen to show (see App above).
function Screens({ account, onlineGameId, onLeaveOnlineGame }) {
  // 'menu' (the main menu), 'home' (the chess campaign), 'dev', 'achievements', or an event id
  const [screen, setScreen] = useState('menu')
  const [colorChoice, setColorChoice] = useState('w') // developer menu: 'w', 'b' or 'random'
  const [match, setMatch] = useState(null) // the game being played, or null
  const [puzzleRun, setPuzzleRun] = useState(null) // the puzzle trial being played: { event, round }
  // The simul being played: { event, round } in the campaign, or { round, minutes, gameMode }
  // (round = { title, opponents, needed }) from the game modes menu.
  const [simulRun, setSimulRun] = useState(null)
  // What is picked in the game modes menu (kept here, so it is still there after a game).
  const [modesChoice, setModesChoice] = useState({ modeId: 'unlimited', color: 'w', setup: 'archchess', simulBots: [], minutes: 10 })
  // What is picked in the Play local menu: the mode, fairy setup and the two names.
  const [localChoice, setLocalChoice] = useState({ modeId: 'unlimited', setup: 'archchess', simulBots: [], names: { w: '', b: '' }, minutes: 10 })
  const [progress, setProgress] = useState(loadProgress)
  const userId = account.user?.id ?? null
  const devTools = useDevTools() // admins only: the developer menu

  // Saves progress in the browser, and to the account when logged in.
  function storeProgress(next) {
    saveProgress(next)
    if (userId) saveCloudProgress(userId, next)
  }

  // When a player logs in (or opens the page while logged in), the browser's progress and
  // the account's are combined, so nothing won on either side is lost. When they log out,
  // the browser forgets it (it is safe in the account), so the next person starts fresh.
  const previousUserRef = useRef(null)
  useEffect(() => {
    const previous = previousUserRef.current
    previousUserRef.current = userId
    if (!userId) {
      if (previous) {
        setProgress(clearProgress())
        setScreen((current) => (current === 'profile' ? 'menu' : current))
      }
      return
    }
    let cancelled = false
    loadCloudProgress(userId).then((cloud) => {
      if (cancelled) return
      setProgress((local) => {
        const merged = mergeProgress(local, cloud)
        saveProgress(merged)
        saveCloudProgress(userId, merged)
        return merged
      })
    })
    return () => {
      cancelled = true
    }
  }, [userId])

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
    setProgress((current) => {
      const next = withRoundWon(current, event.id, round)
      storeProgress(next)
      return next
    })
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
      storeProgress(next)
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
    setMatch({ bot, color, ...clockFor(mode, modesChoice.minutes), variant, lesson: null, gameMode: mode.id })
  }

  // A local game: two people on one device (Play local), in any mode but the Simul.
  async function playLocal(mode) {
    const variant = mode.setups ? localChoice.setup : (mode.variant ?? null)
    if (isFairyVariant(variant)) await loadFairy()
    const names = { w: localChoice.names.w.trim() || 'White', b: localChoice.names.b.trim() || 'Black' }
    // Two players with the same name would be confusing ("Emma wins!"), so tell them apart.
    if (names.w === names.b) names.b += ' (Black)'
    setMatch({ bot: null, color: 'w', ...clockFor(mode, localChoice.minutes), variant, lesson: null, local: names })
  }

  if (onlineGameId !== null) {
    return <OnlineGame key={onlineGameId} gameId={onlineGameId} account={account} progress={progress} onExit={onLeaveOnlineGame} />
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
        timed={simulRun.timed}
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
        local={match.local}
        variant={match.variant}
        lesson={match.lesson}
        playerTitle={playerTitle(progress)}
        playerStars={tierStars(progress)}
        onResult={handleResult}
        exitLabel={
          match.tournament
            ? 'Back to bracket'
            : match.gameMode
              ? 'Back to game modes'
              : match.local
                ? 'Back to play local'
                : 'Back to menu'
        }
        onExit={() => setMatch(null)}
      />
    )
  }
  if (screen === 'dev' && devTools) {
    return (
      <Menu
        colorChoice={colorChoice}
        onColorChoice={setColorChoice}
        onPlay={playBot}
        onBack={() => setScreen('home')}
        onResetProgress={() => {
          const empty = clearProgress()
          if (userId) saveCloudProgress(userId, empty)
          setProgress(empty)
        }}
      />
    )
  }
  if (screen === 'menu') {
    return (
      <MainMenu
        progress={progress}
        account={account}
        onOpenCampaign={() => setScreen('home')}
        onOpenGameModes={() => setScreen('modes')}
        onOpenProfile={() => setScreen('profile')}
        onOpenLocal={() => setScreen('local')}
        onOpenFriends={() => setScreen('friends')}
      />
    )
  }
  if (screen === 'profile' && account.user) {
    return (
      <Profile progress={progress} account={account} onBack={() => setScreen('menu')} onOpenFriends={() => setScreen('friends')} />
    )
  }
  if (screen === 'friends') {
    return <Friends account={account} onBack={() => setScreen('menu')} />
  }
  if (screen === 'local') {
    return (
      <GameModes
        local
        progress={progress}
        choice={localChoice}
        onChoice={setLocalChoice}
        onPlayLocal={playLocal}
        onBack={() => setScreen('menu')}
      />
    )
  }
  if (screen === 'modes') {
    return (
      <GameModes
        progress={progress}
        choice={modesChoice}
        onChoice={setModesChoice}
        onPlay={playGameMode}
        onPlaySimul={(mode, opponents) =>
          setSimulRun({ round: { title: 'Simul', opponents, needed: 2 }, ...clockFor(mode, modesChoice.minutes), gameMode: mode.id })
        }
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
