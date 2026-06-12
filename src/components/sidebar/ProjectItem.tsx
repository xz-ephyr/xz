// Your rules resume
import { useState } from 'react';
import { EllipsisVertical, ChevronDown, ChevronUp } from 'lucide-react';
import GlassyFolderIcon from './GlassyFolderIcon';

interface ProjectItemProps {
  name: string;
}

export default function ProjectItem({ name }: ProjectItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mb-1">
      <div className="flex items-center gap-3 p-2 hover:bg-[#f2f3f6] rounded-[8px] cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <GlassyFolderIcon />
        <span className="text-sm font-semibold text-gray-700 flex-1">{name}</span>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </div>
      {isExpanded && (
        <div className="space-y-1">
          <div className="text-sm p-2 hover:bg-[#f2f3f6] rounded-[8px] flex items-center gap-3 group text-gray-600 cursor-pointer">
            <span className="flex-1">Chat Session 1</span>
            <button className="hidden group-hover:block p-1 hover:bg-[#e5e5e5] rounded-[4px]">
              <EllipsisVertical size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
