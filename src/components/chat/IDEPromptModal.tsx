import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CodeIcon, Chat01Icon } from '@hugeicons/core-free-icons';

interface IDEPromptModalProps {
  onOpenIDE: () => void;
  onContinueChat: () => void;
}

export const IDEPromptModal: React.FC<IDEPromptModalProps> = ({ onOpenIDE, onContinueChat }) => {
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
        <h3 className="text-lg font-bold text-neutral-900 mb-2">Open Project IDE?</h3>
        <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
          Would you like to open the full project in the code editor, or just continue with the normal chat session?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onContinueChat}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-all active:scale-95"
          >
            <HugeiconsIcon icon={Chat01Icon} size={18} strokeWidth={2} />
            Continue
          </button>
          <button
            onClick={onOpenIDE}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-black transition-all shadow-md active:scale-95"
          >
            {/* Using a safer icon name if CodeIcon was suspicious, though CodeIcon is standard in some versions */}
            <HugeiconsIcon icon={CodeIcon} size={18} strokeWidth={2} />
            Open IDE
          </button>
        </div>
      </div>
    </div>
  );
};
