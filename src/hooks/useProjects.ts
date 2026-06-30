import { useState, useEffect, useCallback } from 'react';
import { ChatSessionManager } from '../services/ChatSessionManager';
import { Project } from '../types/chat';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => {
    (async () => setProjects(await ChatSessionManager.getProjects()))();
    const h = () => { (async () => setProjects(await ChatSessionManager.getProjects()))(); };
    window.addEventListener('projects-changed', h);
    return () => window.removeEventListener('projects-changed', h);
  }, []);
  const loadProjects = useCallback(async () => setProjects(await ChatSessionManager.getProjects()), []);
  return { projects, setProjects, loadProjects };
}
