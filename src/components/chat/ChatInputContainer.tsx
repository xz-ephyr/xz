import { type ReactNode } from 'react';
import ChatInput from './ChatInput';

interface ChatInputContainerProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isLoading?: boolean;
  isThinkingEnabled: boolean;
  onToggleThinking: () => void;
  children?: ReactNode;
}

export default function ChatInputContainer({
  onSend,
  onStop,
  isLoading,
  isThinkingEnabled,
  onToggleThinking,
  children,
}: ChatInputContainerProps) {
  return (
    <div className="relative w-full mx-auto" style={{ maxWidth: 'min(880px, 100%)' }}>
      <div className="relative">
        <div
          className="absolute left-0 right-0 bg-neutral-100 dark:bg-neutral-800 rounded-[12px]"
          style={{ top: 0, height: 'calc(100% + 55px)' }}
        />
        <ChatInput
          onSend={onSend}
          onStop={onStop}
          isLoading={isLoading}
          isThinkingEnabled={isThinkingEnabled}
          onToggleThinking={onToggleThinking}
        />
      </div>
      {children}
    </div>
  );
}
