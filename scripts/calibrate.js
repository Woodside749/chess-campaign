// Estimates how strong each bot really is, by letting them play many fast games
// against each other and against Stockfish at fixed, calibrated strengths ("anchors").
//
// Run it with:   npm run calibrate
// Options:       npm run calibrate -- --games 20 --bots lukas,mei,diego
//
// Sweep mode measures what rating each `strength` setting gives (see botStrength.js),
// using test bots without a personality, against bots whose ratings are already known:
//   npm run calibrate -- --sweep 0,0.2,0.4 --fixed amara=1036,diego=1285
// --anchors 1320,1600 chooses which Stockfish strengths to play against.
//
// The games run in the background without a browser, spread over all CPU cores.
// Bots use exactly the same move choice as in the game (botBrain.js), except that
// they move instantly and are never short of time.
import { spawn } from 'node:child_process'
import { cpus } from 'node:os'
import { fileURLToPath } from 'node:url'
import { Chess } from 'chess.js'
import { BOTS } from '../src/bots.js'
import { Engine } from '../src/engine.js'
import { chooseBotMove } from '../src/botBrain.js'

// Reference opponents: Stockfish with its built-in strength limit (UCI_Elo).
// That setting only goes down to 1320, so the weaker bots are linked to the
// anchors through games against each other.
const args = process.argv.slice(2)
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}
const ANCHORS = option('anchors', '1320,1600,2000').split(',').map(Number)
const ANCHOR_MOVE_TIME_MS = 100
const MAX_PLIES = 250 // games longer than this count as a draw

if (args[0] === '--worker') {
  await runWorker(JSON.parse(args[1]))
} else {
  await runMain()
}

// ---------- Main process: plan the games, start workers, report ratings ----------

async function runMain() {
  const gamesPerPairing = Number(option('games', 16))
  const sweep = option('sweep', null)
  const fixedBots = Object.fromEntries(
    (option('fixed', '') || '').split(',').filter(Boolean).map((pair) => {
      const [id, elo] = pair.split('=')
      return [id, Number(elo)]
    }),
  )
  const ids = sweep
    ? sweep.split(',').map((level) => `level:${level}`)
    : option('bots', Object.keys(BOTS).join(',')).split(',')
  const ladder = ids.map(playerFor).sort((a, b) => a.rating - b.rating)

  // Who plays whom: each bot against the next two bots up the ladder,
  // against every fixed-rating bot, and against the Stockfish anchors.
  const pairings = []
  ladder.forEach((bot, i) => {
    for (const other of ladder.slice(i + 1, i + 3)) pairings.push([bot.id, other.id])
    for (const id of Object.keys(fixedBots)) pairings.push([bot.id, id])
    for (const elo of ANCHORS) pairings.push([bot.id, `sf${elo}`])
  })
  const games = []
  for (const [a, b] of pairings) {
    for (let g = 0; g < gamesPerPairing; g++) games.push(g % 2 === 0 ? [a, b] : [b, a]) // alternate colours
  }

  const workers = Math.min(cpus().length, games.length)
  console.log(`Playing ${games.length} games on ${workers} CPU cores...`)
  const chunks = Array.from({ length: workers }, (_, i) => games.filter((_, j) => j % workers === i))
  const started = Date.now()
  let done = 0
  const results = (
    await Promise.all(
      chunks.map((chunk) =>
        startWorker(chunk, () => {
          done++
          if (done % 25 === 0) console.log(`  ${done}/${games.length} games done`)
        }),
      ),
    )
  ).flat()
  console.log(`Finished in ${Math.round((Date.now() - started) / 1000)} s.\n`)

  report(ladder, results, fixedBots)
}

// The bot for an id: a bot from bots.js, or a test bot like "level:0.3"
// (strength 0.3, no personality) for sweep mode.
function playerFor(id) {
  if (!id.startsWith('level:')) return BOTS[id]
  const strength = Number(id.slice('level:'.length))
  return { id, name: `Strength ${strength}`, rating: Math.round(strength * 1000), strength, style: {} }
}

function startWorker(games, onGameDone) {
  return new Promise((resolve, reject) => {
    const script = fileURLToPath(import.meta.url)
    const child = spawn(process.execPath, [script, '--worker', JSON.stringify(games)])
    const results = []
    let buffer = ''
    child.stdout.on('data', (data) => {
      buffer += data
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('{')) continue
        results.push(JSON.parse(line))
        onGameDone()
      }
    })
    child.stderr.on('data', (data) => process.stderr.write(data))
    child.on('exit', (code) => (code === 0 ? resolve(results) : reject(new Error(`worker exited with ${code}`))))
  })
}

// ---------- Rating calculation ----------

