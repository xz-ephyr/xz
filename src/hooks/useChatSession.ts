import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { useNavigate } from 'react-router-dom';
import { ChatSessionManager } from '../services/ChatSessionManager';
import { DatabaseService } from '../services/DatabaseService';
import { getModelForChatRequest } from '../config/models';
import { mapUIMessageToLegacyMessage } from '../lib/chatUtils';
import { useChatTransport } from './useChatTransport';
import { useProjectActions, useSessionInitializer } from './useChatHooks';
import { useSessionTitleManager } from './useSessionTitleManager';
import { FileSystemService } from '../services/FileSystemService';
import type { ProjectContext } from '../services/ai/contextController';

export function useChatSession(uuid: string | undefined, addToast: (msg: string, type: 'error' | 'success') => void, clearArtifacts: () => void, addArtifacts: (arts: any[]) => void, setSessionId: (id: string | null) => void, setSessionTitle: (title: string) => void, setIsTitleGenerating: (val: boolean) => void) {
  const navigate = useNavigate();
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);
  const isThinkingEnabledRef = useRef(false);
  const previousModelRef = useRef<string | null>(null);
  const currentModelRef = useRef<string | null>(null);
  const [modelRevision, setModelRevision] = useState(0);

  const [rawMessages, setRawMessages] = useState<any[]>([]);

  useEffect(() => { isThinkingEnabledRef.current = isThinkingEnabled; }, [isThinkingEnabled]);
  useEffect(() => {
    const handler = () => setModelRevision((v) => v + 1);
    const resetHandler = () => {
      setRawMessages([]);
      window.dispatchEvent(new CustomEvent('internal-reset-messages'));
    };
    window.addEventListener('model-changed', handler);
    window.addEventListener('reset-chat', resetHandler);
    return () => {
      window.removeEventListener('model-changed', handler);
      window.removeEventListener('reset-chat', resetHandler);
    };
  }, []);

  const currentModel = useMemo(() => {
    return getModelForChatRequest(uuid);
  }, [uuid, modelRevision]);

  useEffect(() => {
    currentModelRef.current = currentModel;
  }, [currentModel]);

  const getProjectContext = useCallback(async (): Promise<ProjectContext | undefined> => {
    if (!uuid || uuid === 'new') return undefined;
    try {
      const s = await ChatSessionManager.getSession(uuid);
      if (!s?.projectId) return undefined;
      const p = (await DatabaseService.getProjects()).find(p => p.id === s.projectId);
      if (!p) return undefined;
      const pc = await FileSystemService.getProjectContent(p.path, p.id);
      let f = pc.tree; if (pc.contents.length > 0) f += '\n\n### File Contents\n\n' + pc.contents.map(c => `--- ${c.path} ---\n${c.text}`).join('\n\n');
      return { name: p.name, path: p.path, files: f };
    } catch { return undefined; }
  }, [uuid]);

  const handleChatFinish = useCallback(async (event: any) => {
    if (!event?.message) return;
    const message = mapUIMessageToLegacyMessage(event.message);
    if (message.artifacts?.length > 0 && localStorage.getItem('auto_artifacts') !== 'false') addArtifacts(message.artifacts);
    if (uuid && uuid !== 'new') {
      const msg = { ...message }; delete msg.artifacts;
      DatabaseService.saveMessages(uuid, [msg]).catch(e => console.error(e));
    }
  }, [uuid, addArtifacts]);

  const transport = useChatTransport(uuid, currentModel, currentModelRef, previousModelRef, isThinkingEnabledRef, getProjectContext);
  const { messages: rawMessagesFromChat, sendMessage, status, stop, setMessages } = useChat({ transport, messages: rawMessages, onError: (err) => addToast(err.message, 'error'), onFinish: handleChatFinish }) as any;

  useEffect(() => {
    const h = () => setMessages([]);
    window.addEventListener('internal-reset-messages', h);
    return () => window.removeEventListener('internal-reset-messages', h);
  }, [setMessages]);
  const { generateTitle, resetTitleState } = useSessionTitleManager(uuid, setSessionTitle, setIsTitleGenerating);

  useEffect(() => { resetTitleState(); }, [uuid, resetTitleState]);
  useSessionInitializer(uuid, setMessages, setSessionId, setSessionTitle, clearArtifacts, mapUIMessageToLegacyMessage);

  const handleSend = useCallback(async (content: string) => {
    if (uuid === 'new') {
      const s = await ChatSessionManager.create('New conversation');
      setSessionId(s.id); sessionStorage.setItem('pending-first-message', content);
      navigate(`/thread/${s.id}`); return;
    }
    if (uuid) {
      const s = await ChatSessionManager.getSession(uuid).catch(() => null);
      if (!s) {
        const p = (await ChatSessionManager.getProjects()).find(p => uuid.includes(p.id));
        if (p) {
          const ns = await ChatSessionManager.create('New conversation', undefined, p.id);
          setSessionId(ns.id); sessionStorage.setItem('pending-first-message', content);
          navigate(`/project/${p.name.toLowerCase().replace(/\s+/g, '-')}/${ns.id}`); return;
        }
      }
    }
    const userMsg = { id: crypto.randomUUID(), role: 'user' as const, content, createdAt: Date.now() };
    if (uuid) DatabaseService.saveMessages(uuid, [userMsg]).catch(e => console.error(e));
    sendMessage({ text: content });
    generateTitle(content);
  }, [uuid, sendMessage, navigate, setSessionId, generateTitle]);

  const handleAddProject = useProjectActions(navigate, addToast);

  useEffect(() => {
    if (uuid && uuid !== 'new') {
      const pm = sessionStorage.getItem('pending-first-message');
      if (pm) { sessionStorage.removeItem('pending-first-message'); handleSend(pm); }
    }
  }, [uuid, handleSend]);

  const messages = useMemo(() => rawMessagesFromChat.map(mapUIMessageToLegacyMessage), [rawMessagesFromChat]);
  return { messages, isLoading: status === 'submitted' || status === 'streaming', handleSend, stop, isThinkingEnabled, toggleThinking: () => setIsThinkingEnabled(p => !p), handleAddProject, currentModel };
}
