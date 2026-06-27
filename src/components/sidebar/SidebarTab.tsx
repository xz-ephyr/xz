import React, { type ElementType } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface SidebarTabProps {
  icon: ElementType;
  label: string;
  path: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

const SidebarTab = React.memo(
  ({ icon: Icon, label, path, active, collapsed, onClick }: SidebarTabProps) => {
    return (
      <Link
        to={path}
        onClick={onClick}
        title={collapsed ? label : undefined}
        className={cn(
          'flex items-center p-2 rounded-[8px] cursor-pointer active:scale-[0.99] transition-transform w-full',
          collapsed ? 'justify-center' : 'gap-3',
          active ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent/50'
        )}
      >
        <div className="shrink-0 flex items-center justify-center w-[18px] h-[18px]">
          <Icon size={18} strokeWidth={1.5} />
        </div>
        <span
          className={cn(
            'text-sm font-medium whitespace-nowrap transition-all duration-200 overflow-hidden',
            collapsed ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-[200px] opacity-100'
          )}
        >
          {label}
        </span>
      </Link>
    );
  }
);

export default SidebarTab;
