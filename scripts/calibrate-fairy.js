// Measures how strong the bots are in a fairy chess variant (like our fairy armies), by
// letting test bots play each other and Fairy-Stockfish at fixed, limited strengths
// ("anchors") in that variant. The result is the variant's strength curve: which
// `strength` setting plays at which rating there.
//
// Run it with:   npm run calibrate-fairy -- --variant leapers
// Options:       --sweep 0.2,0.4,0.6,0.8,1   the strength settings to measure (default)
//                --bots mei,fatima,kwame      measure real bots instead (with the strength the
//                                             game gives them in this variant), to check the curve
//                --anchors 800,1500,2200      Fairy-Stockfish's UCI_Elo limits to play against
//                --games 12                   games per pairing
//
// Like calibrate.js, the games run without a browser, spread over all CPU cores. Bots
// choose their moves exactly as in the game: Fairy-Stockfish suggests moves, and the bot
// picks one by its strength settings and personality (no opening book in variants).
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { cpus } from 'node:os'
import { fileURLToPath } from 'node:url'
import Module from 'ffish-es6'
import { BOTS } from '../src/bots.js'
import { Engine } from '../src/engine.js'
import { chooseBotMove } from '../src/botBrain.js'
import { FairyGame } from '../src/fairy/FairyGame.js'
import { FAIRY_VARIANTS } from '../src/fairy/variants.js'
import { strengthForRating, withoutTraits } from '../src/botStrength.js'
import { fitRatings } from './elo.js'

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}
const VARIANT = option('variant', 'archchess')
const ANCHORS = option('anchors', '800,1500,2200').split(',').map(Number)
const ANCHOR_MOVE_TIME_MS = 100
const MAX_PLIES = 250 // games longer than this count as a draw
const VARIANTS_INI = readFileSync(fileURLToPath(new URL('../src/fairy/variants.ini', import.meta.url)), 'utf8')

if (args[0] === '--worker') {
  await runWorker(JSON.parse(args[1]))
} else {
  await runMain()
}

// ---------- Main process: plan the games, start workers, report ratings ----------

async function runMain() {
  const gamesPerPairing = Number(option('games', 12))
  const bots = option('bots', null)
  const ids = bots ? bots.split(',') : option('sweep', '0.2,0.4,0.6,0.8,1').split(',').map((level) => `level:${level}`)
  const ladder = ids.map(playerFor).sort((a, b) => a.strength - b.strength)

  // Each player against the next two up the ladder and against every anchor.
  const pairings = []
  ladder.forEach((bot, i) => {
    for (const other of ladder.slice(i + 1, i + 3)) pairings.push([bot.id, other.id])
    for (const elo of ANCHORS) pairings.push([bot.id, `fsf${elo}`])
  })
  const games = []
  for (const [a, b] of pairings) {
    for (let g = 0; g < gamesPerPairing; g++) games.push(g % 2 === 0 ? [a, b] : [b, a])
  }

  const workers = Math.min(cpus().length, games.length)
  console.log(`Variant ${VARIANT}: playing ${games.length} games on ${workers} CPU cores...`)
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

  const fixed = Object.fromEntries(ANCHORS.map((elo) => [`fsf${elo}`, elo]))
  const ratings = fitRatings(results, fixed)
  const record = {}
  for (const { white, black, score } of results) {
    for (const [player, s] of [[white, score], [black, 1 - score]]) {
      record[player] ??= { w: 0, d: 0, l: 0 }
      record[player][s === 1 ? 'w' : s === 0 ? 'l' : 'd']++
    }
  }
  console.log(`Bot               Strength   Measured in ${VARIANT}   (+/-)   W-D-L`)
  for (const bot of ladder) {
    const r = ratings[bot.id]
    const rec = record[bot.id]
    console.log(
      `${bot.name.padEnd(18)}${String(bot.strength).padStart(8)}${String(Math.round(r.rating)).padStart(14)}` +
        `${('±' + Math.round(r.error)).padStart(12)}   ${rec.w}-${rec.d}-${rec.l}`,
    )
  }
  console.log('\nAnchors: ' + ANCHORS.map((elo) => `fsf${elo} ${record[`fsf${elo}`]?.w ?? 0}-${record[`fsf${elo}`]?.d ?? 0}-${record[`fsf${elo}`]?.l ?? 0}`).join(', '))
  // The curve, ready to paste into src/fairy/variants.js.
  console.log(`\nstrengthCurve: [${ladder.map((bot) => `[${bot.strength}, ${Math.round(ratings[bot.id].rating)}]`).join(', ')}],`)
}

