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

  // Asks Stockfish for its best move in the position (given as a FEN string).
  // Returns a move in UCI format, for example "e2e4" or "e7e8q".
  bestMove(fen, { skillLevel = 20, depth = 10 } = {}) {
    const search = this.queue.then(async () => {
      this.send(`setoption name Skill Level value ${skillLevel}`)
      this.send(`position fen ${fen}`)
      const line = await this.request(`go depth ${depth}`, (l) => l.startsWith('bestmove'))
      return line.split(' ')[1]
    })
    this.queue = search
    return search
  }

  terminate() {
    this.worker.terminate()
    this.listeners.clear()
  }
}
