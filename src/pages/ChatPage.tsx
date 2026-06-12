import { useState } from 'react';
import ChatInput from '../components/chat/ChatInput';

type Message = { role: 'user' | 'assistant'; content: string };

const UserBubble = ({ content }: { content: string }) => (
  <div className="flex justify-end mb-4">
    <div className="bg-[#f9f9f9] rounded-[8px] p-4 text-sm max-w-[70%]">
      {content}
    </div>
  </div>
);

const AssistantBubble = ({ content }: { content: string }) => (
  <div className="mb-4">
    <div className="text-sm p-4">
      {content}
    </div>
  </div>
);

export const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSend = (content: string) => {
    setMessages((prev) => [...prev, { role: 'user', content }, { role: 'assistant', content: 'This is a simulated AI response.' }]);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[720px] mx-auto">
          {messages.map((m, i) => (
            m.role === 'user' ? <UserBubble key={i} content={m.content} /> : <AssistantBubble key={i} content={m.content} />
          ))}
        </div>
      </div>
      <ChatInput onSend={handleSend} />
    </div>
  );
};
