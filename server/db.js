const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// database file path
const dbPath = path.join(__dirname, "chat.db");

// open database (creates file if not exists)
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ DB connection error:", err.message);
  } else {
    console.log("✅ Connected to SQLite database");
  }
});

// create users table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    passwordHash TEXT
  )
`);

module.exports = db;
