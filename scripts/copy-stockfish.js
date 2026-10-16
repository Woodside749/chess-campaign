// Copies the chess engines from node_modules into public/, so the browser can load
// them. Runs automatically before `npm run dev` and `npm run build`
// (see "predev"/"prebuild" in package.json).
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

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

// Fairy-Stockfish asks the browser to set aside up to 2 GB of shared memory. iPhones are
// strict about memory and may refuse that or stop the engine, while fairy chess needs far
// less. So the limit is lowered to 512 MB (8192 pages of 64 KB).
const fairyScript = 'public/fairy-stockfish/stockfish.js'
const script = readFileSync(fairyScript, 'utf8')
if (script.includes('maximum:32768')) {
  writeFileSync(fairyScript, script.replace('maximum:32768', 'maximum:8192'))
  console.log('Fairy-Stockfish memory limit set to 512 MB')
} else if (!script.includes('maximum:8192')) {
  console.warn(`Could not find the memory limit in ${fairyScript}; it stays as it is`)
}
