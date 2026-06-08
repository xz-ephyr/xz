import React from 'react';
import { Button } from '@/components/ui/button'; // Assuming these exist, will handle imports if needed

interface SettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPopup: React.FC<SettingsPopupProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background p-6 rounded-lg border w-96">
        <h2 className="text-lg font-bold mb-4">Settings</h2>
        <div className="mb-4">
          <label className="block text-sm mb-1">Gemini AI Key</label>
          <input type="password" className="w-full p-2 border rounded" placeholder="Enter API Key" />
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-1">Model</label>
          <select className="w-full p-2 border rounded">
            <option value="gemma-4-31b">Gemma 4 31b</option>
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};
