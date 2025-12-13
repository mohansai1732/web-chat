const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const http = require('http');
const { Server } = require('socket.io');

const USERS_FILE = path.join(__dirname, 'users.json');

// Read users from file
function readUsers() {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}

// Write users to file
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Make sure users.json exists
if (!fs.existsSync(USERS_FILE)) writeUsers([]);

const app = express();
app.use(cors());
app.use(express.json());

// SIGNUP API
app.post('/signup', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password)
    return res.status(400).json({ error: 'username and password required' });

  const users = readUsers();

  if (users.find((u) => u.username === username)) {
    return res.status(409).json({ error: 'username already taken' });
  }

  const hash = await bcrypt.hash(password, 8);

  users.push({
    username,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
  });

  writeUsers(users);

  return res.json({ ok: true, username });
});

// LOGIN API
app.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password)
    return res.status(400).json({ error: 'username and password required' });

  const users = readUsers();
  const user = users.find((u) => u.username === username);

  if (!user) return res.status(401).json({ error: 'invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  return res.json({ ok: true, username });
});

// HEALTH CHECK
app.get('/', (req, res) => res.json({ status: 'ok' }));

// Create server + socket
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Online users: socket.id -> username
const online = new Map();

// SOCKET.IO EVENTS
io.on('connection', (socket) => {
  socket.on('join', (username) => {
    if (!username) return socket.disconnect();

    online.set(socket.id, username);

    io.emit('users', Array.from(new Set(online.values())));
    io.emit('system', `${username} joined`);
  });

  socket.on('message', (msg) => {
    const username = online.get(socket.id) || 'Unknown';
    if (!msg.trim()) return;

    io.emit('message', {
      username,
      msg: msg.trim(),
      ts: Date.now(),
    });
  });

  socket.on('disconnect', () => {
    const username = online.get(socket.id);
    online.delete(socket.id);

    if (username) {
      io.emit('users', Array.from(new Set(online.values())));
      io.emit('system', `${username} left`);
    }
  });
});

const PORT = 3001;
server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
