import { ChatSession, Project } from '../types/chat';
import { DatabaseService } from './DatabaseService';

export const ChatSessionManager = {
  // Migration logic to be called on app start
  migrateFromLocalStorage: async () => {
    const SESSION_KEY = 'chat_sessions';
    const PROJECT_KEY = 'projects';

    const storedProjects = localStorage.getItem(PROJECT_KEY);
    if (storedProjects) {
      const projects = JSON.parse(storedProjects);
      for (const p of projects) {
        await DatabaseService.createProject(p.name, p.path);
      }
      localStorage.removeItem(PROJECT_KEY);
    }

    const storedSessions = localStorage.getItem(SESSION_KEY);
    if (storedSessions) {
      const sessions = JSON.parse(storedSessions);
      for (const s of sessions) {
        await DatabaseService.createSession(s.title, s.lastMessage, s.projectId);
      }
      localStorage.removeItem(SESSION_KEY);
    }
  },

  getAll: async (projectId?: string | null): Promise<ChatSession[]> => {
    return DatabaseService.getSessions(projectId) as unknown as Promise<ChatSession[]>;
  },

  create: async (title: string, lastMessage?: string, projectId?: string): Promise<ChatSession> => {
    return DatabaseService.createSession(title, lastMessage, projectId) as unknown as Promise<ChatSession>;
  },

  delete: async (id: string) => {
    return DatabaseService.deleteSession(id);
  },

  archive: async (id: string) => {
    const sessions = await DatabaseService.getSessions();
    const session = sessions.find((s) => s.id === id);
    if (session) {
      await DatabaseService.updateSession(id, { archived: !session.archived });
    }
  },

  rename: async (id: string, newTitle: string) => {
    await DatabaseService.updateSession(id, { title: newTitle });
  },

  // Project Management
  getProjects: async (): Promise<Project[]> => {
    return DatabaseService.getProjects() as unknown as Promise<Project[]>;
  },

  createProject: async (name: string, path: string): Promise<Project> => {
    return DatabaseService.createProject(name, path) as unknown as Promise<Project>;
  },

  deleteProject: async (id: string) => {
    return DatabaseService.deleteProject(id);
  },
};
