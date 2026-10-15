import { useState } from 'react'
import { CREATOR_OPTIONS, HAIR_COLORS, SKIN_TONES, characterPortrait, cleanCharacter, randomCharacter } from './portraits.js'

// The background colours a player can pick behind their character.
const BACKGROUNDS = [
  '#6f8f4e', '#43a047', '#2e7d6b', '#3f8fc4', '#5b6fd6', '#8a55d4',
  '#c2549c', '#d64545', '#e07b39', '#c9a227', '#7a6a58', '#5f6b75',
]

// The character creator on the profile page: a big preview on the left, and every part to
// choose on the right (hairstyles, beards and so on are shown as small previews of the
// player's own character). Nothing is saved until Save is pressed.
// `character` is the saved character (or null), `background` the saved background colour,
// and `onSave(character, background)` saves both (it returns an error message, or null).
export default function CharacterCreator({ character, background, onSave }) {
  const saved = character ? cleanCharacter(character) : null
  const [draft, setDraft] = useState(() => saved ?? cleanCharacter(null))
  const [backdrop, setBackdrop] = useState(background)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)
  const changed = JSON.stringify(draft) !== JSON.stringify(saved) || backdrop !== background
  const set = (changes) => setDraft((current) => ({ ...current, ...changes }))

  async function save() {
    setBusy(true)
    setProblem(await onSave(draft, backdrop))
    setBusy(false)
  }

  // A small preview of the character with one part changed, as a button.
  const tile = (changes, label, selected, onPick, key) => (
    <button key={key} className={selected ? 'creator-tile selected' : 'creator-tile'} onClick={onPick} aria-pressed={selected}>
      <span className="creator-tile-picture" style={{ background: backdrop }}>
        {characterPortrait({ ...draft, ...changes }, `creator-${key}`)}
      </span>
      <span className="creator-tile-label">{label}</span>
    </button>
  )
  const tiles = (part) =>
    CREATOR_OPTIONS[part].map(([value, label]) =>
      tile({ [part]: value }, label, draft[part] === value, () => set({ [part]: value }), `${part}-${value}`),
    )
  const swatches = (colors, value, onPick, label) => (
    <div className="creator-swatches" role="radiogroup" aria-label={label}>
      {colors.map((color) => (
        <button
          key={color}
          role="radio"
          aria-checked={value === color}
          aria-label={color}
          className={value === color ? 'swatch selected' : 'swatch'}
          style={{ background: color }}
          onClick={() => onPick(color)}
        />
      ))}
    </div>
  )

  return (
    <div className="creator">
      <div className="creator-preview">
        <div className="creator-big" style={{ background: backdrop }}>
          {characterPortrait(draft, 'creator-big')}
        </div>
        <button className="secondary creator-random" onClick={() => setDraft(randomCharacter())}>
          🎲 Random
        </button>
        <button className="event-play creator-save" onClick={save} disabled={!changed || busy}>
          {busy ? 'Saving…' : changed ? 'Save character' : 'Saved ✓'}
        </button>
        {problem && <p className="account-message error">{problem}</p>}
        {changed && saved && (
          <button
            className="creator-undo"
            onClick={() => {
              setDraft(saved)
              setBackdrop(background)
            }}
          >
            Undo changes
          </button>
        )}
      </div>

      <div className="creator-options">
        <h3>Skin</h3>
        {swatches(
          CREATOR_OPTIONS.skin.map((tone) => SKIN_TONES[tone]),
          SKIN_TONES[draft.skin],
          (color) => set({ skin: CREATOR_OPTIONS.skin.find((tone) => SKIN_TONES[tone] === color) }),
          'Skin',
        )}

        <h3>Hair</h3>
        <div className="creator-tiles">{tiles('hair')}</div>
        {draft.hair === 'hijab' ? (
          <>
            <h3>Headscarf colour</h3>
            {swatches(CREATOR_OPTIONS.colors, draft.scarf, (scarf) => set({ scarf }), 'Headscarf colour')}
          </>
        ) : (
          <>
            <h3>Hair colour</h3>
            {swatches(
              CREATOR_OPTIONS.hairColor.map((name) => HAIR_COLORS[name]),
              HAIR_COLORS[draft.hairColor],
              (color) => set({ hairColor: CREATOR_OPTIONS.hairColor.find((name) => HAIR_COLORS[name] === color) }),
              'Hair colour',
            )}
          </>
        )}

        <h3>Beard</h3>
        <div className="creator-tiles">{tiles('beard')}</div>

        <h3>Expression</h3>
        <div className="creator-tiles">{tiles('expression')}</div>

        <h3>Glasses</h3>
        <div className="creator-tiles">{tiles('glasses')}</div>

        <h3>Extras</h3>
        <div className="creator-tiles">
          {CREATOR_OPTIONS.extras.map(([extra, label]) => {
            const on = draft.extras.includes(extra)
            const toggled = on ? draft.extras.filter((e) => e !== extra) : [...draft.extras, extra]
            return tile({ extras: [...draft.extras, extra] }, label, on, () => set({ extras: toggled }), `extra-${extra}`)
          })}
        </div>

        <h3>Clothes</h3>
        <div className="creator-tiles">{tiles('clothes')}</div>
        <h3>Clothes colour</h3>
        {swatches(CREATOR_OPTIONS.colors, draft.shirt, (shirt) => set({ shirt }), 'Clothes colour')}

        <h3>Background</h3>
        {swatches(BACKGROUNDS, backdrop, setBackdrop, 'Background')}
      </div>
    </div>
  )
}
