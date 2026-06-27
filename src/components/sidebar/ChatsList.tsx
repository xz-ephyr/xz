import { useState, useEffect } from 'react';
import { ChatSession } from '../../types/chat';
import { ChatSessionManager } from '../../services/ChatSessionManager';
import { Link } from 'react-router-dom';

export default function ChatsList({ collapsed }: { collapsed: boolean }) {
  const [chats, setChats] = useState<ChatSession[]>([]);

  useEffect(() => {
    const loadChats = async () => {
      const allChats = await ChatSessionManager.getAll();
      setChats(allChats);
    };
    loadChats();
  }, []);

  if (collapsed) return null;

  return (
    <div className="mt-2 space-y-1">
      {chats.map((chat) => (
        <Link
          key={chat.id}
          to={`/chat/${chat.id}`}
          className="block px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-[#f2f3f6] dark:hover:bg-[#1a1a18] rounded-[6px] truncate"
        >
          {chat.title}
        </Link>
      ))}
    </div>
  );
}
