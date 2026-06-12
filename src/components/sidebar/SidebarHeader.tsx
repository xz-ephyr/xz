import { PanelLeft, PanelRight } from 'lucide-react';

interface SidebarHeaderProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function SidebarHeader({ isCollapsed, onToggle }: SidebarHeaderProps) {
  return (
    <div className="flex justify-end p-2 shrink-0">
      <button onClick={onToggle} className="p-1 hover:bg-[#e5e5e5] rounded-[8px]">
        {isCollapsed ? <PanelRight size={18} /> : <PanelLeft size={18} />}
      </button>
    </div>
  );
}
