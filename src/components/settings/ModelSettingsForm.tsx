import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ViewIcon,
  ViewOffSlashIcon,
  Key01Icon,
  ZapIcon,
  GlobeIcon,
} from '@hugeicons/core-free-icons';
import { MODELS, MODEL_MODES } from '../../config/models';

export const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google Gemini',
  groq: 'Groq',
  opencodezen: 'OpenCode Zen',
  mistral: 'Mistral',
  openrouter: 'OpenRouter',
  cerebras: 'Cerebras',
};

interface ModelSettingsFormProps {
  keys: Record<string, string>;
  setKeys: (keys: Record<string, string>) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  modelMode: string;
  setModelMode: (mode: any) => void;
  showSaveButton?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
}

export function ModelSettingsForm({
  keys,
  setKeys,
  selectedModel,
  setSelectedModel,
  modelMode,
  setModelMode,
  showSaveButton,
  onSave,
  isSaving,
}: ModelSettingsFormProps) {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const toggleShowKey = (provider: string) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-x-6 gap-y-4 grid-cols-1 sm:grid-cols-2">
        {Object.keys(PROVIDER_LABELS).map((providerId) => (
          <div key={providerId} className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-neutral-600 ml-1">
              {PROVIDER_LABELS[providerId]}
            </label>
            <div className="relative">
              <div className="absolute left-3 top-2.5 text-neutral-400">
                <HugeiconsIcon icon={Key01Icon} size={13} />
              </div>
              <input
                type={showKeys[providerId] ? 'text' : 'password'}
                className="h-9 bg-neutral-50 rounded-[8px] pl-8 pr-9 outline-none text-sm w-full border border-neutral-200 focus:border-neutral-400 transition-colors"
                placeholder={`Enter ${PROVIDER_LABELS[providerId]} Key`}
                value={keys[providerId] || ''}
                onChange={(e) => setKeys({ ...keys, [providerId]: e.target.value })}
              />
              <button
                type="button"
                onClick={() => toggleShowKey(providerId)}
                className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-600 p-0.5"
              >
                <HugeiconsIcon
                  icon={showKeys[providerId] ? ViewOffSlashIcon : ViewIcon}
                  size={15}
                />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-neutral-100 pt-5 space-y-5">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
            <HugeiconsIcon icon={ZapIcon} size={16} />
            Model Mode
          </label>
          <select
            className="h-10 bg-neutral-50 rounded-[10px] px-3 text-sm outline-none w-full border border-neutral-200 focus:border-black transition-all appearance-none cursor-pointer"
            value={modelMode}
            onChange={(e) => setModelMode(e.target.value)}
          >
            <option value={MODEL_MODES.fixed}>Fixed selected model</option>
            <option value={MODEL_MODES.rotate}>Auto rotate models</option>
          </select>
          <p className="text-xs text-neutral-500">
            Auto rotate cycles through every available model in the active chat session.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
            <HugeiconsIcon icon={GlobeIcon} size={16} />
            Default Model
          </label>
          <select
            className="h-10 bg-neutral-50 rounded-[10px] px-3 text-sm outline-none w-full border border-neutral-200 focus:border-black transition-all appearance-none cursor-pointer"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label} ({PROVIDER_LABELS[model.provider] || model.provider})
              </option>
            ))}
          </select>
        </div>
      </div>

      {showSaveButton && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-6 py-2 text-sm font-bold text-white bg-black hover:bg-neutral-800 rounded-[10px] transition-all flex items-center gap-2 shadow-lg shadow-black/5 active:scale-[0.98] disabled:opacity-50"
          >
            {isSaving && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
