import { ChatSession } from '../types/chat';

// Use localStorage for persistence across reloads in the browser/Tauri.
const STORAGE_KEY = 'chat_sessions';

const getSessions = (): ChatSession[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveSessions = (sessions: ChatSession[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

export const ChatSessionManager = {
  getAll: (projectId?: string): ChatSession[] => {
    const sessions = getSessions();
    return sessions.filter(s => projectId ? s.projectId === projectId : !s.projectId);
  },
  
  create: (title: string, lastMessage?: string, projectId?: string): ChatSession => {
    const sessions = getSessions();
    const session: ChatSession = {
      id: crypto.randomUUID(),
      title,
      lastMessage,
      projectId,
      archived: false,
      createdAt: Date.now(),
    };
    sessions.push(session);
    saveSessions(sessions);
    return session;
  },

  delete: (id: string) => {
    const sessions = getSessions().filter(s => s.id !== id);
    saveSessions(sessions);
  },

  archive: (id: string) => {
    const sessions = getSessions();
    const session = sessions.find(s => s.id === id);
    if (session) session.archived = !session.archived;
    saveSessions(sessions);
  },

  rename: (id: string, newTitle: string) => {
    const sessions = getSessions();
    const session = sessions.find(s => s.id === id);
    if (session) session.title = newTitle;
    saveSessions(sessions);
  },
};
