// The player: how they look in the game, and the title they have earned.
// Logged out, the player is simply "You"; logged in, they have their username, avatar
// colour and flag from their profile. The title comes from the career progress.
import { createContext, useContext } from 'react'
import { STAR_TIERS, maxStars, starsWon, wonEvent } from './career.js'
import { roundsWon } from './progress.js'
import { countryName, flagOf } from './countries.js'
import { displayName } from './useAccount.js'

// Looks like a bot to the Avatar component (a coloured circle with an initial).
export const PLAYER = { id: 'you', name: 'You', color: '#6f8f4e', flag: '', country: '', admin: false }

// How the player looks, from their account (or PLAYER when logged out).
export function playerLook(account) {
  if (!account.user) return PLAYER
  const { profile } = account
  return {
    ...PLAYER,
    name: displayName(account),
    color: profile?.avatar_color ?? PLAYER.color,
    flag: flagOf(profile?.country),
    country: countryName(profile?.country),
    admin: Boolean(profile?.is_admin),
    // The character they made in the character creator (null until they have made one).
    character: profile?.avatar ?? null,
  }
}

// Every screen that shows the player reads their look from here (App provides it).
export const PlayerContext = createContext(PLAYER)
export const usePlayer = () => useContext(PlayerContext)

// Whether to show the developer tools (the developer menu and the auto-win buttons): only
// for admins (set in Supabase, see supabase/04-admins.sql). While developing on the Mac
// (npm run dev), a test browser can also switch them on with
// localStorage['chess-campaign-dev-tools'] = 'true'; the published game ignores that.
export function useDevTools() {
  const { admin } = usePlayer()
  return admin || (import.meta.env.DEV && devToolsSwitch())
}

function devToolsSwitch() {
  try {
    return localStorage.getItem('chess-campaign-dev-tools') === 'true'
  } catch {
    return false
  }
}

// Chess titles, like in real life (Master, International Master, Grandmaster), and on top
// World Champion, which the Legend tier's World Championship will give. Shown as a small
// badge next to the name. Listed from highest to lowest: the player shows the highest
// title they have earned.
export const TITLES = [
  { id: 'wc', short: 'WC', name: 'World Champion', earnedBy: 'world-championship' },
  { id: 'gm', short: 'GM', name: 'Grandmaster', earnedBy: 'gm-championship' },
  { id: 'im', short: 'IM', name: 'International Master', earnedBy: 'im-championship' },
  { id: 'master', short: 'M', name: 'Master', earnedBy: 'master-championship' },
]

// A title by its id, like titleById('master'), or null. Bots use this for `chessTitle`.
export function titleById(id) {
  return TITLES.find((title) => title.id === id) ?? null
}

// The player's highest title, like { short: 'IM', ... }, or null if they have none yet.
export function playerTitle(progress) {
  const wonIn = (eventId) => roundsWon(progress, eventId)
  return TITLES.find((title) => wonEvent(wonIn, title.earnedBy)) ?? null
}

// The tiers in which the player has won all the stars (36), like
// [{ section: 'leagues', name: 'Amateur', color: '#9e9e9e' }]. Each shows as a small
// coloured star next to the player's avatar.
export function tierStars(progress) {
  const wonIn = (eventId) => roundsWon(progress, eventId)
  return STAR_TIERS.filter((tier) => starsWon(wonIn, tier.section) >= maxStars(tier.section))
}
