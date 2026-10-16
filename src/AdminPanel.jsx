import { useEffect, useState } from 'react'
import * as feedbackApi from './feedback.js'
import Avatar from './Avatar.jsx'

const TABS = [
  ['bug', '🐞 Bugs'],
  ['idea', '💡 Ideas'],
  ['reports', '🚩 Player reports'],
]

// The admin page (admins only, from the profile page): what players have sent in. Bug
// reports, feature ideas and player reports, each as Open or Done, newest first; "Mark done"
// moves an item to Done (and "Reopen" back). The database only lets admins read these.
// `api` is feedback.js; a test can pass a pretend one.
export default function AdminPanel({ onBack, api = feedbackApi }) {
  const [tab, setTab] = useState('bug')
  const [status, setStatus] = useState('open')
  const [items, setItems] = useState(null) // null while loading
  const [problem, setProblem] = useState(null)
  const [round, setRound] = useState(0) // bumped to load again after a change

  useEffect(() => {
    let cancelled = false
    const load = tab === 'reports' ? api.loadReports(status) : api.loadFeedback(tab, status)
    load.then(({ items: loaded, error }) => {
      if (cancelled) return
      setProblem(error ?? null)
      setItems(loaded ?? [])
    })
    return () => {
      cancelled = true
    }
  }, [tab, status, round, api])

  async function toggle(item) {
    const error = await api.setStatus(tab === 'reports' ? 'reports' : 'feedback', item.id, status === 'open' ? 'done' : 'open')
    if (error) setProblem(error)
    else setRound((n) => n + 1)
  }

  const when = (time) => time.toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <main className="admin-screen">
      <button className="back" onClick={onBack}>
        ← Profile
      </button>
      <h1>Admin</h1>

      <div className="admin-tabs" role="tablist">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            className={tab === value ? 'selected' : ''}
            onClick={() => {
              setItems(null)
              setTab(value)
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="color-choice" role="radiogroup" aria-label="Show">
        {[
          ['open', 'Open'],
          ['done', 'Done'],
        ].map(([value, label]) => (
          <button
            key={value}
            role="radio"
            aria-checked={status === value}
            className={status === value ? 'selected' : ''}
            onClick={() => {
              setItems(null)
              setStatus(value)
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {problem && <p className="account-message error">{problem}</p>}
      {!items ? (
        <p className="friends-empty">Loading…</p>
      ) : items.length === 0 ? (
        <p className="friends-empty">Nothing {status === 'open' ? 'open' : 'done'} here.</p>
      ) : (
        <ul className="admin-list">
          {items.map((item) => (
            <li key={item.id} className="admin-item">
              <div className="admin-item-head">
                {tab === 'reports' ? (
                  <>
                    <Avatar bot={{ ...item.reported, flag: '' }} size={36} />
                    <span>
                      <strong>{item.reported.name}</strong> reported by {item.reporter.name}
                    </span>
                  </>
                ) : (
                  <>
                    <Avatar bot={{ ...item.author, flag: '' }} size={36} />
                    <strong>{item.author.name}</strong>
                  </>
                )}
                <time>{when(item.time)}</time>
              </div>
              {tab === 'reports' && <p className="admin-reason">{item.reason}</p>}
              {(item.message ?? item.details) && <p className="admin-message">{item.message ?? item.details}</p>}
              {item.context && <p className="admin-context">{item.context}</p>}
              <button className="friend-button" onClick={() => toggle(item)}>
                {status === 'open' ? 'Mark done' : 'Reopen'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
