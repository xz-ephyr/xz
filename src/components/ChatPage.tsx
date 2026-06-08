import { useState } from 'react';
import { ChatInput } from "./ChatInput";
import { ThinkingPad } from "./ThinkingPad";

interface Message {
  id: number;
  role: 'user' | 'ai';
  content: string;
}

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [aiResponse, setAiResponse] = useState('');

  const handleSendMessage = (message: string) => {
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: message }]);
    setIsThinking(true);
    setAiResponse('');
    
    // Simulate AI thinking and response
    setTimeout(() => {
      setIsThinking(false);
      simulateTypewriter("This is a simulated AI response using a typewriter effect!");
    }, 2000);
  };

  const simulateTypewriter = (text: string) => {
    let i = 0;
    const interval = setInterval(() => {
      setAiResponse(prev => prev + text.charAt(i));
      i++;
      if (i === text.length) {
        clearInterval(interval);
        setMessages(prev => [...prev, { id: Date.now(), role: 'ai', content: text }]);
        setAiResponse('');
      }
    }, 30);
  };

  return (
    <div className="flex flex-col h-full w-full bg-background p-4">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`px-4 py-2 rounded-2xl max-w-[70%] ${msg.role === 'user' ? 'bg-gray-200 text-foreground' : 'bg-background border'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {aiResponse && (
          <div className="flex justify-start">
            <div className="px-4 py-2 rounded-2xl bg-background border max-w-[70%]">
              {aiResponse}
            </div>
          </div>
        )}
      </div>
      <ThinkingPad isThinking={isThinking} />
      <div className="flex justify-center">
        <ChatInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
}
