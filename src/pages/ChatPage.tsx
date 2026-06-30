import { useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import ChatInputContainer from '../components/chat/ChatInputContainer';
import { ChatMessageRow } from '../components/chat/ChatMessageRow';
import { useToast } from '../components/ui/Toast';
import { HugeiconRenderer } from '../components/ui/HugeiconRenderer';
import { ArrowDown02Icon } from '@hugeicons/core-free-icons';
import { ArtifactPanel } from '../components/artifact/ArtifactPanel';
import { useArtifacts } from '../hooks/useArtifacts';
import { useSessionTitle } from '../hooks/useSessionTitle';
import TitleBar from '../components/layout/TitleBar';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePanelResize } from '../hooks/usePanelResize';
import { useChatScroll } from '../hooks/useChatScroll';
import { useChatSession } from '../hooks/useChatSession';
import { useChatMeta } from '../hooks/useChatMeta';

export const ChatPage = () => {
  const { uuid, folder } = useParams(); const { addToast } = useToast();
  const { setTitle, setSessionId, setIsTitleGenerating } = useSessionTitle();
  const isMobile = useMediaQuery(`(max-width: 768px)`);
  const { artifacts, activeArtifactId, isPanelOpen, addArtifacts, rollbackArtifact, selectArtifact, closePanel, openPanel, clearArtifacts } = useArtifacts();
  const { messages, isLoading, handleSend, stop, isThinkingEnabled, toggleThinking, handleAddProject, currentModel } = useChatSession(uuid, addToast, clearArtifacts, addArtifacts, setSessionId, setTitle, setIsTitleGenerating);
  const { scrollContainerRef, handleScroll, scrollToBottom, showScrollButton } = useChatScroll(messages.length);
  const { panelWidth, startResize, handleDividerKeyDown } = usePanelResize();
  const { currentProjectName, lastAssistantIndex } = useChatMeta(folder, messages, isLoading);

  useEffect(() => { document.body.style.userSelect = isLoading ? 'none' : ''; }, [isLoading]);

  const onOpenArt = useCallback((a: any) => { addArtifacts([a]); selectArtifact(a.identifier); openPanel(); }, [addArtifacts, selectArtifact, openPanel]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-[#111110] relative">
      {uuid !== 'new' && messages.length > 0 && <TitleBar />}
      <div className="flex flex-1 min-h-0">
        <div className={`flex flex-col min-w-0 bg-white dark:bg-[#111110] relative ${isMobile && isPanelOpen ? 'hidden' : 'flex-1'}`}>
          <div ref={scrollContainerRef} onScroll={handleScroll} className={`flex-1 overflow-y-auto thin-scrollbar ${messages.length === 0 ? 'flex flex-col items-center justify-start pt-[15vh] p-4' : ''}`}>
            {messages.length > 0 && <div className="h-[8px] bg-white dark:bg-[#111110] w-full shrink-0" />}
            <div className="w-full mx-auto px-4 pb-24" style={{ maxWidth: 'min(880px, 100%)' }}>
              {messages.map((m: any, i: number) => <ChatMessageRow key={m.id || i} role={m.role} content={m.content} artifacts={m.artifacts} toolInvocations={m.toolInvocations} reasoning={m.reasoning} parts={m.parts} contentBeforeTool={m.contentBeforeTool} contentAfterTool={m.contentAfterTool} currentModel={currentModel} isStreaming={i === lastAssistantIndex} prevUserContent={i > 0 && messages[i-1].role === 'user' ? messages[i-1].content : undefined} onOpenArtifact={onOpenArt} onCopy={c => navigator.clipboard.writeText(c)} onThumbsUp={() => {}} onThumbsDown={() => {}} handleSend={handleSend} />)}
              {messages.length === 0 && <div className="w-full mt-4 flex flex-col items-center overflow-visible pb-10"><h1 className="text-[38px] font-serif-source mb-[10px] text-neutral-800 dark:text-neutral-200 text-center">Hello, how can I help?</h1><ChatInputContainer onSend={handleSend} isLoading={isLoading} onStop={stop} isThinkingEnabled={isThinkingEnabled} onToggleThinking={toggleThinking} onCreateProject={handleAddProject} currentProjectName={currentProjectName} currentModel={currentModel} /></div>}
            </div>
          </div>
          {showScrollButton && messages.length > 0 && <div className="shrink-0 flex justify-center w-full mx-auto bg-white dark:bg-[#111110] relative" style={{ height: 0 }}><button onClick={scrollToBottom} className="absolute left-1/2 -translate-x-1/2 bottom-8 flex items-center justify-center w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-black dark:text-white transition-all shadow-sm z-10" title="Scroll to bottom"><HugeiconRenderer icon={ArrowDown02Icon} size={18} /></button></div>}
          {messages.length > 0 && <div className="shrink-0 w-full mx-auto px-4 bg-white dark:bg-[#111110]"><ChatInputContainer onSend={handleSend} isLoading={isLoading} onStop={stop} isThinkingEnabled={isThinkingEnabled} onToggleThinking={toggleThinking} onCreateProject={handleAddProject} currentProjectName={currentProjectName} currentModel={currentModel} /></div>}
        </div>
        {isPanelOpen && artifacts.length > 0 && (
          <div className="flex overflow-hidden min-w-0" style={{ width: panelWidth, flex: 'none' }}>
            <div onMouseDown={e => { e.preventDefault(); startResize(); }} onTouchStart={e => { e.preventDefault(); startResize(); }} onKeyDown={handleDividerKeyDown} tabIndex={0} role="separator" aria-orientation="vertical" aria-valuenow={panelWidth} className="w-[5px] shrink-0 cursor-col-resize bg-transparent relative flex items-center justify-center group/divider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-inset"><div className="w-px h-full bg-neutral-200 dark:bg-neutral-700 group-hover/divider:bg-neutral-400 dark:group-hover/divider:bg-neutral-500 group-active/divider:bg-neutral-500 dark:group-active/divider:bg-neutral-400 transition-colors" /></div>
            {isMobile && <div className="absolute inset-0 z-50 bg-black/30" onClick={closePanel} />}
            <ArtifactPanel artifacts={artifacts} activeArtifactId={activeArtifactId} onSelectArtifact={selectArtifact} onClose={closePanel} onRegenerate={p => { const t = document.querySelector('textarea'); if (t) { t.value = p; t.focus(); } }} onRollback={rollbackArtifact} />
          </div>
        )}
      </div>
    </div>
  );
};
