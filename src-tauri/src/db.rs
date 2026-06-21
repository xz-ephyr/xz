use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChatSession {
    pub id: String,
    pub title: String,
    pub last_message: Option<String>,
    pub project_id: Option<String>,
    pub archived: bool,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub reasoning: Option<String>,
    pub tool_invocations: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub key: String,
    pub value: String,
}

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(path: &std::path::Path) -> Result<Self, String> {
        let conn = Connection::open(path).map_err(|e| e.to_string())?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
            .map_err(|e| e.to_string())?;
        let db = Database {
            conn: Mutex::new(conn),
        };
        db.migrate()?;
        Ok(db)
    }

    fn migrate(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute_batch(
            "
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
            ",
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Projects ---

    pub fn get_projects(&self) -> Result<Vec<Project>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, name, path, created_at FROM projects ORDER BY created_at DESC")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(Project {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    path: row.get(2)?,
                    created_at: row.get(3)?,
                })
            })
            .map_err(|e| e.to_string())?;
        let mut projects = Vec::new();
        for row in rows {
            projects.push(row.map_err(|e| e.to_string())?);
        }
        Ok(projects)
    }

    pub fn create_project(
        &self,
        id: &str,
        name: &str,
        path: &str,
        created_at: i64,
    ) -> Result<Project, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO projects (id, name, path, created_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(id) DO NOTHING",
            params![id, name, path, created_at],
        )
        .map_err(|e| e.to_string())?;
        Ok(Project {
            id: id.to_string(),
            name: name.to_string(),
            path: path.to_string(),
            created_at,
        })
    }

    pub fn delete_project(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM projects WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Sessions ---

    pub fn get_sessions(&self, project_id: Option<&str>) -> Result<Vec<ChatSession>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let (sql, param): (&str, Vec<Box<dyn rusqlite::types::ToSql>>) = match project_id {
            Some(id) => (
                "SELECT id, title, last_message, project_id, archived, created_at FROM chat_sessions WHERE project_id = ?1 ORDER BY created_at DESC",
                vec![Box::new(id.to_string())],
            ),
            None => (
                "SELECT id, title, last_message, project_id, archived, created_at FROM chat_sessions WHERE project_id IS NULL ORDER BY created_at DESC",
                vec![],
            ),
        };
        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        let param_refs: Vec<&dyn rusqlite::types::ToSql> = param.iter().map(|p| p.as_ref()).collect();
        let rows = stmt
            .query_map(param_refs.as_slice(), |row| {
                Ok(ChatSession {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    last_message: row.get(2)?,
                    project_id: row.get(3)?,
                    archived: row.get::<_, i32>(4)? != 0,
                    created_at: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?;
        let mut sessions = Vec::new();
        for row in rows {
            sessions.push(row.map_err(|e| e.to_string())?);
        }
        Ok(sessions)
    }

    pub fn get_all_sessions(&self) -> Result<Vec<ChatSession>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, title, last_message, project_id, archived, created_at FROM chat_sessions ORDER BY created_at DESC")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(ChatSession {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    last_message: row.get(2)?,
                    project_id: row.get(3)?,
                    archived: row.get::<_, i32>(4)? != 0,
                    created_at: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?;
        let mut sessions = Vec::new();
        for row in rows {
            sessions.push(row.map_err(|e| e.to_string())?);
        }
        Ok(sessions)
    }

    pub fn get_session(&self, id: &str) -> Result<Option<ChatSession>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, title, last_message, project_id, archived, created_at FROM chat_sessions WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt
            .query_map(params![id], |row| {
                Ok(ChatSession {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    last_message: row.get(2)?,
                    project_id: row.get(3)?,
                    archived: row.get::<_, i32>(4)? != 0,
                    created_at: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?;
        match rows.next() {
            Some(row) => Ok(Some(row.map_err(|e| e.to_string())?)),
            None => Ok(None),
        }
    }

    pub fn create_session(
        &self,
        id: &str,
        title: &str,
        last_message: Option<&str>,
        project_id: Option<&str>,
        created_at: i64,
    ) -> Result<ChatSession, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO chat_sessions (id, title, last_message, project_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(id) DO NOTHING",
            params![id, title, last_message, project_id, created_at],
        )
        .map_err(|e| e.to_string())?;
        Ok(ChatSession {
            id: id.to_string(),
            title: title.to_string(),
            last_message: last_message.map(|s| s.to_string()),
            project_id: project_id.map(|s| s.to_string()),
            archived: false,
            created_at,
        })
    }

    pub fn update_session(
        &self,
        id: &str,
        title: Option<&str>,
        last_message: Option<&str>,
        archived: Option<bool>,
    ) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut sets = Vec::new();
        let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
        let mut idx = 1;

        if let Some(t) = title {
            sets.push(format!("title = ?{}", idx));
            params_vec.push(Box::new(t.to_string()));
            idx += 1;
        }
        if let Some(lm) = last_message {
            sets.push(format!("last_message = ?{}", idx));
            params_vec.push(Box::new(lm.to_string()));
            idx += 1;
        }
        if let Some(a) = archived {
            sets.push(format!("archived = ?{}", idx));
            params_vec.push(Box::new(if a { 1i32 } else { 0i32 }));
            idx += 1;
        }

        if sets.is_empty() {
            return Ok(());
        }

        let sql = format!(
            "UPDATE chat_sessions SET {} WHERE id = ?{}",
            sets.join(", "),
            idx
        );
        params_vec.push(Box::new(id.to_string()));

        let param_refs: Vec<&dyn rusqlite::types::ToSql> =
            params_vec.iter().map(|p| p.as_ref()).collect();
        conn.execute(&sql, param_refs.as_slice())
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_session(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM chat_sessions WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Messages ---

    pub fn get_messages(&self, session_id: &str) -> Result<Vec<Message>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, session_id, role, content, reasoning, tool_invocations, created_at FROM messages WHERE session_id = ?1 ORDER BY created_at ASC")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![session_id], |row| {
                Ok(Message {
                    id: row.get(0)?,
                    session_id: row.get(1)?,
                    role: row.get(2)?,
                    content: row.get(3)?,
                    reasoning: row.get(4)?,
                    tool_invocations: row.get(5)?,
                    created_at: row.get(6)?,
                })
            })
            .map_err(|e| e.to_string())?;
        let mut messages = Vec::new();
        for row in rows {
            messages.push(row.map_err(|e| e.to_string())?);
        }
        Ok(messages)
    }

    pub fn save_messages(&self, session_id: &str, messages: Vec<Message>) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        for m in &messages {
            conn.execute(
                "INSERT INTO messages (id, session_id, role, content, reasoning, tool_invocations, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                 ON CONFLICT(id) DO UPDATE SET
                   content = EXCLUDED.content,
                   reasoning = EXCLUDED.reasoning,
                   tool_invocations = EXCLUDED.tool_invocations",
                params![
                    m.id,
                    session_id,
                    m.role,
                    m.content,
                    m.reasoning,
                    m.tool_invocations,
                    m.created_at
                ],
            )
            .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    // --- App Config ---

    pub fn get_config(&self, key: &str) -> Result<Option<String>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT value FROM app_config WHERE key = ?1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt
            .query_map(params![key], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?;
        match rows.next() {
            Some(row) => Ok(Some(row.map_err(|e| e.to_string())?)),
            None => Ok(None),
        }
    }

    pub fn set_config(&self, key: &str, value: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO app_config (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value",
            params![key, value],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }
}
