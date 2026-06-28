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
        <ChatInput
          onSend={onSend}
          onStop={onStop}
          isLoading={isLoading}
          isThinkingEnabled={isThinkingEnabled}
          onToggleThinking={onToggleThinking}
        />
        <div
          className="absolute bottom-0 left-0 right-0 bg-neutral-100 dark:bg-neutral-800 rounded-[12px] -z-10"
          style={{ height: '55px' }}
        />
      </div>
      {children}
    </div>
  );
}
