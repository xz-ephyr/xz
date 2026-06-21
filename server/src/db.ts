import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(path.join(DATA_DIR, 'xz.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: any[],
): Promise<{ rows: T[] }> {
  const sql = text.replace(/\$(\d+)/g, '?');
  const trimmed = text.trimStart().toUpperCase();
  const start = trimmed.startsWith('SELECT')
    || trimmed.startsWith('WITH')
    || trimmed.startsWith('INSERT')
    || trimmed.startsWith('UPDATE')
    || trimmed.startsWith('DELETE');

  const stmt = db.prepare(sql);

  if (start) {
    const rows = (params ? stmt.all(...params) : stmt.all()) as T[];
    return { rows };
  }

  if (params) {
    stmt.run(...params);
  } else {
    stmt.run();
  }
  return { rows: [] as T[] };
}

export async function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      last_message TEXT,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      reasoning TEXT,
      tool_invocations TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  console.log('Migration complete');
}
