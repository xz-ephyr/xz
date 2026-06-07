import React from 'react';
import { ChatInput } from './ChatInput';

interface ChatProps {
  onSendMessage: (content: string) => void;
}

export const Chat: React.FC<ChatProps> = ({
  onSendMessage
}) => {
  return (
    <div className="flex flex-col h-full w-full relative justify-center items-center">
      {/* Welcome / Zero State Dashboard (Centered on the Screen) */}
      <div className="max-w-2xl mx-auto w-full flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-300 gap-6 px-4">
        {/* Soft, beautiful icon glow */}
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-3xl shadow-sm select-none animate-pulse">
          🐱
        </div>
        
        <div className="space-y-2">
          <h1 className="font-heading font-semibold text-2xl md:text-3xl text-foreground tracking-tight">
            How can I help you today?
          </h1>
          <p className="text-xs/relaxed text-muted-foreground max-w-md mx-auto">
            Type anything below to start a conversation. Your chats persist in memory automatically.
          </p>
        </div>

        {/* Centered Input Box */}
        <div className="w-full max-w-2xl mt-2 px-2 md:px-6">
          <ChatInput 
            onSend={onSendMessage} 
            disabled={false}
          />
        </div>
      </div>
    </div>
  );
};
