import { createContext, useContext } from 'react'

// Lets any screen open the feedback window (App provides it). `useFeedback()` gives a
// function `openFeedback(kind, context)`: kind 'bug' or 'idea', and for bugs where the
// player is (like "Game: Fog of War against Priya").
export const FeedbackContext = createContext(() => {})
export const useFeedback = () => useContext(FeedbackContext)
