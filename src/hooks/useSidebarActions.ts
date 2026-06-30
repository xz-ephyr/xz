import { useState, useCallback, useEffect } from 'react';
import { isTauri } from '../lib/tauri';
import { useToast } from '../components/ui/Toast';
import { FileSystemService } from '../services/FileSystemService';
import { ChatSessionManager } from '../services/ChatSessionManager';
import { useNavigate } from 'react-router-dom';

export function useSidebarActions(loadProjects: () => void) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDownloadApp = useCallback(async () => {
    if (isTauri()) { addToast('You are already running the desktop version!', 'info'); return; }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      if ((await deferredPrompt.userChoice).outcome === 'accepted') setDeferredPrompt(null);
    } else {
      const blob = new Blob(['Build with npm run tauri:build'], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'instructions.txt'; a.click(); URL.revokeObjectURL(url);
      addToast('Instructions downloaded!', 'info');
    }
  }, [deferredPrompt, addToast]);

  const handleAddProject = useCallback(async () => {
    try {
      let np: any = null; let fn = '';
      if (isTauri()) {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const sel = await open({ directory: true, multiple: false });
        if (sel && typeof sel === 'string') { fn = sel.split(/[/\\]/).pop() || 'New Project'; np = await ChatSessionManager.createProject(fn, sel); }
      } else if ('showDirectoryPicker' in window) {
        const dh = await (window as any).showDirectoryPicker();
        fn = dh.name; const pp = await FileSystemService.importDirectory(dh);
        np = await ChatSessionManager.createProject(fn, pp); await FileSystemService.uploadProjectFiles(np.id, pp);
      }
      if (!np) return;
      loadProjects();
      navigate(`/project/${fn.toLowerCase().replace(/\s+/g, '-')}-${np.id}`);
    } catch { addToast('Could not open folder.', 'error'); }
  }, [loadProjects, navigate, addToast]);

  return { handleDownloadApp, handleAddProject };
}
