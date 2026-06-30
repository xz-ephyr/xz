import { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PencilEdit02Icon, AlarmClockIcon, ResourcesAddIcon, TreePalmIcon, Settings02Icon, PanelLeftIcon, PanelRightIcon, FolderLibraryIcon, Download01Icon, CursorRectangleSelection02Icon } from '@hugeicons/core-free-icons';
import SidebarTab from './SidebarTab';
import ProjectItem from './ProjectItem';
import { SettingsModal } from '../settings/SettingsModal';
import { ChatSessionManager } from '../../services/ChatSessionManager';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { useProjects } from '../../hooks/useProjects';
import { useSidebarActions } from '../../hooks/useSidebarActions';

const icons = {
  newThread: <HugeiconRenderer icon={PencilEdit02Icon} />,
  chats: <HugeiconRenderer icon={FolderLibraryIcon} />,
  schedule: <HugeiconRenderer icon={AlarmClockIcon} />,
  plugins: <HugeiconRenderer icon={ResourcesAddIcon} />,
  wiki: <HugeiconRenderer icon={TreePalmIcon} />,
  download: <HugeiconRenderer icon={Download01Icon} />,
  workflow: <HugeiconRenderer icon={CursorRectangleSelection02Icon} />,
  settings: <HugeiconRenderer icon={Settings02Icon} />,
};

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { projects, loadProjects } = useProjects();
  const { handleDownloadApp, handleAddProject } = useSidebarActions(loadProjects);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleCollapse = () => {
    const next = !isCollapsed; setIsCollapsed(next); localStorage.setItem('sidebar_collapsed', String(next));
  };

  const handleDeleteProject = useCallback(async (id: string) => {
    await ChatSessionManager.deleteProject(id); loadProjects();
    if (location.pathname.includes('/chat/')) navigate('/chats');
  }, [location.pathname, navigate, loadProjects]);

  return (
    <>
      <div className={`bg-white border-r border-[#e5e5e5] h-screen transition-[width] duration-300 ease-in-out flex flex-col shrink-0 ${isCollapsed ? 'w-[48px]' : 'w-[320px]'}`}>
        <div className={`flex items-center shrink-0 ${isCollapsed ? 'p-2 justify-center' : 'pl-4 pr-2 py-2'}`}>
          {!isCollapsed && <div className="flex-1 min-w-0"><img src="/favicon.png?v=2" alt="Logo" className="w-10 h-10 shrink-0" /></div>}
          <button onClick={toggleCollapse} className="p-1 hover:bg-[#e5e5e5] rounded-[8px] shrink-0" aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!isCollapsed}>
            <HugeiconRenderer icon={isCollapsed ? PanelRightIcon : PanelLeftIcon} />
          </button>
        </div>
        <div className={`flex flex-col min-h-0 flex-1 ${isCollapsed ? 'overflow-hidden' : ''}`}>
          <div className={`shrink-0 ${isCollapsed ? 'px-1.5 overflow-hidden' : 'px-4'}`}>
            <SidebarTab iconElement={icons.newThread} label="New thread" path="/thread/new" active={location.pathname === '/thread/new'} collapsed={isCollapsed} onClick={() => { if (location.pathname === '/thread/new') window.dispatchEvent(new CustomEvent('reset-chat')); }} />
            <SidebarTab iconElement={icons.chats} label="Chats" path="/chats" active={location.pathname === '/chats'} collapsed={isCollapsed} />
            <SidebarTab iconElement={icons.schedule} label="Schedule" path="/schedule" active={location.pathname === '/schedule'} collapsed={isCollapsed} />
            <SidebarTab iconElement={icons.workflow} label="Workflow" path="/workflow" active={location.pathname === '/workflow'} collapsed={isCollapsed} />
            <SidebarTab iconElement={icons.plugins} label="Plugins" path="/plugins" active={location.pathname === '/plugins'} collapsed={isCollapsed} />
            <SidebarTab iconElement={icons.wiki} label="Wiki" path="/wiki" active={location.pathname === '/wiki'} collapsed={isCollapsed} />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-h-0 flex-1 px-4 overflow-hidden">
              <div className="mt-6 flex justify-between items-center mb-2 px-2 shrink-0">
                <h2 className="text-sm font-bold text-gray-500 whitespace-nowrap">Projects</h2>
                <button onClick={handleAddProject} className="text-gray-500 hover:text-black hover:bg-[#e5e5e5] active:bg-[#d4d4d4] p-1 rounded-[6px] transition-all active:scale-95" aria-label="Add project" title="Add project">+</button>
              </div>
              <div className="space-y-1 overflow-y-auto min-h-0 thin-scrollbar pr-3">
                {projects.map((p) => <ProjectItem key={p.id} project={p} onDelete={handleDeleteProject} />)}
                {projects.length === 0 && <p className="text-[11px] text-neutral-400 px-2 italic">Click + to add a project</p>}
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-[#e5e5e5] shrink-0 flex flex-col gap-1">
          <SidebarTab iconElement={icons.download} label="Download app" path="#" onClick={handleDownloadApp} collapsed={isCollapsed} />
          <SidebarTab iconElement={icons.settings} label="Settings" path="#" onClick={() => setIsSettingsOpen(true)} collapsed={isCollapsed} />
        </div>
      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
