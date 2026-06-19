import { PGlite } from '@electric-sql/pglite';

let db: PGlite | null = null;

export async function getDb() {
  if (!db) {
    db = new PGlite('idb://xz-database');
    await initDb(db);
  }
  return db;
}

async function initDb(pg: PGlite) {
  await pg.exec(`
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
      archived BOOLEAN DEFAULT FALSE,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY,
      session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      reasoning TEXT,
      tool_invocations JSONB,
      created_at BIGINT NOT NULL
    );
  `);
}

export const DatabaseService = {
  // Projects
  async getProjects() {
    const pg = await getDb();
    const res = await pg.query('SELECT * FROM projects ORDER BY created_at DESC');
    return res.rows;
  },

  async createProject(name: string, path: string) {
    const pg = await getDb();
    const id = crypto.randomUUID();
    const createdAt = Date.now();
    await pg.query(
      'INSERT INTO projects (id, name, path, created_at) VALUES ($1, $2, $3, $4)',
      [id, name, path, createdAt]
    );
    return { id, name, path, createdAt };
  },

  async deleteProject(id: string) {
    const pg = await getDb();
    await pg.query('DELETE FROM projects WHERE id = $1', [id]);
  },

  // Sessions
  async getSessions(projectId?: string | null) {
    const pg = await getDb();
    let query = 'SELECT * FROM chat_sessions';
    const params = [];

    if (projectId === null) {
      query += ' WHERE project_id IS NULL';
    } else if (projectId) {
      query += ' WHERE project_id = $1';
      params.push(projectId);
    }

    query += ' ORDER BY created_at DESC';
    const res = await pg.query(query, params);
    return res.rows.map((row: any) => ({
      ...row,
      projectId: row.project_id,
      lastMessage: row.last_message,
      createdAt: Number(row.created_at)
    }));
  },

  async createSession(title: string, lastMessage?: string, projectId?: string) {
    const pg = await getDb();
    const id = crypto.randomUUID();
    const createdAt = Date.now();
    await pg.query(
      'INSERT INTO chat_sessions (id, title, last_message, project_id, created_at) VALUES ($1, $2, $3, $4, $5)',
      [id, title, lastMessage || null, projectId || null, createdAt]
    );
    return { id, title, lastMessage, projectId, archived: false, createdAt };
  },

  async updateSession(id: string, updates: { title?: string; lastMessage?: string; archived?: boolean }) {
    const pg = await getDb();
    const fields = [];
    const params = [id];
    let i = 2;

    if (updates.title !== undefined) {
      fields.push(`title = $${i++}`);
      params.push(updates.title);
    }
    if (updates.lastMessage !== undefined) {
      fields.push(`last_message = $${i++}`);
      params.push(updates.lastMessage);
    }
    if (updates.archived !== undefined) {
      fields.push(`archived = $${i++}`);
      params.push(updates.archived ? 'true' : 'false');
    }

    if (fields.length === 0) return;

    await pg.query(
      `UPDATE chat_sessions SET ${fields.join(', ')} WHERE id = $1`,
      params
    );
  },

  async deleteSession(id: string) {
    const pg = await getDb();
    await pg.query('DELETE FROM chat_sessions WHERE id = $1', [id]);
  },

  // Messages
  async getMessages(sessionId: string) {
    const pg = await getDb();
    const res = await pg.query(
      'SELECT * FROM messages WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );
    return res.rows.map((row: any) => ({
      ...row,
      sessionId: row.session_id,
      toolInvocations: row.tool_invocations ? JSON.parse(row.tool_invocations as string) : undefined
    }));
  },

  async saveMessages(sessionId: string, messages: any[]) {
    const pg = await getDb();
    // In a real app, we might want to be more efficient, but for now we'll just clear and re-insert
    // or better, only insert new ones. Let's do a simple insert for new messages.
    for (const m of messages) {
      if (!m.id) m.id = crypto.randomUUID();
      await pg.query(
        `INSERT INTO messages (id, session_id, role, content, reasoning, tool_invocations, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           content = EXCLUDED.content,
           reasoning = EXCLUDED.reasoning,
           tool_invocations = EXCLUDED.tool_invocations`,
        [
          m.id,
          sessionId,
          m.role,
          m.content,
          m.reasoning || null,
          m.toolInvocations ? JSON.stringify(m.toolInvocations) : null,
          m.createdAt || Date.now()
        ]
      );
    }
  }
};
