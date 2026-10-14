// Game sounds. Each sound has a name. If a sound file is listed in SOUND_FILES, that file
// plays; otherwise a simple sound is made right here in code with the browser's Web Audio
// API (no files needed).
//
// To use your own recordings: put the files in the folder public/sounds/ (for example
// public/sounds/move.mp3) and list them below, like  move: '/sounds/move.mp3'.
// Short files work best (mp3, wav or ogg, under a second, except the chimes).
const SOUND_FILES = {
  // move: '/sounds/move.mp3',
  // capture: '/sounds/capture.mp3',
  // check: '/sounds/check.mp3',
  // castle: '/sounds/castle.mp3',
  // promote: '/sounds/promote.mp3',
  // start: '/sounds/start.mp3',
  // win: '/sounds/win.mp3',
  // loss: '/sounds/loss.mp3',
  // draw: '/sounds/draw.mp3',
  // lowTime: '/sounds/low-time.mp3',
}

// Overall volume of all sounds, from 0 (silent) to 1 (full). Lower it to make every
// sound quieter at once.
const MASTER_VOLUME = 0.5

const MUTE_KEY = 'chess-campaign-muted'

let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === 'true'
  } catch {
    return false
  }
})()

export function isMuted() {
  return muted
}

export function setMuted(value) {
  muted = value
  try {
    localStorage.setItem(MUTE_KEY, String(value))
  } catch {
    // Storage can be blocked; then the setting just lasts until the page is closed.
  }
}

// What the sound system is doing, for the developer-only sound check line in the game:
// the last sound asked for, how many have played, and the last error (if any).
const status = { last: null, played: 0, error: null }
export function soundStatus() {
  return { ...status, state: context ? context.state : 'not started', muted }
}

// Plays a sound by name: 'move', 'capture', 'check', 'castle', 'promote', 'start', 'win',
// 'loss', 'draw' or 'lowTime'. Never throws: a sound that can't play is simply skipped.
export function playSound(name) {
  status.last = name
  if (muted) return
  try {
    if (SOUND_FILES[name]) {
      const file = new Audio(SOUND_FILES[name])
      file.volume = MASTER_VOLUME
      file.play().catch((error) => (status.error = String(error)))
      return
    }
    SYNTHS[name]?.(audio())
    status.played++
  } catch (error) {
    // No sound support (or not allowed yet): play on silently, but remember why.
    status.error = String(error)
  }
}

// The sound for a move: check beats capture, capture beats castling and promotion.
export function moveSound(move) {
  if (move.san.includes('+') || move.san.includes('#')) return 'check'
  if (move.captured) return 'capture'
  if (move.flags.includes('k') || move.flags.includes('q')) return 'castle'
  if (move.promotion) return 'promote'
  return 'move'
}

// ---------- The made-in-code sounds ----------

let context = null
let master = null // every made-in-code sound goes through this, at MASTER_VOLUME
function audio() {
  if (!context) {
    context = new (window.AudioContext || window.webkitAudioContext)()
    master = context.createGain()
    master.gain.value = MASTER_VOLUME
    master.connect(context.destination)
  }
  // Safari pauses sound now and then: 'suspended' until a click, and 'interrupted' after
  // switching tabs or when another app plays sound. Wake it up from either.
  if (context.state !== 'running') context.resume().catch((error) => (status.error = String(error)))
  return context
}

// Safari only lets a page start sound *during* a click, tap or key press, and the game's
// sounds play a moment later (after the move has been made). So on every click, tap or
// key press we wake the sound system up, and the first time we also play a silent sound,
// which is what unlocks it in Safari (on the Mac and on iPhones).
let unlocked = false
function unlockAudio() {
  try {
    const ctx = audio()
    if (!unlocked) {
      const silence = ctx.createBufferSource()
      silence.buffer = ctx.createBuffer(1, 1, 22050)
      silence.connect(ctx.destination)
      silence.start(0)
      unlocked = true
    }
  } catch (error) {
    status.error = String(error)
  }
}
if (typeof window !== 'undefined') {
  for (const type of ['pointerdown', 'touchstart', 'keydown']) {
    window.addEventListener(type, unlockAudio, { capture: true, passive: true })
  }
}

// A short knock: a burst of filtered noise plus a low thump, fading out fast.
function knock(ctx, { at = 0, pitch = 1400, thump = 160, volume = 0.5, length = 0.08 } = {}) {
  const start = ctx.currentTime + at
  const noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3
  const source = ctx.createBufferSource()
  source.buffer = noise
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = pitch
  filter.Q.value = 1.5
  const gain = ctx.createGain()
  gain.gain.value = volume
  // (Connected one at a time: some Safari versions don't support chaining connect calls.)
  source.connect(filter)
  filter.connect(gain)
  gain.connect(master)
  source.start(start)
  tone(ctx, { at, frequency: thump, volume: volume * 0.6, length: length * 1.2, type: 'sine' })
}

// A plain tone that fades out.
function tone(ctx, { at = 0, frequency = 880, volume = 0.2, length = 0.15, type = 'triangle' } = {}) {
  const start = ctx.currentTime + at
  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.value = frequency
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(volume, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
  osc.connect(gain)
  gain.connect(master)
  osc.start(start)
  osc.stop(start + length + 0.02)
}

const SYNTHS = {
  // A wooden "tok" with a short pitched click in it, so it is always clearly audible.
  move: (ctx) => {
    knock(ctx, { volume: 0.8 })
    tone(ctx, { frequency: 620, volume: 0.12, length: 0.06, type: 'sine' })
  },
  capture: (ctx) => {
    knock(ctx, { pitch: 2200, thump: 120, volume: 1, length: 0.1 })
    knock(ctx, { at: 0.05, pitch: 1600, volume: 0.6 })
    tone(ctx, { frequency: 420, volume: 0.14, length: 0.09, type: 'sine' })
  },
  check: (ctx) => {
    knock(ctx)
    tone(ctx, { at: 0.02, frequency: 990, volume: 0.15, length: 0.18 })
  },
  castle: (ctx) => {
    knock(ctx)
    knock(ctx, { at: 0.09, pitch: 1200 })
  },
  promote: (ctx) => {
    knock(ctx)
    tone(ctx, { at: 0.03, frequency: 660, volume: 0.12, length: 0.12 })
    tone(ctx, { at: 0.12, frequency: 990, volume: 0.12, length: 0.2 })
  },
  start: (ctx) => {
    tone(ctx, { frequency: 523, volume: 0.15, length: 0.25 })
    tone(ctx, { at: 0.12, frequency: 784, volume: 0.15, length: 0.35 })
  },
  win: (ctx) => [523, 659, 784, 1047].forEach((f, i) => tone(ctx, { at: i * 0.11, frequency: f, volume: 0.15, length: 0.35 })),
  loss: (ctx) => [494, 392, 330].forEach((f, i) => tone(ctx, { at: i * 0.16, frequency: f, volume: 0.15, length: 0.4 })),
  draw: (ctx) => [523, 523].forEach((f, i) => tone(ctx, { at: i * 0.18, frequency: f, volume: 0.15, length: 0.3 })),
  lowTime: (ctx) => [0, 0.18, 0.36].forEach((at) => tone(ctx, { at, frequency: 1200, volume: 0.15, length: 0.1, type: 'square' })),
}
