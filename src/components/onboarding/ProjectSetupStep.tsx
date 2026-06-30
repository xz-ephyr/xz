import { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { FolderLibraryIcon, Download01Icon } from '@hugeicons/core-free-icons';
import { ChatSessionManager } from '../../services/ChatSessionManager';
import { useProjectSetup } from '../../hooks/useProjectSetup';

export function ProjectSetupStep({ onComplete, onSkip }: any) {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const load = () => ChatSessionManager.getProjects().then(setProjects);
  useEffect(() => { load(); }, []);
  const { isCreating, createProject } = useProjectSetup(load);

  return (
    <div className="flex flex-col max-w-lg mx-auto gap-6 py-4 w-full">
      <div className="text-center"><h2 className="text-2xl font-bold text-neutral-900">Connect a Project</h2><p className="text-neutral-500 text-sm mt-1">Give the AI context by connecting your codebase.</p></div>
      <button onClick={createProject} disabled={isCreating} className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-neutral-200 hover:border-neutral-400 transition-colors bg-neutral-50/50 text-left">
        <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0"><HugeiconsIcon icon={Download01Icon} size={18} className="text-neutral-500" /></div>
        <div><div className="text-sm font-semibold text-neutral-800">{isCreating ? 'Opening folder picker...' : 'Add an existing project'}</div><div className="text-xs text-neutral-500">Choose a folder from your computer</div></div>
      </button>
      {projects.length > 0 && <div className="space-y-2">
        <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-1">— or select a previous project —</div>
        {projects.map(p => <ProjectCard key={p.id} project={p} selected={selectedProjectId === p.id} onSelect={() => setSelectedProjectId(selectedProjectId === p.id ? null : p.id)} />)}
      </div>}
      <div className="flex gap-3 pt-2">
        <button onClick={onSkip} className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 font-medium text-sm hover:bg-neutral-50 transition-all">Skip for now</button>
        <button onClick={onComplete} className="flex-1 py-2.5 rounded-xl bg-black text-white font-medium text-sm hover:bg-neutral-800 transition-all active:scale-[0.98]">Continue</button>
      </div>
    </div>
  );
}

const ProjectCard = ({ project, selected, onSelect }: any) => (
  <button onClick={onSelect} className={`flex items-center gap-3 p-3 rounded-xl border w-full text-left transition-all ${selected ? 'border-black bg-neutral-50' : 'border-neutral-100 hover:border-neutral-200'}`}>
    <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0"><HugeiconsIcon icon={FolderLibraryIcon} size={16} className="text-neutral-500" /></div>
    <div><div className="text-sm font-medium text-neutral-800">{project.name}</div><div className="text-xs text-neutral-400 truncate max-w-[300px]">{project.path}</div></div>
  </button>
);
