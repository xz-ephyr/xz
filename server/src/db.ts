import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('query', { text: text.slice(0, 80), duration, rows: res.rowCount });
  return res;
}

export async function migrate() {
  const sql = `
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      last_message TEXT,
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      archived BOOLEAN NOT NULL DEFAULT FALSE,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY,
      session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      reasoning TEXT,
      tool_invocations JSONB,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `;
  await query(sql);
  console.log('Migration complete');
}
