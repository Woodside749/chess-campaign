import { useState } from 'react'
import { BOTS } from './bots.js'
import { LESSONS } from './lessons.js'
import Home from './Home.jsx'
import Menu from './Menu.jsx'
import Game from './Game.jsx'
import './App.css'

// The top of the app. It only decides which screen to show:
// the home screen, the developer menu (every bot), or a game.
export default function App() {
  const [screen, setScreen] = useState('home') // 'home' or 'dev'
  const [colorChoice, setColorChoice] = useState('w') // developer menu: 'w', 'b' or 'random'
  const [match, setMatch] = useState(null) // the game being played, or null

  // A game from the developer menu: any bot, with clocks.
  function playBot(bot) {
    const color = colorChoice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorChoice
    setMatch({ bot, color, timed: true, lesson: null })
  }

  // A game from the career screen.
  function playEvent(event) {
    setMatch({
      bot: BOTS[event.bot],
      color: event.color,
      timed: event.timed,
      lesson: event.lesson ? LESSONS[event.lesson] : null,
    })
  }

  if (match) {
    return (
      <Game
        bot={match.bot}
        startColor={match.color}
        timed={match.timed}
        lesson={match.lesson}
        onExit={() => setMatch(null)}
      />
    )
  }
  if (screen === 'dev') {
    return (
      <Menu
        colorChoice={colorChoice}
        onColorChoice={setColorChoice}
        onPlay={playBot}
        onBack={() => setScreen('home')}
      />
    )
  }
  return <Home onPlayEvent={playEvent} onOpenDevMenu={() => setScreen('dev')} />
}
