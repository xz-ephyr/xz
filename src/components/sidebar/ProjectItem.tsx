import React, { useState, useEffect, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder02Icon, PencilEdit02Icon, MoreVerticalIcon, ArrowDown01Icon, ArrowUp01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { ChatSessionManager } from '../../services/ChatSessionManager';
import { Project } from '../../types/chat';
import { useProjectSessions } from '../../hooks/useProjectSessions';
import { ProjectSessionItem } from './ProjectSessionItem';

interface ProjectItemProps { project: Project; onDelete: (id: string) => void; }

const ProjectItem = memo(({ project, onDelete }: ProjectItemProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [sessionMenuId, setSessionMenuId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const navigate = useNavigate();
  const { sessions, loadSessions } = useProjectSessions(project.id);

  useEffect(() => {
    const h = () => { setShowMenu(false); setMenuPos(null); setSessionMenuId(null); };
    document.addEventListener('click', h); return () => document.removeEventListener('click', h);
  }, []);

  const handleAction = useCallback(async (type: string, sid: string, data?: string) => {
    if (type === 'rename' && data?.trim()) await ChatSessionManager.rename(sid, data.trim());
    else if (type === 'archive') await ChatSessionManager.archive(sid);
    else if (type === 'delete' && window.confirm('Delete this chat?')) await ChatSessionManager.delete(sid);
    window.dispatchEvent(new CustomEvent('session-title-changed', { detail: { projectId: project.id } }));
    setEditingSessionId(null); setSessionMenuId(null); loadSessions();
  }, [project.id, loadSessions]);

  const handleNewChat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ns = await ChatSessionManager.create('New conversation', undefined, project.id);
    loadSessions(); navigate(`/project/${project.name.toLowerCase().replace(/\s+/g, '-')}/${ns.id}`);
  };

  return (
    <div className="mb-1">
      <div className="flex items-center gap-3 p-2 hover:bg-[#f2f3f6] rounded-[8px] cursor-pointer group" onClick={() => setIsExpanded(!isExpanded)}>
        <HugeiconRenderer icon={Folder02Icon} /><span className="text-sm font-semibold text-gray-700 flex-1 truncate">{project.name}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleNewChat} className="p-1 hover:bg-[#e5e5e5] rounded-[6px]" title="New Chat"><HugeiconRenderer icon={PencilEdit02Icon} size={14} /></button>
          <button onClick={(e) => { e.stopPropagation(); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setMenuPos({ top: r.bottom + 4, left: r.right - 128 }); setShowMenu(!showMenu); }} className="p-1 hover:bg-[#e5e5e5] rounded-[6px]" title="Options"><HugeiconRenderer icon={MoreVerticalIcon} size={14} /></button>
          <HugeiconRenderer icon={isExpanded ? ArrowDown01Icon : ArrowUp01Icon} size={14} />
        </div>
      </div>
      {showMenu && menuPos && <div className="fixed w-32 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 z-[9999]" style={{ top: menuPos.top, left: menuPos.left }} onClick={e => e.stopPropagation()}><button onClick={e => { e.stopPropagation(); onDelete(project.id); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-[8px] mx-1 flex items-center gap-2"><HugeiconRenderer icon={Delete02Icon} size={14} />Delete Project</button></div>}
      {isExpanded && <div className="mt-1 space-y-1">{sessions.filter(s => !s.archived).map(s => <ProjectSessionItem key={s.id} session={s} project={project} onAction={handleAction} sessionMenuId={sessionMenuId} setSessionMenuId={setSessionMenuId} editingSessionId={editingSessionId} setEditingSessionId={setEditingSessionId} editTitle={editTitle} setEditTitle={setEditTitle} />)}</div>}
    </div>
  );
});

export default ProjectItem;
