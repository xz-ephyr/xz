import { useState } from 'react';
import { CornerDownLeft, Paperclip, Sparkles } from 'lucide-react';

export default function ChatInput() {
  const [value, setValue] = useState('');

  return (
    <div className="w-full max-w-[720px] mx-auto p-4">
      <div className="bg-white border border-[#e5e5e5] rounded-[12px] shadow-sm overflow-hidden focus-within:ring-1 focus-within:ring-gray-300 transition-all">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask anything..."
          className="w-full p-4 resize-none outline-none text-sm min-h-[44px] max-h-[180px] bg-transparent"
          rows={1}
        />
        <div className="flex items-center justify-between px-3 py-2 border-t border-[#f2f3f6] bg-[#f9f9f9]">
          <div className="flex items-center gap-2">
            <button className="p-1.5 text-gray-500 hover:text-gray-900 rounded-[6px] hover:bg-[#e5e5e5]">
              <Paperclip size={18} />
            </button>
            <button className="p-1.5 text-gray-500 hover:text-gray-900 rounded-[6px] hover:bg-[#e5e5e5]">
              <Sparkles size={18} />
            </button>
          </div>
          <button 
            disabled={!value.trim()}
            className="p-1.5 text-gray-500 hover:text-gray-900 rounded-[6px] hover:bg-[#e5e5e5] disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <CornerDownLeft size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
