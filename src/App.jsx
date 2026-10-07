import { useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Engine } from './engine.js'
import { BOTS, pickLine } from './bots.js'
import { boardResult, reactionTo, timeoutResult } from './rules.js'
import Clock from './Clock.jsx'
import GameOverDialog from './GameOverDialog.jsx'
import './App.css'

const bot = BOTS.lukas
// The bot waits at least this long before moving, so its replies don't feel instant.
const MIN_BOT_DELAY_MS = 500
const START_TIME_MS = 10 * 60 * 1000 // 10 minutes each

// Clock state: time left for each side when its turn began, and when the current
// turn began. `turnStart` is null until White's first move, so the clocks start then.
const freshClock = () => ({ w: START_TIME_MS, b: START_TIME_MS, turnStart: null })

// Returns the clock after `color` has moved: their thinking time is subtracted
// and the other side's clock starts running.
function pressClock(clock, color) {
  const now = Date.now()
  const spent = clock.turnStart === null ? 0 : now - clock.turnStart
  return { ...clock, [color]: clock[color] - spent, turnStart: now }
}

export default function App() {
  // chess.js holds the real game (rules, history). `fen` is a text snapshot of the
  // position that we keep in React state, so the screen re-draws after every move.
  const [game, setGame] = useState(() => new Chess())
  const [fen, setFen] = useState(game.fen())
  const [playerColor, setPlayerColor] = useState('w')
  const [selected, setSelected] = useState(null)
  const [clock, setClock] = useState(freshClock)
  const [now, setNow] = useState(() => Date.now())
  const [speech, setSpeech] = useState(() => pickLine(bot, 'start'))
  const [dialogClosed, setDialogClosed] = useState(false)
  const engineRef = useRef(null)

  const botColor = playerColor === 'w' ? 'b' : 'w'
  const turn = game.turn()

  // Time left on each clock right now. Only the side to move is losing time.
  const finishedOnBoard = boardResult(game, playerColor)
  const elapsed = clock.turnStart !== null && !finishedOnBoard ? Math.max(0, now - clock.turnStart) : 0
  const timeLeft = {
    w: clock.w - (turn === 'w' ? elapsed : 0),
    b: clock.b - (turn === 'b' ? elapsed : 0),
  }

  // The game is over by checkmate/draw on the board, or because a clock hit zero.
  const result = finishedOnBoard ?? (timeLeft[turn] <= 0 ? timeoutResult(game, turn, playerColor) : null)
  const gameOver = result !== null
  const clockRunning = clock.turnStart !== null && !gameOver
  const isPlayersTurn = turn === playerColor && !gameOver
  const botThinking = turn === botColor && !gameOver

  // Start Stockfish once when the page opens, and shut it down when it closes.
  useEffect(() => {
    const engine = new Engine()
    engineRef.current = engine
    return () => engine.terminate()
  }, [])

  // While a clock is running, update `now` 10 times a second so the clock ticks.
  useEffect(() => {
    if (!clockRunning) return
    const timer = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(timer)
  }, [clockRunning])

  // Whenever the position changes and it's the bot's turn, let the bot move.
  useEffect(() => {
    if (gameOver || game.turn() !== botColor) return
    let cancelled = false // set if a new game starts (or time runs out) while the bot is thinking

    async function playBotMove() {
      const started = Date.now()
      const choice = await chooseBotMove(engineRef.current, game, bot)
      const wait = MIN_BOT_DELAY_MS - (Date.now() - started)
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
      if (cancelled) return
      const move = game.move(choice)
      setClock((c) => pressClock(c, botColor))
      const line = reactionLine(move, playerColor)
      if (line) setSpeech(line)
      setFen(game.fen())
    }
    playBotMove()

    return () => {
      cancelled = true
    }
  }, [fen, playerColor, botColor, game, gameOver])

  // Tries to play the player's move. Returns true if it was legal.
  function tryPlayerMove(from, to) {
    if (!isPlayersTurn) return false
    let move
    try {
      // Pawns that reach the last rank always become a queen, for now.
      move = game.move({ from, to, promotion: 'q' })
    } catch {
      return false // chess.js throws on illegal moves
    }
    setSelected(null)
    setClock((c) => pressClock(c, playerColor))
    const line = reactionLine(move, playerColor)
    if (line) setSpeech(line)
    setFen(game.fen())
    return true
  }

  function onPieceDrop({ sourceSquare, targetSquare }) {
    if (!targetSquare) return false
    return tryPlayerMove(sourceSquare, targetSquare)
  }

  // Tap-to-move: tap one of your pieces, then tap where it should go.
  function onSquareClick({ piece, square }) {
    if (selected && tryPlayerMove(selected, square)) return
    const isOwnPiece = piece && piece.pieceType[0] === playerColor
    setSelected(isOwnPiece && isPlayersTurn ? square : null)
  }

  function newGame(color) {
    const fresh = new Chess()
    setGame(fresh)
    setPlayerColor(color)
    setSelected(null)
    setClock(freshClock())
    setSpeech(pickLine(bot, 'start'))
    setDialogClosed(false)
    setFen(fresh.fen())
  }

  const botLine = result ? endLine(bot, result, game) : speech

  return (
    <main className="app">
      <header className="player-bar">
        <div className="avatar">{bot.name[0]}</div>
        <div className="player-info">
          <div className="opponent-name">
            {bot.name} <span className="rating">({bot.rating})</span>
            {botThinking && <span className="thinking"> thinking…</span>}
          </div>
          <div className="speech">“{botLine}”</div>
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
            canDragPiece: ({ piece }) => isPlayersTurn && piece.pieceType[0] === playerColor,
            squareStyles: squareStyles(game, selected),
            animationDurationInMs: 200,
          }}
        />
      </div>

      <div className="player-bar">
        <p className="status">{statusText(game, result, playerColor, bot)}</p>
        <Clock ms={timeLeft[playerColor]} active={clockRunning && turn === playerColor} />
      </div>

      <div className="buttons">
        <button onClick={() => newGame('w')}>New game as White</button>
        <button onClick={() => newGame('b')}>New game as Black</button>
      </div>

      <MoveList history={game.history()} />

      {result && !dialogClosed && (
        <GameOverDialog
          result={result}
          bot={bot}
          botLine={botLine}
          onTryAgain={() => newGame(playerColor)}
          onClose={() => setDialogClosed(true)}
        />
      )}
    </main>
  )
}

