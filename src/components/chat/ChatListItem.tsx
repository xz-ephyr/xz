import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PencilEdit02Icon, ArchiveIcon, Delete02Icon, MoreVerticalIcon } from '@hugeicons/core-free-icons';
import { ChatSession } from '../../types/chat';
import { cn } from '../../lib/utils';
import { useToast } from '../ui/Toast';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';

export const ChatListItem = React.memo(({ chat, onDelete, onArchive, onRename }: { chat: ChatSession; onDelete: (id: string) => void; onArchive: (id: string) => void; onRename: (id: string, title: string) => void; }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { confirmAsync } = useToast();
  const closeMenu = () => { setIsMenuOpen(false); setMenuPos(null); };
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeMenu(); };
    if (isMenuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isMenuOpen]);
  const handleRename = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setIsEditing(true); closeMenu(); };
  const handleArchive = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); onArchive(chat.id); closeMenu(); };
  const handleDelete = async (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); if (await confirmAsync('Delete this chat?')) onDelete(chat.id); closeMenu(); };
  const toggleMenu = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setMenuPos({ top: r.bottom + 4, left: r.right - 160 }); setIsMenuOpen(!isMenuOpen); };
  return (
    <div className={cn('group relative w-full rounded-[6px] transition-all hover:bg-[#f5f5f5] active:bg-[#eeeeee] flex items-center gap-3 px-3 py-1.5', isMenuOpen ? 'z-20' : 'z-0 hover:z-10')}>
      <Link to={chat.projectId ? `/project/session/${chat.id}` : `/thread/${chat.id}`} className="flex-1 min-w-0 h-full flex items-center">
        <div className="w-full">
          {isEditing ? <form onSubmit={(e) => { e.preventDefault(); onRename(chat.id, editTitle); setIsEditing(false); }} onClick={(e) => e.stopPropagation()}><input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onBlur={() => setIsEditing(false)} className="w-full bg-white border border-neutral-300 rounded px-2 py-1 text-sm font-medium focus:ring-2 focus:ring-black outline-none" /></form> :
            <div className="flex flex-col"><span className="text-sm font-medium text-neutral-900 truncate">{chat.title}</span>{chat.lastMessage && <span className="text-xs text-neutral-500 truncate mt-0.5">{chat.lastMessage}</span>}</div>}
        </div>
      </Link>
      <div className="shrink-0" ref={menuRef}>
        <button onClick={toggleMenu} className={cn('p-1.5 hover:bg-neutral-200 rounded-md text-neutral-500 transition-all opacity-0 group-hover:opacity-100', isMenuOpen && 'opacity-100 bg-neutral-200')} aria-label="Chat actions"><HugeiconRenderer icon={MoreVerticalIcon} size={18} /></button>
        {isMenuOpen && menuPos && (
          <div className="fixed w-40 bg-white border border-neutral-200 rounded-xl shadow-xl py-1.5 z-[9999]" style={{ top: menuPos.top, left: menuPos.left }}>
            <button onClick={handleRename} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"><HugeiconRenderer icon={PencilEdit02Icon} size={16} className="text-neutral-400" /><span>Rename</span></button>
            <button onClick={handleArchive} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"><HugeiconRenderer icon={ArchiveIcon} size={16} className="text-neutral-400" /><span>{chat.archived ? 'Unarchive' : 'Archive'}</span></button>
            <div className="h-px bg-neutral-100 my-1.5" />
            <button onClick={handleDelete} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"><HugeiconRenderer icon={Delete02Icon} size={16} className="text-red-400" /><span>Delete</span></button>
          </div>
        )}
      </div>
    </div>
  );
});
