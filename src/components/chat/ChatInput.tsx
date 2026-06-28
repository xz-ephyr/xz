import { useState, useRef, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUp02Icon, PlusSignIcon, Idea01Icon, Cancel01Icon, StopIcon } from '@hugeicons/core-free-icons';
import { ThinScrollbar } from '../ui/ThinScrollbar';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isLoading?: boolean;
  isIdle?: boolean;
  isThinkingEnabled: boolean;
  onToggleThinking: () => void;
}

function PlusDropdown({
  isOpen,
  onToggle,
  onToggleThinking,
  isThinkingEnabled,
  dropUp,
}: {
  isOpen: boolean;
  onToggle: () => void;
  onToggleThinking: () => void;
  isThinkingEnabled: boolean;
  dropUp?: boolean;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-neutral-200/60 transition-colors text-black"
        aria-label="Add content or toggle settings"
        title="Add content or toggle settings"
      >
        <HugeiconsIcon icon={PlusSignIcon} size={18} />
      </button>

      {isOpen && (
        <div
          className={`absolute ${dropUp ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-50`}
        >
          <button
            type="button"
            onClick={() => { onToggleThinking(); onToggle(); }}
            className="w-full text-left px-4 py-2 text-xs hover:bg-neutral-50 text-neutral-700 flex items-center justify-between"
            aria-label="Toggle thinking mode"
          >
            <span className="flex items-center gap-2"><HugeiconsIcon icon={Idea01Icon} size={14} /> Thinking Mode</span>
            {isThinkingEnabled && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
          </button>
        </div>
      )}
    </div>
  );
}

function ThinkingPill({
  onToggleThinking,
  size = 'normal',
}: {
  onToggleThinking: () => void;
  size?: 'normal' | 'small';
}) {
  return (
    <button
      type="button"
      onClick={onToggleThinking}
      className={`group flex items-center gap-2 bg-blue-100 text-blue-900 ${size === 'normal' ? 'px-4 py-1.5 text-sm' : 'px-3 py-1 text-xs'} rounded-full font-medium cursor-pointer transition-all active:scale-95`}
      aria-label="Disable thinking mode"
      title="Disable thinking mode"
    >
      <div className={`relative flex items-center justify-center ${size === 'normal' ? 'w-4 h-4' : 'w-3.5 h-3.5'}`}>
        <HugeiconsIcon icon={Idea01Icon} size={size === 'normal' ? 16 : 14} className="group-hover:hidden" />
        <HugeiconsIcon icon={Cancel01Icon} size={size === 'normal' ? 16 : 14} className="hidden group-hover:block" />
      </div>
      Think
    </button>
  );
}

function SendButton({
  isLoading,
  onStop,
  onSend,
  hasValue,
}: {
  isLoading?: boolean;
  onStop?: () => void;
  onSend: () => void;
  hasValue: boolean;
}) {
  const label = isLoading ? 'Stop generation' : 'Send message';
  return (
    <button
      type="button"
      onClick={isLoading ? onStop : onSend}
      disabled={!hasValue && !isLoading}
      className="p-1.5 text-white rounded-full bg-black disabled:opacity-50 transition-opacity hover:opacity-90 active:scale-95"
      aria-label={label}
      title={label}
    >
      <HugeiconsIcon
        icon={isLoading ? StopIcon : ArrowUp02Icon}
        size={18}
        color="currentColor"
        strokeWidth={1.5}
      />
    </button>
  );
}

export default function ChatInput({ onSend, onStop, isLoading, isIdle, isThinkingEnabled, onToggleThinking }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isExpanded = isFocused || !!value || !isIdle;

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    if (isExpanded) adjustHeight();
  }, [value, isExpanded]);

  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isExpanded]);

  const handleSend = () => {
    if (value.trim() && !isLoading) {
      onSend(value);
      setValue('');
    }
  };

  const commonTextareaProps = {
    ref: textareaRef,
    value,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value),
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    placeholder: isLoading ? 'Generating...' : 'Ask anything...',
    disabled: isLoading,
  };

  return (
    <div className="relative w-full mx-auto transition-all duration-300" style={{ maxWidth: 'min(880px, 100%)' }}>
      {isExpanded ? (
        /* ── EXPANDED STATE: Full auto-resizing input ── */
        <div className="bg-[#f2f3f6] rounded-[12px] transition-all relative z-10 border border-neutral-200/60 shadow-sm">
          <ThinScrollbar className="max-h-[145px]">
            <textarea
              {...commonTextareaProps}
              className="w-full py-3 px-4 resize-none outline-none text-[15px] min-h-[48px] bg-transparent overflow-hidden"
              rows={1}
            />
          </ThinScrollbar>

          <div className="flex items-center justify-between px-3 py-2 bg-transparent">
            <div className="flex items-center gap-2">
              <PlusDropdown isOpen={isDropdownOpen} onToggle={() => setIsDropdownOpen(!isDropdownOpen)} onToggleThinking={onToggleThinking} isThinkingEnabled={isThinkingEnabled} dropUp={true} />
              {isThinkingEnabled && <ThinkingPill onToggleThinking={onToggleThinking} size="small" />}
            </div>
            <SendButton isLoading={isLoading} onStop={onStop} onSend={handleSend} hasValue={!!value.trim()} />
          </div>
        </div>
      ) : (
        /* ── COLLAPSED STATE: Compact pill ── */
        <button
          type="button"
          onClick={() => setIsFocused(true)}
          className="w-full flex items-center justify-between bg-[#f2f3f6] rounded-full border border-neutral-200/60 shadow-sm px-5 h-11 transition-all hover:bg-[#ececed] active:scale-[0.99] cursor-text"
        >
          <span className="text-sm text-neutral-400">Ask anything...</span>
          <SendButton isLoading={false} onStop={onStop} onSend={() => {}} hasValue={false} />
        </button>
      )}
    </div>
  );
}
