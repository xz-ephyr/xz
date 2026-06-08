import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { 
  PanelLeftIcon, 
  PanelRightIcon,
  PencilEdit02Icon,
  Settings01Icon
} from '@hugeicons/core-free-icons';
import { SettingsPopup } from './SettingsPopup';

export const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [animate, setAnimate] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        // Optional: clear active tab if clicking outside the whole sidebar
      } else {
        // Check if the click target is NOT a button in our tabs
        const target = event.target as HTMLElement;
        if (!target.closest('button')) {
          setActiveTab(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setAnimate(tabId);
    setTimeout(() => setAnimate(null), 200);
  };

  return (
    <>
      <aside
        ref={sidebarRef}
        className={cn(
          "relative flex flex-col border-r border-border bg-background text-foreground transition-all duration-300 ease-in-out z-20 shrink-0",
          isOpen ? "w-[280px]" : "w-[60px]"
        )}
      >
        {/* Toggle Button â€” pinned top-right */}
        <div className={cn("flex items-center px-2 h-12", isOpen ? "justify-end" : "justify-center")}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="h-8 w-8 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all rounded-[6px]"
          >
            <Icon icon={isOpen ? PanelLeftIcon : PanelRightIcon} size={18} />
          </Button>
        </div>

        {/* New Chat Tab */}
        <div className="px-2">
          {isOpen ? (
            <button
              onClick={() => handleTabClick('new-chat')}
              className={cn(
                "flex w-full items-center gap-2 rounded-[6px] px-3 py-1 text-sm font-medium transition-all",
                activeTab === 'new-chat' 
                  ? "bg-gray-200 text-foreground shadow-sm" 
                  : "bg-transparent text-muted-foreground hover:bg-gray-100 hover:text-foreground",
                animate === 'new-chat' && "animate-beat"
              )}
            >
              <Icon icon={PencilEdit02Icon} size={16} />
              New Chat
            </button>
          ) : (
            <button
              onClick={() => handleTabClick('new-chat')}
              className={cn(
                "flex w-full items-center justify-center rounded-[6px] h-7 transition-all",
                activeTab === 'new-chat'
                  ? "bg-gray-200 text-foreground"
                  : "bg-transparent text-muted-foreground hover:bg-gray-100 hover:text-foreground",
                animate === 'new-chat' && "animate-beat"
              )}
              title="New Chat"
            >
              <Icon icon={PencilEdit02Icon} size={18} />
            </button>
          )}
        </div>

        {/* Settings Tab â€” at the bottom */}
        <div className="mt-auto px-2 mb-4">
          {isOpen ? (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex w-full items-center gap-2 rounded-[6px] px-3 py-1 text-sm font-medium transition-all text-muted-foreground hover:bg-gray-100 hover:text-foreground"
            >
              <Icon icon={Settings01Icon} size={16} />
              Settings
            </button>
          ) : (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex w-full items-center justify-center rounded-[6px] h-7 transition-all text-muted-foreground hover:bg-gray-100 hover:text-foreground"
              title="Settings"
            >
              <Icon icon={Settings01Icon} size={18} />
            </button>
          )}
        </div>
      </aside>
      
      <SettingsPopup isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};
