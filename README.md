# Chess Career

A chess career game in the browser. See `Chess Career Game Design.md` for the design.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Licences

The bots use [Stockfish](https://stockfishchess.org/) via [stockfish.js](https://github.com/nmrugg/stockfish.js), and for fairy chess [Fairy-Stockfish](https://github.com/fairy-stockfish/Fairy-Stockfish) via [fairy-stockfish.wasm](https://github.com/fairy-stockfish/fairy-stockfish.wasm) and [ffish.js](https://www.npmjs.com/package/ffish-es6). All are GPL licensed, so their source must be made available when the site is published.

## Hosting

Fairy-Stockfish needs a "cross-origin isolated" page. The dev server sends the two headers for that (see `vite.config.js`); the hosting site must send them too:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Without them, fairy games still work, but the bots use a simple backup brain instead of the engine.
