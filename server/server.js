const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const http = require('http');
const { Server } = require('socket.io');

const db = require('./db'); // SQLite connection

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   SIGNUP API
========================= */
app.post('/signup', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }

  const passwordHash = bcrypt.hashSync(password, 8);

  const query =
    'INSERT INTO users (username, passwordHash) VALUES (?, ?)';

  db.run(query, [username, passwordHash], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'username already taken' });
      }
      return res.status(500).json({ error: 'database error' });
    }

    res.json({ ok: true, username });
  });
});

/* =========================
   LOGIN API
========================= */
app.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }

  const query = 'SELECT * FROM users WHERE username = ?';

  db.get(query, [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    const ok = bcrypt.compareSync(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    res.json({ ok: true, username });
  });
});

/* =========================
   HEALTH CHECK
========================= */
app.get('/', (req, res) => res.json({ status: 'ok' }));

/* =========================
   SOCKET.IO
========================= */
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// socket.id -> username
const online = new Map();

io.on('connection', (socket) => {
  socket.on('join', (username) => {
    if (!username) return socket.disconnect();

    online.set(socket.id, username);

    io.emit('users', Array.from(new Set(online.values())));
    io.emit('system', `${username} joined`);
  });

  socket.on('message', (msg) => {
    const username = online.get(socket.id) || 'Unknown';
    if (!msg || !msg.trim()) return;

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

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3001;
server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);