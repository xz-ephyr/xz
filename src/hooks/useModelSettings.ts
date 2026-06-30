import { useState, useCallback } from 'react';
import {
  API_KEYS,
  SELECTED_MODEL_STORAGE_KEY,
  MODEL_MODE_STORAGE_KEY,
  getStoredSelectedModel,
  getStoredModelMode,
} from '../config/models';
import { refreshProviders } from '../services/aiService';

export function useModelSettings() {
  const [keys, setKeys] = useState(() => {
    const initial: Record<string, string> = {};
    Object.keys(API_KEYS).forEach((key) => {
      initial[key] = localStorage.getItem((API_KEYS as any)[key]) || '';
    });
    return initial;
  });

  const [selectedModel, setSelectedModel] = useState(getStoredSelectedModel);
  const [modelMode, setModelMode] = useState(getStoredModelMode);

  const saveSettings = useCallback(async (newKeys: Record<string, string>, newModel: string, newMode: string) => {
    Object.keys(API_KEYS).forEach((key) => {
      localStorage.setItem((API_KEYS as any)[key], newKeys[key]);
    });
    localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, newModel);
    localStorage.setItem(MODEL_MODE_STORAGE_KEY, newMode);

    setKeys(newKeys);
    setSelectedModel(newModel);
    setModelMode(newMode as any);

    refreshProviders();
    window.dispatchEvent(new CustomEvent('model-changed'));
  }, []);

  return {
    keys,
    setKeys,
    selectedModel,
    setSelectedModel,
    modelMode,
    setModelMode,
    saveSettings,
  };
}
