// Fairy-Stockfish, the engine the bots think with in fairy chess. It is loaded once,
// the first time a fairy game needs it, and taught our variants from variants.ini.
// It is wrapped in the same Engine class as normal Stockfish (see engine.js), so the
// bot brain can use either one in the same way.
import { Engine } from '../engine.js'
import variantsIni from './variants.ini?raw'

const SCRIPT_URL = '/fairy-stockfish/stockfish.js'
// If the engine hasn't started after this long (a slow download, or a browser where it
// stalls), the bots use the simple backup brain instead.
const START_TIMEOUT_MS = 20_000
// A search normally takes well under a second. One that hasn't answered after this long
// has got stuck, so the bot plays a backup move and the engine is started afresh next time.
// The deep searches of the Legend bots can take several seconds, so they get longer.
const searchTimeoutMs = (depth = 8) => (depth > 10 ? 30_000 : 8000)
// After this many stuck searches the engine isn't tried again until the page is reloaded
// (the backup brain plays every move, instead of the bot losing seconds each time).
const MAX_STUCK = 2
let loading = null
let stuck = 0

// The shared fairy engine (a promise, because loading takes a moment). If it fails or is
// too slow to start, every later call fails straight away (so the bots use the backup brain
// without waiting again).
function sharedFairyEngine() {
  loading ??= withTimeout(startFairyEngine(), START_TIMEOUT_MS, 'Fairy-Stockfish took too long to start')
  return loading
}

async function startFairyEngine() {
  // Fairy-Stockfish uses several threads, which needs a cross-origin isolated page.
  if (!window.crossOriginIsolated) throw new Error('Fairy-Stockfish needs a cross-origin isolated page')
  await loadScript(SCRIPT_URL)
  // The script defines a global Stockfish() that starts the engine.
  const stockfish = await window.Stockfish()
  // Our variants.ini goes into the engine's own small file system.
  stockfish.FS.writeFile('/variants.ini', variantsIni)
  // A stand-in for a Web Worker, so the normal Engine class can talk to it.
  const worker = { onmessage: null, postMessage: (command) => stockfish.postMessage(command) }
  stockfish.addMessageListener((line) => worker.onmessage?.({ data: line }))
  const engine = new Engine(worker)
  await engine.ready
  engine.send('setoption name VariantPath value /variants.ini')
  await engine.request('isready', (line) => line === 'readyok')
  return engine
}

// An engine for one variant: like the normal engine, but every analysis is in `variant`.
// Throws if Fairy-Stockfish can't run in this browser.
export async function fairyEngineFor(variant) {
  const engine = await sharedFairyEngine()
  return {
    analyse: (fen, options) =>
      withTimeout(
        engine.analyse(fen, { ...options, variant }),
        searchTimeoutMs(options?.depth),
        'Fairy-Stockfish got stuck',
      ).catch((error) => {
        // Throw the stuck engine away, so the next move starts a fresh one (or, after a
        // few times, none at all).
        stuck += 1
        loading = stuck >= MAX_STUCK ? Promise.reject(new Error('Fairy-Stockfish keeps getting stuck')) : null
        loading?.catch(() => {})
        throw error
      }),
  }
}

// Rejects with `message` if `promise` hasn't settled after `ms`.
function withTimeout(promise, ms, message) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

function loadScript(src) {
  if (window.Stockfish) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.onload = resolve
    script.onerror = () => reject(new Error(`Could not load ${src}`))
    document.head.append(script)
  })
}
