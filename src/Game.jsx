import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { pickLine, shownRating } from './bots.js'
import { chooseBotMove, thinkTimeMs } from './botBrain.js'
import { visibleSquares } from './fogChess.js'
import { chooseFogMove, createFogMemory } from './fogBot.js'
import { FairyGame, boardFen, withoutDuck } from './fairy/FairyGame.js'
import { fairyEngineFor } from './fairy/fairyEngine.js'
import { simpleFairyMove } from './fairy/simpleFairyBot.js'
import { allPieces } from './fairy/fairyPieces.js'
import { fairyRules } from './fairy/loadFairy.js'
import { FAIRY_PIECES, FAIRY_VARIANTS, isFairyVariant } from './fairy/variants.js'
import { randomChess960Fen } from './fairy/chess960.js'
import { seededRandom } from './seededRandom.js'
import { ChaosGame } from './chaos/ChaosGame.js'
import { rollPiece } from './chaos/diceRules.js'
import Pocket from './Pocket.jsx'
import { moveSound, playSound } from './sounds.js'
import SettingsButton from './Settings.jsx'
import { chooseChaosMove } from './chaos/chaosBot.js'
import ChaosPanel from './chaos/ChaosPanel.jsx'
import { getEngine } from './engine.js'
import { capturedPieces, materialScore, missingPieces } from './material.js'
import { strengthForRating, withoutTraits } from './botStrength.js'
import { premoveTargets } from './premove.js'
import { boardResult, reactionTo, timeoutResult } from './rules.js'
import Avatar from './Avatar.jsx'
import Icon from './Icon.jsx'
import TitleBadge from './TitleBadge.jsx'
import StarBadges from './StarBadges.jsx'
import { titleById, useDevTools, usePlayer } from './player.js'
import CapturedPieces from './CapturedPieces.jsx'
import Clock from './Clock.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import GameOverDialog from './GameOverDialog.jsx'
import LessonPanel from './LessonPanel.jsx'
import PromotionPicker from './PromotionPicker.jsx'

const START_TIME_MS = 10 * 60 * 1000 // 10 minutes each, unless the event says otherwise

// Local games: the avatar colours of the two players.
const LOCAL_COLORS = { w: '#a39e94', b: '#4a4844' }

// Clock state: time left for each side when its turn began, and when the current
// turn began. White's clock starts running as soon as the game starts.
const freshClock = (minutes) => {
  const ms = minutes ? minutes * 60 * 1000 : START_TIME_MS
  return { w: ms, b: ms, turnStart: Date.now() }
}

// A new game: normal chess (which Fog of War also uses), Chaos Chess (our own rules on
// top of chess.js), or a variant that runs on the rules library (it must already be
// loaded, see loadFairy.js): fairy chess, or Fischer Random with a new random starting
// position every game. `seed` (online games) makes the random parts (the Fischer Random
// start, Chaos rules, dice) come out the same for both players.
function createGame(variant, seed) {
  const random = seed === undefined ? Math.random : seededRandom(seed)
  if (variant === 'chaos') return new ChaosGame(undefined, undefined, random)
  if (variant === 'dice') return new ChaosGame(undefined, rollPiece, random)
  if (!isFairyVariant(variant)) return new Chess()
  const info = FAIRY_VARIANTS[variant]
  const game = info.chess960
    ? new FairyGame(fairyRules(), info.rules, randomChess960Fen(random), true)
    : new FairyGame(fairyRules(), info.rules ?? variant)
  game.winText = info.winText // how to describe a special win, like reaching the hill
  return game
}

// Online games: a move as it is sent to the other player (it works for every kind of game:
// promotions, Crazyhouse drops like "N@", the duck's square, and Chaos moves by name).
const moveForWire = (move) => ({
  from: move.from,
  to: move.to,
  promotion: move.promotion || undefined,
  duck: move.duckSquare || undefined,
  lan: move.lan || undefined,
})

// Plays a move that came from the other player.
function playWireMove(game, move) {
  if (game instanceof ChaosGame && move.lan) return game.move(move.lan)
  return game.move({ from: move.from, to: move.to, promotion: move.promotion, duck: move.duck })
}

// A FEN the board drawing understands: without a Crazyhouse pocket or promoted-piece marks,
// and with Duck Chess's duck ("*") written as "X", which is drawn as a duck.
const drawableFen = (fen) => [boardFen(fen).replace('*', 'X'), ...fen.split(' ').slice(1)].join(' ')
// Blindfold: an empty board.
const EMPTY_BOARD = '8/8/8/8/8/8/8/8 w - - 0 1'
// Blindfold: how long a peek at the pieces lasts. (How many peeks a game allows is the
// `peeks` setting; none unless the event gives some.)
const PEEK_MS = 3000

// What a hidden square looks like in Fog of War.
const FOG_STYLE = { background: '#4a4844', boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.15)' }

// Returns the clock after `color` has moved: their thinking time is subtracted, the
// increment (if any) is added, and the other side's clock starts running.
function pressClock(clock, color, incrementMs = 0) {
  const now = Date.now()
  return { ...clock, [color]: clock[color] - (now - clock.turnStart) + incrementMs, turnStart: now }
}

