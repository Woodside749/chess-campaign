// Copies the Stockfish engine files from node_modules into public/stockfish,
// so the browser can load them as a Web Worker. Runs automatically before
// `npm run dev` and `npm run build` (see "predev"/"prebuild" in package.json).
import { copyFileSync, mkdirSync } from 'node:fs'

const from = 'node_modules/stockfish/bin'
const to = 'public/stockfish'
// The "lite single-threaded" build: ~1.8 MB and needs no special server headers.
const files = ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']

mkdirSync(to, { recursive: true })
for (const file of files) {
  copyFileSync(`${from}/${file}`, `${to}/${file}`)
}
console.log(`Copied Stockfish to ${to}`)
