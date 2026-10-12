import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Fairy-Stockfish (the engine for fairy chess) uses several threads, which browsers only
// allow on "cross-origin isolated" pages. These two headers turn that on. A hosting site
// (Netlify, Vercel, ...) needs the same two headers when the game is published.
const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { headers: crossOriginIsolation },
  preview: { headers: crossOriginIsolation },
})
