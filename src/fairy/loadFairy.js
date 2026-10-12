// Loads the fairy chess rules library (ffish, from Fairy-Stockfish) once, and teaches it
// our variants from variants.ini. Loading takes a moment, so the app waits for this
// before starting a fairy game.
import Module from 'ffish-es6'
import wasmUrl from 'ffish-es6/ffish.wasm?url'
import variantsIni from './variants.ini?raw'

let loading = null
let loaded = null

export function loadFairy() {
  loading ??= Module({ locateFile: () => wasmUrl }).then((ffish) => {
    ffish.loadVariantConfig(variantsIni)
    loaded = ffish
    return ffish
  })
  return loading
}

// The rules library, if it has finished loading (otherwise null).
export function fairyRules() {
  return loaded
}
