import { ChatSession } from '../types/chat';
import { ChatSessionManager } from '../services/ChatSessionManager';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

export const ChatsPage = () => {
  const [chats, setChats] = useState<ChatSession[]>([]);

  useEffect(() => {
    setChats(ChatSessionManager.getAll());
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Chats</h1>
      <div className="space-y-2">
        {chats.map(chat => (
          <Link 
            key={chat.id} 
            to={`/chat/${chat.id}`}
            className="block p-4 bg-[#f9f9f9] hover:bg-[#f2f3f6] rounded-[8px] transition-colors"
          >
            <h3 className="font-semibold">{chat.title}</h3>
          </Link>
        ))}
      </div>
    </div>
  );
};
