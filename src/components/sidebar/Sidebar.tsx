// Your rules resume
import { useState } from 'react';
import { Pencil, Calendar, Puzzle, Book } from 'lucide-react';
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
          <SidebarTab icon={Pencil} label="New thread" />
          <SidebarTab icon={Calendar} label="Schedule" />
          <SidebarTab icon={Puzzle} label="Plugins" />
          <SidebarTab icon={Book} label="Wiki" />
          
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
