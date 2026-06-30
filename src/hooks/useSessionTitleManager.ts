import { useCallback, useRef } from 'react';
import { generateSessionTitle } from '../services/aiService';
import { ChatSessionManager } from '../services/ChatSessionManager';

export function useSessionTitleManager(uuid: string | undefined, setSessionTitle: (t: string) => void, setIsTitleGenerating: (v: boolean) => void) {
  const titleGeneratedRef = useRef(false);
  const generateTitle = useCallback(async (content: string) => {
    if (titleGeneratedRef.current || !uuid || uuid === 'new') return;
    const s = await ChatSessionManager.getSession(uuid).catch(() => null);
    if (!s?.title || s.title === 'New conversation') {
      setIsTitleGenerating(true);
      try {
        const gen = await generateSessionTitle(content);
        if (gen && gen !== 'New conversation') {
          await ChatSessionManager.rename(uuid, gen); setSessionTitle(gen);
          window.dispatchEvent(new CustomEvent('session-title-changed', { detail: { projectId: s?.projectId } }));
        }
      } finally { setIsTitleGenerating(false); titleGeneratedRef.current = true; }
    } else { setSessionTitle(s.title); titleGeneratedRef.current = true; }
  }, [uuid, setSessionTitle, setIsTitleGenerating]);
  return { generateTitle, resetTitleState: useCallback(() => { titleGeneratedRef.current = false; }, []) };
}
