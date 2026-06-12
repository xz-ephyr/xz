import { useState } from 'react';
import { Copy } from 'lucide-react';
import ChatInput from '../components/chat/ChatInput';

type Message = { role: 'user' | 'assistant'; content: string };

const CopyButton = ({ content }: { content: string }) => (
  <button 
    onClick={() => navigator.clipboard.writeText(content).catch(err => console.error('Failed to copy!', err))}
    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 mt-1 text-xs text-gray-400 hover:text-gray-900 transition-opacity"
  >
    <Copy size={12} />
    <span>Copy</span>
  </button>
);

const UserBubble = ({ content }: { content: string }) => (
  <div className="flex flex-col items-end mb-4 group">
    <div className="bg-[#f9f9f9] rounded-[8px] px-4 py-2.5 text-sm max-w-[70%]">
      {content}
    </div>
    <CopyButton content={content} />
  </div>
);

const AssistantBubble = ({ content }: { content: string }) => (
  <div className="mb-4 group">
    <div className="text-sm p-4">
      {content}
    </div>
    <CopyButton content={content} />
  </div>
);

export const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSend = (content: string) => {
    setMessages((prev) => [...prev, { role: 'user', content }, { role: 'assistant', content: 'This is a simulated AI response.' }]);
  };

  return (
    <div className={`flex flex-col h-screen ${messages.length === 0 ? 'justify-center' : ''}`}>
      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-[720px] mx-auto">
            {messages.map((m, i) => (
              m.role === 'user' ? <UserBubble key={i} content={m.content} /> : <AssistantBubble key={i} content={m.content} />
            ))}
          </div>
        </div>
      )}
      <div className={messages.length === 0 ? '' : 'shrink-0'}>
        <ChatInput onSend={handleSend} />
      </div>
    </div>
  );
};
