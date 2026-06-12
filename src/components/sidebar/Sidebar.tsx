// Your rules resume
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SquarePen, AlarmClock, Toolbox, SunMoon, Settings, GalleryVerticalEnd } from 'lucide-react';
import SidebarTab from './SidebarTab';
import { ChatSessionManager } from '../../services/ChatSessionManager';
import ChatsList from './ChatsList';
import SidebarHeader from './SidebarHeader';
import ProjectsSection from './ProjectsSection';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleNewThread = () => {
    const session = ChatSessionManager.create('New Chat');
    navigate(`/chat/${session.id}`);
  };

  return (
    <div 
      className={`bg-[#f9f9f9] border-r border-[#e5e5e5] h-screen transition-[width] duration-300 ease-in-out flex flex-col ${isCollapsed ? 'w-[48px]' : 'w-[320px]'}`}
    >
      <SidebarHeader isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      <div className={`px-4 flex-1 ${isCollapsed ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <>
          <SidebarTab
            icon={SquarePen}
            label="New thread"
            path="#"
            collapsed={isCollapsed}
            onClick={(e) => {
              e.preventDefault();
              handleNewThread();
            }}
          />
          <SidebarTab icon={GalleryVerticalEnd} label="Chats" path="/chats" collapsed={isCollapsed} />
          <ChatsList collapsed={isCollapsed} />
          <SidebarTab icon={AlarmClock} label="Schedule" path="/schedule" collapsed={isCollapsed} />
          <SidebarTab icon={Toolbox} label="Plugins" path="/plugins" collapsed={isCollapsed} />
          <SidebarTab icon={SunMoon} label="Wiki" path="/wiki" collapsed={isCollapsed} />
          
          <ProjectsSection isCollapsed={isCollapsed} />
        </>
      </div>

      {/* Bottom section */}
      <div className="p-4 border-t border-[#e5e5e5] shrink-0">
        <SidebarTab icon={Settings} label="Settings" path="/settings" collapsed={isCollapsed} />
      </div>
    </div>
  );
}
