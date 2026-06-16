import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUp02Icon } from '@hugeicons/core-free-icons';
import { ThinScrollbar } from '../ui/ThinScrollbar';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  isIdle?: boolean;
}

export default function ChatInput({ onSend, isLoading, isIdle }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [selectedMode, setSelectedMode] = useState<'Code' | 'Debug' | 'Refactor'>('Code');

  const handleSend = () => {
    if (value.trim() && !isLoading) {
      onSend(value);
      setValue('');
    }
  };

  const handleCreateProject = () => {
    onSend(
      "Let's create a new project structure! Please design a clean folder layout, a README.md, and starting configuration files for this project workspace."
    );
  };

  const handleCreatePlan = () => {
    onSend(
      'Please write a plan.md file listing our development milestones, checklists, and next steps. Make sure to update it as we proceed.'
    );
  };

  const handleCreateTodo = () => {
    onSend(
      'Please write a todo.md file listing the immediate tasks and actions we need to check off. Update it as we progress.'
    );
  };

  return (
    <div className="relative w-full max-w-[720px] mx-auto transition-all duration-300">
      {isIdle ? (
        /* ── IDLE STATE: Input sits inside a "shelf" holding box ── */
        <div className="relative">
          {/* Holding box — same radius as input, blends top/sides into page bg,
              only the bottom 23px strip shows as a distinct background */}
          <div
            className="absolute inset-x-0 top-0 rounded-[12px] bg-[#d1d2d6] border border-neutral-200/60 shadow-sm"
            style={{ bottom: '-23px' }}
            aria-hidden="true"
          />

          {/* Inner Input Box — sits on top of the holding box */}
          <div className="bg-[#f2f3f6] rounded-[12px] transition-all relative z-10">
            <ThinScrollbar className="max-h-[145px]">
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={isLoading ? 'Generating...' : 'Ask anything...'}
                className="w-full py-3 px-4 resize-none outline-none text-sm min-h-[44px] bg-transparent"
                rows={1}
                disabled={isLoading}
              />
            </ThinScrollbar>
            <div className="flex items-center justify-end px-3 py-2 bg-transparent">
              <div className="flex-1" />
              <button
                onClick={handleSend}
                disabled={!value.trim() || isLoading}
                className="p-1.5 text-white rounded-full bg-black disabled:opacity-50 transition-opacity hover:opacity-90 active:scale-95"
              >
                <HugeiconsIcon
                  icon={ArrowUp02Icon}
                  size={18}
                  color="currentColor"
                  strokeWidth={1.5}
                />
              </button>
            </div>
          </div>

          {/* Bottom shelf strip — action row that sits inside the holding box below the input */}
          <div className="relative z-10 flex items-center gap-2 px-3 pt-1 pb-1 h-[28px]">
            {/* Mode Selector */}
            <div className="flex items-center bg-white/60 rounded-md px-1.5 py-0.5">
              <span className="text-[9px] text-neutral-400 mr-1 uppercase tracking-wider font-bold">
                Mode:
              </span>
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value as any)}
                className="bg-transparent border-none outline-none font-semibold text-neutral-600 cursor-pointer text-[10px]"
              >
                <option value="Code">💻 Code</option>
                <option value="Debug">🪲 Debug</option>
                <option value="Refactor">⚙️ Refactor</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleCreateProject}
              className="flex items-center gap-1 bg-white/60 hover:bg-white px-2 py-0.5 rounded-md text-neutral-600 text-[10px] transition-all active:scale-95"
              title="Create a new project structure"
            >
              ➕ Create Project
            </button>

            <button
              type="button"
              onClick={handleCreatePlan}
              className="flex items-center gap-1 bg-white/60 hover:bg-white px-2 py-0.5 rounded-md text-neutral-600 text-[10px] transition-all active:scale-95"
              title="Create a task plan.md"
            >
              📝 plan.md
            </button>

            <button
              type="button"
              onClick={handleCreateTodo}
              className="flex items-center gap-1 bg-white/60 hover:bg-white px-2 py-0.5 rounded-md text-neutral-600 text-[10px] transition-all active:scale-95"
              title="Create a checklist todo.md"
            >
              📋 todo.md
            </button>
          </div>
        </div>
      ) : (
        /* ── ACTIVE STATE: Plain input, no shelf ── */
        <div className="bg-[#f2f3f6] rounded-[12px] transition-all relative z-10">
          <ThinScrollbar className="max-h-[145px]">
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isLoading ? 'Generating...' : 'Ask anything...'}
              className="w-full py-3 px-4 resize-none outline-none text-sm min-h-[44px] bg-transparent"
              rows={1}
              disabled={isLoading}
            />
          </ThinScrollbar>
          <div className="flex items-center justify-end px-3 py-2 bg-transparent">
            <div className="flex-1" />
            <button
              onClick={handleSend}
              disabled={!value.trim() || isLoading}
              className="p-1.5 text-white rounded-full bg-black disabled:opacity-50 transition-opacity hover:opacity-90 active:scale-95"
            >
              <HugeiconsIcon
                icon={ArrowUp02Icon}
                size={18}
                color="currentColor"
                strokeWidth={1.5}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
