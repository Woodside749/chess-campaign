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

  const captured = capturedPieces(game)
  const score = materialScore(game) // positive: White is ahead
  const advantage = (color) => (color === 'w' ? score : -score)

  // While a clock is running, update `now` 10 times a second so the clock ticks.
  useEffect(() => {
    if (!clockRunning) return
    const timer = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(timer)
  }, [clockRunning])

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
      setFen(game.fen())
    }
    playBotMove()

    return () => {
      cancelled = true
    }
  }, [fen, playerColor, botColor, botTimeLeft, game, gameOver, bot])

  // Tries to play the player's move. Returns true if it was legal.
  function tryPlayerMove(from, to) {
    let move
    try {
      // Pawns that reach the last rank always become a queen, for now.
      move = game.move({ from, to, promotion: 'q' })
    } catch {
      return false // chess.js throws on illegal moves
    }
    setSelected(null)
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

  // A move made by dragging or tapping: a real move on your turn, a premove otherwise.
  // We ask `game` whose turn it is right now, because a drag can start during the
  // bot's turn and end after the bot has moved.
  function moveIntent(from, to) {
    if (gameOver || game.isGameOver()) return false
    return game.turn() === playerColor ? tryPlayerMove(from, to) : tryPremove(from, to)
  }

  function onPieceDrop({ sourceSquare, targetSquare }) {
    if (!targetSquare) return false
    const isRealMove = game.turn() === playerColor
    const accepted = moveIntent(sourceSquare, targetSquare)
    // A premove isn't on the board yet, so the piece snaps back to its square.
    return accepted && isRealMove
  }

  // Tap-to-move: tap one of your pieces, then tap where it should go.
  // Tapping anywhere else cancels the selection and any premove.
  function onSquareClick({ piece, square }) {
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
            position: fen,
            boardOrientation: playerColor === 'w' ? 'white' : 'black',
            onPieceDrop,
            onSquareClick,
            onSquareRightClick: () => setPremove(null),
            canDragPiece: ({ piece }) => !gameOver && piece.pieceType[0] === playerColor,
            squareStyles: squareStyles(game, selected, premove, isPlayersTurn),
            animationDurationInMs: 200,
          }}
        />
      </div>

      <div className="player-bar">
        <div className="player-info">
          <p className="status">{statusText(game, result, playerColor, bot)}</p>
          <CapturedPieces color={playerColor} captured={captured[playerColor]} advantage={advantage(playerColor)} />
        </div>
        <Clock ms={timeLeft[playerColor]} active={clockRunning && turn === playerColor} />
      </div>

      <MoveList history={game.history()} />

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

function MoveList({ history }) {
  const rows = []
  for (let i = 0; i < history.length; i += 2) {
    rows.push({ number: i / 2 + 1, white: history[i], black: history[i + 1] })
  }
  if (rows.length === 0) return null
  return (
    <ol className="moves">
      {rows.map((row) => (
        <li key={row.number}>
          <span className="move-number">{row.number}.</span> {row.white} {row.black}
        </li>
      ))}
    </ol>
  )
}
