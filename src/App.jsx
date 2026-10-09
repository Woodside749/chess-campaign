import { useState } from 'react'
import Menu from './Menu.jsx'
import Game from './Game.jsx'
import './App.css'

// The top of the app. It only decides which screen to show: the menu or a game.
export default function App() {
  const [colorChoice, setColorChoice] = useState('w') // 'w', 'b' or 'random'
  const [match, setMatch] = useState(null) // { bot, color } while playing, null in the menu

  function play(bot) {
    const color = colorChoice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorChoice
    setMatch({ bot, color })
  }

  if (!match) {
    return <Menu colorChoice={colorChoice} onColorChoice={setColorChoice} onPlay={play} />
  }
  return <Game bot={match.bot} startColor={match.color} onExit={() => setMatch(null)} />
}
