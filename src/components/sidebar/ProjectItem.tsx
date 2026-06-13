import { useState } from 'react';
import { MoreVerticalIcon, ArrowDown01Icon, ArrowUp01Icon, Folder02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

interface ProjectItemProps {
  name: string;
}

const HugeiconRenderer = ({ icon: Icon, size = 16, className }: { icon: any, size?: number, className?: string }) => (
  <HugeiconsIcon icon={Icon} size={size} color="currentColor" strokeWidth={1.5} className={className} />
);

export default function ProjectItem({ name }: ProjectItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mb-1">
      <div className="flex items-center gap-3 p-2 hover:bg-[#f2f3f6] rounded-[8px] cursor-pointer group" onClick={() => setIsExpanded(!isExpanded)}>
        <HugeiconRenderer icon={Folder02Icon} />
        <span className="text-sm font-semibold text-gray-700 flex-1">{name}</span>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
          {isExpanded ? <HugeiconRenderer icon={ArrowDown01Icon} /> : <HugeiconRenderer icon={ArrowUp01Icon} />}
        </span>
      </div>
      {isExpanded && (
        <div className="space-y-1">
          <div className="text-sm p-2 hover:bg-[#f2f3f6] rounded-[8px] flex items-center gap-3 group text-gray-600 cursor-pointer active:scale-[0.99] transition-transform">
            <span className="flex-1">Chat Session 1</span>
            <button className="hidden group-hover:block p-1 hover:bg-[#e5e5e5] rounded-[4px]">
              <HugeiconRenderer icon={MoreVerticalIcon} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
