import { ModelSettingsForm } from '../settings/ModelSettingsForm';
import { useModelSettings } from '../../hooks/useModelSettings';

interface ModelSetupStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function ModelSetupStep({ onComplete, onSkip }: ModelSetupStepProps) {
  const {
    keys,
    setKeys,
    selectedModel,
    setSelectedModel,
    modelMode,
    setModelMode,
    saveSettings,
  } = useModelSettings();

  const handleSave = async () => {
    await saveSettings(keys, selectedModel, modelMode);
    onComplete();
  };

  const hasAnyKey = Object.values(keys).some((k) => k.trim().length > 0);

  return (
    <div className="flex flex-col max-w-lg mx-auto gap-6 py-4 w-full">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-neutral-900">Configure AI Model</h2>
        <p className="text-neutral-500 text-sm mt-1">
          Set up your AI provider to start coding with AI assistance.
        </p>
      </div>

      <div className="bg-blue-50 p-3 rounded-[8px] border border-blue-100">
        <p className="text-xs text-blue-700 leading-relaxed">
          Enter your API keys for the providers you wish to use. Keys are stored locally and never sent anywhere
          except to the provider directly.
        </p>
      </div>

      <ModelSettingsForm
        keys={keys}
        setKeys={setKeys}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        modelMode={modelMode}
        setModelMode={setModelMode}
      />

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onSkip}
          className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 font-medium text-sm hover:bg-neutral-50 transition-all"
        >
          Skip for now
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 py-2.5 rounded-xl bg-black text-white font-medium text-sm hover:bg-neutral-800 transition-all active:scale-[0.98]"
        >
          {hasAnyKey ? 'Save & Continue' : 'Continue without API key'}
        </button>
      </div>
    </div>
  );
}
