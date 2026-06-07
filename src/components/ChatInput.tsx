import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { SentIcon, Attachment01Icon } from '@hugeicons/core-free-icons';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  disabled 
}) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [value]);

  return (
    <div className="relative flex flex-col w-full bg-card border border-border/80 rounded-[22px] shadow-sm hover:shadow-md transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 p-2.5 gap-2">
      {/* Textarea Area */}
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask CatGPT anything..."
        className="w-full bg-transparent border-none focus:ring-0 resize-none py-1.5 px-3 text-xs/relaxed text-foreground max-h-[180px] min-h-[36px] overflow-y-auto outline-none"
        disabled={disabled}
      />

      {/* Control Bar */}
      <div className="flex items-center justify-between border-t border-border/20 pt-2 px-1">
        {/* Left Tools: Attachment */}
        <div className="flex items-center gap-1.5">
          {/* Mock Attachment Button */}
          <button
            type="button"
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-200"
            title="Attach file"
          >
            <Icon icon={Attachment01Icon} size={15} />
          </button>
        </div>

        {/* Right Tools: Send Button */}
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          className="rounded-xl size-8 shrink-0 bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm active:scale-95 transition-all duration-150 disabled:opacity-30 disabled:scale-100 disabled:pointer-events-none"
        >
          <Icon icon={SentIcon} size={15} />
        </Button>
      </div>
    </div>
  );
};
