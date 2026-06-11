// Your rules resume
import { useState } from 'react';
import { PencilEdit01Icon, Calendar01Icon, Plug01Icon, Book01Icon } from '@hugeicons/core-free-icons';
import SidebarTab from './SidebarTab';
import ProjectItem from './ProjectItem';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div 
      className={`bg-[#f9f9f9] border-r border-[#e5e5e5] h-screen transition-all duration-300 ${isCollapsed ? 'w-[48px]' : 'w-[420px]'}`}
    >
      <div className="flex justify-end p-2">
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 hover:bg-[#e5e5e5] rounded-[8px]">
          {isCollapsed ? '->' : '<-'}
        </button>
      </div>

      {!isCollapsed && (
        <div className="px-4">
          <SidebarTab icon={PencilEdit01Icon} label="New thread" />
          <SidebarTab icon={Calendar01Icon} label="Schedule" />
          <SidebarTab icon={Plug01Icon} label="Plugins" />
          <SidebarTab icon={Book01Icon} label="Wiki" />
          
          <div className="mt-6 flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-500">Projects</h2>
            <button className="text-gray-500 hover:text-black">+</button>
          </div>
          
          <div className="mt-2">
            <ProjectItem name="Project Alpha" />
          </div>
        </div>
      )}
    </div>
  );
}
