// Loads the fairy chess rules library (ffish, from Fairy-Stockfish) once, and teaches it
// our variants from variants.ini. Loading takes a moment, so the app waits for this
// before starting a fairy game.
// The library itself is only downloaded the first time it's needed (import() below).
import wasmUrl from 'ffish-es6/ffish.wasm?url'
import variantsIni from './variants.ini?raw'

let loading = null
let loaded = null

export function loadFairy() {
  loading ??= (async () => {
    const { default: Module } = await import('ffish-es6')
    const ffish = await Module({ locateFile: () => wasmUrl })
    ffish.loadVariantConfig(variantsIni)
    loaded = ffish
    return ffish
  })()
  return loading
}

// The rules library, if it has finished loading (otherwise null).
export function fairyRules() {
  return loaded
}
