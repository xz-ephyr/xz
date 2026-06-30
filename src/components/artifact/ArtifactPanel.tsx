import { useState, useCallback, useMemo } from 'react';
import type { Artifact } from '../../types/artifact';
import { ARTIFACT_TYPE_LABELS } from '../../types/artifact';
import type { TabId } from './ArtifactTabs';
import { CodePreview } from './CodePreview';
import { CloseIcon, CopyIcon, DownloadIcon } from './icons';
import { ArtifactRenderer, getFileExtension } from './ArtifactRenderer';

interface ArtifactPanelProps {
  artifacts: Artifact[]; activeArtifactId: string | null;
  onSelectArtifact: (id: string) => void; onClose: () => void;
  onRegenerate: (prompt: string) => void; onRollback: (id: string, ver: number) => void;
}

export function ArtifactPanel({ artifacts, activeArtifactId, onSelectArtifact, onClose, onRegenerate }: ArtifactPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('preview');
  const activeArtifact = useMemo(() => (activeArtifactId ? artifacts.find(a => a.identifier === activeArtifactId) : null) || artifacts[0], [artifacts, activeArtifactId]);
  const currentIndex = useMemo(() => artifacts.findIndex(a => a.identifier === activeArtifact?.identifier), [artifacts, activeArtifact]);

  const handleCopy = useCallback(() => activeArtifact && navigator.clipboard.writeText(activeArtifact.content), [activeArtifact]);
  const handleDownload = useCallback(() => {
    if (!activeArtifact) return;
    const blob = new Blob([activeArtifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${activeArtifact.identifier}.${getFileExtension(activeArtifact)}`; a.click(); URL.revokeObjectURL(url);
  }, [activeArtifact]);

  if (!activeArtifact) return null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1a1a1a] border-l border-neutral-200 dark:border-neutral-700" style={{ width: '100%', minWidth: 0 }} onKeyDown={e => e.key === 'Escape' && onClose()} tabIndex={-1}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-700 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider shrink-0">{ARTIFACT_TYPE_LABELS[activeArtifact.type]}</span>
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">{activeArtifact.title}</span>
          {artifacts.length > 1 && <span className="text-xs text-neutral-400 dark:text-neutral-500 shrink-0">{currentIndex + 1}/{artifacts.length}</span>}
        </div>
        <div className="flex items-center gap-1">
          <TabSwitcher activeTab={activeTab} setActiveTab={setActiveTab} />
          <IconButton onClick={handleCopy} title="Copy"><CopyIcon /></IconButton>
          <IconButton onClick={handleDownload} title="Download"><DownloadIcon /></IconButton>
          <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-1" />
          {artifacts.length > 1 && <Navigation currentIndex={currentIndex} total={artifacts.length} onNavigate={(idx: number) => onSelectArtifact(artifacts[idx].identifier)} />}
          <IconButton onClick={onClose} title="Close (Esc)"><CloseIcon /></IconButton>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === 'preview' ? <div className="h-full overflow-auto thin-scrollbar"><ArtifactRenderer artifact={activeArtifact} onRegenerate={onRegenerate} /></div> :
          <div className="h-full overflow-auto thin-scrollbar"><CodePreview content={activeArtifact.content} language={activeArtifact.language} /></div>}
      </div>
    </div>
  );
}

const TabSwitcher = ({ activeTab, setActiveTab }: any) => (
  <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5 mr-2">
    {['preview', 'code'].map(t => <button key={t} onClick={() => setActiveTab(t)} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${activeTab === t ? 'bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
  </div>
);

const IconButton = ({ onClick, title, children }: any) => (
  <button onClick={onClick} className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors" title={title}>{children}</button>
);

const Navigation = ({ currentIndex, total, onNavigate }: any) => (
  <div className="flex items-center gap-1 mr-1">
    <IconButton onClick={() => onNavigate(currentIndex - 1)} disabled={currentIndex <= 0} title="Previous"><ChevronLeftIcon /></IconButton>
    <IconButton onClick={() => onNavigate(currentIndex + 1)} disabled={currentIndex >= total - 1} title="Next"><ChevronRightIcon /></IconButton>
  </div>
);

function ChevronLeftIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function ChevronRightIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
