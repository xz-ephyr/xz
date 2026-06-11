import { type ElementType } from 'react';

interface SidebarTabProps {
  icon: ElementType;
  label: string;
  active?: boolean;
  collapsed?: boolean;
}

export default function SidebarTab({ icon: Icon, label, active, collapsed }: SidebarTabProps) {
  return (
    <div className={`flex items-center gap-3 p-2 rounded-[8px] cursor-pointer ${active ? 'bg-[#e5e5e5]' : 'hover:bg-[#f2f3f6]'}`}>
      <Icon size={20} strokeWidth={1.5} />
      {!collapsed && <span className="text-sm font-medium">{label}</span>}
      {active && !collapsed && <div className="ml-auto w-1 h-[15px] bg-black rounded-[2px]" />}
    </div>
  );
}

