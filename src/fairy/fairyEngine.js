// Fairy-Stockfish, the engine the bots think with in fairy chess. It is loaded once,
// the first time a fairy game needs it, and taught our variants from variants.ini.
// It is wrapped in the same Engine class as normal Stockfish (see engine.js), so the
// bot brain can use either one in the same way.
import { Engine } from '../engine.js'
import variantsIni from './variants.ini?raw'

const SCRIPT_URL = '/fairy-stockfish/stockfish.js'
let loading = null

// The shared fairy engine (a promise, because loading takes a moment).
function sharedFairyEngine() {
  loading ??= (async () => {
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
  })()
  return loading
}

// An engine for one variant: like the normal engine, but every analysis is in `variant`.
// Throws if Fairy-Stockfish can't run in this browser.
export async function fairyEngineFor(variant) {
  const engine = await sharedFairyEngine()
  return { analyse: (fen, options) => engine.analyse(fen, { ...options, variant }) }
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
