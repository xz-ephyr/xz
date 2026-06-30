import { useRef, useEffect } from 'react';
import { FilterMailIcon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { cn } from '../../lib/utils';

export const ChatListFilter = ({ filter, setFilter, isFilterOpen, setIsFilterOpen, filterMenuPos, setFilterMenuPos }: any) => {
  const filterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (filterRef.current && !filterRef.current.contains(e.target as Node)) { setIsFilterOpen(false); setFilterMenuPos(null); } };
    if (isFilterOpen) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [isFilterOpen, setIsFilterOpen, setFilterMenuPos]);

  return (
    <div ref={filterRef} className="absolute right-6 top-[138px]">
      <button onClick={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setFilterMenuPos({ top: r.bottom + 8, left: r.right - 208 }); setIsFilterOpen(!isFilterOpen); }}
              className={cn('p-3 rounded-2xl transition-all flex items-center justify-center h-[46px] w-[46px] text-neutral-600', isFilterOpen && 'bg-neutral-100 text-neutral-900')} aria-label="Filter chats"><HugeiconRenderer icon={FilterMailIcon} size={20} /></button>
      {isFilterOpen && filterMenuPos && (
        <div className="fixed w-52 bg-white border border-neutral-200 rounded-2xl shadow-xl py-2 z-[9999]" style={{ top: filterMenuPos.top, left: filterMenuPos.left }}>
          <div className="px-4 py-2 text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Filter by</div>
          <FilterButton label="Active Chats" active={filter === 'active'} onClick={() => { setFilter('active'); setIsFilterOpen(false); }} />
          <FilterButton label="Archived Chats" active={filter === 'archived'} onClick={() => { setFilter('archived'); setIsFilterOpen(false); }} />
        </div>
      )}
    </div>
  );
};

const FilterButton = ({ label, active, onClick }: any) => (
  <button onClick={onClick} className="w-full flex items-center justify-between px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors">
    <span className={cn('font-medium', active ? 'text-neutral-900' : 'text-neutral-600')}>{label}</span>
    {active && <HugeiconRenderer icon={CheckmarkCircle02Icon} size={18} className="text-neutral-900" />}
  </button>
);