// The game screen: games against `bot`, with the player as `startColor` ('w' or 'b').
// `timed` turns the clocks on or off. `lesson` is an optional script from lessons.js
// that the coach walks through before the game carries on normally.
// `onResult` is called once with the result when a game ends. `exitLabel` names the
// game-over pop-up's way out, like "Back to bracket". `minutes` sets the clocks,
// `increment` is the seconds added after each move, and `variant` can be 'fog' for Fog of War.
// `peeks` (Blindfold only) is how many times the player may look at the pieces for a moment.
// `compact` draws a small board for the Simul screen, which shows three at once: no back
// button, move list, review buttons or game-over pop-up (the result shows under the board).
// `playerTitle` is the player's title (like Master), shown as a badge by their name, and
// `playerStars` the tier stars they have earned, shown small next to their avatar.
// `online` makes it a game against another player (see OnlineGame.jsx): the game from
// online.js (its moves, server clock, status, `myColor`, `opponent`) plus `api` (online.js)
// and `onResync()` for when this screen got out of step with the server.
// `local` turns it into a game for two people on one device (Play local), with their
// names like { w: 'Emma', b: 'Noah' } and no bot: the board turns to whoever is to move,
// and in Fog of War a cover hides the board while the device is passed over.
export default function Game({
  bot,
  startColor,
  timed = true,
  minutes,
  increment = 0,
  variant = null,
  lesson = null,
  onResult,
  exitLabel,
  onExit,
  compact = false,
  playerTitle = null,
  playerStars = [],
  peeks = 0,
  local = null,
  online = null,
}) {
  const player = usePlayer() // the player's name and avatar (from their account)
  const devTools = useDevTools() // admins only: the auto-win buttons
  // chess.js holds the real game (rules, history), also in Fog of War, which only hides
  // squares. `fen` is a text snapshot of the position that we keep in React state, so
  // the screen re-draws after every move.
  const [game, setGame] = useState(() => {
    const fresh = createGame(variant, online?.seed)
    // Online: replay the moves played so far (when joining or rejoining a game).
    for (const move of online?.moves ?? []) playWireMove(fresh, move)
    return fresh
  })
  const fog = variant === 'fog'
  // Chaos Chess and Dice Chess both roll a rule each turn (see chaos/).
  const chaos = variant === 'chaos' || variant === 'dice'
  const blind = variant === 'blindfold'
  const fairy = isFairyVariant(variant) ? FAIRY_VARIANTS[variant] : null
  const duck = Boolean(fairy?.duck)
  // In Fog of War, the bot's memory of where it last saw the player's pieces.
  const fogMemoryRef = useRef(null)
  const [fen, setFen] = useState(game.fen())
  // Whose pieces can be moved (and are shown at the bottom): the player's, or in a local
  // game whoever is to move.
  const playerColor = online ? online.myColor : local ? game.turn() : startColor
  const [selected, setSelected] = useState(null)
  const [clock, setClock] = useState(() => freshClock(minutes))
  // Online, the server keeps the clocks; after our own move we press our clock here until
  // the server's answer arrives (`from` is the server clock it was pressed on).
  const [pressed, setPressed] = useState(null)
  const shownClock = online ? (pressed?.from === online.clock ? pressed.clock : online.clock) : clock
  const [now, setNow] = useState(() => Date.now())
  const [speech, setSpeech] = useState(() => (local || online ? null : pickLine(bot, 'start')))
  // Local Fog of War: the board is covered after each move until the next player is ready.
  const [covered, setCovered] = useState(false)
  const [dialogClosed, setDialogClosed] = useState(false)
  // Which position you are looking at when stepping back through the moves:
  // a number of moves from the start, or null for the live position.
  const [viewPly, setViewPly] = useState(null)
  // A pawn move to the last rank waiting for you to pick a piece, like { from: 'e7', to: 'e8' }.
  const [pendingPromotion, setPendingPromotion] = useState(null)
  // Duck Chess: a piece move waiting for the duck to be placed, like { from, to, promotion }.
  const [pendingDuck, setPendingDuck] = useState(null)
  // Blindfold: whether the pieces are shown right now, and how many peeks are left.
  const [peeking, setPeeking] = useState(false)
  const [peeksLeft, setPeeksLeft] = useState(peeks)
  const [resigned, setResigned] = useState(false)
  // Set by the developer-only Auto-win button.
  const [autoWon, setAutoWon] = useState(false)
  // Which "are you sure?" pop-up is open: 'resign', 'leave' or null.
  const [confirming, setConfirming] = useState(null)
  // Lesson progress: which step the coach is on, whether the coach is about to answer
  // the player's move, and a gentle hint after a wrong move.
  const [lessonStep, setLessonStep] = useState(0)
  const [replyPending, setReplyPending] = useState(false)
  const [lessonHint, setLessonHint] = useState(null)
  const inLesson = lesson !== null && lessonStep < lesson.length
  const step = inLesson ? lesson[lessonStep] : null
  // A move the player has queued while the bot is thinking, like { from: 'e2', to: 'e4' }.
  // It is kept in state (to draw it) and in a ref (so the bot's move code can read it).
  const [premove, setPremoveState] = useState(null)
  const premoveRef = useRef(null)
  const setPremove = (value) => {
    premoveRef.current = value
    setPremoveState(value)
  }

  const botColor = playerColor === 'w' ? 'b' : 'w'
  const turn = game.turn()

  // Time left on each clock right now. Only the side to move is losing time,
  // and the clocks stop once the game is decided on the board or you resign.
  const finishedOnBoard = boardResult(game, playerColor)
  const stopped = finishedOnBoard || resigned || autoWon
  const onlineOver = online?.status === 'finished'
  // (Online, the clocks start with White's first move.)
  const notStarted = online && online.moves.length === 0
  const elapsed = stopped || onlineOver || notStarted ? 0 : Math.max(0, now - shownClock.turnStart)
  const timeLeft = timed
    ? { w: shownClock.w - (turn === 'w' ? elapsed : 0), b: shownClock.b - (turn === 'b' ? elapsed : 0) }
    : { w: Infinity, b: Infinity }

  // The game is over by checkmate/draw on the board, by resigning, or because a clock hit zero.
  // Only worked out again when something it depends on changes (`fen` changes with every move).
  const flagged = timeLeft[turn] <= 0
  const result = useMemo(
    () =>
      online
        ? onlineResult(game, online, playerColor)
        : local
        ? localResult(game, local, resigned, flagged)
        : (boardResult(game, playerColor) ??
          (autoWon ? { outcome: 'win', reason: 'Auto-win (developer button).' } : null) ??
          (resigned ? { outcome: 'loss', reason: 'You resigned.' } : null) ??
          (flagged ? timeoutResult(game, turn, playerColor) : null)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `game` changes in place; `fen` tells us when
    [game, fen, playerColor, resigned, autoWon, flagged, turn, local, online],
  )
  const gameOver = result !== null
  const clockRunning = timed && !gameOver
  const isPlayersTurn = turn === playerColor && !gameOver
  const botThinking = turn === botColor && !gameOver
  // The bot's time left when its turn began. Only changes when a move is made.
  // Without clocks, the bot thinks as if it had a fresh 10 minutes.
  const botTimeLeft = timed ? clock[botColor] : START_TIME_MS
  // How long each clock started with, so bots can pace themselves in fast games.
  const clockMs = minutes ? minutes * 60 * 1000 : START_TIME_MS
  const incrementMs = increment * 1000
  // Fog of War: the player is told when they are in check, but not by what.
  const playerInCheck = fog && !gameOver && turn === playerColor && game.inCheck()
  // Racing Kings is always shown from White's side; otherwise from the player's side.
  const orientation = fairy?.whiteView || playerColor === 'w' ? 'white' : 'black'

  // Stepping back through the game. While viewing an earlier position the board is
  // locked: you can look, but not move.
  const history = game.history({ verbose: true })
  const plyCount = history.length
  const viewing = viewPly !== null && viewPly < plyCount
  const shownPly = viewing ? viewPly : plyCount
  const shownFen = !viewing ? fen : viewPly === 0 ? history[0].before : history[viewPly - 1].after

  // Fog of War: while the game is on, the player only sees the squares their pieces can
  // see (also when stepping back through the moves). When it ends, everything is revealed.
  const fogActive = fog && !gameOver
  const visible = fogActive ? visibleSquares(shownFen, playerColor) : null
  // (Fog of War gives the board a list of the pieces to show instead of a FEN.)
  // Blindfold hides every piece while the game is on (unless you are peeking). In Duck
  // Chess, while you choose where the duck goes, the board shows your move without it.
  const pendingDuckMove = pendingDuck && duckMoves(game, pendingDuck)[0]
  const boardPosition = fogActive
    ? fogPosition(shownFen, playerColor, visible)
    : blind && !gameOver && !peeking
      ? EMPTY_BOARD
      : pendingDuckMove
        ? drawableFen(withoutDuck(pendingDuckMove.after))
        : drawableFen(shownFen)

  const captured = variant === 'atomic' ? missingPieces(game, game.startFen) : capturedPieces(game)
  const score = materialScore(game) // positive: White is ahead
  const advantage = (color) => (color === 'w' ? score : -score)

  // Tell the screen that started this game how it ended, once per game.
  const reportedRef = useRef(false)
  useEffect(() => {
    if (!result || reportedRef.current) return
    reportedRef.current = true
    // 'win', 'loss' or 'draw' (a local game always has a winner to cheer for, or a draw)
    playSound(local ? (result.winner ? 'win' : 'draw') : result.outcome)
    onResult?.(result)
  }, [result, onResult, local])

  // Sounds: a chime when a game starts, and a sound for every move (yours and the bot's).
  useEffect(() => playSound('start'), [game])
  const soundedPlyRef = useRef(0)
  useEffect(() => {
    if (plyCount > soundedPlyRef.current) playSound(moveSound(history[plyCount - 1]))
    soundedPlyRef.current = plyCount
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new move should make a sound
  }, [plyCount])

  // A warning sound, once per game, when your clock gets low: under a tenth of the
  // starting time, but at least 10 seconds (10 s in bullet, 18 s in 3-minute blitz).
  const lowTimeWarnedRef = useRef(false)
  const lowTimeMs = Math.max(10_000, clockMs * 0.1)
  const playerTimeLeft = timeLeft[playerColor]
  useEffect(() => {
    if (!timed || gameOver || lowTimeWarnedRef.current) return
    if (playerTimeLeft > 0 && playerTimeLeft < lowTimeMs) {
      lowTimeWarnedRef.current = true
      playSound('lowTime')
    }
  }, [timed, gameOver, playerTimeLeft, lowTimeMs])

  // While a clock is running, update `now` 10 times a second so the clock ticks.
  useEffect(() => {
    if (!clockRunning) return
    const timer = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(timer)
  }, [clockRunning])

  // The left and right arrow keys step back and forward through the moves.
  useEffect(() => {
    function onKey(event) {
      if (event.key === 'ArrowLeft') setViewPly((v) => Math.max(0, (v ?? plyCount) - 1))
      else if (event.key === 'ArrowRight') setViewPly((v) => (v === null || v + 1 >= plyCount ? null : v + 1))
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [plyCount])

  // During a lesson, the coach answers the player's move with the scripted reply,
  // after a short pause, and then moves on to the next step.
  useEffect(() => {
    if (!replyPending) return
    const timer = setTimeout(() => {
      if (step.reply) game.move({ from: step.reply.slice(0, 2), to: step.reply.slice(2, 4) })
      setReplyPending(false)
      setLessonStep((n) => n + 1)
      setFen(game.fen())
    }, 900)
    return () => clearTimeout(timer)
  }, [replyPending, step, game])

  // Blindfold: a peek shows the pieces for a few seconds.
  useEffect(() => {
    if (!peeking) return
    const timer = setTimeout(() => setPeeking(false), PEEK_MS)
    return () => clearTimeout(timer)
  }, [peeking])

  // Whenever the position changes and it's the bot's turn, let the bot move.
  // (Not during a lesson: then the coach's moves come from the script.)
  useEffect(() => {
    if (local || online || gameOver || inLesson || game.turn() !== botColor) return
    let cancelled = false // set if a new game starts, time runs out or you leave while the bot is thinking

    async function playBotMove() {
      const started = Date.now()
      const thinkMs = thinkTimeMs(game, bot, botTimeLeft, clockMs, incrementMs)
      let choice
      if (fog) {
        fogMemoryRef.current ??= createFogMemory(game, botColor)
        choice = await chooseFogMove(game, bot, botTimeLeft, fogMemoryRef.current)
      } else if (chaos) {
        // Chaos Chess: the bot plays by this turn's rule (see chaos/chaosBot.js).
        choice = await chooseChaosMove(game, bot, botTimeLeft, clockMs)
      } else if (fairy?.chess960) {
        // Fischer Random: normal Stockfish in its Chess960 mode. The bot keeps its
        // personality, but opening books make no sense with a shuffled start.
        const engine = { analyse: (fen, options) => getEngine().analyse(fen, { ...options, chess960: true }) }
        choice = await chooseBotMove(game, { ...bot, openings: null }, botTimeLeft, engine, clockMs)
      } else if (fairy) {
        // Fairy chess and the other engine variants: Fairy-Stockfish thinks. Opening books
        // are left out (they are for normal chess), and personality traits that make no
        // sense in the variant are dropped (see ignoreTraits). If Fairy-Stockfish can't
        // start in this browser, a simple backup brain plays instead.
        const engine = await fairyEngineFor(fairy.rules ?? variant).catch((error) => {
          console.warn(`${error.message}; using the simple fairy bot instead.`)
          return null
        })
        // Variants with a measured strength curve (calibrate-fairy) set the bot's strength
        // from its rating label, so it plays at that rating in this variant too.
        const variantBot = {
          ...bot,
          openings: null,
          style: withoutTraits(bot.style, fairy.ignoreTraits),
          ...(fairy.strengthCurve ? { strength: strengthForRating(fairy.strengthCurve, bot.rating) } : {}),
        }
        choice = engine ? await chooseBotMove(game, variantBot, botTimeLeft, engine, clockMs) : simpleFairyMove(game, bot)
      } else {
        choice = await chooseBotMove(game, bot, botTimeLeft, undefined, clockMs)
      }
      // Wait out the rest of the thinking time, so the bot doesn't reply instantly.
      const wait = thinkMs - (Date.now() - started)
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
      if (cancelled) return
      const move = game.move(choice)
      setClock((c) => pressClock(c, botColor, incrementMs))
      let line = reactionLine(bot, move, playerColor)

      // If the player queued a premove, play it straight away, if it's still legal.
      const queued = premoveRef.current
      if (queued && !game.isGameOver()) {
        premoveRef.current = null
        setPremoveState(null)
        try {
          const reply = game.move({ ...queued, promotion: 'q' })
          setClock((c) => pressClock(c, playerColor, incrementMs))
          line = reactionLine(bot, reply, playerColor) ?? line
        } catch {
          // The premove isn't legal in the new position, so it's dropped.
        }
      }

      if (line) setSpeech(line)
      setViewPly(null) // jump back to the live position so you see the bot's move
      setFen(game.fen())
    }
    playBotMove()

    return () => {
      cancelled = true
    }
  }, [fen, playerColor, botColor, botTimeLeft, clockMs, incrementMs, game, gameOver, inLesson, bot, fog, chaos, fairy, variant, local, online])

  // Tries to play the player's move. Returns true if it was legal.
  // A pawn reaching the last rank first opens the promotion picker, unless
  // `promotion` (the chosen piece) is given.
  function tryPlayerMove(from, to, promotion) {
    // In Fischer Random you castle by moving the king onto its rook. Dropping it on the
    // castling square (g1/c1) also works, unless a normal king move goes there.
    const pieceMoves = game.moves({ square: from, verbose: true })
    let legal = pieceMoves.filter((m) => m.to === to)
    if (legal.length === 0) legal = pieceMoves.filter((m) => m.castleTo === to)
    if (legal.length === 0) return false
    to = legal[0].to
    // In a lesson, only the move the coach asked for is allowed.
    if (inLesson && (replyPending || from + to !== step.move)) {
      setLessonHint(step.move ? "That's a legal move, but let's practise this one first." : 'Press Continue first.')
      setSelected(null)
      return false
    }
    setSelected(null)
    if (legal[0].promotion && !promotion) {
      setPendingPromotion({ from, to })
      return true
    }
    // Duck Chess: the move is only finished once the duck has been placed.
    if (duck) {
      setPendingDuck({ from, to, promotion })
      return true
    }
    finishPlayerMove(game.move({ from, to, promotion }))
    return true
  }

  // Duck Chess: places the duck for the waiting move. Returns false if it can't go there.
  function placeDuck(square) {
    if (!duckMoves(game, pendingDuck).some((m) => m.duckSquare === square)) return false
    const move = game.move({ ...pendingDuck, duck: square })
    setPendingDuck(null)
    finishPlayerMove(move)
    return true
  }

  // After the player's move: press the clock, let the bot react, redraw.
  function finishPlayerMove(move) {
    if (online) {
      sendOnlineMove(move)
      setFen(game.fen())
      return
    }
    setClock((c) => pressClock(c, playerColor, incrementMs))
    if (local) {
      // Local Fog of War: hide the board until the next player has the device.
      if (fog) setCovered(true)
    } else {
      const line = reactionLine(bot, move, playerColor)
      if (line) setSpeech(line)
    }
    if (inLesson) {
      setLessonHint(null)
      setReplyPending(true)
    }
    setFen(game.fen())
  }

  // Online: sends our move to the server (with the result, if it ended the game). If the
  // server refuses it (we were out of step), the game is loaded again from the server.
  async function sendOnlineMove(move) {
    // White's first move costs no time: the clocks only start with it.
    const base = online.moves.length === 0 ? { ...online.clock, turnStart: Date.now() } : online.clock
    setPressed({ from: online.clock, clock: pressClock(base, playerColor, incrementMs) })
    const ended = boardResult(game, 'w')
    const result = ended ? { winner: ended.outcome === 'draw' ? null : ended.outcome === 'win' ? 'w' : 'b', reason: 'board' } : null
    const error = await online.api.playMove(online.id, game.history().length - 1, moveForWire(move), result)
    if (error) online.onResync(error)
  }

  function continueLesson() {
    setLessonHint(null)
    setLessonStep((n) => n + 1)
  }

  // Queues a premove while the bot is thinking. Returns true if it was accepted.
  function tryPremove(from, to) {
    // No premoves in Duck Chess: a move there isn't complete without its duck square.
    if (duck || !premoveTargets(game, from).includes(to)) return false
    setPremove({ from, to })
    setSelected(null)
    return true
  }

  // Called with the piece picked in the promotion picker.
  function choosePromotion(piece) {
    const { from, to } = pendingPromotion
    setPendingPromotion(null)
    if (!gameOver && game.turn() === playerColor) tryPlayerMove(from, to, piece)
  }

  // A move made by dragging or tapping: a real move on your turn, a premove otherwise.
  // We ask `game` whose turn it is right now, because a drag can start during the
  // bot's turn and end after the bot has moved.
  function moveIntent(from, to) {
    if (gameOver || game.isGameOver() || viewing) return false
    if (game.turn() === playerColor) return tryPlayerMove(from, to)
    return inLesson ? false : tryPremove(from, to)
  }

  function onPieceDrop({ sourceSquare, targetSquare }) {
    if (!targetSquare) return false
    const movesBefore = game.history().length
    moveIntent(sourceSquare, targetSquare)
    // Keep the piece on its new square only if a move was actually played. A premove,
    // or a promotion waiting for its piece, isn't on the board yet, so it snaps back.
    return game.history().length > movesBefore
  }

  // Tap-to-move: tap one of your pieces, then tap where it should go.
  // Tapping anywhere else cancels the selection and any premove.
  function onSquareClick({ piece, square }) {
    if (viewing) return
    // Duck Chess: the next tap places the duck (tapping anywhere else takes the move back).
    if (pendingDuck) {
      if (!placeDuck(square)) setPendingDuck(null)
      return
    }
    // Tapping the selected piece again puts it down, so you can pick another one.
    if (square === selected) {
      setSelected(null)
      return
    }
    if (selected && moveIntent(selected, square)) return
    setPremove(null)
    // In Blindfold no pieces are drawn, so ask the game what stands on the square.
    const isOwnPiece = blind ? game.get(square)?.color === playerColor : piece && piece.pieceType[0] === playerColor
    setSelected(isOwnPiece && !gameOver ? square : null)
  }

  // Crazyhouse: picking up a piece from your pocket. It's "selected" like a square, using
  // its drop moves' `from` (like "N@"), so tapping a square then drops it there.
  function selectDrop(type) {
    const drop = game.moves({ verbose: true }).find((m) => m.drop && m.piece === type)
    setSelected(drop && selected !== drop.from ? drop.from : null)
  }

  // Developer shortcut: win the game straight away, to test what comes after a win.
  function autoWin() {
    setClock((c) => pressClock(c, game.turn()))
    setAutoWon(true)
    setPendingPromotion(null)
    setPremove(null)
  }

  function resign() {
    if (online) {
      setConfirming(null)
      online.api.resignGame(online.id)
      return
    }
    // Stop the clock where it is: the time spent on this move is taken off.
    setClock((c) => pressClock(c, game.turn()))
    setResigned(true)
    setConfirming(null)
    setPendingPromotion(null)
    setPremove(null)
  }

  // Leaving during a game asks first, because it counts as resigning.
  // (Not during a lesson, which isn't a real game yet.)
  function leave() {
    if (gameOver || inLesson) onExit()
    else setConfirming('leave')
  }

  // Online: the other player's moves arrive with `online.moves`. Play the ones this board
  // hasn't got yet, then any premove we queued in the meantime.
  const onlinePlies = online?.moves.length ?? 0
  useEffect(() => {
    if (online) playArrivedMoves()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only new moves matter
  }, [onlinePlies])

  function playArrivedMoves() {
    const before = game.history().length
    try {
      for (const move of online.moves.slice(before)) playWireMove(game, move)
    } catch (error) {
      online.onResync(error.message)
      return
    }
    if (game.history().length === before) return
    setViewPly(null) // jump back to the live position so you see the new move
    setFen(game.fen())
    const queued = premoveRef.current
    if (queued && game.turn() === playerColor && !game.isGameOver()) {
      premoveRef.current = null
      setPremoveState(null)
      try {
        finishPlayerMove(game.move({ ...queued, promotion: 'q' }))
      } catch {
        // The premove isn't legal in the new position, so it's dropped.
      }
    }
  }

  // Online: when the clock of the player to move runs out, ask the server to end the game
  // (it checks with its own time). Once per turn.
  const claimedRef = useRef(-1)
  useEffect(() => {
    if (!online || !online.timed || onlineOver || !flagged || claimedRef.current === onlinePlies) return
    claimedRef.current = onlinePlies
    const timeout = timeoutResult(game, turn, 'w')
    const winner = turn === 'w' ? 'b' : 'w'
    online.api.claimTimeout(online.id, timeout.outcome === 'draw' ? { winner: null, reason: 'time-draw' } : { winner, reason: 'time' })
  }, [online, onlineOver, flagged, onlinePlies, game, turn])

  // Starts a new game against the same bot, with the same colour.
  function newGame() {
    const fresh = createGame(variant)
    fogMemoryRef.current = null
    setGame(fresh)
    setSelected(null)
    setPremove(null)
    setViewPly(null)
    setPendingPromotion(null)
    setPendingDuck(null)
    setPeeking(false)
    setPeeksLeft(peeks)
    setResigned(false)
    setAutoWon(false)
    setConfirming(null)
    reportedRef.current = false
    lowTimeWarnedRef.current = false
    setLessonStep(0)
    setReplyPending(false)
    setLessonHint(null)
    setClock(freshClock(minutes))
    setSpeech(local ? null : pickLine(bot, 'start'))
    setCovered(false)
    setDialogClosed(false)
    setFen(fresh.fen())
  }

  const botLine = local || online ? null : result ? endLine(bot, result, game) : speech
  // The other side's name: the bot's, the other local player's, or the online opponent's.
  const opponentName = local ? local[botColor] : online ? online.opponent.name : bot.name
  // Local games: how each player looks (a plain avatar with their name), and the other side.
  const look = (color) => ({ id: color, name: local[color], color: LOCAL_COLORS[color], flag: '', country: '' })

  // The green arrow showing the move the coach asks for.
  const lessonArrows =
    step?.move && !replyPending
      ? [{ startSquare: step.move.slice(0, 2), endSquare: step.move.slice(2, 4), color: 'rgba(56, 158, 72, 0.85)' }]
      : []
  // King of the Hill: the centre squares to reach are tinted gold.
  const hillStyles = Object.fromEntries(
    (fairy?.hill ?? []).map((square) => [square, { background: 'rgba(230, 180, 40, 0.45)' }]),
  )
  const lessonHighlights = Object.fromEntries(
    (step?.highlight ?? []).map((square) => [square, { background: 'rgba(76, 175, 80, 0.45)' }]),
  )

  if (compact) {
    return (
      <section className={`simul-board${isPlayersTurn ? ' your-turn' : ''}${result ? ` ${result.outcome}` : ''}`}>
        <header className="player-bar opponent-bar">
          <Avatar bot={online ? online.opponent : bot} size={36} />
          <div className="player-info">
            {online ? (
              <div className="opponent-name">{opponentName}</div>
            ) : (
              <div className="opponent-name">
                <TitleBadge title={titleById(bot.chessTitle)} /> {bot.name} <span className="rating">({shownRating(bot)})</span>
              </div>
            )}
            {botLine && <div className="speech">“{botLine}”</div>}
          </div>
          {timed && <Clock ms={timeLeft[botColor]} active={clockRunning && turn === botColor} />}
        </header>
        <div className="board">
          <Chessboard
            options={{
              position: fen,
              boardOrientation: orientation,
              onPieceDrop,
              onSquareClick,
              onSquareRightClick: () => setPremove(null),
              canDragPiece: ({ piece }) => !gameOver && piece.pieceType[0] === playerColor,
              squareStyles: squareStyles(game, selected, premove, isPlayersTurn),
              animationDurationInMs: 200,
            }}
          />
          {pendingPromotion && !gameOver && (
            <PromotionPicker color={playerColor} onChoose={choosePromotion} onCancel={() => setPendingPromotion(null)} />
          )}
        </div>
        <div className="simul-board-footer">
          <p className="status">
            {result
              ? { win: '✓ You won', loss: '✗ You lost', draw: '½ Draw' }[result.outcome]
              : isPlayersTurn
                ? 'Your move'
                : online
                  ? `${opponentName}'s move`
                  : `${bot.name} is thinking…`}
          </p>
          <CapturedPieces color={playerColor} captured={captured[playerColor]} advantage={advantage(playerColor)} />
          {timed && <Clock ms={timeLeft[playerColor]} active={clockRunning && turn === playerColor} />}
          {devTools && !gameOver && !online && (
            <button className="simul-small-button dev" onClick={autoWin}>
              ⚡ Win
            </button>
          )}
          {!gameOver && (
            <button className="simul-small-button" onClick={() => setConfirming('resign')}>
              Resign
            </button>
          )}
        </div>
        {confirming === 'resign' && (
          <ConfirmDialog
            title={`Resign against ${opponentName}?`}
            confirmLabel="Resign"
            onConfirm={resign}
            onCancel={() => setConfirming(null)}
          />
        )}
      </section>
    )
  }

  return (
    <main className="game-screen">
      <button className="back" onClick={leave}>
        ← Back
      </button>

      <header className="player-bar opponent-bar">
        <Avatar bot={local ? look(botColor) : online ? online.opponent : bot} />
        <div className="player-info">
          {local || online ? (
            <div className="opponent-name">{opponentName}</div>
          ) : (
            <div className="opponent-name">
              <TitleBadge title={titleById(bot.chessTitle)} /> {bot.name} <span className="rating">({shownRating(bot)})</span>
              {botThinking && <span className="thinking"> thinking…</span>}
            </div>
          )}
          {!inLesson && botLine && <div className="speech">“{botLine}”</div>}
          {fairy?.pockets ? (
            <Pocket pieces={game.pocket(botColor)} color={botColor} />
          ) : (
            <CapturedPieces color={botColor} captured={captured[botColor]} advantage={advantage(botColor)} />
          )}
        </div>
        {timed && <Clock ms={timeLeft[botColor]} active={clockRunning && turn === botColor} />}
      </header>

      {fairy && !inLesson && (
        <section className="lesson-panel fairy-note">
          <div className="opponent-name">
            <Icon icon={fairy.icon} /> {fairy.title}
          </div>
          <p className="lesson-text">{fairy.intro}</p>
          {fairy.checkCounter && game.checksLeft() && (
            <p className="check-counter">
              Checks given: <strong>{local ? local[playerColor] : 'You'} {3 - game.checksLeft()[playerColor]}/3</strong> ·{' '}
              {opponentName.split(' ')[0]} {3 - game.checksLeft()[botColor]}/3
            </p>
          )}
          {fairy.pieces && (
            <ul className="fairy-legend">
              {fairy.pieces.map((letter) => (
                <li key={letter}>
                  <span className="fairy-legend-piece">{allPieces[playerColor + letter.toUpperCase()]()}</span>
                  <span>
                    <strong>{FAIRY_PIECES[letter].name}</strong> moves {FAIRY_PIECES[letter].moves}.
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {chaos && !gameOver && (
        <ChaosPanel
          rule={game.currentRule()}
          yourTurn={turn === playerColor}
          botName={opponentName.split(' ')[0]}
          hasPowers={game.moves({ verbose: true }).some((m) => m.special)}
          dice={variant === 'dice'}
        />
      )}

      {blind && !gameOver && (
        <section className="lesson-panel fairy-note">
          <div className="opponent-name">🙈 Blindfold</div>
          <p className="lesson-text">
            The pieces are invisible. Play from memory and the move list: tap the square of one of your
            pieces, then where it should go.
          </p>
          {peeks > 0 && (
            <button
              className="peek-button secondary"
              onClick={() => {
                setPeeksLeft((n) => n - 1)
                setPeeking(true)
              }}
              disabled={peeking || peeksLeft === 0}
            >
              {peeking ? '👁 Peeking…' : `👁 Peek for 3 seconds (${peeksLeft} left)`}
            </button>
          )}
        </section>
      )}

      {inLesson && (
        <LessonPanel
          bot={bot}
          step={step}
          stepNumber={lessonStep + 1}
          totalSteps={lesson.length}
          hint={lessonHint}
          busy={replyPending}
          onContinue={continueLesson}
        />
      )}

      <div className="board">
        <Chessboard
          options={{
            position: boardPosition,
            pieces: allPieces,
            boardOrientation: orientation,
            onPieceDrop,
            onSquareClick,
            onSquareRightClick: () => setPremove(null),
            canDragPiece: ({ piece }) => !gameOver && !viewing && !pendingDuck && piece.pieceType[0] === playerColor,
            squareStyles: withFog(
              viewing
                ? reviewStyles(history[viewPly - 1])
                : pendingDuck
                  ? duckStyles(game, pendingDuck)
                  : { ...hillStyles, ...squareStyles(game, selected, premove, isPlayersTurn, !blind), ...lessonHighlights },
              visible,
            ),
            arrows: viewing ? [] : lessonArrows,
            animationDurationInMs: 200,
          }}
        />
        {pendingPromotion && !gameOver && (
          <PromotionPicker color={playerColor} onChoose={choosePromotion} onCancel={() => setPendingPromotion(null)} />
        )}
      </div>

      <div className="player-bar you-bar">
        <div className="avatar-with-stars">
          <Avatar bot={local ? look(playerColor) : player} />
          {!local && <StarBadges stars={playerStars} />}
        </div>
        <div className="player-info">
          <div className="opponent-name">
            {local ? local[playerColor] : <><TitleBadge title={playerTitle} /> {player.name}</>}
          </div>
          <p className="status">
            {viewing
              ? viewingText(history, viewPly)
              : inLesson
                ? `Lesson with ${bot.name}`
                : pendingDuck
                  ? (
                      <>
                        <Icon icon="rubber-duck" /> Now tap an empty square for the duck
                      </>
                    )
                  : playerInCheck
                  ? '⚠️ Your king is in check!'
                  : local
                    ? localStatusText(game, result, local)
                    : statusText(game, result, playerColor, opponentName)}
          </p>
          {fairy?.pockets ? (
            <Pocket
              pieces={game.pocket(playerColor)}
              color={playerColor}
              onSelect={isPlayersTurn && !viewing ? selectDrop : undefined}
              selectedType={selected?.[1] === '@' ? selected[0].toLowerCase() : null}
            />
          ) : (
            <CapturedPieces color={playerColor} captured={captured[playerColor]} advantage={advantage(playerColor)} />
          )}
        </div>
        {timed && <Clock ms={timeLeft[playerColor]} active={clockRunning && turn === playerColor} />}
      </div>

      <div className="review-nav">
        <button aria-label="First move" onClick={() => setViewPly(0)} disabled={shownPly === 0}>
          «
        </button>
        <button aria-label="Previous move" onClick={() => setViewPly(Math.max(0, shownPly - 1))} disabled={shownPly === 0}>
          ‹
        </button>
        <button
          aria-label="Next move"
          onClick={() => setViewPly(shownPly + 1 >= plyCount ? null : shownPly + 1)}
          disabled={!viewing}
        >
          ›
        </button>
        <button aria-label="Latest move" onClick={() => setViewPly(null)} disabled={!viewing}>
          »
        </button>
        {online && (
          <button
            className="draw-offer"
            onClick={() => online.api.offerDraw(online.id)}
            disabled={gameOver || online.drawOffer === playerColor}
            title="Offer a draw"
          >
            ½
          </button>
        )}
        <button className="resign" onClick={() => setConfirming('resign')} disabled={gameOver || inLesson}>
          Resign
        </button>
        <SettingsButton
          context={`Game: ${variant ?? 'chess'} against ${opponentName}${online ? ' (online)' : local ? ' (local)' : ''}, move ${plyCount}`}
        />
      </div>

      {/* Online: a draw offer from the other player, or ours waiting for an answer. */}
      {online && !gameOver && online.drawOffer && (
        <div className="draw-banner">
          {online.drawOffer === playerColor ? (
            <span>You offered a draw. Waiting for {opponentName}…</span>
          ) : (
            <>
              <span>{opponentName} offers a draw.</span>
              <button className="friend-button primary" onClick={() => online.api.answerDraw(online.id, true)}>
                Accept
              </button>
              <button className="friend-button" onClick={() => online.api.answerDraw(online.id, false)}>
                Decline
              </button>
            </>
          )}
        </div>
      )}

      {/* Only for admins (and not in local or online games, which have no bot to beat). */}
      {devTools && !local && !online && (
        <button className="dev-autowin" onClick={autoWin} disabled={gameOver}>
          ⚡ Auto-win (developer)
        </button>
      )}

      <MoveList
        history={history}
        currentPly={shownPly}
        hiddenColor={fogActive ? botColor : null}
        hideAll={local && fog && covered && !gameOver}
        onSelect={(ply) => setViewPly(ply >= plyCount ? null : ply)}
      />

      {confirming === 'resign' && (
        <ConfirmDialog
          title={local ? `${local[turn]}, resign this game?` : 'Resign this game?'}
          confirmLabel="Resign"
          onConfirm={resign}
          onCancel={() => setConfirming(null)}
        />
      )}
      {confirming === 'leave' && (
        <ConfirmDialog
          title="Leave the game?"
          text={
            local
              ? 'The game ends here, without a winner.'
              : online
                ? 'The game goes on and your clock keeps running. You can come back to it from the main menu.'
                : 'Leaving counts as resigning.'
          }
          confirmLabel={local || online ? 'Leave' : 'Resign and leave'}
          onConfirm={onExit}
          onCancel={() => setConfirming(null)}
        />
      )}

      {/* Local Fog of War: the board stays hidden until the next player taps. */}
      {local && fog && covered && !gameOver && (
        <div className="overlay local-cover">
          <div className="dialog" role="dialog" aria-modal="true">
            <h2>Pass to {local[turn]}</h2>
            <p className="reason">{local[botColor]} has moved. Only {local[turn]} should look at the board now.</p>
            <div className="dialog-buttons">
              <button className="primary" onClick={() => setCovered(false)} autoFocus>
                I'm {local[turn]}: show my board
              </button>
            </div>
          </div>
        </div>
      )}

      {result && !dialogClosed && (
        <GameOverDialog
          result={result}
          bot={bot}
          botLine={botLine}
          heading={local ? (result.winner ? `${local[result.winner]} wins!` : 'Draw') : null}
          onTryAgain={online ? null : newGame}
          onClose={() => setDialogClosed(true)}
          onMenu={onExit}
          menuLabel={exitLabel}
        />
      )}
    </main>
  )
}

// What the bot says after a move: a line if it was a capture or check, otherwise null.
function reactionLine(bot, move, playerColor) {
  const situation = reactionTo(move, playerColor)
  return situation ? pickLine(bot, situation) : null
}

// What the bot says when the game ends. Picked by move count rather than at random,
// so the line stays the same every time the screen re-draws.
function endLine(bot, result, game) {
  const situation = { win: 'playerWins', loss: 'botWins', draw: 'draw' }[result.outcome]
  const options = bot.lines[situation]
  return options[game.history().length % options.length]
}

// Colours for highlighted squares: last move, selected piece, where it can go,
// a queued premove, and a king in check.
// `showTargets` is false in Blindfold, where only the selected square is marked.
function squareStyles(game, selected, premove, isPlayersTurn, showTargets = true) {
  const styles = {}
  const lastMove = game.history({ verbose: true }).at(-1)
  if (lastMove) {
    styles[lastMove.from] = { background: 'rgba(255, 213, 79, 0.45)' }
    styles[lastMove.to] = { background: 'rgba(255, 213, 79, 0.45)' }
  }
  if (selected) {
    styles[selected] = { background: 'rgba(100, 181, 246, 0.6)' }
    if (!showTargets) {
      // Blindfold: no hints about where the piece can go.
    } else if (isPlayersTurn) {
      for (const move of game.moves({ square: selected, verbose: true })) {
        // A ring around pieces you can take (or swap with, in Chaos Chess), or the rook you
        // can castle with (Fischer Random). Chaos Chess special moves are purple.
        const shade = move.special ? 'rgba(142, 68, 173, 0.7)' : 'rgba(0, 0, 0, 0.25)'
        styles[move.to] = {
          background: move.captured || move.swap || (move.castleTo && move.castleTo !== move.to)
            ? `radial-gradient(circle, transparent 58%, ${shade} 60%)`
            : `radial-gradient(circle, ${shade} 22%, transparent 24%)`,
        }
      }
    } else {
      // While the bot thinks, show where the piece could be premoved to.
      for (const square of premoveTargets(game, selected)) {
        styles[square] = { background: 'radial-gradient(circle, rgba(0, 0, 0, 0.15) 18%, transparent 20%)' }
      }
    }
  }
  if (premove) {
    styles[premove.from] = { background: 'rgba(229, 57, 53, 0.45)' }
    styles[premove.to] = { background: 'rgba(229, 57, 53, 0.45)' }
  }
  if (game.inCheck()) {
    const kingSquare = game.findPiece({ type: 'k', color: game.turn() })[0]
    styles[kingSquare] = { background: 'radial-gradient(circle, #e53935 30%, transparent 75%)' }
  }
  return styles
}

// Why an online game ended, from my side (`outcome` is 'win', 'loss' or 'draw').
const ONLINE_REASONS = {
  resigned: (outcome) => (outcome === 'win' ? 'Your opponent resigned.' : 'You resigned.'),
  agreed: () => 'Draw agreed.',
  time: (outcome) => (outcome === 'win' ? "Your opponent's time ran out." : 'Your time ran out.'),
  'time-draw': () => 'Time ran out, but the other side has no pieces left to checkmate with.',
}

// The result of an online game from my side (`me` is my colour): the server's, once it says
// the game is over, or the board's (both screens see the same position, so it agrees).
function onlineResult(game, online, me) {
  if (online.status === 'finished' && online.result) {
    const { winner, reason } = online.result
    const outcome = winner === null ? 'draw' : winner === me ? 'win' : 'loss'
    const text = reason === 'board' ? (boardResult(game, me)?.reason ?? 'The game is over.') : (ONLINE_REASONS[reason]?.(outcome) ?? 'The game is over.')
    return { outcome, reason: text }
  }
  return boardResult(game, me)
}

// Local games: for example "Emma to move", "Emma to move. Check!" or "Noah wins!".
function localStatusText(game, result, names) {
  if (result) return result.winner ? `${names[result.winner]} wins!` : 'Draw.'
  const whose = `${names[game.turn()]} to move`
  return game.inCheck() ? `${whose}. Check!` : whose
}

// The result of a local game, like the bot games' but with `winner` ('w', 'b', or null for
// a draw), and the reason told from the winner's side ("Your king reached the hill!").
// The side to move is the one who resigns or runs out of time.
function localResult(game, names, resigned, flagged) {
  const turn = game.turn()
  const other = turn === 'w' ? 'b' : 'w'
  const asWhite = boardResult(game, 'w')
  if (asWhite) {
    if (asWhite.outcome === 'draw') return { ...asWhite, winner: null }
    const winner = asWhite.outcome === 'win' ? 'w' : 'b'
    return { ...boardResult(game, winner), winner }
  }
  if (resigned) return { outcome: 'win', winner: other, reason: `${names[turn]} resigned.` }
  if (flagged) {
    const timeout = timeoutResult(game, turn, other)
    if (timeout.outcome === 'draw') return { ...timeout, winner: null }
    return { outcome: 'win', winner: other, reason: `${names[turn]}'s time ran out.` }
  }
  return null
}

function statusText(game, result, playerColor, opponentName) {
  if (result) return { win: 'You won!', loss: `${opponentName} won.`, draw: 'Draw.' }[result.outcome]
  const whose = game.turn() === playerColor ? 'Your move' : `${opponentName} to move`
  return game.inCheck() ? `${whose}. Check!` : whose
}

// The moves so far. Each move can be clicked to view the position after it.
// `currentPly` is the position being shown (number of moves from the start).
// Moves by `hiddenColor` are shown as "?" (the opponent's moves in Fog of War).
// `hideAll` hides the whole list (while a local Fog of War board is covered).
function MoveList({ history, currentPly, hiddenColor, hideAll = false, onSelect }) {
  if (history.length === 0 || hideAll) return null
  const rows = []
  for (let i = 0; i < history.length; i += 2) rows.push(i)
  const moveButton = (ply) =>
    history[ply - 1] && (
      <button className={ply === currentPly ? 'current' : ''} onClick={() => onSelect(ply)}>
        {history[ply - 1].color === hiddenColor ? '?' : history[ply - 1].san}
      </button>
    )
  return (
    <ol className="moves">
      {rows.map((i) => (
        <li key={i}>
          <span className="move-number">{i / 2 + 1}.</span> {moveButton(i + 1)} {moveButton(i + 2)}
        </li>
      ))}
    </ol>
  )
}

// Highlights the move that led to the position being viewed.
function reviewStyles(lastMove) {
  if (!lastMove) return {}
  const highlight = { background: 'rgba(255, 213, 79, 0.45)' }
  return { [lastMove.from]: highlight, [lastMove.to]: highlight }
}

// For example "Viewing 12... Nc6", or "Viewing the start position".
function viewingText(history, ply) {
  if (ply === 0) return 'Viewing the start position'
  const number = Math.ceil(ply / 2)
  return `Viewing ${number}${ply % 2 === 1 ? '.' : '...'} ${history[ply - 1].san}`
}

// Fog of War: the pieces the player can see, in the form the board expects
// ({ e4: { pieceType: 'wP' }, ... }). Enemy pieces on hidden squares are left out.
function fogPosition(fen, playerColor, visible) {
  const position = {}
  for (const piece of new Chess(fen).board().flat()) {
    if (!piece) continue
    if (piece.color === playerColor || visible.has(piece.square)) {
      position[piece.square] = { pieceType: piece.color + piece.type.toUpperCase() }
    }
  }
  return position
}

// Greys out every square that isn't in `visible` (if there is fog), on top of other styles.
function withFog(styles, visible) {
  if (!visible) return styles
  const fogged = { ...styles }
  for (const file of 'abcdefgh') {
    for (let rank = 1; rank <= 8; rank++) {
      if (!visible.has(file + rank)) fogged[file + rank] = FOG_STYLE
    }
  }
  return fogged
}

// Duck Chess: the legal moves for a piece move waiting for its duck ({ from, to,
// promotion }), one per square the duck may go to.
function duckMoves(game, pending) {
  return game
    .moves({ square: pending.from, verbose: true })
    .filter((m) => m.to === pending.to && (!m.promotion || m.promotion === (pending.promotion ?? 'q')))
}

// Duck Chess: while the duck is being placed, the move is marked and every square the duck
// may go to gets a dot.
function duckStyles(game, pending) {
  const styles = {
    [pending.from]: { background: 'rgba(255, 213, 79, 0.45)' },
    [pending.to]: { background: 'rgba(255, 213, 79, 0.45)' },
  }
  for (const move of duckMoves(game, pending)) {
    styles[move.duckSquare] = { background: 'radial-gradient(circle, rgba(230, 160, 30, 0.75) 20%, transparent 22%)' }
  }
  return styles
}
