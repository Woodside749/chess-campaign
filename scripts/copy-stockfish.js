// Copies the chess engines from node_modules into public/, so the browser can load
// them. Runs automatically before `npm run dev` and `npm run build`
// (see "predev"/"prebuild" in package.json).
import { copyFileSync, mkdirSync } from 'node:fs'

const engines = [
  {
    // Stockfish for normal chess: the "lite single-threaded" build (~1.8 MB).
    from: 'node_modules/stockfish/bin',
    to: 'public/stockfish',
    files: ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm'],
  },
  {
    // Fairy-Stockfish for fairy chess (custom pieces). Uses several threads.
    from: 'node_modules/fairy-stockfish-nnue.wasm',
    to: 'public/fairy-stockfish',
    files: ['stockfish.js', 'stockfish.wasm', 'stockfish.worker.js'],
  },
]

for (const { from, to, files } of engines) {
  mkdirSync(to, { recursive: true })
  for (const file of files) copyFileSync(`${from}/${file}`, `${to}/${file}`)
  console.log(`Copied ${files.length} engine files to ${to}`)
}
