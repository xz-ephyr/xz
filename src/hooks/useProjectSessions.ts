import { useState, useEffect, useCallback } from 'react';
import { ChatSessionManager } from '../services/ChatSessionManager';
import { ChatSession } from '../types/chat';

export function useProjectSessions(projectId: string) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const loadSessions = useCallback(async () => {
    const all = await ChatSessionManager.getAll(projectId);
    setSessions(all);
  }, [projectId]);

  useEffect(() => {
    (async () => { await loadSessions(); })();
    const h = (e: any) => { if (e.detail?.projectId === projectId) { (async () => { await loadSessions(); })(); } };
    window.addEventListener('session-title-changed', h);
    return () => window.removeEventListener('session-title-changed', h);
  }, [projectId, loadSessions]);

  return { sessions, loadSessions };
}