// What the bot says after a move: a line if it was a capture or check, otherwise null.
function reactionLine(move, playerColor) {
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

// Picks the bot's move: usually Stockfish's choice, sometimes a random blunder.
async function chooseBotMove(engine, game, bot) {
  const legalMoves = game.moves({ verbose: true })
  if (Math.random() < bot.blunderChance) {
    return legalMoves[Math.floor(Math.random() * legalMoves.length)].san
  }
  const uci = await engine.bestMove(game.fen(), {
    skillLevel: bot.skillLevel,
    depth: bot.depth,
  })
  // UCI moves look like "e2e4", or "e7e8q" for a promotion.
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }
}

// Colours for highlighted squares: last move, selected piece, legal targets, check.
function squareStyles(game, selected) {
  const styles = {}
  const lastMove = game.history({ verbose: true }).at(-1)
  if (lastMove) {
    styles[lastMove.from] = { background: 'rgba(255, 213, 79, 0.45)' }
    styles[lastMove.to] = { background: 'rgba(255, 213, 79, 0.45)' }
  }
  if (selected) {
    styles[selected] = { background: 'rgba(100, 181, 246, 0.6)' }
    for (const move of game.moves({ square: selected, verbose: true })) {
      styles[move.to] = {
        background: move.captured
          ? 'radial-gradient(circle, transparent 58%, rgba(0, 0, 0, 0.25) 60%)'
          : 'radial-gradient(circle, rgba(0, 0, 0, 0.25) 22%, transparent 24%)',
      }
    }
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
