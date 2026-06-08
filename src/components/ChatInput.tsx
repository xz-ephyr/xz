import React from 'react';
import { ArrowTurnBackwardIcon } from "@hugeicons/core-free-icons";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
}

const Icon = ({ icon: IconComponent, className }: { icon: any, className?: string }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {IconComponent.map(([tag, attrs]: [string, any]) => 
        React.createElement(tag, { ...attrs, key: attrs.key })
      )}
    </svg>
  );
};

export function ChatInput({ onSendMessage }: ChatInputProps) {
  return (
    // Previous max-width was 876px. Reducing by 134px = 742px.
    <div className="relative w-full max-w-[742px] border border-border rounded-lg p-3 bg-background min-h-[100px]">
      <input
        type="text"
        className="w-[calc(100%-16px)] bg-transparent outline-none absolute top-3 left-3 text-left"
        placeholder="Type a message..."
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSendMessage(e.currentTarget.value);
            e.currentTarget.value = "";
          }
        }}
      />
      {/* Reduced height from w-8 h-8 to w-8 h-6 */}
      <div className="absolute bottom-2 right-2 flex items-center justify-center w-8 h-6 rounded-md bg-lime-800">
        <Icon icon={ArrowTurnBackwardIcon} className="w-5 h-5 text-white" />
      </div>
    </div>
  );
}
