import React, { type ElementType } from 'react';
import { Link } from 'react-router-dom';

interface SidebarTabProps {
  icon: ElementType;
  label: string;
  path: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

const SidebarTab = React.memo(({ icon: Icon, label, path, active, collapsed, onClick }: SidebarTabProps) => {
  return (
    <Link to={path} onClick={onClick} className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} p-2 rounded-[8px] cursor-pointer ${active ? 'bg-[#e5e5e5]' : 'hover:bg-[#f2f3f6]'} active:scale-[0.99] transition-transform`}>
      <div className="shrink-0">
        <Icon size={18} strokeWidth={1.5} />
      </div>
      {!collapsed && <span className="text-sm font-medium whitespace-nowrap">{label}</span>}
    </Link>
  );
});

export default SidebarTab;

