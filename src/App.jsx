import { useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Engine } from './engine.js'
import { BOTS } from './bots.js'
import './App.css'

const bot = BOTS.lukas
// The bot waits at least this long before moving, so its replies don't feel instant.
const MIN_BOT_DELAY_MS = 500

export default function App() {
  // chess.js holds the real game (rules, history). `fen` is a text snapshot of the
  // position that we keep in React state, so the screen re-draws after every move.
  const [game, setGame] = useState(() => new Chess())
  const [fen, setFen] = useState(game.fen())
  const [playerColor, setPlayerColor] = useState('w')
  const [selected, setSelected] = useState(null)
  const engineRef = useRef(null)

  // Start Stockfish once when the page opens, and shut it down when it closes.
  useEffect(() => {
    const engine = new Engine()
    engineRef.current = engine
    return () => engine.terminate()
  }, [])

  // Whenever the position changes and it's the bot's turn, let the bot move.
  useEffect(() => {
    if (game.isGameOver() || game.turn() === playerColor) return
    let cancelled = false // set if a new game starts while the bot is thinking

    async function playBotMove() {
      const started = Date.now()
      const move = await chooseBotMove(engineRef.current, game, bot)
      const wait = MIN_BOT_DELAY_MS - (Date.now() - started)
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
      if (cancelled) return
      game.move(move)
      setFen(game.fen())
    }
    playBotMove()

    return () => {
      cancelled = true
    }
  }, [fen, playerColor, game])

  const isPlayersTurn = game.turn() === playerColor && !game.isGameOver()
  const botThinking = game.turn() !== playerColor && !game.isGameOver()

  // Tries to play the player's move. Returns true if it was legal.
  function tryPlayerMove(from, to) {
    if (!isPlayersTurn) return false
    try {
      // Pawns that reach the last rank always become a queen, for now.
      game.move({ from, to, promotion: 'q' })
    } catch {
      return false // chess.js throws on illegal moves
    }
    setSelected(null)
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
    setFen(fresh.fen())
  }

  return (
    <main className="app">
      <header className="opponent">
        <div className="avatar">{bot.name[0]}</div>
        <div>
          <div className="opponent-name">
            {bot.name} <span className="rating">({bot.rating})</span>
          </div>
          <div className="opponent-line">
            {botThinking ? 'Thinking…' : `“${bot.greeting}”`}
          </div>
        </div>
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

      <p className="status">{statusText(game, playerColor, bot)}</p>

      <div className="buttons">
        <button onClick={() => newGame('w')}>New game as White</button>
        <button onClick={() => newGame('b')}>New game as Black</button>
      </div>

      <MoveList history={game.history()} />
    </main>
  )
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

function statusText(game, playerColor, bot) {
  if (game.isCheckmate()) {
    return game.turn() === playerColor ? `Checkmate. ${bot.name} wins.` : 'Checkmate. You win!'
  }
  if (game.isStalemate()) return 'Draw by stalemate.'
  if (game.isThreefoldRepetition()) return 'Draw by repetition.'
  if (game.isInsufficientMaterial()) return 'Draw, not enough pieces left to mate.'
  if (game.isDraw()) return 'Draw by the 50-move rule.'
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
