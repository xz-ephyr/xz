import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChatSession } from '../types/chat';
import { ChatSessionManager } from '../services/ChatSessionManager';
import { ChatListItem } from '../components/chat/ChatListItem';
import { ChatSearchHeader } from '../components/chat/ChatSearchHeader';
import { ChatListFilter } from '../components/chat/ChatListFilter';
import { Link } from 'react-router-dom';
import { Search01Icon, Folder01Icon } from '@hugeicons/core-free-icons';
import { HugeiconRenderer } from '../components/ui/HugeiconRenderer';

export const ChatsPage = () => {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'active' | 'archived'>('active');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterMenuPos, setFilterMenuPos] = useState<{ top: number; left: number } | null>(null);

  const refreshChats = useCallback(async () => setChats(await ChatSessionManager.getAll()), []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await ChatSessionManager.getAll();
      if (!cancelled) setChats(all);
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredChats = useMemo(() => chats.filter(c => {
    const m = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase());
    return filter === 'archived' ? c.archived && m : !c.archived && m;
  }).sort((a, b) => b.createdAt - a.createdAt), [chats, searchQuery, filter]);

  const actions = {
    onDelete: async (id: string) => { await ChatSessionManager.delete(id); refreshChats(); },
    onArchive: async (id: string) => { await ChatSessionManager.archive(id); refreshChats(); },
    onRename: async (id: string, t: string) => { await ChatSessionManager.rename(id, t); refreshChats(); }
  };

  return (
    <div className="flex-1 bg-white overflow-y-auto thin-scrollbar relative">
      <div className="mx-auto px-6 py-12" style={{ maxWidth: 'min(800px, 100%)' }}>
        <ChatSearchHeader searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        <ChatListFilter filter={filter} setFilter={setFilter} isFilterOpen={isFilterOpen} setIsFilterOpen={setIsFilterOpen} filterMenuPos={filterMenuPos} setFilterMenuPos={setFilterMenuPos} />
        <div className="space-y-0.5 overflow-visible">
          {filteredChats.length > 0 ? filteredChats.map(c => <ChatListItem key={c.id} chat={c} {...actions} />) :
            <EmptyState searchQuery={searchQuery} archived={filter === 'archived'} />}
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ searchQuery, archived }: any) => (
  <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in duration-500">
    <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center text-neutral-200 mb-6 border border-neutral-100 shadow-sm"><HugeiconRenderer icon={searchQuery ? Search01Icon : Folder01Icon} size={36} /></div>
    <h3 className="text-xl font-semibold text-neutral-900 mb-2">{searchQuery ? 'No matches found' : archived ? 'No archived conversations' : 'Your chat list is empty'}</h3>
    <p className="text-sm text-neutral-500 max-w-[320px] leading-relaxed">{searchQuery ? `We couldn't find any results for "${searchQuery}".` : 'Every conversation you start will appear here for easy access.'}</p>
    {!searchQuery && !archived && <Link to="/thread/new" className="mt-8 px-6 py-2.5 bg-neutral-900 text-white text-sm font-semibold rounded-full hover:bg-neutral-800 transition-all active:scale-95">Start a new thread</Link>}
  </div>
);