// The bot for an id: a bot from bots.js, or a test bot like "level:0.3" (strength 0.3).
// A real bot plays with the strength the game would give it in this variant: read from
// the variant's strength curve, if it has one already.
function playerFor(id) {
  if (!id.startsWith('level:')) {
    const curve = FAIRY_VARIANTS[VARIANT]?.strengthCurve
    return curve ? { ...BOTS[id], strength: strengthForRating(curve, BOTS[id].rating) } : BOTS[id]
  }
  const strength = Number(id.slice('level:'.length))
  return { id, name: `Strength ${strength}`, rating: Math.round(strength * 1000), strength, style: {} }
}

function startWorker(games, onGameDone) {
  return new Promise((resolve, reject) => {
    const script = fileURLToPath(import.meta.url)
    const child = spawn(process.execPath, [script, '--worker', JSON.stringify(games), '--variant', VARIANT])
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

// ---------- Worker process: play the given games and print each result ----------

async function runWorker(games) {
  const ffish = await Module({ wasmBinary: readFileSync(fileURLToPath(new URL('../node_modules/ffish-es6/ffish.wasm', import.meta.url))) })
  ffish.loadVariantConfig(VARIANTS_INI)
  const botEngine = await createFairyEngine()
  const anchorEngine = await createFairyEngine()
  for (const [white, black] of games) {
    const score = await playGame(ffish, white, black, botEngine, anchorEngine)
    console.log(JSON.stringify({ white, black, score }))
  }
  process.exit(0)
}

// Starts Fairy-Stockfish (the same WebAssembly engine the game uses) inside Node, with our
// variants loaded, and wraps it in our Engine class.
async function createFairyEngine() {
  const require = createRequire(import.meta.url)
  const dir = fileURLToPath(new URL('../node_modules/fairy-stockfish-nnue.wasm/', import.meta.url))
  const FairyStockfish = require(dir + 'stockfish.js')
  const sf = await FairyStockfish({ wasmBinary: readFileSync(dir + 'stockfish.wasm'), locateFile: (file) => dir + file })
  sf.FS.writeFile('/variants.ini', VARIANTS_INI)
  // A stand-in for a browser Web Worker, so the normal Engine class can use it.
  const worker = { onmessage: null, postMessage: (command) => sf.postMessage(command) }
  sf.addMessageListener((line) => worker.onmessage?.({ data: line }))
  const engine = new Engine(worker)
  await engine.ready
  engine.send('setoption name VariantPath value /variants.ini')
  return engine
}

// Plays one game and returns White's score: 1 win, 0.5 draw, 0 loss.
async function playGame(ffish, white, black, botEngine, anchorEngine) {
  const game = new FairyGame(ffish, VARIANT)
  const players = { w: white, b: black }
  const engine = { analyse: (fen, options) => botEngine.analyse(fen, { ...options, variant: VARIANT }) }
  try {
    while (!game.isGameOver() && !game.specialWinner() && game.history().length < MAX_PLIES) {
      const player = players[game.turn()]
      if (player.startsWith('fsf')) {
        game.move(await anchorMove(anchorEngine, game.fen(), Number(player.slice(3))))
      } else {
        // As in the game: no opening book, and the bot's personality minus the traits the
        // variant ignores. (Test bots like "level:0.5" have no personality.)
        const base = playerFor(player)
        const bot = { ...base, openings: null, style: withoutTraits(base.style, FAIRY_VARIANTS[VARIANT]?.ignoreTraits) }
        game.move(await chooseBotMove(game, bot, 600_000, engine))
      }
    }
    const winner = game.specialWinner() ?? (game.isCheckmate() ? (game.turn() === 'w' ? 'b' : 'w') : null)
    return winner === 'w' ? 1 : winner === 'b' ? 0 : 0.5
  } finally {
    game.dispose()
  }
}

// Fairy-Stockfish playing the variant at a fixed Elo using its own strength limit.
async function anchorMove(engine, fen, elo) {
  engine.send(`setoption name UCI_Variant value ${VARIANT}`)
  engine.send('setoption name UCI_LimitStrength value true')
  engine.send(`setoption name UCI_Elo value ${elo}`)
  engine.send(`position fen ${fen}`)
  const line = await engine.request(`go movetime ${ANCHOR_MOVE_TIME_MS}`, (l) => l.startsWith('bestmove'))
  return line.split(' ')[1]
}
