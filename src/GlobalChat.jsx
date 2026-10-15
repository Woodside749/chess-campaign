import { useEffect, useRef, useState } from 'react'
import * as chatApi from './chat.js'
import * as friendsApi from './friends.js'
import { usePlayer } from './player.js'
import Avatar from './Avatar.jsx'
import PlayerActions from './PlayerActions.jsx'

// The global chat on the main menu: everyone who is logged in, live. Messages are short,
// have no links and disappear after an hour (see chat.js). Clicking a player's name or
// picture opens the player menu (block, report …); admins can delete any message.
// `chat` and `friends` are chat.js and friends.js; a test can pass pretend ones.
export default function GlobalChat({ account, chat = chatApi, friends = friendsApi }) {
  const myId = account.user?.id
  const admin = usePlayer().admin
  const [messages, setMessages] = useState(null) // null while loading
  const [draft, setDraft] = useState('')
  const [problem, setProblem] = useState(null)
  const [sending, setSending] = useState(false)
  const [menuFor, setMenuFor] = useState(null) // { player, text, relation } for the player menu
  const [notice, setNotice] = useState(null)
  const [round, setRound] = useState(0) // bumped to load the messages again
  const listRef = useRef(null)

  // Load the last hour of messages, then listen for new and deleted ones.
  useEffect(() => {
    if (!myId) return
    let cancelled = false
    chat.loadMessages().then(({ messages: loaded, error }) => {
      if (cancelled) return
      if (error) setProblem(error)
      else setMessages(loaded)
    })
    const stop = chat.watchChat(
      (message) => setMessages((current) => (current?.some((m) => m.id === message.id) ? current : [...(current ?? []), message])),
      (id) => setMessages((current) => current?.filter((m) => m.id !== id) ?? current),
    )
    return () => {
      cancelled = true
      stop()
    }
  }, [myId, chat, round])

  // Every minute, drop messages that have become more than an hour old.
  useEffect(() => {
    const timer = setInterval(() => setMessages((current) => current?.filter((m) => !chat.tooOld(m)) ?? current), 60_000)
    return () => clearInterval(timer)
  }, [chat])

  // Keep the newest message in view (unless the player has scrolled up to read).
  useEffect(() => {
    const list = listRef.current
    if (list && list.scrollHeight - list.scrollTop - list.clientHeight < 120) list.scrollTop = list.scrollHeight
  }, [messages])

  async function send(e) {
    e.preventDefault()
    if (!draft.trim() || sending) return
    setSending(true)
    const error = await chat.sendMessage(myId, draft)
    setSending(false)
    setProblem(error)
    if (!error) {
      setDraft('')
      // The message arrives through the live connection; make sure it's there anyway.
      const { messages: loaded } = await chat.loadMessages()
      if (loaded) setMessages(loaded)
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
    }
  }

  // Opens the player menu for a message's author, after checking whether we are friends
  // (so it can offer Add friend, Accept or Remove friend).
  async function openMenuFor(message) {
    const { lists } = await friends.loadFriendships(myId)
    const find = (list) => lists?.[list].find((entry) => entry.player.id === message.author.id)
    const kind = ['friends', 'incoming', 'outgoing'].find(find)
    const relation = kind ? { kind: kind === 'friends' ? 'friend' : kind, id: find(kind).id } : { kind: 'none' }
    setMenuFor({ player: message.author, text: message.text, relation })
  }

  async function remove(id) {
    const error = await chat.deleteMessage(id)
    if (error) setProblem(error)
    else setMessages((current) => current.filter((m) => m.id !== id))
  }

  return (
    <aside className="menu-chat" aria-label="Global chat">
      <h2>🌍 Global chat</h2>

      {!myId ? (
        <div className="chat-messages empty">
          <p className="chat-empty">Meet other players here: find friends, and agree on a game mode to play together.</p>
          <p className="chat-empty">Log in (top right) to chat.</p>
        </div>
      ) : (
        <ol className="chat-messages" ref={listRef}>
          {messages?.length === 0 && <li className="chat-empty">No messages in the last hour. Say hi!</li>}
          {messages?.map((message) => {
            const mine = message.author.id === myId
            const openMenu = mine ? undefined : () => openMenuFor(message)
            return (
              <li key={message.id} className={mine ? 'chat-message mine' : 'chat-message'}>
                <button className="chat-avatar" onClick={openMenu} disabled={mine} aria-label={message.author.name}>
                  <Avatar bot={{ ...message.author, flag: '' }} size={30} />
                </button>
                <div className="chat-body">
                  <div className="chat-meta">
                    <button className="chat-name" onClick={openMenu} disabled={mine}>
                      {message.author.name}
                    </button>
                    <time>{message.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                    {admin && (
                      <button className="chat-delete" onClick={() => remove(message.id)} title="Delete for everyone (admin)">
                        🗑
                      </button>
                    )}
                  </div>
                  <p className="chat-text">{message.text}</p>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {notice && <p className="chat-notice">{notice}</p>}
      {problem && <p className="chat-problem">{problem}</p>}

      <form className="chat-form" onSubmit={send}>
        <input
          className="chat-input"
          placeholder={myId ? 'Message (no links)' : 'Log in to chat'}
          value={draft}
          maxLength={chat.MAX_LENGTH}
          onChange={(e) => {
            setDraft(e.target.value)
            setProblem(null)
          }}
          disabled={!myId}
        />
        {myId && (
          <button className="chat-send" type="submit" disabled={!draft.trim() || sending}>
            Send
          </button>
        )}
      </form>
      {draft.length > chat.MAX_LENGTH - 40 && (
        <p className="chat-count">
          {draft.length}/{chat.MAX_LENGTH}
        </p>
      )}

      <p className="menu-links">
        <a href="/privacy.html">Privacy</a> · <a href="/credits.html">Credits</a>
      </p>

      {menuFor && (
        <PlayerActions
          player={menuFor.player}
          relation={menuFor.relation}
          myId={myId}
          api={friends}
          reportReason="chat"
          reportDetails={`Message: "${menuFor.text}"`}
          onDone={(message) => {
            setMenuFor(null)
            setNotice(message)
            setRound((n) => n + 1) // a blocked player's messages disappear
          }}
          onClose={() => setMenuFor(null)}
        />
      )}
    </aside>
  )
}
