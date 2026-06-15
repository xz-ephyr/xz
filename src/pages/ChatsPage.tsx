import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search01Icon,
  ArchiveIcon,
  Delete02Icon,
  PencilEdit02Icon,
  Message01Icon,
  Folder01Icon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChatSession } from '../types/chat';
import { ChatSessionManager } from '../services/ChatSessionManager';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const HugeiconRenderer = ({ icon: Icon, size = 18, className = "" }: { icon: any, size?: number, className?: string }) => (
  <HugeiconsIcon icon={Icon} size={size} color="currentColor" strokeWidth={1.5} className={className} />
);

const ChatListItem = ({
  chat,
  onDelete,
  onArchive,
  onRename
}: {
  chat: ChatSession,
  onDelete: (id: string) => void,
  onArchive: (id: string) => void,
  onRename: (id: string, newTitle: string) => void
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title);

  const handleRename = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
  };

  const submitRename = (e: React.FormEvent) => {
    e.preventDefault();
    onRename(chat.id, editTitle);
    setIsEditing(false);
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onArchive(chat.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this chat?')) {
      onDelete(chat.id);
    }
  };

  return (
    <Link
      to={`/chat/${chat.id}`}
      className="group block relative w-full"
    >
      <div className={cn(
        "flex items-center gap-4 px-4 py-3 rounded-[12px] transition-all duration-200",
        "hover:bg-[#f5f5f5] active:bg-[#eeeeee]",
        "h-[60px]" // 2/3 of a typical 90px item
      )}>
        <div className="shrink-0 w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500">
          <HugeiconRenderer icon={Message01Icon} size={18} />
        </div>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <form onSubmit={submitRename} onClick={(e) => e.stopPropagation()}>
              <input
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => setIsEditing(false)}
                className="w-full bg-white border border-neutral-300 rounded px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black"
              />
            </form>
          ) : (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-neutral-900 truncate">{chat.title}</span>
              {chat.lastMessage && (
                <span className="text-xs text-neutral-500 truncate mt-0.5">
                  {chat.lastMessage}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleRename}
            className="p-1.5 hover:bg-neutral-200 rounded-md text-neutral-500 transition-colors"
            title="Rename"
          >
            <HugeiconRenderer icon={PencilEdit02Icon} size={16} />
          </button>
          <button
            onClick={handleArchive}
            className="p-1.5 hover:bg-neutral-200 rounded-md text-neutral-500 transition-colors"
            title={chat.archived ? "Unarchive" : "Archive"}
          >
            <HugeiconRenderer icon={ArchiveIcon} size={16} />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 hover:bg-red-50 text-neutral-500 hover:text-red-600 rounded-md transition-colors"
            title="Delete"
          >
            <HugeiconRenderer icon={Delete02Icon} size={16} />
          </button>
        </div>
      </div>
    </Link>
  );
};

export const ChatsPage = () => {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'active' | 'archived'>('active');

  const refreshChats = () => {
    setChats(ChatSessionManager.getAll());
  };

  useEffect(() => {
    refreshChats();
  }, []);

  const filteredChats = useMemo(() => {
    return chats
      .filter(chat => {
        const matchesSearch = chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             (chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase()));

        if (filter === 'archived') return chat.archived && matchesSearch;
        return !chat.archived && matchesSearch;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [chats, searchQuery, filter]);

  const handleDelete = (id: string) => {
    ChatSessionManager.delete(id);
    refreshChats();
  };

  const handleArchive = (id: string) => {
    ChatSessionManager.archive(id);
    refreshChats();
  };

  const handleRename = (id: string, newTitle: string) => {
    ChatSessionManager.rename(id, newTitle);
    refreshChats();
  };

  return (
    <div className="flex-1 bg-white overflow-y-auto thin-scrollbar">
      <div className="max-w-[800px] mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold text-neutral-900 tracking-tight">Chats</h1>
            <div className="flex items-center bg-neutral-100 p-1 rounded-xl">
                <button
                    onClick={() => setFilter('active')}
                    className={cn(
                        "px-4 py-1.5 text-sm font-medium rounded-lg transition-all",
                        filter === 'active' ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                    )}
                >
                    Active
                </button>
                <button
                    onClick={() => setFilter('archived')}
                    className={cn(
                        "px-4 py-1.5 text-sm font-medium rounded-lg transition-all",
                        filter === 'archived' ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                    )}
                >
                    Archived
                </button>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-neutral-900 transition-colors">
              <HugeiconRenderer icon={Search01Icon} size={20} />
            </div>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-300 transition-all"
            />
          </div>
        </div>

        {/* List Section */}
        <div className="space-y-0.5">
          {filteredChats.length > 0 ? (
            filteredChats.map(chat => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                onDelete={handleDelete}
                onArchive={handleArchive}
                onRename={handleRename}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center text-neutral-300 mb-4 border border-neutral-100">
                <HugeiconRenderer icon={searchQuery ? Search01Icon : Folder01Icon} size={28} />
              </div>
              <h3 className="text-lg font-medium text-neutral-900 mb-1">
                {searchQuery ? "No results found" : (filter === 'archived' ? "No archived chats" : "No chats yet")}
              </h3>
              <p className="text-sm text-neutral-500 max-w-[280px]">
                {searchQuery
                  ? `We couldn't find any chats matching "${searchQuery}"`
                  : "Start a new conversation to see it listed here."}
              </p>
              {!searchQuery && filter === 'active' && (
                <Link
                    to="/chat/new"
                    className="mt-6 px-5 py-2 bg-neutral-900 text-white text-sm font-medium rounded-full hover:bg-neutral-800 transition-colors"
                >
                    New thread
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