function report(ladder, results, fixedBots) {
  const fixed = { ...fixedBots, ...Object.fromEntries(ANCHORS.map((elo) => [`sf${elo}`, elo])) }
  const ratings = fitRatings(results, fixed)

  // Per-player win/draw/loss totals.
  const record = {}
  for (const { white, black, score } of results) {
    for (const [player, s] of [[white, score], [black, 1 - score]]) {
      record[player] ??= { w: 0, d: 0, l: 0 }
      record[player][s === 1 ? 'w' : s === 0 ? 'l' : 'd']++
    }
  }

  console.log('Bot               Label   Measured   (+/-)   W-D-L')
  for (const bot of ladder) {
    const r = ratings[bot.id]
    const rec = record[bot.id]
    console.log(
      `${bot.name.padEnd(18)}${String(bot.rating).padStart(5)}${String(Math.round(r.rating)).padStart(11)}` +
        `${('±' + Math.round(r.error)).padStart(8)}   ${rec.w}-${rec.d}-${rec.l}`,
    )
  }
  console.log('\nAnchors: ' + ANCHORS.map((elo) => `sf${elo} ${record[`sf${elo}`]?.w ?? 0}-${record[`sf${elo}`]?.d ?? 0}-${record[`sf${elo}`]?.l ?? 0}`).join(', '))
}

// Finds the ratings that best explain the results, with the anchors held fixed.
// Uses the standard Elo formula: expected score = 1 / (1 + 10^((opponent - you) / 400)).
function fitRatings(results, fixed) {
  const players = new Set(results.flatMap((r) => [r.white, r.black]))
  const rating = Object.fromEntries([...players].map((p) => [p, fixed[p] ?? 1000]))
  // One imaginary draw per game pair keeps 100% scores from giving infinite ratings.
  const games = [...results, ...results.map((r) => ({ ...r, score: 0.5, weight: 0.05 }))]
  const expected = (a, b) => 1 / (1 + 10 ** ((rating[b] - rating[a]) / 400))
  const info = {}
  for (let step = 0; step < 500; step++) {
    const gradient = {}
    for (const p of players) {
      gradient[p] = 0
      info[p] = 0
    }
    for (const { white, black, score, weight = 1 } of games) {
      const e = expected(white, black)
      gradient[white] += weight * (score - e)
      gradient[black] -= weight * (score - e)
      info[white] += weight * e * (1 - e)
      info[black] += weight * e * (1 - e)
    }
    for (const p of players) {
      if (p in fixed) continue
      rating[p] += Math.max(-100, Math.min(100, (gradient[p] / info[p]) * (400 / Math.LN10)))
    }
  }
  return Object.fromEntries(
    [...players].map((p) => [p, { rating: rating[p], error: (400 / Math.LN10) / Math.sqrt(info[p]) }]),
  )
}

// ---------- Worker process: play the given games and print each result ----------

async function runWorker(games) {
  const botEngine = await createNodeEngine()
  const anchorEngine = await createNodeEngine()
  for (const [white, black] of games) {
    const score = await playGame(white, black, botEngine, anchorEngine)
    console.log(JSON.stringify({ white, black, score }))
  }
  botEngine.process.kill()
  anchorEngine.process.kill()
  process.exit(0)
}

// Starts Stockfish as a separate command-line program and wraps it in our Engine class.
async function createNodeEngine() {
  const enginePath = fileURLToPath(new URL('../node_modules/stockfish/bin/stockfish-19-lite-single.js', import.meta.url))
  const child = spawn(process.execPath, [enginePath])
  // A stand-in for a browser Web Worker, so the normal Engine class can use it.
  const worker = {
    onmessage: null,
    postMessage: (command) => child.stdin.write(command + '\n'),
  }
  let buffer = ''
  child.stdout.on('data', (data) => {
    buffer += data
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) worker.onmessage?.({ data: line.trim() })
  })
  const engine = new Engine(worker)
  engine.process = child
  await engine.ready
  return engine
}

// Plays one game and returns White's score: 1 win, 0.5 draw, 0 loss.
async function playGame(white, black, botEngine, anchorEngine) {
  const game = new Chess()
  const players = { w: white, b: black }
  while (!game.isGameOver() && game.history().length < MAX_PLIES) {
    const player = players[game.turn()]
    if (player.startsWith('sf')) {
      game.move(await anchorMove(anchorEngine, game.fen(), Number(player.slice(2))))
    } else {
      game.move(await chooseBotMove(game, playerFor(player), 600_000, botEngine))
    }
  }
  if (game.isCheckmate()) return game.turn() === 'w' ? 0 : 1
  return 0.5
}

// Stockfish playing at a fixed Elo using its own strength limit.
async function anchorMove(engine, fen, elo) {
  engine.send('setoption name UCI_LimitStrength value true')
  engine.send(`setoption name UCI_Elo value ${elo}`)
  engine.send(`position fen ${fen}`)
  const line = await engine.request(`go movetime ${ANCHOR_MOVE_TIME_MS}`, (l) => l.startsWith('bestmove'))
  const uci = line.split(' ')[1]
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }
}
