import { type ElementType } from 'react';

interface SidebarTabIconProps {
  icon: ElementType;
}

export default function SidebarTabIcon({ icon: Icon }: SidebarTabIconProps) {
  return (
    <div className="shrink-0">
      <Icon size={18} strokeWidth={1.5} />
    </div>
  );
}
