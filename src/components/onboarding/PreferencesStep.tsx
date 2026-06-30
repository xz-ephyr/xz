import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { PencilEdit02Icon, Settings02Icon, FolderLibraryIcon } from '@hugeicons/core-free-icons';
import { usePreferences } from '../../hooks/usePreferences';

const STYLE_OPTIONS = [
  { id: 'concise', label: 'Concise', desc: 'Short, direct answers' },
  { id: 'balanced', label: 'Balanced', desc: 'Clear with reasonable detail' },
  { id: 'detailed', label: 'Detailed', desc: 'In-depth with examples' },
];

const EXPERTISE_OPTIONS = [
  { id: 'beginner', label: 'Beginner', desc: 'Explain from the ground up' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Assume basic knowledge' },
  { id: 'expert', label: 'Expert', desc: 'Focus on advanced topics' },
];

const FOCUS_OPTIONS = [
  'Web (React, Next.js)', 'Mobile (React Native)', 'Backend (Node.js, Python)',
  'DevOps & Infrastructure', 'Data Science & ML', 'Game Development',
  'Desktop Apps (Tauri, Electron)', 'CLI & Tooling',
];

export function PreferencesStep({ onComplete, onSkip }: any) {
  const { prefs, setPrefs, savePrefs, toggleFocus } = usePreferences();
  const [showCustom, setShowCustom] = useState(prefs.customInstructions.length > 0);

  const handleSave = () => { savePrefs(); onComplete(); };

  return (
    <div className="flex flex-col max-w-lg mx-auto gap-6 py-4 w-full">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-neutral-900">AI Memory & Preferences</h2>
        <p className="text-neutral-500 text-sm mt-1">Help the AI understand how you like to work.</p>
      </div>
      <div className="space-y-6">
        <OptionGroup label="Communication Style" icon={PencilEdit02Icon} options={STYLE_OPTIONS} value={prefs.style} onChange={(id: string) => setPrefs((p: any) => ({ ...p, style: id }))} />
        <OptionGroup label="Expertise Level" icon={Settings02Icon} options={EXPERTISE_OPTIONS} value={prefs.expertise} onChange={(id: string) => setPrefs((p: any) => ({ ...p, expertise: id }))} />
        <div className="space-y-3">
          <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2"><HugeiconsIcon icon={FolderLibraryIcon} size={16} />Coding Focus Areas</label>
          <div className="flex flex-wrap gap-2">{FOCUS_OPTIONS.map(item => <button key={item} onClick={() => toggleFocus(item)} className={`px-3 py-1.5 rounded-[8px] text-xs font-medium border transition-all ${prefs.focus.includes(item) ? 'border-black bg-black text-white' : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'}`}>{item}</button>)}</div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between"><label className="text-sm font-semibold text-neutral-700 flex items-center gap-2"><HugeiconsIcon icon={PencilEdit02Icon} size={16} />Custom Instructions</label><button onClick={() => setShowCustom(!showCustom)} className="text-xs text-neutral-500 hover:text-neutral-700 underline underline-offset-2">{showCustom ? 'Hide' : 'Add'}</button></div>
          {showCustom && <textarea className="w-full h-24 bg-neutral-50 rounded-xl px-4 py-3 text-sm border border-neutral-200 outline-none focus:border-neutral-400 transition-colors resize-none" placeholder="e.g. I prefer TypeScript..." value={prefs.customInstructions} onChange={(e) => setPrefs((p: any) => ({ ...p, customInstructions: e.target.value }))} />}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onSkip} className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 font-medium text-sm hover:bg-neutral-50 transition-all">Skip</button>
        <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-black text-white font-medium text-sm hover:bg-neutral-800 transition-all active:scale-[0.98]">Save & Continue</button>
      </div>
    </div>
  );
}

const OptionGroup = ({ label, icon, options, value, onChange }: any) => (
  <div className="space-y-3">
    <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2"><HugeiconsIcon icon={icon} size={16} />{label}</label>
    <div className="grid grid-cols-3 gap-2">
      {options.map((opt: any) => (
        <button key={opt.id} onClick={() => onChange(opt.id)} className={`p-3 rounded-xl border text-left transition-all ${value === opt.id ? 'border-black bg-neutral-50' : 'border-neutral-100 hover:border-neutral-200'}`}>
          <div className="text-sm font-semibold text-neutral-800">{opt.label}</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">{opt.desc}</div>
        </button>
      ))}
    </div>
  </div>
);
