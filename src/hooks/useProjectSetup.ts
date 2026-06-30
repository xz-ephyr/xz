import { useState, useCallback } from 'react';
import { isTauri } from '../lib/tauri';
import { ChatSessionManager } from '../services/ChatSessionManager';
import { FileSystemService } from '../services/FileSystemService';

export function useProjectSetup(loadProjects: () => void) {
  const [isCreating, setIsCreating] = useState(false);
  const createProject = useCallback(async () => {
    setIsCreating(true);
    try {
      if (isTauri()) {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const sel = await open({ directory: true, multiple: false });
        if (sel && typeof sel === 'string') { await ChatSessionManager.createProject(sel.split(/[/\\]/).pop() || 'Project', sel); loadProjects(); }
      } else if ('showDirectoryPicker' in window) {
        const dh = await (window as any).showDirectoryPicker();
        const pp = await FileSystemService.importDirectory(dh);
        const np = await ChatSessionManager.createProject(dh.name || 'Project', pp);
        await FileSystemService.uploadProjectFiles(np.id, pp); loadProjects();
      } else {
        const fn = prompt('Name:'); if (fn) { await ChatSessionManager.createProject(fn, `/web-projects/${fn}`); loadProjects(); }
      }
    } finally { setIsCreating(false); }
  }, [loadProjects]);
  return { isCreating, createProject };
}
