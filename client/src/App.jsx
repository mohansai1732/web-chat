import React, { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const SERVER = 'http://localhost:3001'

// store username in browser
function saveUser(name) { localStorage.setItem('chat_user', name) }
function loadUser() { return localStorage.getItem('chat_user') }
function clearUser() { localStorage.removeItem('chat_user') }

export default function App() {
  const [view, setView] = useState(loadUser() ? 'chat' : 'auth')
  const [username, setUsername] = useState(loadUser() || '')
  const [messages, setMessages] = useState([])
  const [users, setUsers] = useState([])
  const [input, setInput] = useState('')
  const socketRef = useRef(null)
  const messagesRef = useRef(null)

  useEffect(() => {
    if (view === 'chat') startSocket()
    return () => socketRef.current && socketRef.current.disconnect()
    // eslint-disable-next-line
  }, [view])

  function startSocket() {
    if (socketRef.current) socketRef.current.disconnect()
    const s = io(SERVER, { autoConnect: true })
    socketRef.current = s

    s.on('connect', () => s.emit('join', username))
    s.on('message', (m) => setMessages(old => [...old, m]))
    s.on('system', (t) => setMessages(old => [...old, { username: 'System', msg: t }]))
    s.on('users', (list) => setUsers(list))
  }

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages])

  async function signup(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    const u = (fd.get('username') || '').trim()
    const p = (fd.get('password') || '').trim()
    if (!u || !p) return alert('Enter username and password')
    const res = await fetch(SERVER + '/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    })
    const data = await res.json()
    if (!res.ok) return alert(data.error || 'Signup failed')
    saveUser(u); setUsername(u); setView('chat')
  }

  async function login(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    const u = (fd.get('username') || '').trim()
    const p = (fd.get('password') || '').trim()
    if (!u || !p) return alert('Enter username and password')
    const res = await fetch(SERVER + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    })
    const data = await res.json()
    if (!res.ok) return alert(data.error || 'Login failed')
    saveUser(u); setUsername(u); setView('chat')
  }

  function sendMessage() {
    if (!input.trim()) return
    socketRef.current && socketRef.current.emit('message', input.trim())
    setInput('')
  }

  function logout() {
    clearUser()
    setUsername('')
    setUsers([])
    setMessages([])
    socketRef.current && socketRef.current.disconnect()
    setView('auth')
  }

  // AUTH VIEW: centered simple forms
  if (view === 'auth') {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial' }}>
        <div style={{ width: 640, padding: 20, background: '#fff', boxShadow: '0 6px 18px rgba(0,0,0,0.06)', borderRadius: 8 }}>
          <h2 style={{ marginTop: 0 }}>Simple Chat</h2>
          <div style={{ display: 'flex', gap: 12 }}>
            <form onSubmit={login} style={{ flex: 1 }}>
              <h4>Login</h4>
              <input name="username" placeholder="username" style={{ width: '100%', padding: 8, marginBottom: 8 }} />
              <input name="password" type="password" placeholder="password" style={{ width: '100%', padding: 8, marginBottom: 8 }} />
              <button type="submit">Login</button>
            </form>

            <form onSubmit={signup} style={{ flex: 1 }}>
              <h4>Signup</h4>
              <input name="username" placeholder="username" style={{ width: '100%', padding: 8, marginBottom: 8 }} />
              <input name="password" type="password" placeholder="password (min 6)" style={{ width: '100%', padding: 8, marginBottom: 8 }} />
              <button type="submit">Signup</button>
            </form>
          </div>
          <p style={{ marginTop: 12, color: '#666' }}>After login/signup the chat UI will appear.</p>
        </div>
      </div>
    )
  }

  // CHAT VIEW: simple compact layout
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial' }}>
      <aside style={{ width: 220, borderRight: '1px solid #ddd', padding: 12 }}>
        <h3>Users</h3>
        <div>{users.length === 0 ? <i>No one online</i> : users.map((u,i)=><div key={i}>{u}</div>)}</div>
        <hr />
        <div style={{ marginTop: 8 }}><strong>User:</strong> {username}</div>
        <div style={{ marginTop: 8 }}><button onClick={logout}>Logout</button></div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div ref={messagesRef} style={{ padding: 12, flex: 1, overflow: 'auto' }}>
          {messages.map((m,i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <strong>{m.username}:</strong> <span>{m.msg}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: 12, borderTop: '1px solid #eee', display: 'flex' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message and press Enter"
            style={{ flex: 1, padding: 8 }}
          />
          <button onClick={sendMessage} style={{ marginLeft: 8 }}>Send</button>
        </div>
      </main>
    </div>
  )
}
