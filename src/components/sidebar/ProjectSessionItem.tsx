import { useState, Fragment, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PencilEdit02Icon, ArchiveIcon, Delete02Icon, MoreVerticalIcon } from '@hugeicons/core-free-icons';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';

export const ProjectSessionItem = memo(({ session, project, onAction, sessionMenuId, setSessionMenuId, editingSessionId, setEditingSessionId, editTitle, setEditTitle }: any) => {
  const navigate = useNavigate(); const { uuid } = useParams();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const slug = project.name.toLowerCase().replace(/\s+/g, '-');
  return (
    <Fragment>
      <div className={`group flex items-center text-sm py-1 px-2 hover:bg-[#f2f3f6] rounded-[8px] cursor-pointer active:scale-[0.99] transition-transform ${uuid === session.id ? 'bg-[#f2f3f6] text-black' : 'text-gray-600'}`} onClick={() => navigate(`/project/${slug}/${session.id}`)}>
        {editingSessionId === session.id ? <form onSubmit={(e) => { e.preventDefault(); onAction('rename', session.id, editTitle); }} onClick={(e) => e.stopPropagation()} className="flex-1 flex"><input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onBlur={() => setEditingSessionId(null)} className="w-full bg-white border border-neutral-300 rounded px-1.5 py-0.5 text-xs outline-none" /></form> :
          <span className="flex-1 truncate">{session.title}</span>}
        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mr-3"><button type="button" onClick={(e) => { e.stopPropagation(); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setPos({ top: r.bottom + 2, left: r.right - 128 }); setSessionMenuId(sessionMenuId === session.id ? null : session.id); }} className="p-1 hover:bg-neutral-200/60 rounded-[6px] text-neutral-500"><HugeiconRenderer icon={MoreVerticalIcon} size={15} /></button></div>
      </div>
      {sessionMenuId === session.id && pos && (
        <div className="fixed w-32 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 z-[9999]" style={{ top: pos.top, left: pos.left }} onClick={(e) => e.stopPropagation()}>
          <ActionButton onClick={() => { setEditTitle(session.title); setEditingSessionId(session.id); setSessionMenuId(null); }} icon={PencilEdit02Icon} label="Rename" />
          <ActionButton onClick={() => onAction('archive', session.id)} icon={ArchiveIcon} label="Archive" />
          <div className="h-px bg-neutral-100 my-1" />
          <ActionButton onClick={() => onAction('delete', session.id)} icon={Delete02Icon} label="Delete" color="text-red-600" />
        </div>
      )}
    </Fragment>
  );
});

const ActionButton = ({ onClick, icon, label, color = 'text-neutral-700' }: any) => (
  <button type="button" onClick={onClick} className={`w-full text-left px-3 py-1.5 text-xs ${color} hover:bg-neutral-50 flex items-center gap-2`}><HugeiconRenderer icon={icon} size={13} className="text-neutral-400" />{label}</button>
);
