import { useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import PUZZLES from './puzzles.json'

// How long to wait before the opponent's moves, so you can see them happen.
const OPPONENT_DELAY_MS = 600

// Picks `count` different random puzzles from a difficulty band ('easy', 'medium', 'hard').
function pickPuzzles(band, count) {
  return [...PUZZLES[band]].sort(() => Math.random() - 0.5).slice(0, count)
}

const toMove = (uci) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })

// One puzzle trial: a series of puzzles (from the Lichess puzzle database). Each puzzle
// starts with the opponent's move; then the player must find the best moves.
// `trial` is { title, band, count, needed }. `onFinish(passed)` is called once at the end.
export default function PuzzleTrial({ trial, onFinish, onExit }) {
  const [puzzles, setPuzzles] = useState(() => pickPuzzles(trial.band, trial.count))
  const [index, setIndex] = useState(0) // which puzzle we're on
  const [results, setResults] = useState([]) // true (solved) or false (missed) per puzzle
  const [game, setGame] = useState(() => new Chess(puzzles[0].fen))
  const [step, setStep] = useState(0) // how many moves of the puzzle's line have been played
  const [fen, setFen] = useState(game.fen())
  const [status, setStatus] = useState('opponent') // 'opponent', 'yours', 'solved' or 'missed'
  const [selected, setSelected] = useState(null)

  const puzzle = puzzles[index]
  const finished = results.length === puzzles.length
  const solvedCount = results.filter(Boolean).length
  // The player plays the side that is NOT to move in the puzzle's starting position.
  const playerColor = new Chess(puzzle.fen).turn() === 'w' ? 'b' : 'w'

  // The opponent's moves in the line (the first one, and each reply) play automatically.
  useEffect(() => {
    if (status !== 'opponent') return
    const timer = setTimeout(() => {
      game.move(toMove(puzzle.moves[step]))
      setStep(step + 1)
      setFen(game.fen())
      setStatus('yours')
    }, OPPONENT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [status, step, game, puzzle])

  function finishPuzzle(solved) {
    setResults((r) => [...r, solved])
    setStatus(solved ? 'solved' : 'missed')
    setSelected(null)
  }

  // Tries the player's move. Returns true if a move was made (right or wrong).
  function tryMove(from, to) {
    if (status !== 'yours') return false
    const expected = toMove(puzzle.moves[step])
    const legal = game.moves({ square: from, verbose: true }).filter((m) => m.to === to)
    if (legal.length === 0) return false
    const isExpected = from === expected.from && to === expected.to
    // Promotions use the solution's piece if the move is right, otherwise a queen.
    const move = game.move({ from, to, promotion: isExpected ? expected.promotion : 'q' })
    setFen(game.fen())
    if (isExpected || game.isCheckmate()) {
      // Right (any checkmate also counts, like on Lichess).
      if (game.isCheckmate() || step + 1 >= puzzle.moves.length) finishPuzzle(true)
      else {
        setStep(step + 1)
        setStatus('opponent')
      }
    } else {
      game.undo() // show the position again, with the right move as an arrow
      setFen(game.fen())
      finishPuzzle(false)
    }
    return Boolean(move)
  }

  function onPieceDrop({ sourceSquare, targetSquare }) {
    if (!targetSquare) return false
    const movesBefore = game.history().length
    tryMove(sourceSquare, targetSquare)
    return game.history().length > movesBefore
  }

  function onSquareClick({ piece, square }) {
    if (selected && tryMove(selected, square)) return
    const own = piece && piece.pieceType[0] === playerColor
    setSelected(own && status === 'yours' ? square : null)
  }

  function nextPuzzle() {
    const next = puzzles[index + 1]
    const fresh = new Chess(next.fen)
    setIndex(index + 1)
    setGame(fresh)
    setStep(0)
    setFen(fresh.fen())
    setStatus('opponent')
  }

  function restart() {
    const fresh = pickPuzzles(trial.band, trial.count)
    const firstGame = new Chess(fresh[0].fen)
    reportedRef.current = false
    setPuzzles(fresh)
    setIndex(0)
    setResults([])
    setGame(firstGame)
    setStep(0)
    setFen(firstGame.fen())
    setStatus('opponent')
  }

  // Tell the trials screen once, when the last puzzle is done.
  const passed = solvedCount >= trial.needed
  const reportedRef = useRef(false)
  useEffect(() => {
    if (!finished || reportedRef.current) return
    reportedRef.current = true
    onFinish(passed)
  }, [finished, passed, onFinish])

  // Squares to highlight: the selected piece and where it can go; after a miss, the right move.
  const styles = {}
  if (selected) {
    styles[selected] = { background: 'rgba(100, 181, 246, 0.6)' }
    for (const m of game.moves({ square: selected, verbose: true })) {
      styles[m.to] = { background: 'radial-gradient(circle, rgba(0, 0, 0, 0.25) 22%, transparent 24%)' }
    }
  }
  const answer = status === 'missed' ? toMove(puzzle.moves[step]) : null
  const arrows = answer ? [{ startSquare: answer.from, endSquare: answer.to, color: 'rgba(56, 158, 72, 0.85)' }] : []

  const message = {
    opponent: 'Watch the opponent’s move…',
    yours: `${playerColor === 'w' ? 'White' : 'Black'} to move. Find the best move!`,
    solved: '✓ Correct!',
    missed: '✗ Not quite. The green arrow shows the right move.',
  }[status]

  return (
    <main className="game-screen puzzle-screen">
      <button className="back" onClick={onExit}>
        ← Back
      </button>

      <header className="lesson-panel puzzle-panel">
        <div className="opponent-name">🧩 {trial.title}</div>
        <p className="lesson-text">
          Puzzle {index + 1} of {puzzles.length} · rated {puzzle.rating}
        </p>
        <ol className="puzzle-dots" aria-label="Results so far">
          {puzzles.map((p, i) => (
            <li key={p.id} className={i < results.length ? (results[i] ? 'solved' : 'missed') : i === index ? 'current' : ''} />
          ))}
        </ol>
        <p className="puzzle-score">
          Solved {solvedCount} · need {trial.needed} of {puzzles.length} to pass
        </p>
      </header>

      <div className="board">
        <Chessboard
          options={{
            position: fen,
            boardOrientation: playerColor === 'w' ? 'white' : 'black',
            onPieceDrop,
            onSquareClick,
            canDragPiece: ({ piece }) => status === 'yours' && piece.pieceType[0] === playerColor,
            squareStyles: styles,
            arrows,
            animationDurationInMs: 200,
          }}
        />
      </div>

      <div className="player-bar you-bar">
        <p className={`status puzzle-message ${status}`}>{message}</p>
      </div>

      {/* Only shown while developing (npm run dev), never in the published game. */}
      {import.meta.env.DEV && (status === 'yours' || status === 'opponent') && (
        <button className="dev-autowin" onClick={() => finishPuzzle(true)}>
          ⚡ Auto-solve (developer)
        </button>
      )}

      {(status === 'solved' || status === 'missed') && !finished && (
        <button className="lesson-continue puzzle-next" onClick={nextPuzzle} autoFocus>
          Next puzzle
        </button>
      )}

      {finished && (
        <div className="overlay">
          <div className={`dialog ${passed ? 'win' : 'loss'}`} role="dialog" aria-modal="true">
            <h2>{passed ? 'Trial passed!' : 'Not quite'}</h2>
            <p className="reason">
              You solved {solvedCount} of {puzzles.length} puzzles{passed ? '.' : `; you need ${trial.needed}.`}
            </p>
            {/* After passing, going back to the trials is the green button. */}
            <div className="dialog-buttons">
              {passed && (
                <button className="primary" onClick={onExit} autoFocus>
                  Back to trials
                </button>
              )}
              <button className={passed ? 'secondary' : 'primary'} onClick={restart} autoFocus={!passed}>
                {passed ? 'Play again' : 'Try again'}
              </button>
              {!passed && (
                <button className="secondary" onClick={onExit}>
                  Back to trials
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
