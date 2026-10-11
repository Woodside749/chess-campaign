import { useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { pickLine } from './bots.js'
import { chooseBotMove, thinkTimeMs } from './botBrain.js'
import { capturedPieces, materialScore } from './material.js'
import { premoveTargets } from './premove.js'
import { boardResult, reactionTo, timeoutResult } from './rules.js'
import Avatar from './Avatar.jsx'
import CapturedPieces from './CapturedPieces.jsx'
import Clock from './Clock.jsx'
import GameOverDialog from './GameOverDialog.jsx'
import PromotionPicker from './PromotionPicker.jsx'

const START_TIME_MS = 10 * 60 * 1000 // 10 minutes each

// Clock state: time left for each side when its turn began, and when the current
// turn began. White's clock starts running as soon as the game starts.
const freshClock = () => ({ w: START_TIME_MS, b: START_TIME_MS, turnStart: Date.now() })

// Returns the clock after `color` has moved: their thinking time is subtracted
// and the other side's clock starts running.
function pressClock(clock, color) {
  const now = Date.now()
  return { ...clock, [color]: clock[color] - (now - clock.turnStart), turnStart: now }
}

// The game screen: games against `bot`, starting with the player as `startColor` ('w' or 'b').
export default function Game({ bot, startColor, onExit }) {
  // chess.js holds the real game (rules, history). `fen` is a text snapshot of the
  // position that we keep in React state, so the screen re-draws after every move.
  const [game, setGame] = useState(() => new Chess())
  const [fen, setFen] = useState(game.fen())
  const playerColor = startColor
  const [selected, setSelected] = useState(null)
  const [clock, setClock] = useState(freshClock)
  const [now, setNow] = useState(() => Date.now())
  const [speech, setSpeech] = useState(() => pickLine(bot, 'start'))
  const [dialogClosed, setDialogClosed] = useState(false)
  // Which position you are looking at when stepping back through the moves:
  // a number of moves from the start, or null for the live position.
  const [viewPly, setViewPly] = useState(null)
  // A pawn move to the last rank waiting for you to pick a piece, like { from: 'e7', to: 'e8' }.
  const [pendingPromotion, setPendingPromotion] = useState(null)
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

  // Time left on each clock right now. Only the side to move is losing time.
  const finishedOnBoard = boardResult(game, playerColor)
  const elapsed = finishedOnBoard ? 0 : Math.max(0, now - clock.turnStart)
  const timeLeft = {
    w: clock.w - (turn === 'w' ? elapsed : 0),
    b: clock.b - (turn === 'b' ? elapsed : 0),
  }

  // The game is over by checkmate/draw on the board, or because a clock hit zero.
  const result = finishedOnBoard ?? (timeLeft[turn] <= 0 ? timeoutResult(game, turn, playerColor) : null)
  const gameOver = result !== null
  const clockRunning = !gameOver
  const isPlayersTurn = turn === playerColor && !gameOver
  const botThinking = turn === botColor && !gameOver
  // The bot's time left when its turn began. Only changes when a move is made.
  const botTimeLeft = clock[botColor]

  // Stepping back through the game. While viewing an earlier position the board is
  // locked: you can look, but not move.
  const history = game.history({ verbose: true })
  const plyCount = history.length
  const viewing = viewPly !== null && viewPly < plyCount
  const shownPly = viewing ? viewPly : plyCount
  const shownFen = !viewing ? fen : viewPly === 0 ? history[0].before : history[viewPly - 1].after

  const captured = capturedPieces(game)
  const score = materialScore(game) // positive: White is ahead
  const advantage = (color) => (color === 'w' ? score : -score)

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

  // Whenever the position changes and it's the bot's turn, let the bot move.
  useEffect(() => {
    if (gameOver || game.turn() !== botColor) return
    let cancelled = false // set if a new game starts, time runs out or you leave while the bot is thinking

    async function playBotMove() {
      const started = Date.now()
      const thinkMs = thinkTimeMs(game, bot, botTimeLeft)
      const choice = await chooseBotMove(game, bot, botTimeLeft)
      // Wait out the rest of the thinking time, so the bot doesn't reply instantly.
      const wait = thinkMs - (Date.now() - started)
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
      if (cancelled) return
      const move = game.move(choice)
      setClock((c) => pressClock(c, botColor))
      let line = reactionLine(bot, move, playerColor)

      // If the player queued a premove, play it straight away, if it's still legal.
      const queued = premoveRef.current
      if (queued && !game.isGameOver()) {
        premoveRef.current = null
        setPremoveState(null)
        try {
          const reply = game.move({ ...queued, promotion: 'q' })
          setClock((c) => pressClock(c, playerColor))
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
  }, [fen, playerColor, botColor, botTimeLeft, game, gameOver, bot])

  // Tries to play the player's move. Returns true if it was legal.
  // A pawn reaching the last rank first opens the promotion picker, unless
  // `promotion` (the chosen piece) is given.
  function tryPlayerMove(from, to, promotion) {
    const legal = game.moves({ square: from, verbose: true }).filter((m) => m.to === to)
    if (legal.length === 0) return false
    setSelected(null)
    if (legal[0].promotion && !promotion) {
      setPendingPromotion({ from, to })
      return true
    }
    const move = game.move({ from, to, promotion })
    setClock((c) => pressClock(c, playerColor))
    const line = reactionLine(bot, move, playerColor)
    if (line) setSpeech(line)
    setFen(game.fen())
    return true
  }

  // Queues a premove while the bot is thinking. Returns true if it was accepted.
  function tryPremove(from, to) {
    if (!premoveTargets(game, from).includes(to)) return false
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
    return game.turn() === playerColor ? tryPlayerMove(from, to) : tryPremove(from, to)
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
    if (selected && moveIntent(selected, square)) return
    setPremove(null)
    const isOwnPiece = piece && piece.pieceType[0] === playerColor
    setSelected(isOwnPiece && !gameOver ? square : null)
  }

  // Starts a new game against the same bot, with the same colour.
  function newGame() {
    const fresh = new Chess()
    setGame(fresh)
    setSelected(null)
    setPremove(null)
    setViewPly(null)
    setPendingPromotion(null)
    setClock(freshClock())
    setSpeech(pickLine(bot, 'start'))
    setDialogClosed(false)
    setFen(fresh.fen())
  }

  const botLine = result ? endLine(bot, result, game) : speech

  return (
    <main className="app">
      <button className="back" onClick={onExit}>
        ← Menu
      </button>

      <header className="player-bar">
        <Avatar bot={bot} />
        <div className="player-info">
          <div className="opponent-name">
            {bot.name} <span className="rating">({bot.rating})</span>
            {botThinking && <span className="thinking"> thinking…</span>}
          </div>
          <div className="speech">“{botLine}”</div>
          <CapturedPieces color={botColor} captured={captured[botColor]} advantage={advantage(botColor)} />
        </div>
        <Clock ms={timeLeft[botColor]} active={clockRunning && turn === botColor} />
      </header>

      <div className="board">
        <Chessboard
          options={{
            position: shownFen,
            boardOrientation: playerColor === 'w' ? 'white' : 'black',
            onPieceDrop,
            onSquareClick,
            onSquareRightClick: () => setPremove(null),
            canDragPiece: ({ piece }) => !gameOver && !viewing && piece.pieceType[0] === playerColor,
            squareStyles: viewing
              ? reviewStyles(history[viewPly - 1])
              : squareStyles(game, selected, premove, isPlayersTurn),
            animationDurationInMs: 200,
          }}
        />
        {pendingPromotion && !gameOver && (
          <PromotionPicker color={playerColor} onChoose={choosePromotion} onCancel={() => setPendingPromotion(null)} />
        )}
      </div>

      <div className="player-bar">
        <div className="player-info">
          <p className="status">
            {viewing ? viewingText(history, viewPly) : statusText(game, result, playerColor, bot)}
          </p>
          <CapturedPieces color={playerColor} captured={captured[playerColor]} advantage={advantage(playerColor)} />
        </div>
        <Clock ms={timeLeft[playerColor]} active={clockRunning && turn === playerColor} />
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
      </div>

      <MoveList history={history} currentPly={shownPly} onSelect={(ply) => setViewPly(ply >= plyCount ? null : ply)} />

      {result && !dialogClosed && (
        <GameOverDialog
          result={result}
          bot={bot}
          botLine={botLine}
          onTryAgain={newGame}
          onClose={() => setDialogClosed(true)}
          onMenu={onExit}
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
function squareStyles(game, selected, premove, isPlayersTurn) {
  const styles = {}
  const lastMove = game.history({ verbose: true }).at(-1)
  if (lastMove) {
    styles[lastMove.from] = { background: 'rgba(255, 213, 79, 0.45)' }
    styles[lastMove.to] = { background: 'rgba(255, 213, 79, 0.45)' }
  }
  if (selected) {
    styles[selected] = { background: 'rgba(100, 181, 246, 0.6)' }
    if (isPlayersTurn) {
      for (const move of game.moves({ square: selected, verbose: true })) {
        styles[move.to] = {
          background: move.captured
            ? 'radial-gradient(circle, transparent 58%, rgba(0, 0, 0, 0.25) 60%)'
            : 'radial-gradient(circle, rgba(0, 0, 0, 0.25) 22%, transparent 24%)',
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

function statusText(game, result, playerColor, bot) {
  if (result) return { win: 'You won!', loss: `${bot.name} won.`, draw: 'Draw.' }[result.outcome]
  const whose = game.turn() === playerColor ? 'Your move' : `${bot.name} to move`
  return game.inCheck() ? `${whose}. Check!` : whose
}

// The moves so far. Each move can be clicked to view the position after it.
// `currentPly` is the position being shown (number of moves from the start).
function MoveList({ history, currentPly, onSelect }) {
  if (history.length === 0) return null
  const rows = []
  for (let i = 0; i < history.length; i += 2) rows.push(i)
  const moveButton = (ply) =>
    history[ply - 1] && (
      <button className={ply === currentPly ? 'current' : ''} onClick={() => onSelect(ply)}>
        {history[ply - 1].san}
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
