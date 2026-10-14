# Chess Campaign

A chess campaign game in the browser, playable at [chesscampaign.com](https://chesscampaign.com).

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Licences

Chess Campaign is free software under the GNU General Public License, version 3 or later (see `LICENSE`), like the chess engines it is built on. Anyone may read, change and share the code under the same licence.

The bots use [Stockfish](https://stockfishchess.org/) via [stockfish.js](https://github.com/nmrugg/stockfish.js), and for fairy chess [Fairy-Stockfish](https://github.com/fairy-stockfish/Fairy-Stockfish) via [fairy-stockfish.wasm](https://github.com/fairy-stockfish/fairy-stockfish.wasm) and [ffish.js](https://www.npmjs.com/package/ffish-es6). All are GPL licensed; their source code is at those links.

The puzzles in Puzzle Trials come from the [Lichess puzzle database](https://database.lichess.org/#puzzles) (public domain, CC0). `scripts/pick-puzzles.py` explains how they were picked and how to pick new ones.

## Hosting

The game is hosted on Netlify, which builds it from GitHub on every push (settings in `netlify.toml`). Fairy-Stockfish needs a "cross-origin isolated" page. The dev server sends the two headers for that (see `vite.config.js`), and `netlify.toml` makes Netlify send them too:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Without them, fairy games still work, but the bots use a simple backup brain instead of the engine.
