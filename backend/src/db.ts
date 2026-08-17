import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'pump.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS pump_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    is_on INTEGER NOT NULL DEFAULT 0,
    mode TEXT NOT NULL DEFAULT 'auto',
    manual_expires_at TEXT,
    last_updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_heartbeat TEXT
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    days TEXT NOT NULL,
    start_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event TEXT NOT NULL,
    trigger TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Pastikan selalu ada satu baris di pump_state
const existing = db.prepare('SELECT id FROM pump_state WHERE id = 1').get();
if (!existing) {
  db.prepare(`INSERT INTO pump_state (id, is_on, mode) VALUES (1, 0, 'auto')`).run();
}

export default db;
