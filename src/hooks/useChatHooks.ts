import { useCallback, useEffect } from 'react';
import { ChatSessionManager } from '../services/ChatSessionManager';
import { DatabaseService } from '../services/DatabaseService';
import { FileSystemService } from '../services/FileSystemService';
import { isTauri } from '../lib/tauri';
import type { Project } from '../types/chat';

export function useProjectActions(navigate: (p: string) => void, addToast: (m: string, t: 'error') => void) {
  return useCallback(async () => {
    try {
      let np: Project | null = null; let fn = '';
      if (isTauri()) {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const sel = await open({ directory: true, multiple: false });
        if (sel && typeof sel === 'string') { fn = sel.split(/[/\\]/).pop() || 'New Project'; np = await ChatSessionManager.createProject(fn, sel); }
      } else if ('showDirectoryPicker' in window) {
        const dh = await (window as any).showDirectoryPicker();
        fn = dh.name || 'New Project'; const pp = await FileSystemService.importDirectory(dh);
        np = await ChatSessionManager.createProject(fn, pp); await FileSystemService.uploadProjectFiles(np.id, pp);
      }
      if (!np) return;
      window.dispatchEvent(new CustomEvent('projects-changed'));
      const ns = await ChatSessionManager.create('New conversation', undefined, np.id);
      navigate(`/project/${fn.toLowerCase().replace(/\s+/g, '-')}/${ns.id}`);
    } catch { addToast('Could not open folder.', 'error'); }
  }, [navigate, addToast]);
}

export function useSessionInitializer(uuid: string | undefined, setMessages: (m: any[]) => void, setSessionId: (id: string | null) => void, setSessionTitle: (t: string) => void, clearArtifacts: () => void, mapUIMessageToLegacyMessage: any) {
  useEffect(() => {
    clearArtifacts();
    if (uuid) {
      (async () => {
        if (!sessionStorage.getItem('pending-first-message') && uuid !== 'new') {
          const stored = await DatabaseService.getMessages(uuid);
          setMessages(stored.map(mapUIMessageToLegacyMessage));
          const session = await ChatSessionManager.getSession(uuid);
          if (session) { setSessionId(uuid); setSessionTitle(session.title); }
        } else if (uuid === 'new') {
          setSessionId('new'); setSessionTitle('New conversation'); setMessages([]);
        }
      })();
    } else setSessionId(null);
  }, [uuid, setMessages, setSessionId, setSessionTitle, clearArtifacts, mapUIMessageToLegacyMessage]);
}
