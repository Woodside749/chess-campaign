// A small wrapper around Stockfish running in a Web Worker.
// We talk to it with UCI text commands and listen for its text replies.

const ENGINE_URL = '/stockfish/stockfish-19-lite-single.js'

export class Engine {
  constructor() {
    this.worker = new Worker(ENGINE_URL)
    this.listeners = new Set()
    this.worker.onmessage = (event) => {
      const line = typeof event.data === 'string' ? event.data : ''
      for (const listener of this.listeners) listener(line)
    }
    this.ready = this.init()
    // Searches run one at a time, so a reply can never be mixed up with another search.
    this.queue = this.ready
  }

  send(command) {
    this.worker.postMessage(command)
  }

  // Sends a command, then resolves with the first reply line that passes `match`.
  request(command, match) {
    return new Promise((resolve) => {
      const listener = (line) => {
        if (match(line)) {
          this.listeners.delete(listener)
          resolve(line)
        }
      }
      this.listeners.add(listener)
      this.send(command)
    })
  }

  async init() {
    await this.request('uci', (line) => line === 'uciok')
    await this.request('isready', (line) => line === 'readyok')
  }

  // Asks Stockfish for its top `multiPv` moves in the position (given as a FEN string),
  // searching `depth` moves ahead. Returns a list like
  //   [{ uci: 'e2e4', score: 35 }, { uci: 'd2d4', score: 30 }, ...]
  // best first. Scores are in centipawns (100 = one pawn) for the side to move.
  // A forced mate gets a huge score: about +10000 if we mate, -10000 if we get mated.
  analyse(fen, { depth = 8, multiPv = 5 } = {}) {
    const search = this.queue.then(async () => {
      const lines = new Map() // multipv number -> latest result for that line
      const collect = (line) => {
        const info = parseInfo(line)
        if (info) lines.set(info.rank, info)
      }
      this.listeners.add(collect)
      this.send('setoption name Skill Level value 20')
      this.send(`setoption name MultiPV value ${multiPv}`)
      this.send(`position fen ${fen}`)
      await this.request(`go depth ${depth}`, (l) => l.startsWith('bestmove'))
      this.listeners.delete(collect)
      return [...lines.values()].sort((x, y) => x.rank - y.rank).map(({ uci, score }) => ({ uci, score }))
    })
    this.queue = search.catch(() => {})
    return search
  }

  terminate() {
    this.worker.terminate()
    this.listeners.clear()
  }
}

// Reads a Stockfish line like
//   "info depth 8 ... multipv 2 score cp -15 ... pv d2d4 d7d5 ..."
// and returns { rank: 2, score: -15, uci: 'd2d4' }, or null for other lines.
function parseInfo(line) {
  if (!line.startsWith('info') || !line.includes(' pv ')) return null
  if (line.includes('lowerbound') || line.includes('upperbound')) return null
  const words = line.split(' ')
  const after = (word) => words[words.indexOf(word) + 1]
  const rank = words.includes('multipv') ? Number(after('multipv')) : 1
  const uci = after('pv')
  let score
  if (words.includes('mate')) {
    const movesToMate = Number(after('mate'))
    score = movesToMate > 0 ? 10000 - movesToMate : -10000 - movesToMate
  } else {
    score = Number(after('cp'))
  }
  return { rank, score, uci }
}

// One shared engine for the whole app, started the first time a bot needs it.
let sharedEngine = null
export function getEngine() {
  sharedEngine ??= new Engine()
  return sharedEngine
}
