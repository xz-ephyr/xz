import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { 
  PanelLeftIcon, 
  PanelRightIcon 
} from '@hugeicons/core-free-icons';

export const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground transition-colors duration-300">
      {/* Sidebar Panel */}
      <aside
        className={cn(
          "relative flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out z-20 shrink-0",
          isOpen ? "w-[280px]" : "w-[60px]"
        )}
      >
        {/* Header Row */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-border/40">
          {isOpen ? (
            <div className="flex items-center gap-2">
              <img src="/favicon.png" alt="App Logo" className="h-7 w-7 object-contain" />
            </div>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "h-8 w-8 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all rounded-lg",
              !isOpen && "mx-auto"
            )}
          >
            <Icon icon={isOpen ? PanelLeftIcon : PanelRightIcon} size={18} />
          </Button>
        </div>        
      </aside>
      
      {/* Main Content Area */}
      <main className="flex-grow overflow-hidden relative flex flex-col bg-background" />
    </div>
  );
};
