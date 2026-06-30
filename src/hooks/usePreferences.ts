import { useState } from 'react';

const STORAGE_KEY = 'ai_preferences';
const DEFAULT_PREFERENCES = { style: 'balanced', expertise: 'intermediate', focus: [], customInstructions: '' };

export function usePreferences() {
  const [prefs, setPrefs] = useState(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : DEFAULT_PREFERENCES; }
    catch { return DEFAULT_PREFERENCES; }
  });
  const savePrefs = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  const toggleFocus = (item: string) => setPrefs((p: any) => ({ ...p, focus: p.focus.includes(item) ? p.focus.filter((f: any) => f !== item) : [...p.focus, item] }));
  return { prefs, setPrefs, savePrefs, toggleFocus };
}
