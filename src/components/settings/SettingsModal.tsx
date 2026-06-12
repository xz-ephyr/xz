import { useState, useEffect } from 'react';

const GEMMA_4_MODELS = ['gemma-4-pro', 'gemma-4-flash', 'gemma-4-nano'];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('api-key') || '');
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('selected-model') || GEMMA_4_MODELS[0]);

  useEffect(() => {
    localStorage.setItem('api-key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('selected-model', selectedModel);
  }, [selectedModel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] z-50">
      <div className="bg-white/70 backdrop-blur-md rounded-[12px] p-6 w-[500px] shadow-xl border border-white/50">
        <h2 className="text-[18px] font-bold mb-6">Settings</h2>
        
        <div className="space-y-6">
          {/* API Key Section */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Google API Key</label>
            <input
              type="password"
              className="h-9 bg-white/50 rounded-[8px] px-3 outline-none text-sm w-full border border-white/20"
              placeholder="Enter your API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          {/* Model Selection Section */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Select Model</label>
            <select 
              className="h-9 bg-white/50 rounded-[8px] px-3 text-sm outline-none w-full border border-white/20"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {GEMMA_4_MODELS.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-8">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-bold text-neutral-600 hover:bg-white/50 rounded-[8px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
