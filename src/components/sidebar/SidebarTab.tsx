import React, { type ElementType } from 'react';
import { Link } from 'react-router-dom';
import SidebarTabIcon from './SidebarTabIcon';
import SidebarTabLabel from './SidebarTabLabel';

interface SidebarTabProps {
  icon: ElementType;
  label: string;
  path: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

const SidebarTab = React.memo(({ icon, label, path, active, collapsed, onClick }: SidebarTabProps) => {
  const containerClassName = `flex items-center ${collapsed ? 'justify-center' : 'gap-3'} p-2 rounded-[8px] cursor-pointer ${active ? 'bg-[#e5e5e5]' : 'hover:bg-[#f2f3f6]'} active:scale-[0.99] transition-transform`;

  return (
    <Link to={path} onClick={onClick} className={containerClassName}>
      <SidebarTabIcon icon={icon} />
      {!collapsed && <SidebarTabLabel label={label} active={!!active} />}
    </Link>
  );
});

export default SidebarTab;

