import { createContext, useContext } from 'react'

// Lets any screen open the "Invite to game" window for a player (App provides it, for
// logged-in players). `useInvite()` gives a function `invite(player)`, or null.
export const InviteContext = createContext(null)
export const useInvite = () => useContext(InviteContext)
