import { Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';

export const ChatSearchHeader = ({ searchQuery, setSearchQuery }: any) => (
  <div className="flex flex-col gap-6 mb-8">
    <h1 className="text-3xl font-semibold text-neutral-900 tracking-tight">Chats</h1>
    <div className="relative flex-1">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
        <HugeiconRenderer icon={Search01Icon} size={20} />
      </div>
      <input
        type="text"
        placeholder="Search conversations..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full bg-neutral-50 rounded-[8px] py-3 pl-12 pr-4 text-sm focus:outline-none placeholder:text-neutral-400"
      />
    </div>
  </div>
);
